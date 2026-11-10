import joblib
import pandas as pd

# Load trained model
model = joblib.load("models/house_price_model.pkl")

# Sample house details
house = pd.DataFrame({
    "area": [1500],
    "bedrooms": [3],
    "age": [5]
})

# Predict price
prediction = model.predict(house)

print("House Details:")
print(house)

print("\nPredicted House Price:", round(prediction[0], 2), "Lakhs")