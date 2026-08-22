"""
KrushakSetu — FastAPI Backend Application
AI-Driven Crop Price Forecasting & Market Routing
"""
import sys
import json
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
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
    conn = db.get_connection()
    # Ensure alert tables exist even if ETL hasn't created them
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alert_subscriptions (
            id INTEGER PRIMARY KEY,
            phone VARCHAR NOT NULL,
            state VARCHAR DEFAULT 'Maharashtra',
            district VARCHAR,
            commodity VARCHAR,
            lang VARCHAR DEFAULT 'en',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            active BOOLEAN DEFAULT TRUE
        )
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS alert_sub_seq START 1")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sent_alerts (
            id INTEGER PRIMARY KEY,
            phone VARCHAR,
            series_key VARCHAR,
            message TEXT,
            status VARCHAR,
            alert_timestamp VARCHAR
        )
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS sent_alert_seq START 1")
    try:
        from forecasting.engine import ensure_aux_tables
        ensure_aux_tables()
    except Exception as e:
        logger.warning(f"Could not ensure forecast aux tables: {e}")
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
    horizon: int = 14

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

        conditions.append("price_date >= ?")
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        params.append(cutoff_date)

        where = " AND ".join(conditions)
        sql = f"""
            SELECT price_date, modal_price, min_price, max_price,
                   commodity, district, market, source
            FROM prices
            WHERE {where}
            ORDER BY price_date DESC
        """
        
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
        cached = get_cached_forecast(req.commodity, req.district, req.market, req.horizon)
        if cached:
            return cached

        # Generate fresh forecast
        result = generate_forecast(req.commodity, req.district, req.market, req.horizon)
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

@app.post("/api/calculate-explain")
def calculate_explain(req: dict):
    """Generate bilingual LLM explanation for calculate tab arbitrage."""
    try:
        from llm.reasoning import generate_arbitrage_explanation
        lang = req.get("lang", "en")
        explanation = generate_arbitrage_explanation(req, lang)
        return {"explanation": explanation, "lang": lang}
    except Exception as e:
        logger.error(f"Calculate Explain error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routing/roadmap")
def get_roadmap(
    crop: str = Query(...),
    location: str = Query(...),
    market: str = Query(""),
    quantity: float = Query(50.0),
    lang: str = Query("en"),
):
    """Return roadmap steps for a given crop and location."""
    try:
        from llm.reasoning import generate_roadmap_expectation
        
        perishable = crop.lower() in ["onion", "tomato", "potato"]
        market_label = market or "nearby APMC"
        
        expectation_text = generate_roadmap_expectation(crop, location, market_label, lang)
        
        storage_text = (
            "Keep the holding window short, monitor spoilage daily, and prioritize faster routes."
            if perishable
            else "Use warehouse storage strategically and target stronger mandi windows instead of immediate distress selling."
        )
        return {
            "perishable": perishable,
            "crop": crop,
            "location": location,
            "market": market_label,
            "quantity": quantity,
            "expectation": expectation_text,
            "steps": [
                {
                    "phase": "Phase 1",
                    "icon": "Sprout",
                    "title": "Soil & Breed Prep",
                    "summary": f"Prepare land in {location} using high-yield {crop} seed varieties.",
                    "details": f"Test soil health, confirm irrigation readiness, and choose input quality based on the expected selling window for {market_label}."
                },
                {
                    "phase": "Phase 2",
                    "icon": "CloudSun",
                    "title": "Sowing & Weather Monitoring",
                    "summary": "Monitor local weather forecasts and adjust irrigation.",
                    "details": f"Track rainfall and temperature shifts around {location}. Use those signals to anticipate arrival pressure and likely mandi price softness."
                },
                {
                    "phase": "Phase 3",
                    "icon": "Warehouse",
                    "title": "Storage Strategy",
                    "summary": "Decide whether to hold in cold storage or sell immediately.",
                    "details": storage_text
                },
                {
                    "phase": "Phase 4",
                    "icon": "TrendingUp",
                    "title": "Peak Market Selling",
                    "summary": "Execute sale at the top recommended mandi.",
                    "details": f"Use KrushakSetu forecasts to time the best dispatch from {location} to {market_label} and maximize net profit on {quantity:.0f} quintals."
                }
            ]
        }
    except Exception as e:
        logger.error(f"Roadmap error: {e}", exc_info=True)
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


@app.post("/api/alerts/simulate")
def simulate_alerts(req: AlertSubscribeRequest):
    """Trigger a simulated demo alert directly (bypasses Twilio)."""
    try:
        from alerts.twilio_alerts import generate_daily_briefing, format_alert_message
        
        briefing_dict = generate_daily_briefing(req.phone, req.commodity, req.district)
        formatted_message = format_alert_message(briefing_dict, req.lang)
        
        return {
            "status": "success",
            "message": "Demo alert simulated successfully.",
            "data": {
                "briefing_dict": briefing_dict,
                "formatted_message": formatted_message
            }
        }
    except Exception as e:
        logger.error(f"Simulate alert error: {e}", exc_info=True)
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

@app.get("/api/roadmap/crop-recommendation")
def get_crop_recommendation(
    district: str = Query(...),
    quantity: float = Query(50.0),
    lang: str = Query("en"),
):
    """Recommend the best crop to plant in a district."""
    try:
        from routing.optimizer import get_best_markets
        from llm.reasoning import generate_crop_switch_reasoning
        
        candidates = ["Onion", "Tomato", "Wheat", "Soyabean"]
        crops_data = []
        
        # We don't have lat/lon in this route easily without geocoding the district. 
        # But we can just use default coords or use get_best_markets with district name.
        # get_best_markets needs lat/lon. We can map district to lat/lon.
        from etl.constants import DISTRICT_CENTROIDS
        
        dist_key = district.lower().replace(' ', '_')
        lat = 19.0
        lon = 74.0
        for k, v in DISTRICT_CENTROIDS.items():
            if dist_key in k.lower():
                lat, lon = v['lat'], v['lon']
                break
                
        for crop in candidates:
            # find best market for crop
            try:
                res = get_best_markets(lat, lon, crop, quantity)
                if not res.get('markets'):
                    continue
                best_market = res['markets'][0]
                crops_data.append({
                    "crop": crop,
                    "net_profit": best_market['net_profit'],
                    "peak_price": best_market['current_rate'] * 1.15, # approximate if not full forecast
                    "market": best_market['name']
                })
            except Exception as e:
                logger.warning(f"Failed to get best market for {crop}: {e}")
                
        if not crops_data:
            raise HTTPException(status_code=404, detail="No market data available for candidates.")
            
        # Select best
        best_crop = max(crops_data, key=lambda x: x['net_profit'])
        
        reasoning = generate_crop_switch_reasoning(district, crops_data, lang)
        
        return {
            "recommended_crop": best_crop['crop'],
            "crops_data": crops_data,
            "reasoning": reasoning
        }
    except Exception as e:
        logger.error(f"Crop recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
