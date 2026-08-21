import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_golden_demo_dataset(crop, mandi, base_price, harvest_months, volatility):
    print(f"Generating Golden Demo Data for {crop.capitalize()} at {mandi.capitalize()}...")
    
    # Generate 3 years of daily dates ending today
    end_date = datetime.today()
    start_date = end_date - timedelta(days=365 * 3)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    prices = []
    
    for d in dates:
        price = base_price
        
        # Inject Seasonal Crash
        if d.month in harvest_months:
            price *= 0.65  
            
        # Inject Pre-Harvest Peak
        pre_harvest_month = harvest_months[0] - 1 if harvest_months[0] > 1 else 12
        if d.month == pre_harvest_month:
            price *= 1.25  
            
        # Add daily random volatility
        noise = np.random.normal(0, volatility)
        price += noise
        
        prices.append(round(max(100, price), 2))
        
    df = pd.DataFrame({
        'date': dates.strftime('%Y-%m-%d'),
        'price': prices
    })
    
    output_filename = f"forecast/data/{crop.lower()}_{mandi.lower()}.csv"
    os.makedirs(os.path.dirname(output_filename), exist_ok=True)
    df.to_csv(output_filename, index=False)
    print(f"✅ Generated {len(df)} days of historical data -> {output_filename}")

# --- DEMO DATA GENERATION MATRIX ---
# Crops: Onion, Tomato, Wheat, Soybean
# Locations: Pune, Solapur, Nashik, Ahmednagar

crops_config = {
    "onion": {"base_price": 2200, "harvest_months": [10, 11], "volatility": 70},
    "tomato": {"base_price": 1400, "harvest_months": [3, 8, 12], "volatility": 110},
    "wheat": {"base_price": 2100, "harvest_months": [4, 5], "volatility": 45},
    "soybean": {"base_price": 3800, "harvest_months": [9, 10], "volatility": 90}
}

mandis = ["pune", "solapur", "nashik", "ahmednagar"]

for crop, config in crops_config.items():
    for mandi in mandis:
        generate_golden_demo_dataset(
            crop=crop,
            mandi=mandi,
            base_price=config["base_price"],
            harvest_months=config["harvest_months"],
            volatility=config["volatility"]
        )

print("\n🎉 All 16 Crop-Mandi combinations generated successfully in forecast/data/!")