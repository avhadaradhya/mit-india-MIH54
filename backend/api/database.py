"""
DuckDB connection manager for KrushakSetu.
Provides helpers to query the merged APMC price database.
"""
import duckdb
import pandas as pd
from pathlib import Path
from api.config import DATABASE_PATH

_conn = None

def get_connection() -> duckdb.DuckDBPyConnection:
    """Get or create a DuckDB connection (singleton per process)."""
    global _conn
    if _conn is None:
        db_path = Path(DATABASE_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _conn = duckdb.connect(str(db_path), read_only=False)
    return _conn

def close_connection():
    """Close the DuckDB connection."""
    global _conn
    if _conn is not None:
        _conn.close()
        _conn = None

def query_df(sql: str, params: list = None) -> pd.DataFrame:
    """Execute a SQL query and return result as a pandas DataFrame."""
    conn = get_connection()
    if params:
        return conn.execute(sql, params).fetchdf()
    return conn.execute(sql).fetchdf()

def query_dicts(sql: str, params: list = None) -> list[dict]:
    """Execute a SQL query and return result as a list of dicts."""
    df = query_df(sql, params)
    if df is None or df.empty:
        return []
    return df.to_dict(orient="records")

def execute(sql: str, params: list = None):
    """Execute a SQL statement (INSERT/CREATE/etc.)."""
    conn = get_connection()
    if params:
        conn.execute(sql, params)
    else:
        conn.execute(sql)
