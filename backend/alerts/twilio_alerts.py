"""
Twilio WhatsApp alerts module for KrushakSetu.
Handles subscriptions and sending alerts.
"""
import logging
import json
import re
from typing import Dict, Any, List

from api.config import (
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM
)
from api.database import (
    get_connection,
    query_df,
    query_dicts,
    execute
)

logger = logging.getLogger(__name__)

def subscribe(phone: str, state: str, district: str, commodity: str, lang: str = 'en') -> Dict[str, Any]:
    """
    Subscribe a user to WhatsApp alerts.
    
    Args:
        phone (str): The phone number (10 digits for India).
        state (str): State name.
        district (str): District name.
        commodity (str): Commodity name.
        lang (str, optional): Language ('en' or 'mr'). Defaults to 'en'.
        
    Returns:
        dict: Subscription status.
    """
    # Clean phone string (remove non-digits)
    cleaned_phone = re.sub(r'\D', '', phone)
    
    if len(cleaned_phone) == 10:
        formatted_phone = f"+91{cleaned_phone}"
    elif len(cleaned_phone) == 12 and cleaned_phone.startswith("91"):
        formatted_phone = f"+{cleaned_phone}"
    else:
        # Assuming it's already properly formatted or let it pass for Twilio validation
        formatted_phone = phone if phone.startswith('+') else f"+91{cleaned_phone}"
        if not formatted_phone.startswith('+'):
            formatted_phone = f"+{formatted_phone}"
            
    execute(
        "INSERT INTO alert_subscriptions (id, phone, state, district, commodity, lang) VALUES (nextval('alert_sub_seq'), ?, ?, ?, ?, ?)", 
        [formatted_phone, state, district, commodity, lang]
    )
    
    logger.info(f"Subscribed {formatted_phone} to {commodity} alerts in {district}, {state}")
    
    return {"status": "subscribed", "phone": formatted_phone}


def send_whatsapp_alert(phone: str, message: str) -> Dict[str, Any]:
    """
    Send a WhatsApp alert using Twilio or log it if in mock mode.
    
    Args:
        phone (str): The recipient's phone number.
        message (str): The message content.
        
    Returns:
        dict: Status of the sent message.
    """
    if not TWILIO_AUTH_TOKEN:
        logger.info(f"MOCK WhatsApp to {phone}: {message}")
        return {"status": "mock", "message": message}
        
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=TWILIO_WHATSAPP_FROM,
            to=f'whatsapp:{phone}'
        )
        logger.info(f"WhatsApp sent to {phone}, sid: {msg.sid}")
        return {"status": "sent", "sid": msg.sid}
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message to {phone}: {e}")
        return {"status": "error", "message": str(e)}


def generate_daily_briefing(phone: str, crop: str, district: str) -> Dict[str, str]:
    """
    Generate a decoupled daily briefing object.
    
    Args:
        phone (str): The recipient's phone number.
        crop (str): Commodity name.
        district (str): District name.
        
    Returns:
        dict: Briefing lines.
    """
    from forecasting.engine import get_cached_forecast, generate_forecast
    
    # Try getting the forecast
    forecast_data = get_cached_forecast(crop, district, "nearby APMC")
    if not forecast_data:
        try:
            forecast_data = generate_forecast(crop, district, "nearby APMC")
        except Exception:
            forecast_data = {}
            
    current_price = forecast_data.get('current_price', 0)
    recommendation = forecast_data.get('recommendation', {})
    action = recommendation.get('action', 'Hold')
    peak_price = recommendation.get('peak_price', current_price)
    hold_days = recommendation.get('hold_days', 0)
    
    # Trend computation
    trend_val = 0
    if current_price > 0:
        trend_val = ((peak_price - current_price) / current_price) * 100
        
    trend_arrow = "," if trend_val >= 0 else ","
    
    price_line = f"{crop} in {district}: ,1{current_price}/qtl today, projected {trend_arrow} {abs(trend_val):.1f}%."
    weather_line = "Moderate weather expected."
    
    # Simple recommendation formatting
    if "sell" in action.lower():
        rec_line = f"Recommendation: SELL - {action.upper()}."
    else:
        rec_line = f"Recommendation: HOLD - forecast peak in {hold_days} days at ,1{peak_price}."
        
    return {
        "price_line": price_line,
        "trend_arrow": trend_arrow,
        "weather_line": weather_line,
        "recommendation_line": rec_line
    }

def format_alert_message(briefing: Dict[str, str], lang: str = 'en') -> str:
    """Format the briefing dictionary into a single text block."""
    if lang == 'mr':
        return (
            f"🔔 KrushakSetu Alert (Marathi):\n"
            f"{briefing['price_line']}\n"
            f"{briefing['weather_line']}\n"
            f"{briefing['recommendation_line']}"
        )
        
    return (
        f"🔔 KrushakSetu Alert:\n"
        f"{briefing['price_line']}\n"
        f"{briefing['weather_line']}\n"
        f"{briefing['recommendation_line']}"
    )


def check_and_send_alerts() -> List[Dict[str, Any]]:
    """
    Check for active subscriptions and send alerts if applicable.
    
    Returns:
        list: Summaries of sent alerts.
    """
    sent_summaries = []
    
    # Query all active subscriptions
    subscriptions = query_dicts("SELECT * FROM alert_subscriptions", [])
    
    if not subscriptions:
        logger.info("No active subscriptions found.")
        return sent_summaries
        
    for sub in subscriptions:
        phone = sub['phone']
        district = sub['district']
        commodity = sub['commodity']
        lang = sub.get('lang', 'en')
        
        # Look up cached forecast for this district and commodity
        query = """
            SELECT series_key, generated_at, recommendation_json 
            FROM forecasts 
            WHERE district = ? AND commodity = ?
            ORDER BY generated_at DESC LIMIT 1
        """
        forecasts = query_dicts(query, [district, commodity])
        
        if not forecasts:
            continue
            
        latest_forecast = forecasts[0]
        series_key = latest_forecast['series_key']
        generated_at = latest_forecast['generated_at']
        
        try:
            recommendation = json.loads(latest_forecast['recommendation_json']) if isinstance(latest_forecast['recommendation_json'], str) else latest_forecast['recommendation_json']
        except Exception as e:
            logger.error(f"Error parsing recommendation JSON for {series_key}: {e}")
            continue
            
        if not recommendation:
            continue
            
        # Check if alert should fire (peak detected within hold window)
        # Using basic action check based on instructions
        action = recommendation.get('action', '').lower()
        if not action or action == 'none':
            continue
            
        # Check dedup: query sent_alerts for matching phone + series_key + forecast_run_id
        # We'll use generated_at string as forecast_run_id equivalent 
        check_query = """
            SELECT id FROM sent_alerts 
            WHERE phone = ? AND series_key = ? AND alert_timestamp = ?
        """
        sent_check = query_dicts(check_query, [phone, series_key, generated_at])
        
        if not sent_check:
            # New alert
            briefing = generate_daily_briefing(phone, commodity, district)
            message = format_alert_message(briefing, lang)
            send_result = send_whatsapp_alert(phone, message)
            
            # Log to sent_alerts
            execute(
                "INSERT INTO sent_alerts (id, phone, series_key, message, status, alert_timestamp) VALUES (nextval('sent_alert_seq'), ?, ?, ?, ?, ?)",
                [phone, series_key, message, send_result['status'], generated_at]
            )
            
            sent_summaries.append({
                "phone": phone,
                "commodity": commodity,
                "district": district,
                "status": send_result['status']
            })
            
    return sent_summaries
