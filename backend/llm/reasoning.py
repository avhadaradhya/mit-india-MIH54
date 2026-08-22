import json
import logging
from typing import Dict, Optional, Tuple, Any

from groq import Groq
from cerebras.cloud.sdk import Cerebras
from api.config import GROQ_API_KEY, CEREBRAS_API_KEY
from forecasting.engine import get_weather_forecast
import pandas as pd

logger = logging.getLogger(__name__)

# Cache dictionary
# Key: (series_key, lang, forecast_generated_at)
# Value: explanation string
_explanation_cache: Dict[Tuple[str, str, str], str] = {}


def generate_explanation(recommendation: dict, lang: str = 'en') -> str:
    """
    Generate an LLM-based explanation for a crop price recommendation.
    Uses Groq as primary, falls back to Cerebras on failure.
    Caches results to avoid redundant API calls.

    Args:
        recommendation (dict): Recommendation data containing at least 'series_key', 'action', 'commodity', and 'forecast_generated_at'.
        lang (str): Language code ('en' or 'mr').

    Returns:
        str: The explanation string.
    """
    series_key = recommendation.get('series_key', 'unknown')
    generated_at = recommendation.get('forecast_generated_at', 'unknown')
    cache_key = (series_key, lang, generated_at)

    if cache_key in _explanation_cache:
        logger.debug(f"Returning cached explanation for {cache_key}")
        return _explanation_cache[cache_key]

    historical_analog = recommendation.get('historical_analog', '')
    
    system_prompt = (
        "You are explaining a crop price forecast to a farmer. "
        "Given this JSON data about a crop price recommendation, explain in 2-3 short sentences "
        "why we recommend the given action. No jargon. State the peak day and price plainly. "
        "Be encouraging and practical."
    )
    
    if historical_analog:
        system_prompt += f" ALSO, strictly mention this historical analog in your explanation: '{historical_analog}'"

    if lang == 'mr':
        system_prompt += " Respond entirely in Marathi (Devanagari script). Use simple farmer-friendly language."

    user_message = json.dumps(recommendation, indent=2)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    explanation = None

    # Try Groq primary
    try:
        if GROQ_API_KEY:
            logger.info("Attempting Groq API for explanation generation")
            groq_client = Groq(api_key=GROQ_API_KEY, timeout=10.0)
            
            # fallback logic can be handled internally or with another try catch, but sticking to request
            response = groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=messages,
                temperature=0.4,
                max_tokens=300
            )
            explanation = response.choices[0].message.content.strip()
        else:
            logger.warning("GROQ_API_KEY not found in config.")
    except Exception as e:
        logger.warning(f"Groq API failed: {e}. Falling back to Cerebras.")
        explanation = None

    # Try Cerebras fallback
    if not explanation:
        try:
            if CEREBRAS_API_KEY:
                logger.info("Attempting Cerebras API for explanation generation")
                cerebras_client = Cerebras(api_key=CEREBRAS_API_KEY)
                response = cerebras_client.chat.completions.create(
                    model='llama-3.3-70b',
                    messages=messages,
                    temperature=0.4,
                    max_tokens=300
                )
                explanation = response.choices[0].message.content.strip()
            else:
                logger.warning("CEREBRAS_API_KEY not found in config.")
        except Exception as e:
            logger.error(f"Cerebras API fallback failed: {e}.")
            explanation = None

    # Hardcoded fallback
    if not explanation:
        logger.warning("Both Groq and Cerebras failed. Using hardcoded fallback.")
        action = recommendation.get('action', 'hold')
        commodity = recommendation.get('commodity', 'crop')
        
        if lang == 'mr':
            action_mr_map = {'sell': 'विक्री', 'hold': 'वाट पाहण्याची', 'buy': 'खरेदी'}
            action_mr = action_mr_map.get(action.lower(), action)
            explanation = f"सध्याच्या बाजारभावानुसार, आम्ही तुमचा {commodity} {action_mr} करण्याची शिफारस करतो. तपशीलवार विश्लेषणासाठी कृपया नंतर तपासा."
        else:
            explanation = f"Based on current market trends, we recommend {action} your {commodity}. Please check back later for a detailed analysis."

    _explanation_cache[cache_key] = explanation
    return explanation

