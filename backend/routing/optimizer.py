import math
import logging
import httpx
import pandas as pd
from api.database import query_df
from api.config import TRANSPORT_RATE_PER_KM
from etl.constants import DISTRICT_CENTROIDS, PERISHABILITY_TIERS, MANDIS_MATRIX

logger = logging.getLogger(__name__)

# === Constants ===
MAX_RADIUS_KM = 100  # Only markets within this radius are ranked as candidates
FUEL_COST_PER_KM = 40.0   # ≈ ₹90.5/L at 4.5 kmpl, round-trip
VEHICLE_RENT_PER_KM = 14.0
ROAD_CURVATURE_FACTOR = 1.15  # Haversine → road distance multiplier
FALLBACK_SPEED_KMH = 40.0

# Module-level cache for OSRM routes
_osrm_cache = {}

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on the earth."""
    R = 6371.0  # Earth radius in kilometers

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance

def get_osrm_route(lat1: float, lon1: float, lat2: float, lon2: float) -> dict | None:
    """
    Get driving distance and duration from OSRM public API.
    Uses caching to avoid hitting rate limits.
    """
    cache_key = f"{lat1:.4f},{lon1:.4f}_{lat2:.4f},{lon2:.4f}"
    
    if cache_key in _osrm_cache:
        return _osrm_cache[cache_key]

    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                route = data["routes"][0]
                result = {
                    "distance_km": route["distance"] / 1000.0,
                    "duration_min": route["duration"] / 60.0,
                    "geometry": route["geometry"]
                }
                _osrm_cache[cache_key] = result
                return result
    except Exception as e:
        logger.warning(f"OSRM request failed for {url}: {e}")
    
    return None


def _compute_market_economics(
    lat: float, lon: float,
    mandi: dict, commodity: str, quantity_qtl: float
) -> dict | None:
    """
    Compute distance, cost breakdown, and net profit for a single mandi.
    Returns None if no price data is available.
    """
    market_name = mandi["name"]
    district = mandi["district"]
    m_lat = mandi["lat"]
    m_lon = mandi["lon"]
    cess_pct = mandi["cess_pct"]

    # Query latest price for this specific mandi
    query = """
        SELECT modal_price 
        FROM prices 
        WHERE commodity = ? AND market = ? AND district = ?
        ORDER BY price_date DESC LIMIT 1
    """
    df = query_df(query, [commodity, market_name, district])
    df.columns = [str(col).strip().lower() for col in df.columns]
    if not df.empty:
        current_rate = float(df.iloc[0]['modal_price'])
    else:
        current_rate = 0.0

    if current_rate == 0.0:
        return None

    # Try OSRM route, fallback to Haversine * road curvature factor
    route = get_osrm_route(lat, lon, m_lat, m_lon)

    if route:
        distance_km = route['distance_km']
        duration_min = route['duration_min']
    else:
        h_dist = haversine(lat, lon, m_lat, m_lon)
        distance_km = round(h_dist * ROAD_CURVATURE_FACTOR, 1)
        duration_min = (distance_km / FALLBACK_SPEED_KMH) * 60

    transit_hours = duration_min / 60.0

    # Cost formula: distance × (fuel + rent)
    diesel_cost = distance_km * FUEL_COST_PER_KM
    freight_base = distance_km * VEHICLE_RENT_PER_KM
    total_transit_cost = distance_km * (FUEL_COST_PER_KM + VEHICLE_RENT_PER_KM)

    gross_revenue = current_rate * quantity_qtl
    mandi_fee = gross_revenue * cess_pct

    # Spoilage logic
    spoilage_loss = 0.0
    if commodity in PERISHABILITY_TIERS:
        tier_info = PERISHABILITY_TIERS[commodity]
        daily_loss_pct = tier_info.get('daily_loss_pct', 0) if isinstance(tier_info, dict) else tier_info.daily_loss_pct

        loss_pct = (daily_loss_pct * transit_hours / 24.0)
        spoilage_loss = (loss_pct / 100.0) * gross_revenue

    net_profit = gross_revenue - total_transit_cost - mandi_fee - spoilage_loss

    return {
        "name": market_name,
        "district": district,
        "lat": m_lat,
        "lon": m_lon,
        "distance_km": round(distance_km, 2),
        "driving_duration_min": round(duration_min),
        "current_rate": current_rate,
        "raw_rate": current_rate,
        "gross_revenue": round(gross_revenue, 2),
        "transit_cost": round(total_transit_cost, 2),
        "diesel_cost": round(diesel_cost, 2),
        "freight_base": round(freight_base, 2),
        "mandi_fee": round(mandi_fee, 2),
        "cess_pct": cess_pct,
        "spoilage_loss": round(spoilage_loss, 2),
        "net_profit": round(net_profit, 2),
        "geometry": route.get('geometry') if route else None,
    }


def get_best_markets(lat: float, lon: float, commodity: str, quantity_qtl: float) -> dict:
    """
    Find top 3 most profitable markets for a given commodity, quantity, and origin.
    
    IMPORTANT: Only markets within MAX_RADIUS_KM are ranked as candidates.
    If no markets exist within the radius, the nearest out-of-radius market
    is returned as a reference (clearly flagged, never labeled "BEST").
    """
    all_evaluated = []

    for mandi in MANDIS_MATRIX:
        result = _compute_market_economics(lat, lon, mandi, commodity, quantity_qtl)
        if result is not None:
            all_evaluated.append(result)

    # --- Radius enforcement: split into within-radius and out-of-radius ---
    within_radius = [m for m in all_evaluated if m["distance_km"] <= MAX_RADIUS_KM]
    out_of_radius = [m for m in all_evaluated if m["distance_km"] > MAX_RADIUS_KM]

    # Sort within-radius candidates by net profit (highest first)
    within_radius.sort(key=lambda x: x['net_profit'], reverse=True)
    top_3 = within_radius[:3]

    # Tag the best market
    if top_3:
        top_3[0]['is_top'] = True
        top_recommendation = top_3[0]['name']
        message = f"Top {len(top_3)} markets within {MAX_RADIUS_KM} km ranked by net profit."
    else:
        top_recommendation = None
        message = f"No APMC markets found within {MAX_RADIUS_KM} km. Showing nearest available market for reference only."

    # Build the nearest out-of-radius reference (if any)
    nearest_oor = None
    if out_of_radius:
        out_of_radius.sort(key=lambda x: x['distance_km'])
        nearest_oor = out_of_radius[0].copy()
        nearest_oor['out_of_radius'] = True
        nearest_oor['is_top'] = False

    response = {
        "origin": {"lat": lat, "lon": lon},
        "commodity": commodity,
        "quantity_qtl": quantity_qtl,
        "radius_km": MAX_RADIUS_KM,
        "markets": top_3,
        "top_recommendation": top_recommendation,
        "message": message,
    }

    if nearest_oor:
        response["nearest_out_of_radius"] = nearest_oor

    return response
