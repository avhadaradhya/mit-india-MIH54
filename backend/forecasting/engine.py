import sys
import json
import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import pmdarima
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.stats.diagnostic import acorr_ljungbox
from sklearn.metrics import mean_absolute_error, mean_squared_error
from api.database import query_df, execute, get_connection, query_dicts
from api.config import FORECAST_HORIZON

logger = logging.getLogger(__name__)

def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    return np.mean(np.abs((y_true - y_pred) / y_true)) * 100

def symmetric_mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    return 100/len(y_true) * np.sum(2 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred)))

def get_cached_forecast(commodity: str, district: str, market: str) -> dict | None:
    """
    Retrieve cached forecast from DuckDB if it exists and was generated in the last 6 hours.
    """
    series_key = f"{commodity}_{district}_{market}".lower().replace(' ', '_')
    sql = """
        SELECT forecast_json, metrics_json, recommendation_json, generated_at
        FROM forecasts
        WHERE series_key = ?
    """
    results = query_dicts(sql, [series_key])
    if not results:
        return None
        
    row = results[0]
    generated_at_str = row['generated_at']
    try:
        if isinstance(generated_at_str, str):
            generated_at = datetime.fromisoformat(generated_at_str)
        else:
            generated_at = generated_at_str
        
        if datetime.now() - generated_at < timedelta(hours=6):
            forecast_data = json.loads(row['forecast_json']) if isinstance(row['forecast_json'], str) else row['forecast_json']
            return forecast_data
    except Exception as e:
        logger.warning(f"Error parsing cached forecast for {series_key}: {e}")
        
    return None

def cache_forecast(series_key: str, commodity: str, district: str, market: str, forecast_data: dict, metrics_data: dict, recommendation_data: dict):
    """
    Upsert forecast data into DuckDB.
    """
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
        json.dumps(forecast_data), json.dumps(metrics_data), json.dumps(recommendation_data)
    ])

