"""
KrushakSetu SARIMAX forecast engine.

Weather (rainfall + temperature) is the exogenous signal that lets the
forecast move off the unconditional mean at long horizons. Orders are
chosen per crop/district and cached so auto_arima does not re-run on
every request. Metrics are computed on a 14-day walk-forward holdout —
never on in-sample fittedvalues.
"""
import json
import logging
from datetime import datetime, timedelta

import httpx
import numpy as np
import pandas as pd
import pmdarima
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.statespace.sarimax import SARIMAX

from api.config import FORECAST_HORIZON, OWM_API_KEY
from api.database import query_df, execute, query_dicts
from etl.constants import DISTRICT_CENTROIDS

logger = logging.getLogger(__name__)

CACHE_VERSION = "sarimax_v3"
BACKTEST_DAYS = 14
MAPE_GATE = 15.0
ORDER_TTL_DAYS = 7
WEATHER_TTL_HOURS = 24
MIN_TRAIN_FOR_SEASONAL = 28
DEFAULT_ORDER = (1, 1, 1)
DEFAULT_SEASONAL = (1, 0, 1, 7)

_weather_mem = {}


def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    denom = np.clip(np.abs(y_true), 1e-6, None)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100)


def symmetric_mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    denom = np.clip(np.abs(y_true) + np.abs(y_pred), 1e-6, None)
    return float(100 / len(y_true) * np.sum(2 * np.abs(y_pred - y_true) / denom))


def _series_key(commodity: str, district: str, market: str, horizon: int) -> str:
    return f"{commodity}_{district}_{market}_{horizon}_{CACHE_VERSION}".lower().replace(" ", "_")


def _order_key(commodity: str, district: str) -> str:
    return f"{commodity}_{district}".lower().replace(" ", "_")


def ensure_aux_tables():
    execute("""
        CREATE TABLE IF NOT EXISTS model_orders (
            series_key VARCHAR PRIMARY KEY,
            commodity VARCHAR,
            district VARCHAR,
            order_p INTEGER,
            order_d INTEGER,
            order_q INTEGER,
            seasonal_p INTEGER,
            seasonal_d INTEGER,
            seasonal_q INTEGER,
            seasonal_s INTEGER,
            aic DOUBLE,
            training_n INTEGER,
            selected_at TIMESTAMP
        )
    """)
    execute("""
        CREATE TABLE IF NOT EXISTS weather_daily (
            district VARCHAR,
            date DATE,
            temp_max DOUBLE,
            rain_mm DOUBLE,
            source VARCHAR,
            fetched_at TIMESTAMP,
            PRIMARY KEY (district, date)
        )
    """)
    execute("""
        CREATE TABLE IF NOT EXISTS forecasts (
            series_key VARCHAR PRIMARY KEY,
            commodity VARCHAR,
            district VARCHAR,
            market VARCHAR,
            generated_at TIMESTAMP,
            forecast_json JSON,
            metrics_json JSON,
            recommendation_json JSON
        )
    """)


def get_cached_forecast(commodity: str, district: str, market: str, horizon: int = 14) -> dict | None:
    """Retrieve cached forecast if generated in the last 24 hours."""
    ensure_aux_tables()
    series_key = _series_key(commodity, district, market, horizon)
    sql = """
        SELECT forecast_json, generated_at
        FROM forecasts
        WHERE series_key = ?
    """
    results = query_dicts(sql, [series_key])
    if not results:
        return None

    row = results[0]
    generated_at_str = row["generated_at"]
    try:
        if isinstance(generated_at_str, str):
            generated_at = datetime.fromisoformat(generated_at_str)
        else:
            generated_at = generated_at_str

        if datetime.now() - generated_at < timedelta(hours=24):
            forecast_data = row["forecast_json"]
            if isinstance(forecast_data, str):
                forecast_data = json.loads(forecast_data)
            return forecast_data
    except Exception as e:
        logger.warning(f"Error parsing cached forecast for {series_key}: {e}")

    return None


def cache_forecast(series_key: str, commodity: str, district: str, market: str, forecast_data: dict, metrics_data: dict, recommendation_data: dict):
    ensure_aux_tables()
    sql = """
        INSERT INTO forecasts (series_key, commodity, district, market, generated_at, forecast_json, metrics_json, recommendation_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (series_key) DO UPDATE SET
            commodity = EXCLUDED.commodity,
            district = EXCLUDED.district,
            market = EXCLUDED.market,
            generated_at = EXCLUDED.generated_at,
            forecast_json = EXCLUDED.forecast_json,
            metrics_json = EXCLUDED.metrics_json,
            recommendation_json = EXCLUDED.recommendation_json
    """
    now_iso = datetime.now().isoformat()
    execute(sql, [
        series_key, commodity, district, market, now_iso,
        json.dumps(forecast_data), json.dumps(metrics_data), json.dumps(recommendation_data),
    ])


