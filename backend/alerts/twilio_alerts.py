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


def format_alert_message(recommendation: Dict[str, Any], lang: str = 'en') -> str:
    """
    Format the alert message in the specified language.
    
    Args:
        recommendation (dict): Recommendation data.
        lang (str, optional): Language code ('en' or 'mr'). Defaults to 'en'.
        
    Returns:
        str: Formatted message.
    """
    commodity = recommendation.get('commodity', 'Commodity')
    market = recommendation.get('market', 'Market')
    current_price = recommendation.get('current_price', 0)
    peak_price = recommendation.get('peak_price', 0)
    hold_days = recommendation.get('hold_days', 0)
    action = recommendation.get('action', 'Hold')
    
    # Determine verbs based on price change
    if peak_price >= current_price:
        action_verb = "rise"
        action_verb_mr = "वाढणे"
    else:
        action_verb = "fall"
        action_verb_mr = "घटणे"
        
    # Translate action to Marathi if needed
    action_mr = action
    if action.lower() == 'sell immediately':
        action_mr = 'लगेच विका'
    elif action.lower() == 'hold':
        action_mr = 'प्रतीक्षा करा'
    elif 'sell in' in action.lower():
        action_mr = f'{hold_days} दिवसांत विका'
        
    if lang == 'mr':
        return f"कृषकसेतू सूचना: {market} येथील {commodity} {hold_days} दिवसांत ₹{peak_price}/क्विंटल पर्यंत {action_verb_mr} अपेक्षित (सध्या ₹{current_price}). शिफारस: {action_mr}. सदस्यता रद्द करण्यासाठी STOP पाठवा."
    
    return f"KrushakSetu Alert: {commodity} at {market} expected to {action_verb} at ₹{peak_price}/q in {hold_days} days (currently ₹{current_price}). Recommendation: {action}. Reply STOP to unsubscribe."


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
            message = format_alert_message(recommendation, lang)
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
