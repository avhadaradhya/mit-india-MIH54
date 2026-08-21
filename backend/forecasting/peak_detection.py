import numpy as np
from scipy.signal import argrelextrema
from api.config import PROFIT_THRESHOLD
from etl.constants import PERISHABILITY_TIERS

def generate_recommendation(commodity: str, district: str, market: str, forecast_data: dict) -> dict:
    """
    Peak/dip detection and hold/sell recommendation engine.
    """
    forecast_list = forecast_data.get('forecast', [])
    current_price = forecast_data.get('current_price', 0.0)
    
    if not forecast_list:
        return {}
        
    prices = np.array([f['price'] for f in forecast_list])
    
    # Find local maxima and minima
    maxima_idx = argrelextrema(prices, np.greater_equal)[0]
    minima_idx = argrelextrema(prices, np.less_equal)[0]
    
    if len(maxima_idx) > 0:
        peak_idx = maxima_idx[np.argmax(prices[maxima_idx])]
        peak_price = float(prices[peak_idx])
        peak_day_offset = int(peak_idx) + 1
    else:
        peak_idx = np.argmax(prices)
        peak_price = float(prices[peak_idx])
        peak_day_offset = int(peak_idx) + 1
        
    if len(minima_idx) > 0:
        dip_idx = minima_idx[np.argmin(prices[minima_idx])]
        dip_price = float(prices[dip_idx])
        dip_day_offset = int(dip_idx) + 1
    else:
        dip_idx = np.argmin(prices)
        dip_price = float(prices[dip_idx])
        dip_day_offset = int(dip_idx) + 1
        
    perishability = PERISHABILITY_TIERS.get(commodity, 'medium').lower()
    
    action = "SELL"
    hold_days = 0
    confidence_note = ""
    
    forecast_gain_ratio = peak_price / current_price if current_price > 0 else 1.0
    
    if perishability == 'high':
        # High perishability (Tomato): max 2 days hold, recommend SELL unless peak is literally tomorrow
        if peak_day_offset <= 2 and forecast_gain_ratio > PROFIT_THRESHOLD:
            action = "HOLD"
            hold_days = peak_day_offset
            confidence_note = f"High perishability. Hold for {hold_days} days to reach peak."
        else:
            action = "SELL"
            hold_days = 0
            confidence_note = "High perishability. Recommend immediate sell."
            
    elif perishability == 'medium':
        # Medium (Onion, Potato): hold only while forecast_gain% > cumulative_storage_loss%
        # Approximating cumulative_storage_loss% as 0.5% per day
        loss_per_day = 0.005
        best_hold = 0
        
        for i, price in enumerate(prices):
            days = i + 1
            gain = (price / current_price) - 1.0
            loss = days * loss_per_day
            if gain > loss and (price / current_price) >= PROFIT_THRESHOLD:
                best_hold = days
                
        if best_hold > 0:
            action = "HOLD"
            hold_days = best_hold
            confidence_note = "Expected gain exceeds storage loss."
        else:
            action = "SELL"
            hold_days = 0
            confidence_note = "Expected gain does not justify storage loss."
            
    else:
        # Low (Wheat, Rice): pure forecast-driven, up to 30 days
        if forecast_gain_ratio >= PROFIT_THRESHOLD:
            action = "HOLD"
            hold_days = peak_day_offset
            confidence_note = "Low perishability. Hold until peak price."
        else:
            action = "SELL"
            hold_days = 0
            confidence_note = "No significant price increase expected."
            
    # Add day 8 CI note as requested in example
    if len(forecast_list) >= 8:
        ci_width_day8 = forecast_list[7]['ci_upper'] - forecast_list[7]['ci_lower']
        if ci_width_day8 > current_price * 0.1:
            confidence_note += " 90% range widens after day 8 — recheck forecast in 3 days."
            
    return {
        "commodity": commodity,
        "market": market,
        "action": action,
        "hold_days": int(hold_days),
        "current_price": float(current_price),
        "peak_price": float(peak_price),
        "peak_day_offset": int(peak_day_offset),
        "dip_price": float(dip_price),
        "dip_day_offset": int(dip_day_offset),
        "perishability_tier": perishability,
        "confidence_note": confidence_note.strip()
    }