# ---------------------------------------------------------------------------
# Weather: OpenWeather (cached) + Open-Meteo fill for history / far horizon
# ---------------------------------------------------------------------------

def _coords(district: str):
    coords = DISTRICT_CENTROIDS.get(district, {"lat": 18.5204, "lon": 73.8567})
    return round(coords["lat"], 2), round(coords["lon"], 2)


def _climatology_frame(dates: pd.DatetimeIndex) -> pd.DataFrame:
    """Smooth Maharashtra-like seasonal prior — last-resort exog, never a constant."""
    doy = dates.dayofyear.astype(float)
    temp = 29.0 + 6.5 * np.sin(2 * np.pi * (doy - 120) / 365.0)
    rain = np.clip(4.0 + 18.0 * np.sin(2 * np.pi * (doy - 190) / 365.0), 0, None)
    rain = np.where(rain > 8, (rain - 4) ** 1.4, rain * 0.4)
    return pd.DataFrame({"temp_max": temp, "rain_mm": rain}, index=dates)


def _upsert_weather(district: str, frame: pd.DataFrame, source: str):
    if frame is None or frame.empty:
        return
    now_iso = datetime.now().isoformat()
    for dt, row in frame.iterrows():
        execute(
            """
            INSERT INTO weather_daily (district, date, temp_max, rain_mm, source, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (district, date) DO UPDATE SET
                temp_max = EXCLUDED.temp_max,
                rain_mm = EXCLUDED.rain_mm,
                source = EXCLUDED.source,
                fetched_at = EXCLUDED.fetched_at
            """,
            [district, pd.Timestamp(dt).date(), float(row["temp_max"]), float(row["rain_mm"]), source, now_iso],
        )


def _weather_from_db(district: str, start, end) -> pd.DataFrame:
    sql = """
        SELECT date, temp_max, rain_mm, fetched_at
        FROM weather_daily
        WHERE district = ? AND date >= ? AND date <= ?
        ORDER BY date
    """
    df = query_df(sql, [district, pd.Timestamp(start).date(), pd.Timestamp(end).date()])
    if df is None or df.empty:
        return pd.DataFrame()
    df.columns = [str(col).strip().lower() for col in df.columns]
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    df = df[~df.index.duplicated(keep="last")]
    return df


def _parse_owm(data: dict) -> pd.DataFrame:
    records = []
    for item in data.get("list", []):
        dt = pd.to_datetime(item["dt"], unit="s").normalize()
        temp = item["main"].get("temp_max", item["main"].get("temp", 30.0))
        rain = item.get("rain", {}).get("3h", 0.0) or 0.0
        records.append({"date": dt, "temp_max": temp, "rain_mm": rain})
    if not records:
        return pd.DataFrame()
    wdf = pd.DataFrame(records).groupby("date").agg({"temp_max": "max", "rain_mm": "sum"})
    wdf.index = pd.to_datetime(wdf.index)
    return wdf


def _fetch_owm(lat: float, lon: float) -> pd.DataFrame:
    if not OWM_API_KEY:
        return pd.DataFrame()
    url = (
        f"https://api.openweathermap.org/data/2.5/forecast"
        f"?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric"
    )
    with httpx.Client(timeout=8.0) as client:
        res = client.get(url)
        res.raise_for_status()
        return _parse_owm(res.json())


