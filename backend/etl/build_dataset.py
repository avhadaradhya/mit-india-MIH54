"""
KrushakSetu ETL Pipeline — build_dataset.py
Merges Kaggle (Source A) + eNAM (Source B) into unified DuckDB database.
Run: python -m etl.build_dataset
"""
import os
import sys
import json
import time
import logging
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.constants import (
    DISTRICT_ALIASES, COMMODITY_GROUP_MAP, PERISHABILITY_TIERS,
    ENAM_FILE_MAP, TARGET_COMMODITIES
)
from api.config import DATASET_DIR, PROCESSED_DIR, DATABASE_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

report = {
    "run_timestamp": datetime.now().isoformat(),
    "source_a": {},
    "source_b": {},
    "merged": {},
    "issues": [],
}


def normalize_district(name: str) -> str:
    """Normalize district name: strip, title-case, apply alias mapping."""
    if pd.isna(name):
        return ""
    cleaned = str(name).strip().title()
    return DISTRICT_ALIASES.get(cleaned.lower(), cleaned)


def load_source_a(dataset_dir: Path) -> pd.DataFrame:
    """Load Kaggle historical dataset (Source A)."""
    path = dataset_dir / "Agriculture_price_dataset.csv"
    if not path.exists():
        logger.error(f"Source A not found: {path}")
        report["issues"].append(f"Source A missing: {path}")
        return pd.DataFrame()

    logger.info(f"Loading Source A: {path}")
    df = pd.read_csv(str(path), low_memory=False)

    report["source_a"]["raw_rows"] = len(df)
    report["source_a"]["columns"] = list(df.columns)

    # Parse dates (M/D/YYYY format)
    df["price_date"] = pd.to_datetime(df["Price Date"], format="%m/%d/%Y", errors="coerce")
    date_nulls = df["price_date"].isna().sum()
    if date_nulls > 0:
        report["issues"].append(f"Source A: {date_nulls} unparseable dates dropped")
        df = df.dropna(subset=["price_date"])

    # Filter to Maharashtra only
    df = df[df["STATE"].str.strip().str.lower() == "maharashtra"].copy()
    report["source_a"]["maharashtra_rows"] = len(df)

    # Filter to target commodities
    df["Commodity"] = df["Commodity"].str.strip().str.title()
    df = df[df["Commodity"].isin(TARGET_COMMODITIES)].copy()
    report["source_a"]["target_commodity_rows"] = len(df)

    # Normalize to unified schema
    df = df.rename(columns={
        "STATE": "state",
        "District Name": "district",
        "Market Name": "market",
        "Commodity": "commodity",
        "Variety": "variety",
        "Grade": "grade",
        "Min_Price": "min_price",
        "Max_Price": "max_price",
        "Modal_Price": "modal_price",
    })

    df["state"] = "Maharashtra"
    df["district"] = df["district"].apply(normalize_district)
    df["market"] = df["market"].str.strip().str.title()
    df["commodity_group"] = df["commodity"].map(COMMODITY_GROUP_MAP).fillna("Unknown")
    df["price_unit"] = "Rs./Quintal"
    df["arrival_qty"] = np.nan
    df["arrival_unit"] = None
    df["source"] = "kaggle"

    # Drop invalid prices
    invalid_prices = (df["modal_price"] <= 0).sum()
    if invalid_prices > 0:
        report["issues"].append(f"Source A: {invalid_prices} rows with modal_price <= 0 dropped")
        df = df[df["modal_price"] > 0].copy()

    cols = [
        "state", "district", "market", "commodity_group", "commodity",
        "variety", "grade", "min_price", "max_price", "modal_price",
        "price_unit", "arrival_qty", "arrival_unit", "price_date", "source"
    ]
    return df[cols].copy()


