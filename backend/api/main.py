"""
KrushakSetu — FastAPI Backend Application
AI-Driven Crop Price Forecasting & Market Routing
"""
import sys
import json
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add backend dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.config import CORS_ORIGINS, DATABASE_PATH
from api import database as db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("KrushakSetu API starting — connecting to DuckDB")
    db.get_connection()
    yield
    logger.info("KrushakSetu API shutting down")
    db.close_connection()


# --- App ---
app = FastAPI(
    title="KrushakSetu API",
    description="AI-Driven Crop Price Forecasting & Market Routing",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---
class ForecastRequest(BaseModel):
    commodity: str
    district: str
    market: str

class RoutingRequest(BaseModel):
    lat: float
    lon: float
    commodity: str
    quantity: float = 50.0

class ExplainRequest(BaseModel):
    recommendation_json: dict
    lang: str = "en"

class AlertSubscribeRequest(BaseModel):
    phone: str
    state: str = "Maharashtra"
    district: str
    commodity: str
    lang: str = "en"


# === ENDPOINTS ===

@app.get("/api/health/")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# --- Filters (for cascading selects) ---
@app.get("/api/filters/")
def get_filters():
    """Get available states, districts, commodities for cascading selects."""
    try:
        states = db.query_dicts("SELECT DISTINCT state FROM prices ORDER BY state")
        districts = db.query_dicts(
            "SELECT DISTINCT state, district FROM prices ORDER BY state, district"
        )
        commodities = db.query_dicts(
            "SELECT DISTINCT commodity FROM prices ORDER BY commodity"
        )
        markets = db.query_dicts(
            "SELECT DISTINCT district, market FROM prices ORDER BY district, market"
        )
        return {
            "states": [r["state"] for r in states],
            "districts": districts,
            "commodities": [r["commodity"] for r in commodities],
            "markets": markets,
        }
    except Exception as e:
        logger.error(f"Error fetching filters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- History ---
@app.get("/api/history")
def get_history(
    state: str = Query("Maharashtra"),
    district: str = Query(None),
    market: str = Query(None),
    commodity: str = Query(None),
    days: int = Query(30),
):
    """Get historical price series from DuckDB."""
    try:
        conditions = ["state = ?"]
        params = [state]

        if district:
            conditions.append("district = ?")
            params.append(district)
        if market:
            conditions.append("market = ?")
            params.append(market)
        if commodity:
            conditions.append("commodity = ?")
            params.append(commodity)

        where = " AND ".join(conditions)
        sql = f"""
            SELECT price_date, modal_price, min_price, max_price,
                   commodity, district, market, source
            FROM prices
            WHERE {where}
            ORDER BY price_date DESC
            LIMIT ?
        """
        params.append(days * 5)  # allow for multiple markets/commodities per day

        rows = db.query_dicts(sql, params)

        # Format dates
        for row in rows:
            if row.get("price_date"):
                row["price_date"] = str(row["price_date"])[:10]

        return {"data": rows, "count": len(rows)}
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Forecast ---
@app.post("/api/forecast")
def run_forecast(req: ForecastRequest):
    """Generate or retrieve cached SARIMAX forecast."""
    try:
        from forecasting.engine import generate_forecast, get_cached_forecast

        # Check cache first
        cached = get_cached_forecast(req.commodity, req.district, req.market)
        if cached:
            return cached

        # Generate fresh forecast
        result = generate_forecast(req.commodity, req.district, req.market)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Forecast error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


# --- Recommendation ---
@app.get("/api/recommendation")
def get_recommendation(
    commodity: str = Query(...),
    district: str = Query(...),
    market: str = Query(...),
):
    """Get hold/sell recommendation for a commodity/market pair."""
    try:
        from forecasting.engine import generate_forecast, get_cached_forecast
        from forecasting.peak_detection import generate_recommendation

        # Get forecast (cached or fresh)
        forecast_data = get_cached_forecast(commodity, district, market)
        if not forecast_data:
            forecast_data = generate_forecast(commodity, district, market)

        # Generate recommendation from forecast
        recommendation = generate_recommendation(
            commodity, district, market, forecast_data
        )
        return recommendation
    except Exception as e:
        logger.error(f"Recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Routing ---
@app.post("/api/routing/best-market")
def best_market(req: RoutingRequest):
    """Find best markets by net profit within 100km."""
    try:
        from routing.optimizer import get_best_markets

        result = get_best_markets(req.lat, req.lon, req.commodity, req.quantity)
        return result
    except Exception as e:
        logger.error(f"Routing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- LLM Explain ---
@app.post("/api/explain")
def explain(req: ExplainRequest):
    """Generate bilingual LLM explanation of a recommendation."""
    try:
        from llm.reasoning import generate_explanation

        explanation = generate_explanation(req.recommendation_json, req.lang)
        return {"explanation": explanation, "lang": req.lang}
    except Exception as e:
        logger.error(f"Explain error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Alerts ---
@app.post("/api/alerts/subscribe")
def subscribe_alerts(req: AlertSubscribeRequest):
    """Subscribe a phone number for WhatsApp price alerts."""
    try:
        from alerts.twilio_alerts import subscribe

        result = subscribe(req.phone, req.state, req.district, req.commodity, req.lang)
        return result
    except Exception as e:
        logger.error(f"Subscribe error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/check")
def check_alerts():
    """Manually trigger alert checking (for demo purposes)."""
    try:
        from alerts.twilio_alerts import check_and_send_alerts

        results = check_and_send_alerts()
        return {"alerts_sent": len(results), "details": results}
    except Exception as e:
        logger.error(f"Alert check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- ETL Report ---
@app.get("/api/etl-report")
def etl_report():
    """Return the data-quality summary from the last ETL run."""
    try:
        report_path = Path(DATABASE_PATH).parent / "etl_report.json"
        if not report_path.exists():
            raise HTTPException(status_code=404, detail="ETL report not found. Run the ETL pipeline first.")
        with open(str(report_path)) as f:
            return json.load(f)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ETL report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Main ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