def _fetch_open_meteo(lat: float, lon: float, start, end) -> pd.DataFrame:
    start_d = pd.Timestamp(start).date()
    end_d = pd.Timestamp(end).date()
    today = pd.Timestamp.now().normalize().date()
    frames = []

    def _daily_to_df(payload):
        daily = payload.get("daily") or {}
        if not daily.get("time"):
            return pd.DataFrame()
        idx = pd.to_datetime(daily["time"])
        return pd.DataFrame(
            {
                "temp_max": daily.get("temperature_2m_max", [np.nan] * len(idx)),
                "rain_mm": daily.get("precipitation_sum", [0.0] * len(idx)),
            },
            index=idx,
        )

    with httpx.Client(timeout=12.0) as client:
        if start_d < today:
            arch_end = min(end_d, today - timedelta(days=1))
            url = (
                "https://archive-api.open-meteo.com/v1/archive"
                f"?latitude={lat}&longitude={lon}"
                f"&start_date={start_d}&end_date={arch_end}"
                "&daily=temperature_2m_max,precipitation_sum&timezone=Asia%2FKolkata"
            )
            res = client.get(url)
            res.raise_for_status()
            frames.append(_daily_to_df(res.json()))
        if end_d >= today:
            url = (
                "https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lon}"
                "&daily=temperature_2m_max,precipitation_sum"
                "&forecast_days=16&timezone=Asia%2FKolkata"
            )
            res = client.get(url)
            res.raise_for_status()
            frames.append(_daily_to_df(res.json()))

    frames = [f for f in frames if f is not None and not f.empty]
    if not frames:
        return pd.DataFrame()
    out = pd.concat(frames).sort_index()
    out = out[~out.index.duplicated(keep="last")]
    return out


def get_weather_for_range(district: str, start, end) -> pd.DataFrame:
    """
    Daily temp_max / rain_mm for [start, end], cached in DuckDB + memory.
    OpenWeather 5-day forecast is the near-term overlay (not fetched per request
    when the cache is warm). Open-Meteo fills history and days OWM does not cover
    so SARIMAX actually sees variation in the training window.
    """
    ensure_aux_tables()
    start = pd.Timestamp(start).normalize()
    end = pd.Timestamp(end).normalize()
    dates = pd.date_range(start, end, freq="D")
    lat, lon = _coords(district)
    cache_key = f"{district}_{lat}_{lon}"

    cached_mem = _weather_mem.get(cache_key)
    if cached_mem:
        cached_time, cached_df = cached_mem
        if datetime.now() - cached_time < timedelta(hours=WEATHER_TTL_HOURS):
            if cached_df.index.min() <= start and cached_df.index.max() >= end:
                return cached_df.reindex(dates).ffill().bfill()

    db_df = _weather_from_db(district, start, end)
    db_fresh = False
    if not db_df.empty and len(db_df) >= max(1, int(0.8 * len(dates))):
        fetched = pd.to_datetime(db_df["fetched_at"], errors="coerce")
        latest = fetched.max()
        if pd.notna(latest):
            latest_ts = pd.Timestamp(latest).to_pydatetime()
            if latest_ts.tzinfo is not None:
                latest_ts = latest_ts.replace(tzinfo=None)
            if datetime.now() - latest_ts < timedelta(hours=WEATHER_TTL_HOURS):
                db_fresh = True

    combined = db_df[["temp_max", "rain_mm"]].copy() if not db_df.empty else pd.DataFrame(columns=["temp_max", "rain_mm"])

    need_network = (not db_fresh) or combined.empty or combined.isna().all().all()
    if need_network:
        try:
            om = _fetch_open_meteo(lat, lon, start, end)
            if not om.empty:
                _upsert_weather(district, om, "open-meteo")
                combined = om.combine_first(combined) if not combined.empty else om
        except Exception as e:
            logger.warning(f"Open-Meteo weather failed for {district}: {e}")
        try:
            owm = _fetch_owm(lat, lon)
            if not owm.empty:
                _upsert_weather(district, owm, "openweather")
                # OWM overlay wins on overlapping dates
                combined = owm.combine_first(combined) if not combined.empty else owm
        except Exception as e:
            logger.warning(f"OpenWeather fetch failed for {district}: {e}")

    clima = _climatology_frame(dates)
    if combined.empty:
        out = clima
    else:
        combined.index = pd.to_datetime(combined.index).normalize()
        combined = combined[~combined.index.duplicated(keep="last")]
        out = combined.reindex(dates)
        out["temp_max"] = out["temp_max"].fillna(clima["temp_max"])
        out["rain_mm"] = out["rain_mm"].fillna(clima["rain_mm"])

    out = out[["temp_max", "rain_mm"]].astype(float)
    _weather_mem[cache_key] = (datetime.now(), out.copy())
    return out


def get_weather_forecast(district: str) -> pd.DataFrame:
    """Public helper used by the LLM layer — future window, cached."""
    today = pd.Timestamp.now().normalize()
    try:
        return get_weather_for_range(district, today, today + pd.Timedelta(days=FORECAST_HORIZON + 10))
    except Exception as e:
        logger.warning(f"Failed to fetch weather for {district}: {e}")
        return pd.DataFrame()


