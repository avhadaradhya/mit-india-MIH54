import pandas as pd
df = pd.DataFrame({"A": [1], "B": [2], 0: [3]})
try:
    df.columns = df.columns.astype(str).str.strip().str.lower()
    print("SUCCESS")
    print(df.columns)
except Exception as e:
    print(f"ERROR: {e}")
