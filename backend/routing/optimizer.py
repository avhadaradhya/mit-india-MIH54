import math
import logging
import httpx
import pandas as pd
from api.database import query_df
from api.config import TRANSPORT_RATE_PER_KM
from etl.constants import DISTRICT_CENTROIDS, PERISHABILITY_TIERS

logger = logging.getLogger(__name__)

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

def get_best_markets(lat: float, lon: float, commodity: str, quantity_qtl: float) -> dict:
    """
    Find top 5 most profitable markets for a given commodity, quantity, and origin.
    Returns market details, cost breakdown, and net profit.
    """
    query = """
        SELECT market, district, MAX(price_date) as max_date, 
               (SELECT modal_price 
                FROM prices p2 
                WHERE p2.commodity = p.commodity 
                  AND p2.market = p.market 
                ORDER BY price_date DESC LIMIT 1) as current_rate
        FROM prices p
        WHERE commodity = ?
        GROUP BY market, district, commodity
    """
    df = query_df(query, [commodity])
    
    if df is None or df.empty:
        return {
            "origin": {"lat": lat, "lon": lon},
            "commodity": commodity,
            "quantity_qtl": quantity_qtl,
            "markets": [],
            "top_recommendation": None
        }

    candidate_markets = []
    
    for _, row in df.iterrows():
        market = row['market']
        district = row['district']
        try:
            current_rate = float(row['current_rate']) if pd.notnull(row['current_rate']) else 0.0
        except (ValueError, TypeError):
            current_rate = 0.0
        
        if district not in DISTRICT_CENTROIDS:
            continue
            
        centroid = DISTRICT_CENTROIDS[district]
        m_lat, m_lon = centroid['lat'], centroid['lon']
        
        h_dist = haversine(lat, lon, m_lat, m_lon)
        if h_dist > 100:
            continue
            
        candidate_markets.append({
            "name": market,
            "district": district,
            "lat": m_lat,
            "lon": m_lon,
            "h_dist": h_dist,
            "current_rate": current_rate
        })
        
    results = []
    
    for m in candidate_markets:
        route = get_osrm_route(lat, lon, m['lat'], m['lon'])
        
        if route:
            distance_km = route['distance_km']
            duration_min = route['duration_min']
        else:
            distance_km = m['h_dist'] * 1.3
            duration_min = (distance_km / 40.0) * 60
            
        transit_hours = duration_min / 60.0
        
        gross_revenue = m['current_rate'] * quantity_qtl
        
        tonnes = quantity_qtl / 10.0
        transport_cost = distance_km * TRANSPORT_RATE_PER_KM * tonnes
        
        mandi_fee = gross_revenue * 0.015
        
        spoilage_loss = 0.0
        if commodity in PERISHABILITY_TIERS:
            tier_info = PERISHABILITY_TIERS[commodity]
            daily_loss_pct = tier_info.daily_loss_pct if hasattr(tier_info, 'daily_loss_pct') else tier_info.get('daily_loss_pct', 0)
            
            loss_pct = (daily_loss_pct * transit_hours / 24.0)
            spoilage_loss = (loss_pct / 100.0) * gross_revenue
            
        net_profit = gross_revenue - transport_cost - mandi_fee - spoilage_loss
        
        results.append({
            "name": m['name'],
            "district": m['district'],
            "lat": m['lat'],
            "lon": m['lon'],
            "distance_km": round(distance_km, 2),
            "driving_duration_min": round(duration_min),
            "current_rate": m['current_rate'],
            "gross_revenue": round(gross_revenue, 2),
            "transport_cost": round(transport_cost, 2),
            "mandi_fee": round(mandi_fee, 2),
            "spoilage_loss": round(spoilage_loss, 2),
            "net_profit": round(net_profit, 2)
        })

    results.sort(key=lambda x: x['net_profit'], reverse=True)
    top_5 = results[:5]
    
    if top_5:
        top_5[0]['is_top'] = True
        top_recommendation = top_5[0]['name']
    else:
        top_recommendation = None

    return {
        "origin": {"lat": lat, "lon": lon},
        "commodity": commodity,
        "quantity_qtl": quantity_qtl,
        "markets": top_5,
        "top_recommendation": top_recommendation
    }
