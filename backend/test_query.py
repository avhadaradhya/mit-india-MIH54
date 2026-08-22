import os
from api.database import query_df, query_dicts

df = query_df("SELECT modal_price FROM prices LIMIT 2")
print("DATAFRAME COLUMNS:", list(df.columns))
print("DATAFRAME TYPES:", [type(c) for c in df.columns])

print("DICTS:", query_dicts("SELECT forecast_json, generated_at FROM forecasts LIMIT 2"))

# test lowercasing
df.columns = [str(col).strip().lower() for col in df.columns]
print("AFTER COMPREHENSION:", list(df.columns))