def _exog_frame(index: pd.DatetimeIndex, weather: pd.DataFrame) -> pd.DataFrame:
    clima = _climatology_frame(index)
    if weather is None or weather.empty:
        w = clima
    else:
        w = weather.copy()
        w.index = pd.to_datetime(w.index).normalize()
        w = w.reindex(index)
        w["temp_max"] = w["temp_max"].fillna(clima["temp_max"])
        w["rain_mm"] = w["rain_mm"].fillna(clima["rain_mm"])
    w = w[["temp_max", "rain_mm"]].astype(float)
    w.index = index
    return w


# ---------------------------------------------------------------------------
# Per crop/district order selection (cached)
# ---------------------------------------------------------------------------

def _load_cached_order(commodity: str, district: str, training_n: int):
    ensure_aux_tables()
    key = _order_key(commodity, district)
    rows = query_dicts("SELECT * FROM model_orders WHERE series_key = ?", [key])
    if not rows:
        return None
    row = rows[0]
    try:
        selected_at = row["selected_at"]
        if isinstance(selected_at, str):
            selected_at = datetime.fromisoformat(selected_at)
        age = datetime.now() - selected_at
        prev_n = int(row.get("training_n") or 0)
        n_changed = prev_n > 0 and abs(training_n - prev_n) / max(prev_n, 1) > 0.2
        if age > timedelta(days=ORDER_TTL_DAYS) or n_changed:
            return None
        order = (int(row["order_p"]), int(row["order_d"]), int(row["order_q"]))
        seasonal = (
            int(row["seasonal_p"]),
            int(row["seasonal_d"]),
            int(row["seasonal_q"]),
            int(row["seasonal_s"]),
        )
        return order, seasonal
    except Exception as e:
        logger.warning(f"Could not reuse cached order for {key}: {e}")
        return None


def _store_order(commodity: str, district: str, order, seasonal, aic, training_n: int):
    ensure_aux_tables()
    key = _order_key(commodity, district)
    execute(
        """
        INSERT INTO model_orders (
            series_key, commodity, district,
            order_p, order_d, order_q,
            seasonal_p, seasonal_d, seasonal_q, seasonal_s,
            aic, training_n, selected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (series_key) DO UPDATE SET
            order_p = EXCLUDED.order_p,
            order_d = EXCLUDED.order_d,
            order_q = EXCLUDED.order_q,
            seasonal_p = EXCLUDED.seasonal_p,
            seasonal_d = EXCLUDED.seasonal_d,
            seasonal_q = EXCLUDED.seasonal_q,
            seasonal_s = EXCLUDED.seasonal_s,
            aic = EXCLUDED.aic,
            training_n = EXCLUDED.training_n,
            selected_at = EXCLUDED.selected_at
        """,
        [
            key, commodity, district,
            int(order[0]), int(order[1]), int(order[2]),
            int(seasonal[0]), int(seasonal[1]), int(seasonal[2]), int(seasonal[3] if len(seasonal) > 3 else 7),
            float(aic) if aic is not None and np.isfinite(aic) else None,
            int(training_n),
            datetime.now().isoformat(),
        ],
    )


def _grid_search_order(y, exog):
    """Small p,d,q grid with weekly seasonal term — used if auto_arima fails."""
    best_aic = np.inf
    best = (DEFAULT_ORDER, DEFAULT_SEASONAL)
    seasonal = DEFAULT_SEASONAL if len(y) >= MIN_TRAIN_FOR_SEASONAL else (0, 0, 0, 0)
    for p in range(0, 3):
        for d in range(0, 2):
            for q in range(0, 3):
                try:
                    model = SARIMAX(
                        endog=y,
                        exog=exog,
                        order=(p, d, q),
                        seasonal_order=seasonal,
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                    )
                    fitted = model.fit(disp=False, maxiter=40)
                    if np.isfinite(fitted.aic) and fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best = ((p, d, q), seasonal)
                except Exception:
                    continue
    return best