def generate_arbitrage_explanation(routing_data: dict, lang: str = 'en') -> str:
    """
    Generate an LLM-based explanation for calculator arbitrage.
    """
    # Simple hash of markets for cache key
    cache_key = ("arbitrage", lang, str(routing_data.get('quantity_qtl')))
    
    if cache_key in _explanation_cache:
        logger.debug(f"Returning cached arbitrage explanation for {cache_key}")
        return _explanation_cache[cache_key]
        
    system_prompt = (
        "You are advising a farmer on where to sell their crop based on a routing cost analysis. "
        "The JSON contains a list of markets with distance_km, transport_cost, mandi_fee, and net_profit. "
        "Explain in 2-3 short sentences why they should travel to the top recommended market instead of the closest one, "
        "comparing the extra profit vs the extra transport cost. Be practical and encouraging."
    )
    if lang == 'mr':
        system_prompt += " Respond entirely in Marathi (Devanagari script). Use simple farmer-friendly language."
        
    user_message = json.dumps(routing_data, indent=2)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    explanation = None
    try:
        if GROQ_API_KEY:
            groq_client = Groq(api_key=GROQ_API_KEY, timeout=10.0)
            response = groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=messages,
                temperature=0.4,
                max_tokens=300
            )
            explanation = response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Groq API failed: {e}. Falling back to Cerebras.")
        
    if not explanation:
        try:
            if CEREBRAS_API_KEY:
                cerebras_client = Cerebras(api_key=CEREBRAS_API_KEY)
                response = cerebras_client.chat.completions.create(
                    model='llama-3.3-70b',
                    messages=messages,
                    temperature=0.4,
                    max_tokens=300
                )
                explanation = response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Cerebras API fallback failed: {e}.")
            
    if not explanation:
        markets = routing_data.get('markets', [])
        if markets and len(markets) > 0:
            top = markets[0]
            if lang == 'mr':
                explanation = f"आम्ही {top.get('name', 'मंडी')} येथे विक्री करण्याचा सल्ला देतो, कारण वाहतूक खर्च वजा जाता तुम्हाला सर्वाधिक नफा मिळेल."
            else:
                explanation = f"We recommend selling at {top.get('name', 'the top market')} to maximize your net profit even after transport costs."
        else:
            explanation = ""
            
    _explanation_cache[cache_key] = explanation
    return explanation


