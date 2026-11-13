
import joblib
import pandas as pd
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "trained_models" / "property_price_model.pkl"

# Load trained model
model = joblib.load(MODEL_PATH)


def predict_property_price(
    city,
    property_type,
    locality,
    area_sqft,
    area_basis,
    bedrooms=None,
    property_age=None,
    price_type="Asking"
):
    # Prepare input data
    property_data = pd.DataFrame([{
        "city": city,
        "property_type": property_type,
        "locality": locality,
        "area_sqft": area_sqft,
        "area_basis": area_basis,
        "bedrooms": bedrooms,
        "property_age": property_age,
        "price_type": price_type
    }])

    # Predict price in INR
    prediction = model.predict(property_data)[0]

    return max(0, float(prediction))


if __name__ == "__main__":

    predicted_price = predict_property_price(
        city="Pune",
        property_type="Flat",
        locality="Baner",
        area_sqft=1000,
        area_basis="Carpet",
        bedrooms=2,
        property_age="5-10 years",
        price_type="Asking"
    )

    print("Predicted Property Price:")
    print(f"INR {predicted_price:,.2f}")
    print(f"INR {predicted_price / 100000:.2f} Lakhs")
