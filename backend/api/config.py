"""
KrushakSetu Backend Configuration.
Loads environment variables from .env and provides typed access.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from backend/api/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# --- Paths ---
DATASET_DIR = PROJECT_ROOT / "dataset"
DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
DATABASE_PATH = os.getenv("DATABASE_PATH", str(DATA_DIR / "krushaksetu.duckdb"))

# --- API Keys (server-side only) ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")
OWM_API_KEY = os.getenv("VITE_OWM_KEY", "")

# --- Twilio ---
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+17372212163")

# --- Forecasting ---
FORECAST_HORIZON = 14
PROFIT_THRESHOLD = 1.03  # 3% threshold for SELL vs HOLD
TRANSPORT_RATE_PER_KM = 22  # ₹/km default

# --- CORS ---
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
