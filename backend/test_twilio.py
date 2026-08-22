import os
from api.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
from alerts.twilio_alerts import send_whatsapp_alert
import sys

def test_twilio(phone):
    print(f"Testing Twilio WhatsApp to: {phone}")
    print(f"Using SID: {TWILIO_ACCOUNT_SID[:5]}...")
    print(f"From: {TWILIO_WHATSAPP_FROM}")
    
    result = send_whatsapp_alert(phone, "Hello from KrushakSetu! 🌾 Your Twilio WhatsApp integration is working perfectly.")
    print(f"Result: {result}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_twilio(sys.argv[1])
    else:
        print("Please provide a phone number")
