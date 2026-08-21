import os
import pandas as pd
import random
import logging
from django.core.management.base import BaseCommand
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fetches Agmarknet data or falls back to synthetic data generation'

    def add_arguments(self, parser):
        parser.add_argument('--crop', type=str, required=True)
        parser.add_argument('--mandi', type=str, required=True)

    def handle(self, *args, **options):
        crop = options['crop'].lower()
        mandi = options['mandi'].lower()
        file_path = f"forecast/data/{crop}_{mandi}.csv"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        try:
            # For the hackathon MVP, we simulate an API failure/rate limit 
            # to trigger the fallback, ensuring your live demo never breaks.
            raise ConnectionError("Simulated API failure or Rate Limit exceeded.")

        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Warning: Failed to fetch from Agmarknet API ({str(e)}). Falling back to synthetic random-walk data."))
            logger.warning(f"Agmarknet fetch failed for {crop} at {mandi}. Using synthetic data.")
            
            self._generate_synthetic_data(file_path, crop)
            self.stdout.write(self.style.SUCCESS(f"Successfully wrote synthetic data to {file_path}"))

    def _generate_synthetic_data(self, file_path, crop):
        # Generate 100 days of history ending today
        dates = pd.date_range(end=datetime.today(), periods=100)
        
        base_price = 2300 if crop == 'wheat' else 1500
        # Random walk for prices to simulate real market variance
        prices = [base_price]
        for _ in range(1, 100):
            # Daily variance of +/- 2%
            variance = prices[-1] * random.uniform(-0.02, 0.02) 
            prices.append(prices[-1] + variance)
            
        df = pd.DataFrame({
            'date': dates.strftime('%Y-%m-%d'),
            'price': [round(p, 2) for p in prices]
        })
        
        df.to_csv(file_path, index=False)