def load_source_b(dataset_dir: Path) -> pd.DataFrame:
    """Load eNAM Daily Price Arrival Reports (Source B)."""
    frames = []
    report["source_b"]["files"] = {}

    for suffix, commodity in ENAM_FILE_MAP.items():
        # Find matching file
        matches = list(dataset_dir.glob(f"*{suffix}.csv"))
        if not matches:
            report["issues"].append(f"Source B: No file found for {commodity} (suffix {suffix})")
            continue

        path = matches[0]
        logger.info(f"Loading Source B [{commodity}]: {path.name}")

        # Row 1 is a merged title row — skip it
        df = pd.read_csv(str(path), skiprows=1, low_memory=False)
        report["source_b"]["files"][commodity] = {"raw_rows": len(df), "file": path.name}

        # Strip commas from numeric price/qty columns and cast
        for col in ["Min Price", "Max Price", "Modal Price", "Arrival Quantity"]:
            if col in df.columns:
                df[col] = (
                    df[col]
                    .astype(str)
                    .str.replace(",", "", regex=False)
                    .str.strip()
                )
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Parse dates (DD-MM-YYYY)
        df["price_date"] = pd.to_datetime(df["Arrival Date"], format="%d-%m-%Y", errors="coerce")
        date_nulls = df["price_date"].isna().sum()
        if date_nulls > 0:
            report["issues"].append(f"Source B [{commodity}]: {date_nulls} unparseable dates")
            df = df.dropna(subset=["price_date"])

        # Normalize to unified schema
        df = df.rename(columns={
            "State/UT": "state",
            "District": "district",
            "Market": "market",
            "Commodity Group": "commodity_group",
            "Commodity": "commodity",
            "Variety": "variety",
            "Grade": "grade",
            "Min Price": "min_price",
            "Max Price": "max_price",
            "Modal Price": "modal_price",
            "Price Unit": "price_unit",
            "Arrival Quantity": "arrival_qty",
            "Arrival Unit": "arrival_unit",
        })

        df["state"] = "Maharashtra"
        df["district"] = df["district"].apply(normalize_district)
        df["market"] = df["market"].str.strip().str.title()
        df["commodity"] = df["commodity"].str.strip().str.title()
        df["source"] = "enam"

        # Drop invalid prices
        df = df[df["modal_price"] > 0].copy()

        cols = [
            "state", "district", "market", "commodity_group", "commodity",
            "variety", "grade", "min_price", "max_price", "modal_price",
            "price_unit", "arrival_qty", "arrival_unit", "price_date", "source"
        ]
        frames.append(df[cols])

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    report["source_b"]["total_rows"] = len(combined)
    return combined


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived analytical columns."""
    df["week_of_year"] = df["price_date"].dt.isocalendar().week.astype(int)
    df["month"] = df["price_date"].dt.month
    df["day_of_week"] = df["price_date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["perishability"] = df["commodity"].map(
        lambda c: PERISHABILITY_TIERS.get(c, {}).get("tier", "unknown")
    )
    return df


def build_seasonal_baseline(source_a: pd.DataFrame) -> pd.DataFrame:
    """
    Build monthly seasonal baseline from Source A (2+ years of history).
    This is used as an exogenous seasonal prior for SARIMAX.
    """
    if source_a.empty:
        return pd.DataFrame()

    source_a = source_a.copy()
    source_a["month"] = source_a["price_date"].dt.month

    baseline = (
        source_a.groupby(["commodity", "district", "month"])["modal_price"]
        .agg(["mean", "std", "min", "max", "count"])
        .reset_index()
    )
    baseline.columns = [
        "commodity", "district", "month",
        "seasonal_mean", "seasonal_std", "seasonal_min", "seasonal_max", "sample_count"
    ]
    return baseline


def write_to_duckdb(merged: pd.DataFrame, baseline: pd.DataFrame, db_path: str):
    """Load DataFrames into DuckDB tables."""
    import duckdb

    db_dir = Path(db_path).parent
    db_dir.mkdir(parents=True, exist_ok=True)

    conn = duckdb.connect(db_path)

    # Drop existing tables and recreate
    conn.execute("DROP TABLE IF EXISTS prices")
    conn.execute("DROP TABLE IF EXISTS seasonal_baseline")
    conn.execute("DROP TABLE IF EXISTS forecasts")
    conn.execute("DROP TABLE IF EXISTS sent_alerts")
    conn.execute("DROP TABLE IF EXISTS alert_subscriptions")

    # Create prices table from DataFrame
    conn.execute("CREATE TABLE prices AS SELECT * FROM merged")
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_prices_lookup 
        ON prices (commodity, district, market, price_date)
    """)

    # Create seasonal baseline
    if not baseline.empty:
        conn.execute("CREATE TABLE seasonal_baseline AS SELECT * FROM baseline")

    # Create forecasts cache table
    conn.execute("""
        CREATE TABLE forecasts (
            series_key VARCHAR PRIMARY KEY,
            commodity VARCHAR,
            district VARCHAR,
            market VARCHAR,
            generated_at TIMESTAMP,
            forecast_json JSON,
            metrics_json JSON,
            recommendation_json JSON
        )
    """)

    # Alert subscriptions table
    conn.execute("""
        CREATE TABLE alert_subscriptions (
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

    # Sent alerts dedup table
    conn.execute("""
        CREATE TABLE sent_alerts (
            id INTEGER PRIMARY KEY,
            phone VARCHAR,
            series_key VARCHAR,
            forecast_run_id VARCHAR,
            message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR
        )
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS sent_alert_seq START 1")

    # Verify
    row_count = conn.execute("SELECT COUNT(*) FROM prices").fetchone()[0]
    logger.info(f"DuckDB: {row_count} rows in 'prices' table")

    if not baseline.empty:
        bl_count = conn.execute("SELECT COUNT(*) FROM seasonal_baseline").fetchone()[0]
        logger.info(f"DuckDB: {bl_count} rows in 'seasonal_baseline' table")

    # Summary stats
    districts = conn.execute("SELECT COUNT(DISTINCT district) FROM prices").fetchone()[0]
    markets = conn.execute("SELECT COUNT(DISTINCT market) FROM prices").fetchone()[0]
    commodities = conn.execute("SELECT DISTINCT commodity FROM prices").fetchdf()["commodity"].tolist()
    date_range = conn.execute("SELECT MIN(price_date), MAX(price_date) FROM prices").fetchone()

    logger.info(f"DuckDB summary: {districts} districts, {markets} markets, commodities={commodities}")
    logger.info(f"DuckDB date range: {date_range[0]} → {date_range[1]}")

    conn.close()

    report["merged"]["duckdb_rows"] = row_count
    report["merged"]["districts"] = districts
    report["merged"]["markets"] = markets
    report["merged"]["commodities"] = commodities
    report["merged"]["date_range"] = [str(date_range[0]), str(date_range[1])]


def main():
    """Run the full ETL pipeline."""
    start = time.time()
    logger.info("=" * 60)
    logger.info("KrushakSetu ETL Pipeline — Starting")
    logger.info("=" * 60)

    dataset_dir = Path(DATASET_DIR)
    if not dataset_dir.exists():
        logger.error(f"Dataset directory not found: {dataset_dir}")
        sys.exit(1)

    # Step 1: Load sources
    logger.info("Step 1/6: Loading Source A (Kaggle)...")
    source_a = load_source_a(dataset_dir)
    logger.info(f"  → Source A: {len(source_a)} rows")

    logger.info("Step 2/6: Loading Source B (eNAM)...")
    source_b = load_source_b(dataset_dir)
    logger.info(f"  → Source B: {len(source_b)} rows")

    # Step 2: Build seasonal baseline from Source A
    logger.info("Step 3/6: Building seasonal baseline...")
    baseline = build_seasonal_baseline(source_a)
    logger.info(f"  → Baseline: {len(baseline)} rows")

    # Step 3: Merge
    logger.info("Step 4/6: Merging sources...")
    merged = pd.concat([source_a, source_b], ignore_index=True)

    # Dedup exact duplicates
    before_dedup = len(merged)
    merged = merged.drop_duplicates()
    dupes = before_dedup - len(merged)
    if dupes > 0:
        report["issues"].append(f"Dropped {dupes} exact duplicate rows")
    logger.info(f"  → Merged: {len(merged)} rows (dropped {dupes} duplicates)")

    # Step 4: Add derived columns
    logger.info("Step 5/6: Adding derived columns...")
    merged = add_derived_columns(merged)

    report["merged"]["total_rows"] = len(merged)
    per_commodity = merged.groupby("commodity").size().to_dict()
    report["merged"]["per_commodity"] = per_commodity
    per_source = merged.groupby("source").size().to_dict()
    report["merged"]["per_source"] = per_source

    # Step 5: Write outputs
    logger.info("Step 6/6: Writing outputs...")

    # Parquet files
    processed_dir = Path(PROCESSED_DIR)
    processed_dir.mkdir(parents=True, exist_ok=True)

    merged.to_parquet(str(processed_dir / "prices_full.parquet"), index=False)
    logger.info(f"  → Wrote prices_full.parquet")

    if not baseline.empty:
        baseline.to_parquet(str(processed_dir / "monthly_seasonal_baseline.parquet"), index=False)
        logger.info(f"  → Wrote monthly_seasonal_baseline.parquet")

    # DuckDB
    write_to_duckdb(merged, baseline, DATABASE_PATH)

    # ETL report
    elapsed = round(time.time() - start, 2)
    report["elapsed_seconds"] = elapsed

    data_dir = Path(DATABASE_PATH).parent
    report_path = data_dir / "etl_report.json"
    with open(str(report_path), "w") as f:
        json.dump(report, f, indent=2, default=str)
    logger.info(f"  → Wrote {report_path}")

    logger.info("=" * 60)
    logger.info(f"ETL Complete in {elapsed}s — {len(merged)} rows → DuckDB")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
