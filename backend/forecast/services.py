import os
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from django.core.cache import cache
from django.conf import settings

PROFIT_THRESHOLD = 1.03  # 3% threshold for SELL vs HOLD

def get_arima_forecast(crop, mandi):
    # 1. File loading & Data prep
    # In production, use os.path.join(settings.BASE_DIR, ...)
    file_path = f"forecast/data/{crop}_{mandi}.csv"
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Data for {crop} at {mandi} not found.")

    df = pd.read_csv(file_path)
    df['date'] = pd.to_datetime(df['date'])
    df.set_index('date', inplace=True)
    
    # Set daily frequency and interpolate missing gaps
    df = df.asfreq('D')
    df['price'] = df['price'].interpolate(method='linear')

    # 2. Check Cache for fitted model
    cache_key = f"arima_model_{crop}_{mandi}"
    model_fit = cache.get(cache_key)

    if not model_fit:
        # Fit ARIMA(2,1,2) - A reasonable default for daily commodity price series. 
        # (Accounts for 2 days auto-regression, 1 level of differencing for trend, and 2 days moving average)
        model = ARIMA(df['price'], order=(2, 1, 2))
        model_fit = model.fit()
        # Cache for 1 hour (3600 seconds)
        cache.set(cache_key, model_fit, 3600)

    # 3. Generate Forecast (14 steps ahead)
    forecast_series = model_fit.forecast(steps=14)
    
    current_price = float(df['price'].iloc[-1])
    max_forecast_price = float(forecast_series.max())
    
    # Logic Calculations
    predicted_jump = round(max_forecast_price - current_price)
    
    if max_forecast_price > (current_price * PROFIT_THRESHOLD):
        recommendation = "HOLD"
        # +1 because index 0 is day 1
        hold_days = int(np.argmax(forecast_series.values) + 1) 
    else:
        recommendation = "SELL_TODAY"
        hold_days = 0

    # 4. Formatting output to match exactly with API contract
    history_data = [
        {"date": idx.strftime('%Y-%m-%d'), "price": round(row['price'], 2)} 
        for idx, row in df.tail(7).iterrows()
    ]
    
    forecast_data = [
        {"date": idx.strftime('%Y-%m-%d'), "price": round(val, 2)} 
        for idx, val in forecast_series.items()
    ]

    return {
        "crop": crop,
        "mandi": mandi,
        "current_price": round(current_price, 2),
        "history": history_data,
        "forecast": forecast_data,
        "recommendation": recommendation,
        "hold_days": hold_days,
        "predicted_jump": predicted_jump
    }