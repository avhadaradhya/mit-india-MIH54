import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_golden_demo_dataset(crop, mandi, base_price, harvest_months, volatility):
    print(f"Generating Golden Demo Data for {crop.capitalize()} at {mandi.capitalize()}...")
    
    # 1. Generate 3 years of daily dates ending today
    end_date = datetime.today()
    start_date = end_date - timedelta(days=365 * 3)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    prices = []
    
    # 2. Simulate Realistic Agricultural Economics
    for d in dates:
        # Base price fluctuation
        price = base_price
        
        # Inject Seasonal Crash (Prices drop heavily during harvest months)
        if d.month in harvest_months:
            price *= 0.6  # 40% crash due to market flooding
            
        # Inject Pre-Harvest Peak (Prices spike right before harvest when storage is empty)
        pre_harvest_month = harvest_months[0] - 1 if harvest_months[0] > 1 else 12
        if d.month == pre_harvest_month:
            price *= 1.3  # 30% spike
            
        # Add daily random market volatility
        noise = np.random.normal(0, volatility)
        price += noise
        
        prices.append(round(price, 2))
        
    df = pd.DataFrame({
        'date': dates.strftime('%Y-%m-%d'),
        'price': prices
    })
    
    # 3. Save directly to the forecast/data folder
    output_filename = f"forecast/data/{crop.lower()}_{mandi.lower()}.csv"
    os.makedirs(os.path.dirname(output_filename), exist_ok=True)
    df.to_csv(output_filename, index=False)
    print(f"✅ Generated {len(df)} days of historical data -> {output_filename}")


# --- DEMO EXECUTION ---
# Crop, Mandi, Average Base Price (Rs/Qtl), Harvest Months (When price crashes), Daily Volatility

# Wheat (Rabi Crop: Harvests around April/May)
generate_golden_demo_dataset("wheat", "pune", base_price=2300, harvest_months=[4, 5], volatility=50)

# Onion (Kharif/Late Kharif: Harvests heavily in Oct/Nov)
generate_golden_demo_dataset("onion", "pune", base_price=1800, harvest_months=[10, 11], volatility=80)

# Tomato (Short cycle, highly volatile, multiple harvests)
generate_golden_demo_dataset("tomato", "pune", base_price=1200, harvest_months=[3, 8, 12], volatility=120)

print("\n🎉 Demo Data Generation Complete! Your ARIMA API is now ready for testing.")