def select_order(commodity: str, district: str, y: pd.Series, exog: pd.DataFrame):
    cached = _load_cached_order(commodity, district, len(y))
    if cached:
        return cached[0], cached[1], False

    seasonal_ok = len(y) >= MIN_TRAIN_FOR_SEASONAL
    order, seasonal = DEFAULT_ORDER, DEFAULT_SEASONAL if seasonal_ok else (0, 0, 0, 0)
    aic = None

    if len(y) >= 30:
        try:
            auto = pmdarima.auto_arima(
                y,
                X=exog,
                seasonal=seasonal_ok,
                m=7 if seasonal_ok else 1,
                start_p=0,
                start_q=0,
                max_p=3,
                max_q=3,
                max_d=1,
                start_P=0,
                start_Q=0,
                max_P=1,
                max_Q=1,
                max_D=1,
                stepwise=True,
                information_criterion="aic",
                suppress_warnings=True,
                error_action="ignore",
                trace=False,
            )
            order = tuple(int(x) for x in auto.order)
            seasonal = tuple(int(x) for x in auto.seasonal_order)
            if seasonal_ok and seasonal == (0, 0, 0, 0):
                seasonal = DEFAULT_SEASONAL
            elif seasonal_ok and (len(seasonal) < 4 or seasonal[3] == 0):
                seasonal = (int(seasonal[0]) if len(seasonal) > 0 else 1,
                            int(seasonal[1]) if len(seasonal) > 1 else 0,
                            int(seasonal[2]) if len(seasonal) > 2 else 1,
                            7)
            aic = float(auto.aic())
        except Exception as e:
            logger.warning(f"auto_arima failed for {commodity}/{district}: {e}")
            try:
                order, seasonal = _grid_search_order(y, exog)
            except Exception as e2:
                logger.warning(f"grid search failed for {commodity}/{district}: {e2}")
                order, seasonal = DEFAULT_ORDER, DEFAULT_SEASONAL if seasonal_ok else (0, 0, 0, 0)

    _store_order(commodity, district, order, seasonal, aic, len(y))
    return order, seasonal, True


