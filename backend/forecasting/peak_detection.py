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
        
    perish_dict = PERISHABILITY_TIERS.get(commodity, {"tier": "medium"})
    if isinstance(perish_dict, dict):
        perishability = perish_dict.get("tier", "medium").lower()
    else:
        perishability = str(perish_dict).lower()
    
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
            
    # Add historical analog
    historical_analog = ""
    history_list = forecast_data.get('history', [])
    if history_list:
        recent_prices = [h['price'] for h in history_list]
        historical_analog = find_historical_analog(commodity, district, market, recent_prices)
            
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
        "confidence_note": confidence_note.strip(),
        "historical_analog": historical_analog
    }

def find_historical_analog(commodity: str, district: str, market: str, current_prices: list) -> str:
    """Find the closest 14-day historical window to the current price shape."""
    try:
        from api.database import query_dicts
        import pandas as pd
        
        sql = "SELECT price_date, modal_price FROM prices WHERE commodity=? AND district=? AND market=? ORDER BY price_date"
        rows = query_dicts(sql, [commodity, district, market])
        if len(rows) < 100 or len(current_prices) < 14:
            return ""
            
        df = pd.DataFrame(rows)
        df['price_date'] = pd.to_datetime(df['price_date'])
        df = df.set_index('price_date').resample('D').ffill().dropna()
        
        if len(df) < 100:
            return ""
            
        recent_14 = np.array(current_prices[-14:])
        if np.std(recent_14) == 0:
            return ""
            
        recent_norm = (recent_14 - np.mean(recent_14)) / np.std(recent_14)
        
        # Exclude the last 60 days from search
        search_df = df.iloc[:-60]
        prices = search_df['modal_price'].values
        dates = search_df.index
        
        best_corr = -1
        best_idx = -1
        
        for i in range(len(prices) - 28): # need 14 days + 14 days ahead
            window = prices[i:i+14]
            if np.std(window) == 0:
                continue
            window_norm = (window - np.mean(window)) / np.std(window)
            corr = np.corrcoef(recent_norm, window_norm)[0, 1]
            if corr > best_corr:
                best_corr = corr
                best_idx = i
                
        if best_idx != -1 and best_corr > 0.7:
            analog_start_date = dates[best_idx].strftime('%b %Y')
            start_price = prices[best_idx + 13]
            future_price = prices[best_idx + 27]
            change_pct = ((future_price - start_price) / start_price) * 100
            
            direction = "rose" if change_pct >= 0 else "fell"
            return f"In similar conditions in {analog_start_date}, prices {direction} by {abs(change_pct):.0f}% over the following 14 days."
            
        return ""
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Analog search failed: {e}")
        return ""