def generate_roadmap_expectation(crop: str, location: str, market: str, lang: str = 'en') -> str:
    """
    Generate an AI-driven roadmap expectation incorporating weather and cross-crop context.
    """
    cache_key = ("roadmap", crop, location, market, lang)
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]
        
    # Get weather summary
    weather_summary = "moderate weather expected"
    try:
        wdf = get_weather_forecast(location)
        if not wdf.empty:
            avg_rain = wdf['rain_mm'].mean()
            if avg_rain > 5.0:
                weather_summary = "heavy rains expected"
            elif avg_rain > 1.0:
                weather_summary = "moderate rain expected"
            else:
                weather_summary = "clear and dry weather expected"
    except:
        pass

    system_prompt = (
        "You are an expert agricultural advisor. "
        "A farmer is planning to harvest and sell a specific crop. "
        "Given the crop, location, and upcoming weather, write a short, strategic 2-sentence paragraph. "
        "Recommend whether to start production/harvesting, which mandi might offer best prices in the future, "
        "or suggest switching crops (e.g., 'don't start potato, go with tomato due to high demand'). "
        "Be assertive and practical."
    )
    if lang == 'mr':
        system_prompt += " Respond entirely in Marathi (Devanagari script). Use simple farmer-friendly language."
        
    user_message = f"Crop: {crop}\nLocation: {location}\nTarget Market: {market}\nUpcoming Weather: {weather_summary}"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    explanation = None
    try:
        if GROQ_API_KEY:
            groq_client = Groq(api_key=GROQ_API_KEY, timeout=10.0)
            response = groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=messages,
                temperature=0.4,
                max_tokens=300
            )
            explanation = response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Groq API failed: {e}. Falling back to Cerebras.")
        
    if not explanation:
        try:
            if CEREBRAS_API_KEY:
                cerebras_client = Cerebras(api_key=CEREBRAS_API_KEY)
                response = cerebras_client.chat.completions.create(
                    model='llama-3.3-70b',
                    messages=messages,
                    temperature=0.4,
                    max_tokens=300
                )
                explanation = response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Cerebras API fallback failed: {e}.")
            
    if not explanation:
        if lang == 'mr':
            explanation = (
                f"In {location}, current weather conditions ({weather_summary}) suggest "
                f"{crop} should perform steadily in {market} over the coming weeks."
            )
        else:
            explanation = f"Given {weather_summary} in {location}, strategically time your {crop} harvest for {market} to maximize returns."
            
    _explanation_cache[cache_key] = explanation
    return explanation

def clear_cache(series_key: Optional[str] = None) -> None:
    """
    Clear cached explanations. If series_key is provided, clear only entries for that series.

    Args:
        series_key (Optional[str]): The series key to clear from cache.
    """
    global _explanation_cache
    if series_key:
        keys_to_delete = [k for k in _explanation_cache.keys() if k[0] == series_key]
        for k in keys_to_delete:
            del _explanation_cache[k]
        logger.info(f"Cleared explanation cache for series_key: {series_key}")
    else:
        _explanation_cache.clear()
        logger.info("Cleared entire explanation cache")

def generate_crop_switch_reasoning(district: str, crops_data: list, lang: str = 'en') -> str:
    """Generate reasoning for why one crop is better than another based on profit margins."""
    best_crop = max(crops_data, key=lambda x: x['net_profit'])
    
    prompt = f"""
    You are an AI agricultural advisor for farmers in Maharashtra.
    The farmer is in {district}.
    Here is the projected net profit (per 50 quintals) for different crops:
    """
    for c in crops_data:
        prompt += f"- {c['crop']}: Rs. {c['net_profit']:,.2f} (Peak Price: Rs. {c['peak_price']})\n"
        
    prompt += f"""
    Recommend planting {best_crop['crop']} over the others. 
    Explain in 3 short, punchy bullet points why {best_crop['crop']} is the most profitable choice right now based on these numbers and general seasonal trends.
    Format as plain text bullets.
    Language: {"Marathi" if lang == 'mr' else "English"}
    """
    
    try:
        messages = [
            {"role": "system", "content": "You are a concise, data-driven agricultural expert."},
            {"role": "user", "content": prompt}
        ]
        
        if GROQ_API_KEY:
            groq_client = Groq(api_key=GROQ_API_KEY, timeout=10.0)
            completion = groq_client.chat.completions.create(
                model=MODEL_ID,
                messages=messages,
                temperature=0.7,
                max_tokens=300
            )
            return completion.choices[0].message.content
            
        if CEREBRAS_API_KEY:
            cerebras_client = Cerebras(api_key=CEREBRAS_API_KEY)
            completion = cerebras_client.chat.completions.create(
                model="llama3.1-8b",
                messages=messages,
                temperature=0.7,
                max_tokens=300
            )
            return completion.choices[0].message.content
            
        raise Exception("No LLM API keys configured")
        
    except Exception as e:
        logger.error(f"LLM API error in crop switch reasoning: {e}")
        return f"Based on current market forecasts, {best_crop['crop']} shows the highest potential profit margin for {district}."
