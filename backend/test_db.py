import duckdb
conn = duckdb.connect("d:/FSD/mit-india-MIH54/backend/data/krushaksetu.duckdb")
print(conn.execute("SELECT * FROM market_prices LIMIT 0").fetchdf().columns)
print(conn.execute("SELECT * FROM model_forecasts LIMIT 0").fetchdf().columns)
