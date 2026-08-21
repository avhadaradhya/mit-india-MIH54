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

# Approximate district centroids (lat, lon) for routing
DISTRICT_CENTROIDS = {
    "Ahilyanagar":                  {"lat": 19.0952, "lon": 74.7496},
    "Pune":                         {"lat": 18.5204, "lon": 73.8567},
    "Nashik":                       {"lat": 19.9975, "lon": 73.7898},
    "Solapur":                      {"lat": 17.6599, "lon": 75.9064},
    "Satara":                       {"lat": 17.6805, "lon": 74.0183},
    "Kolhapur":                     {"lat": 16.7050, "lon": 74.2433},
    "Sangli":                       {"lat": 16.8524, "lon": 74.5815},
    "Jalgaon":                      {"lat": 21.0077, "lon": 75.5626},
    "Chhatrapati Sambhajinagar":    {"lat": 19.8762, "lon": 75.3433},
    "Dharashiv":                    {"lat": 18.1860, "lon": 76.0444},
    "Latur":                        {"lat": 18.3968, "lon": 76.5604},
    "Nanded":                       {"lat": 19.1383, "lon": 77.3210},
    "Nagpur":                       {"lat": 21.1458, "lon": 79.0882},
    "Amravati":                     {"lat": 20.9374, "lon": 77.7796},
    "Akola":                        {"lat": 20.7002, "lon": 77.0082},
    "Buldhana":                     {"lat": 20.5290, "lon": 76.1842},
    "Washim":                       {"lat": 20.1120, "lon": 77.1334},
    "Yavatmal":                     {"lat": 20.3899, "lon": 78.1307},
    "Beed":                         {"lat": 18.9890, "lon": 75.7601},
    "Parbhani":                     {"lat": 19.2610, "lon": 76.7748},
    "Hingoli":                      {"lat": 19.7173, "lon": 77.1500},
    "Jalna":                        {"lat": 19.8347, "lon": 75.8816},
    "Dhule":                        {"lat": 20.9042, "lon": 74.7749},
    "Nandurbar":                    {"lat": 21.3691, "lon": 74.2394},
    "Ratnagiri":                    {"lat": 16.9902, "lon": 73.3120},
    "Sindhudurg":                   {"lat": 16.3489, "lon": 73.7556},
    "Thane":                        {"lat": 19.2183, "lon": 72.9781},
    "Palghar":                      {"lat": 19.6968, "lon": 72.7653},
    "Raigad":                       {"lat": 18.5157, "lon": 73.1822},
    "Mumbai":                       {"lat": 19.0760, "lon": 72.8777},
    "Gondiya":                      {"lat": 21.4602, "lon": 80.1950},
    "Bhandara":                     {"lat": 21.1669, "lon": 79.6508},
    "Chandrapur":                   {"lat": 19.9502, "lon": 79.2961},
    "Gadchiroli":                   {"lat": 20.1809, "lon": 80.0013},
    "Wardha":                       {"lat": 20.7453, "lon": 78.6022},
}
