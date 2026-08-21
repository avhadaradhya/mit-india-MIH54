import math
import random

TRANSPORT_RATE_PER_KM = 22 # ₹22/km

# Hardcoded MANDIS dict for MVP (Lat/Lon approximate for Maharashtra region)
LOCATIONS = {
    "pune": {"lat": 18.5204, "lon": 73.8567},
    "solapur": {"lat": 17.6599, "lon": 75.9064},
    "nashik": {"lat": 19.9975, "lon": 73.7898},
    "ahmednagar": {"lat": 19.0952, "lon": 74.7496}
}

MANDIS = [
    {"name": "Pune Gultekdi APMC", "lat": 18.5024, "lon": 73.8642, "mandi_fee": 600},
    {"name": "Solapur APMC", "lat": 17.6710, "lon": 75.9220, "mandi_fee": 800},
    {"name": "Khed Mandi", "lat": 18.8475, "lon": 73.8820, "mandi_fee": 450},
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_routing_data(crop, quintals, location):
    # Base location coords
    base_loc = LOCATIONS.get(location.lower(), LOCATIONS["pune"])
    
    # Base rate derived roughly for demo variance (e.g. wheat ~ 2300)
    base_rate = 2300 if crop == "wheat" else 2000 
    
    results = []
    
    for m in MANDIS:
        dist = haversine(base_loc['lat'], base_loc['lon'], m['lat'], m['lon'])
        
        # Add slight demo variance to rates per mandi
        rate = base_rate + random.randint(-80, 150)
        
        gross = rate * quintals
        transport = dist * TRANSPORT_RATE_PER_KM
        net_profit = gross - transport - m['mandi_fee']
        
        results.append({
            "name": m['name'],
            "distance_km": round(dist, 1),
            "rate_per_quintal": rate,
            "gross": round(gross, 2),
            "transport_cost": round(transport, 2),
            "mandi_fee": m['mandi_fee'],
            "net_profit": round(net_profit, 2)
        })
        
    # Sort descending by Net Profit
    results = sorted(results, key=lambda x: x['net_profit'], reverse=True)
    
    return {
        "mandis": results,
        "top_recommendation": results[0]['name'] if results else ""
    }

def get_mock_roadmap(crop, location):
    # Satisfies the frontend contract for /api/roadmap/
    return {
        "steps": [
            { "step": 1, "title": "Recommended Seed Variety", "summary": f"Best for {location.capitalize()}", "detail": "Use drought-resistant varieties." },
            { "step": 2, "title": "Weather & Sowing Window", "summary": "Sow next week", "detail": "IMD predicts favorable monsoon." },
            { "step": 3, "title": "Storage Strategy", "summary": "Requires cold chain", "detail": "Onions decay fast in current humidity.", "perishable": True if crop in ['onion', 'tomato'] else False },
            { "step": 4, "title": "Target Peak Window", "summary": "Sell mid-November", "detail": "Historical data shows a 15% price spike." }
        ]
    }