def generate_forecast(commodity: str, district: str, market: str) -> dict:
    """
    Generate forecast using SARIMAX with auto_arima for parameter selection.
    """
    # 1. Query DuckDB prices table
    sql_prices = """
        SELECT price_date, modal_price, source
        FROM prices
        WHERE commodity = ? AND district = ? AND market = ?
        ORDER BY price_date
    """
    df = query_df(sql_prices, [commodity, district, market])
    
    if df.empty:
        raise ValueError(f"No price data found for {commodity} in {district} ({market})")
        
    # 2. Filter source='enam' if available
    if 'enam' in df['source'].values:
        df = df[df['source'] == 'enam'].copy()
        
    df['price_date'] = pd.to_datetime(df['price_date'])
    df['modal_price'] = pd.to_numeric(df['modal_price'], errors='coerce')
    df = df.set_index('price_date').sort_index()
    
    # Remove duplicates
    df = df[~df.index.duplicated(keep='last')]
    
    # 3. Resample to daily frequency, forward-fill gaps <= 3 days
    df = df[['modal_price']].resample('D').mean()
    df['modal_price'] = df['modal_price'].ffill(limit=3)
    df = df.dropna(subset=['modal_price'])
    
    if len(df) < 14:
        raise ValueError(f"Insufficient data for forecasting ({len(df)} points)")
        
    # 5. Query seasonal baseline
    sql_seasonal = """
        SELECT month, seasonal_mean, seasonal_std
        FROM seasonal_baseline
        WHERE commodity = ? AND district = ?
    """
    df_seasonal = query_df(sql_seasonal, [commodity, district])
    
    # Compute exogenous feature
    if not df_seasonal.empty:
        # Create exogenous feature mapping
        seasonal_map = dict(zip(df_seasonal['month'], df_seasonal['seasonal_mean']))
        df['month'] = df.index.month
        df['seasonal_baseline_deviation'] = df['modal_price'] - df['month'].map(seasonal_map)
        df['seasonal_baseline_deviation'] = df['seasonal_baseline_deviation'].fillna(0)
        exog = df[['seasonal_baseline_deviation']]
    else:
        df['seasonal_baseline_deviation'] = 0.0
        exog = df[['seasonal_baseline_deviation']]

    y = df['modal_price']
    current_price = y.iloc[-1]
    
    # Default model if too few points
    use_simple_arima = len(df) < 30
    auto_arima_failed = False
    
    arima_order = (1, 1, 0)
    seasonal_order = (0, 0, 0, 0)
    
    if not use_simple_arima:
        # 4. Use auto_arima
        try:
            model_auto = pmdarima.auto_arima(
                y, 
                exogenous=exog,
                seasonal=True, 
                m=7, 
                stepwise=True, 
                information_criterion='aic',
                suppress_warnings=True,
                error_action='ignore'
            )
            arima_order = model_auto.order
            seasonal_order = model_auto.seasonal_order
        except Exception as e:
            logger.warning(f"auto_arima failed: {e}")
            auto_arima_failed = True
            arima_order = (2, 1, 2)
            seasonal_order = (0, 0, 0, 0)
            
    # 6. Fit SARIMAX
    try:
        model = SARIMAX(
            endog=y,
            exog=exog,
            order=arima_order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        fitted_model = model.fit(disp=False)
    except Exception as e:
        logger.warning(f"SARIMAX failed: {e}")
        # fallback to simple without exog
        model = SARIMAX(endog=y, order=(1,1,0), enforce_stationarity=False, enforce_invertibility=False)
        fitted_model = model.fit(disp=False)
        
    # 7. Forecast 14 steps ahead
    future_dates = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=FORECAST_HORIZON, freq='D')
    
    # Prepare future exog
    future_exog = pd.DataFrame(index=future_dates)
    if not df_seasonal.empty:
        future_exog['month'] = future_exog.index.month
        # Use last known deviation logic or simple baseline
        last_dev = df['seasonal_baseline_deviation'].iloc[-1]
        future_exog['seasonal_baseline_deviation'] = last_dev
        f_exog = future_exog[['seasonal_baseline_deviation']]
    else:
        future_exog['seasonal_baseline_deviation'] = 0.0
        f_exog = future_exog[['seasonal_baseline_deviation']]
        
    try:
        forecast_res = fitted_model.get_forecast(steps=FORECAST_HORIZON, exog=f_exog)
    except Exception:
        forecast_res = fitted_model.get_forecast(steps=FORECAST_HORIZON)
        
    forecast_mean = forecast_res.predicted_mean
    conf_int = forecast_res.conf_int(alpha=0.10) # 90% CI
    
    forecast_list = []
    for i, date in enumerate(future_dates):
        forecast_list.append({
            'date': date.strftime('%Y-%m-%d'),
            'price': float(forecast_mean.iloc[i]),
            'ci_lower': float(conf_int.iloc[i, 0]),
            'ci_upper': float(conf_int.iloc[i, 1])
        })
        
    # 8. Walk-forward backtest
    metrics = {
        'arima_order': str(arima_order),
        'seasonal_order': str(seasonal_order),
        'aic': float(fitted_model.aic),
        'bic': float(fitted_model.bic),
        'hqic': float(fitted_model.hqic),
        'log_likelihood': float(fitted_model.llf),
        'rmse': None,
        'mae': None,
        'mape': None,
        'smape': None,
        'ljung_box_pvalue': None,
        'training_window_days': len(df),
        'training_date_range': [df.index[0].strftime('%Y-%m-%d'), df.index[-1].strftime('%Y-%m-%d')],
        'ci_width_day7': float(conf_int.iloc[6, 1] - conf_int.iloc[6, 0]) if FORECAST_HORIZON >= 7 else None,
        'ci_width_day14': float(conf_int.iloc[13, 1] - conf_int.iloc[13, 0]) if FORECAST_HORIZON >= 14 else None
    }
    
    try:
        lb_test = acorr_ljungbox(fitted_model.resid, lags=[10], return_df=True)
        metrics['ljung_box_pvalue'] = float(lb_test['lb_pvalue'].iloc[0])
    except Exception:
        pass
        
    if len(df) > FORECAST_HORIZON + 10: # ensure enough data
        train_y = y.iloc[:-FORECAST_HORIZON]
        test_y = y.iloc[-FORECAST_HORIZON:]
        
        train_exog = exog.iloc[:-FORECAST_HORIZON]
        test_exog = exog.iloc[-FORECAST_HORIZON:]
        
        try:
            bt_model = SARIMAX(
                endog=train_y,
                exog=train_exog,
                order=arima_order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            bt_fit = bt_model.fit(disp=False)
            bt_pred = bt_fit.forecast(steps=FORECAST_HORIZON, exog=test_exog)
            
            metrics['rmse'] = float(np.sqrt(mean_squared_error(test_y, bt_pred)))
            metrics['mae'] = float(mean_absolute_error(test_y, bt_pred))
            metrics['mape'] = float(mean_absolute_percentage_error(test_y, bt_pred))
            metrics['smape'] = float(symmetric_mean_absolute_percentage_error(test_y, bt_pred))
        except Exception as e:
            logger.warning(f"Backtest failed: {e}")
            
    history_list = []
    history_df = df.iloc[-30:]
    for date, row in history_df.iterrows():
        history_list.append({
            'date': date.strftime('%Y-%m-%d'),
            'price': float(row['modal_price'])
        })
        
    # 9. Return dict
    return {
        'commodity': commodity,
        'district': district,
        'market': market,
        'current_price': float(current_price),
        'history': history_list,
        'forecast': forecast_list,
        'metrics': metrics,
        'generated_at': datetime.now().isoformat()
    }
