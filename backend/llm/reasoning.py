import json
import logging
from typing import Dict, Optional, Tuple

from groq import Groq
from cerebras.cloud.sdk import Cerebras

from api.config import GROQ_API_KEY, CEREBRAS_API_KEY

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

    system_prompt = (
        "You are explaining a crop price forecast to a farmer. "
        "Given this JSON data about a crop price recommendation, explain in 2-3 short sentences "
        "why we recommend the given action. No jargon. State the peak day and price plainly. "
        "Be encouraging and practical."
    )

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
