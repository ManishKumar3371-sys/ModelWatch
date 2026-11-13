import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
df = pd.read_csv(BASE_DIR / "datasets" / "property_prices.csv")

# Sample 60 properties and simulate a market shift (drift in area and price)
sample = df.sample(n=60, random_state=123).copy()

# Add a realistic drift: recent quarterly inflation + higher proportion of compact luxury apartments
sample["area_sqft"] = (sample["area_sqft"] * 1.35).round(1)
sample["price_inr"] = (sample["price_inr"] * 1.48).round(-4)
sample["collected_date"] = "2026-11-13"

sample.to_csv(BASE_DIR / "datasets" / "new_data.csv", index=False)
print("Realistic drift dataset created: 60 records with intentional distribution shift.")
