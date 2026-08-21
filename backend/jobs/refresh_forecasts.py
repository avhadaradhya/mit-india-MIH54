"""
KrushakSetu — Batch Forecast Refresh Job
Pre-computes SARIMAX forecasts for all active (commodity, district, market) series.
Run: python -m jobs.refresh_forecasts
"""
import sys
import time
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api import database as db
from forecasting.engine import generate_forecast
from forecasting.peak_detection import generate_recommendation

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def get_active_series(limit: int = 50) -> list[dict]:
    """
    Get the most-traded (commodity, district, market) combinations.
    Prioritizes series with recent eNAM data.
    """
    sql = """
        SELECT commodity, district, market, 
               COUNT(*) as row_count,
               MAX(price_date) as latest_date
        FROM prices
        WHERE source = 'enam'
        GROUP BY commodity, district, market
        HAVING COUNT(*) >= 30
        ORDER BY row_count DESC
        LIMIT ?
    """
    return db.query_dicts(sql, [limit])


def main():
    start = time.time()
    logger.info("=" * 60)
    logger.info("KrushakSetu Forecast Refresh — Starting")
    logger.info("=" * 60)

    series_list = get_active_series(limit=30)
    logger.info(f"Found {len(series_list)} active series to forecast")

    success = 0
    errors = 0

    for i, series in enumerate(series_list, 1):
        commodity = series["commodity"]
        district = series["district"]
        market = series["market"]
        label = f"{commodity} @ {market} ({district})"

        try:
            logger.info(f"[{i}/{len(series_list)}] Forecasting: {label}")

            # Generate forecast
            forecast_data = generate_forecast(commodity, district, market)

            # Generate recommendation
            recommendation = generate_recommendation(
                commodity, district, market, forecast_data
            )

            logger.info(
                f"  → {recommendation.get('action', '?')} | "
                f"Current: ₹{recommendation.get('current_price', 0)} | "
                f"Peak: ₹{recommendation.get('peak_price', 0)} day {recommendation.get('peak_day_offset', '?')}"
            )
            success += 1

        except Exception as e:
            logger.error(f"  ✗ Failed: {label} — {e}")
            errors += 1

    elapsed = round(time.time() - start, 2)
    logger.info("=" * 60)
    logger.info(f"Forecast Refresh Complete in {elapsed}s — {success} OK, {errors} errors")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
