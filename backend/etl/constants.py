"""
ETL Constants for KrushakSetu data pipeline.
District aliases, commodity mappings, perishability tiers, and eNAM file mappings.
"""

# Maharashtra district renames (2023): old lowercase Kaggle name → new Title Case eNAM name
DISTRICT_ALIASES = {
    "ahmednagar": "Ahilyanagar",
    "aurangabad": "Chhatrapati Sambhajinagar",
    "osmanabad": "Dharashiv",
}

# Map commodity names to commodity groups (for Source A which lacks this field)
COMMODITY_GROUP_MAP = {
    "Onion": "Vegetables",
    "Potato": "Vegetables",
    "Tomato": "Vegetables",
    "Wheat": "Cereals",
    "Rice": "Cereals",
}

# Perishability tiers (§6.1)
PERISHABILITY_TIERS = {
    "Tomato":  {"tier": "high",   "max_hold_days": 2,  "daily_loss_pct": 5.0},
    "Onion":   {"tier": "medium", "max_hold_days": 14, "daily_loss_pct": 1.5},
    "Potato":  {"tier": "medium", "max_hold_days": 14, "daily_loss_pct": 1.0},
    "Wheat":   {"tier": "low",    "max_hold_days": 30, "daily_loss_pct": 0.1},
    "Rice":    {"tier": "low",    "max_hold_days": 30, "daily_loss_pct": 0.1},
}

# eNAM file suffix → commodity name
# Files are named: "Daily Price Arrival Report-07-11-2025 to 21-08-2026 for Maharashtra (N).csv"
ENAM_FILE_MAP = {
    "(6)": "Onion",
    "(7)": "Tomato",
    "(8)": "Potato",
    "(4)": "Wheat",
    "(5)": "Rice",
    # (3) = Bajra — excluded per user directive
}

# Target commodities (final scope)
TARGET_COMMODITIES = ["Onion", "Potato", "Tomato", "Wheat", "Rice"]

# Exact origin coordinates
DISTRICT_CENTROIDS = {
    "Ahilyanagar": {"lat": 19.0952, "lon": 74.7496},
    "Pune":        {"lat": 18.5204, "lon": 73.8567},
    "Nashik":      {"lat": 19.9975, "lon": 73.7898}
}

# Mandis Matrix: Exact locations and cess percentages
MANDIS_MATRIX = [
    {"name": "Ahilyanagar APMC", "district": "Ahilyanagar", "lat": 19.1120, "lon": 74.7180, "cess_pct": 0.010},
    {"name": "Rahata", "district": "Ahilyanagar", "lat": 19.6880, "lon": 74.4920, "cess_pct": 0.008},
    {"name": "Pune Gultekdi", "district": "Pune", "lat": 18.4980, "lon": 73.8680, "cess_pct": 0.012},
    {"name": "Khed APMC", "district": "Pune", "lat": 18.8450, "lon": 73.9040, "cess_pct": 0.010},
    {"name": "Nashik APMC", "district": "Nashik", "lat": 20.0120, "lon": 73.8050, "cess_pct": 0.011},
    {"name": "Lasalgaon", "district": "Nashik", "lat": 20.1480, "lon": 74.2280, "cess_pct": 0.010}
]