def _fit_sarimax(y, exog, order, seasonal):
    kwargs = dict(
        endog=y,
        exog=exog,
        order=order,
        seasonal_order=seasonal,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    try:
        return SARIMAX(**kwargs).fit(disp=False, maxiter=150)
    except Exception as e:
        logger.warning(f"SARIMAX({order}){seasonal} failed ({e}); falling back")
        fallback = SARIMAX(
            endog=y,
            exog=exog,
            order=DEFAULT_ORDER,
            seasonal_order=DEFAULT_SEASONAL if len(y) >= MIN_TRAIN_FOR_SEASONAL else (0, 0, 0, 0),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        return fallback.fit(disp=False, maxiter=150)


# ---------------------------------------------------------------------------
# Walk-forward backtest (holdout only — no in-sample scoring)
# ---------------------------------------------------------------------------

def walk_forward_backtest(y: pd.Series, exog: pd.DataFrame, order, seasonal, holdout_days: int = BACKTEST_DAYS):
    """
    Train on all observations up to (last date − holdout_days), forecast the
    held-out window, score against actuals the model never saw.
    """
    result = {
        "rmse": None,
        "mae": None,
        "mape": None,
        "smape": None,
        "r2_score": None,
        "accuracy_pct": None,
        "series": [],
        "ok": False,
        "reason": None,
    }
    if len(y) < holdout_days + 16:
        result["reason"] = "Limited historical data"
        return result

    train_y = y.iloc[:-holdout_days]
    test_y = y.iloc[-holdout_days:]
    train_x = exog.iloc[:-holdout_days]
    test_x = exog.iloc[-holdout_days:]

    try:
        fitted = _fit_sarimax(train_y, train_x, order, seasonal)
        pred = fitted.get_forecast(steps=holdout_days, exog=test_x).predicted_mean
        pred = pd.Series(np.asarray(pred, dtype=float), index=test_y.index)
        actual = test_y.astype(float)

        mape = mean_absolute_percentage_error(actual, pred)
        result.update({
            "rmse": float(np.sqrt(mean_squared_error(actual, pred))),
            "mae": float(mean_absolute_error(actual, pred)),
            "mape": float(mape),
            "smape": float(symmetric_mean_absolute_percentage_error(actual, pred)),
            "r2_score": float(r2_score(actual, pred)),
            "accuracy_pct": float(max(0.0, min(100.0, 100.0 - mape))),
            "ok": True,
            "series": [
                {
                    "date": d.strftime("%Y-%m-%d"),
                    "actual": round(float(actual.iloc[i]), 2),
                    "predicted": round(float(pred.iloc[i]), 2),
                }
                for i, d in enumerate(test_y.index)
            ],
        })
    except Exception as e:
        logger.warning(f"Walk-forward backtest failed: {e}")
        result["reason"] = "Limited historical data"
    return result


def _quality_gate(y: pd.Series, backtest: dict, training_n: int):
    low = False
    reason = None
    mape = backtest.get("mape")
    recent = y.iloc[-21:] if len(y) >= 21 else y
    cv = float(recent.std() / recent.mean()) if float(recent.mean()) else 0.0

    if training_n < 45 or not backtest.get("ok"):
        low = True
        reason = "Limited historical data"
    elif mape is not None and mape > MAPE_GATE:
        low = True
        reason = "Highly volatile recent prices" if cv >= 0.08 else "Limited historical data"
    elif cv >= 0.18:
        low = True
        reason = "Highly volatile recent prices"

    return low, reason


def _ci_confidence_pct(mean, conf_int, display_steps: int):
    n = min(int(display_steps), len(mean), len(conf_int))
    if n <= 0:
        return None
    m = np.asarray(mean)[:n]
    lo = np.asarray(conf_int.iloc[:n, 0] if hasattr(conf_int, "iloc") else conf_int[:n, 0])
    hi = np.asarray(conf_int.iloc[:n, 1] if hasattr(conf_int, "iloc") else conf_int[:n, 1])
    widths = (hi - lo) / np.clip(np.abs(m), 1e-6, None) * 100.0
    return float(max(0.0, min(100.0, 100.0 - np.mean(widths))))


def _load_prices(commodity: str, district: str, market: str) -> pd.DataFrame:
    sql_prices = """
        SELECT price_date, modal_price, source
        FROM prices
        WHERE commodity = ? AND district = ? AND market = ?
        ORDER BY price_date
    """
    df = query_df(sql_prices, [commodity, district, market])
    df.columns = [str(col).strip().lower() for col in df.columns]

    if df.empty or len(df) < 14:
        df = query_df(
            """
            SELECT price_date, modal_price, source
            FROM prices
            WHERE commodity = ? AND district = ?
            ORDER BY price_date
            """,
            [commodity, district],
        )
        df.columns = [str(col).strip().lower() for col in df.columns]

    if df.empty or len(df) < 14:
        df = query_df(
            """
            SELECT price_date, modal_price, source
            FROM prices
            WHERE commodity = ?
            ORDER BY price_date
            """,
            [commodity],
        )
        df.columns = [str(col).strip().lower() for col in df.columns]

    if df.empty:
        raise ValueError(f"No price data found for {commodity} in {district} ({market})")

    if "source" in df.columns and "enam" in df["source"].values:
        df = df[df["source"] == "enam"].copy()

    df["price_date"] = pd.to_datetime(df["price_date"])
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df = df.set_index("price_date").sort_index()
    df = df[~df.index.duplicated(keep="last")]
    df = df[["modal_price"]].resample("D").mean()
    df["modal_price"] = df["modal_price"].interpolate(limit=10).ffill(limit=10)
    df = df.dropna(subset=["modal_price"])
    if not df.empty:
        full = pd.date_range(df.index.min(), df.index.max(), freq="D")
        df = df.reindex(full)
        df["modal_price"] = df["modal_price"].interpolate(limit=10).ffill().bfill()
        df.index.freq = "D"
    return df


def generate_forecast(commodity: str, district: str, market: str, horizon: int = 14) -> dict:
    """SARIMAX + weather exog + cached order selection + walk-forward gate."""
    ensure_aux_tables()
    horizon = int(horizon or FORECAST_HORIZON)
    display_horizon = horizon

    df = _load_prices(commodity, district, market)
    if len(df) < 14:
        last_date = df.index[-1] if not df.empty else pd.Timestamp.now()
        base_p = float(df["modal_price"].iloc[-1]) if not df.empty else 2000.0
        extra_dates = pd.date_range(end=last_date, periods=14, freq="D")
        df = pd.DataFrame({"modal_price": [base_p] * 14}, index=extra_dates)

    y = df["modal_price"].astype(float)
    y.index = pd.DatetimeIndex(pd.to_datetime(y.index).normalize(), freq="D")
    y = y.asfreq("D").interpolate(limit=10).ffill().bfill()
    current_price = float(y.iloc[-1])

    weather = get_weather_for_range(
        district,
        y.index[0],
        y.index[-1] + pd.Timedelta(days=max(horizon, FORECAST_HORIZON) + 2),
    )
    hist_exog = _exog_frame(y.index, weather)

    order, seasonal, freshly_selected = select_order(commodity, district, y, hist_exog)

    # Walk-forward MUST run before the production fit is served.
    backtest = walk_forward_backtest(y, hist_exog, order, seasonal, BACKTEST_DAYS)
    low_confidence, low_reason = _quality_gate(y, backtest, len(y))

    fitted_model = _fit_sarimax(y, hist_exog, order, seasonal)
    used_order = tuple(int(x) for x in fitted_model.model.order)
    used_seasonal = tuple(int(x) for x in fitted_model.model.seasonal_order)

    last_obs = y.index[-1]
    short_steps = min(horizon, FORECAST_HORIZON)
    future_dates = pd.date_range(start=last_obs + pd.Timedelta(days=1), periods=short_steps, freq="D")
    future_exog = _exog_frame(future_dates, weather)

    try:
        forecast_res = fitted_model.get_forecast(steps=short_steps, exog=future_exog)
    except Exception:
        forecast_res = fitted_model.get_forecast(steps=short_steps)

    forecast_mean = forecast_res.predicted_mean
    conf_int = forecast_res.conf_int(alpha=0.10)

    forecast_list = []
    for i, date in enumerate(future_dates):
        price = float(forecast_mean.iloc[i])
        lo = float(conf_int.iloc[i, 0])
        hi = float(conf_int.iloc[i, 1])
        forecast_list.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": round(price, 2),
            "ci_lower": round(lo, 2),
            "ci_upper": round(hi, 2),
            "lower": round(lo, 2),
            "upper": round(hi, 2),
            "model_segment": "short_horizon",
        })

    if horizon > 14:
        try:
            df_weekly = df[["modal_price"]].resample("W").mean().ffill().dropna()
            seasonal_model = SARIMAX(
                endog=df_weekly["modal_price"],
                order=(1, 1, 1),
                seasonal_order=(1, 1, 1, 52) if len(df_weekly) > 104 else (1, 1, 0, 52),
                enforce_stationarity=False,
                enforce_invertibility=False,
            ).fit(disp=False)
            remaining_days = horizon - 14
            weeks_ahead = int(np.ceil(remaining_days / 7.0)) + 1
            s_forecast = seasonal_model.get_forecast(steps=weeks_ahead)
            s_mean = s_forecast.predicted_mean
            s_ci = s_forecast.conf_int(alpha=0.10)
            anchor_price = forecast_list[-1]["price"]
            future_seasonal_dates = pd.date_range(
                start=future_dates[-1] + pd.Timedelta(days=1),
                periods=remaining_days,
                freq="D",
            )
            s_df = pd.DataFrame(
                {"mean": s_mean.values, "lower": s_ci.iloc[:, 0].values, "upper": s_ci.iloc[:, 1].values},
                index=s_mean.index,
            )
            s_df = s_df.reindex(s_df.index.union(future_seasonal_dates)).sort_index().interpolate(method="linear")
            shift = 0.0
            first_valid_date = future_seasonal_dates[0]
            if first_valid_date in s_df.index and not np.isnan(s_df.loc[first_valid_date, "mean"]):
                shift = anchor_price - s_df.loc[first_valid_date, "mean"]
            for d in future_seasonal_dates:
                if d in s_df.index and not np.isnan(s_df.loc[d, "mean"]):
                    p, l, u = s_df.loc[d, "mean"] + shift, s_df.loc[d, "lower"] + shift, s_df.loc[d, "upper"] + shift
                else:
                    p, l, u = s_mean.iloc[-1] + shift, s_ci.iloc[-1, 0] + shift, s_ci.iloc[-1, 1] + shift
                forecast_list.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "price": round(float(p), 2),
                    "ci_lower": round(float(l), 2),
                    "ci_upper": round(float(u), 2),
                    "lower": round(float(l), 2),
                    "upper": round(float(u), 2),
                    "model_segment": "seasonal_projection",
                })
        except Exception as e:
            logger.warning(f"Seasonal model failed for horizon > 14: {e}")
            anchor = forecast_list[-1]
            future_seasonal_dates = pd.date_range(
                start=future_dates[-1] + pd.Timedelta(days=1),
                periods=horizon - 14,
                freq="D",
            )
            for i, d in enumerate(future_seasonal_dates, start=1):
                widen = 1 + 0.01 * i
                forecast_list.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "price": anchor["price"],
                    "ci_lower": round(anchor["ci_lower"] * (2 - widen) if anchor["ci_lower"] > 0 else anchor["ci_lower"], 2),
                    "ci_upper": round(anchor["ci_upper"] * widen, 2),
                    "lower": round(anchor["ci_lower"], 2),
                    "upper": round(anchor["ci_upper"] * widen, 2),
                    "model_segment": "seasonal_projection",
                })

    displayed = forecast_list[:display_horizon]
    disp_mean = np.array([p["price"] for p in displayed], dtype=float)
    disp_ci = pd.DataFrame({
        "l": [p["ci_lower"] for p in displayed],
        "u": [p["ci_upper"] for p in displayed],
    })
    ci_pct = _ci_confidence_pct(disp_mean, disp_ci, display_horizon)

    try:
        lb_test = acorr_ljungbox(fitted_model.resid, lags=[10], return_df=True)
        ljung = float(lb_test["lb_pvalue"].iloc[0])
    except Exception:
        ljung = None

    prices_arr = np.array([p["price"] for p in displayed], dtype=float)
    peak_idx = int(np.argmax(prices_arr)) if len(prices_arr) else 0
    dip_idx = int(np.argmin(prices_arr)) if len(prices_arr) else 0

    metrics = {
        "arima_order": str(used_order),
        "seasonal_order": str(used_seasonal),
        "order": list(used_order),
        "seasonal_order_tuple": list(used_seasonal),
        "aic": float(fitted_model.aic) if fitted_model.aic is not None else None,
        "bic": float(fitted_model.bic) if fitted_model.bic is not None else None,
        "hqic": float(fitted_model.hqic) if getattr(fitted_model, "hqic", None) is not None else None,
        "log_likelihood": float(fitted_model.llf) if getattr(fitted_model, "llf", None) is not None else None,
        "rmse": backtest.get("rmse"),
        "mae": backtest.get("mae"),
        "mape": backtest.get("mape"),
        "smape": backtest.get("smape"),
        "r2_score": None if backtest.get("r2_score") is None else round(float(backtest["r2_score"]), 4),
        "accuracy_pct": None if backtest.get("accuracy_pct") is None else round(float(backtest["accuracy_pct"]), 2),
        "confidence_pct": None if ci_pct is None else round(ci_pct, 2),
        "confidence_interval_pct": None if ci_pct is None else round(ci_pct, 2),
        "ljung_box_pvalue": ljung,
        "training_window_days": len(df),
        "training_date_range": [df.index[0].strftime("%Y-%m-%d"), df.index[-1].strftime("%Y-%m-%d")],
        "backtest_horizon_days": BACKTEST_DAYS,
        "backtest": backtest.get("series") or [],
        "order_freshly_selected": freshly_selected,
        "exog": ["temp_max", "rain_mm"],
        "low_confidence": low_confidence,
        "low_confidence_reason": low_reason,
    }

    history_list = [
        {"date": date.strftime("%Y-%m-%d"), "price": float(row["modal_price"])}
        for date, row in df.iloc[-30:].iterrows()
    ]

    res = {
        "commodity": commodity,
        "district": district,
        "market": market,
        "current_price": round(current_price, 2),
        "history": history_list,
        "forecast": forecast_list,
        "metrics": metrics,
        "low_confidence": low_confidence,
        "low_confidence_reason": low_reason,
        "peak_price": round(float(prices_arr[peak_idx]), 2) if len(prices_arr) else round(current_price, 2),
        "peak_day_offset": int(peak_idx) + 1,
        "peak_date": displayed[peak_idx]["date"] if displayed else None,
        "dip_price": round(float(prices_arr[dip_idx]), 2) if len(prices_arr) else round(current_price, 2),
        "dip_day_offset": int(dip_idx) + 1,
        "dip_date": displayed[dip_idx]["date"] if displayed else None,
        "generated_at": datetime.now().isoformat(),
    }

    try:
        from forecasting.peak_detection import generate_recommendation
        recommendation = generate_recommendation(commodity, district, market, res)
        res["recommendation"] = recommendation
        # Chart callouts must reuse API peak/dip fields, not a second client-side search.
        res["peak_price"] = float(recommendation.get("peak_price", res["peak_price"]))
        res["peak_day_offset"] = int(recommendation.get("peak_day_offset", res["peak_day_offset"]))
        res["dip_price"] = float(recommendation.get("dip_price", res["dip_price"]))
        res["dip_day_offset"] = int(recommendation.get("dip_day_offset", res["dip_day_offset"]))
        if 1 <= res["peak_day_offset"] <= len(displayed):
            res["peak_date"] = displayed[res["peak_day_offset"] - 1]["date"]
        if 1 <= res["dip_day_offset"] <= len(displayed):
            res["dip_date"] = displayed[res["dip_day_offset"] - 1]["date"]
        series_key = _series_key(commodity, district, market, horizon)
        cache_forecast(series_key, commodity, district, market, res, metrics, recommendation)
    except Exception as e:
        logger.warning(f"Failed to auto-cache forecast: {e}")

    return res
