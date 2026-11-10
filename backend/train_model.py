import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_FILE = BASE_DIR / "datasets" / "reference.csv"
MODEL_DIR = BASE_DIR / "trained_models"

MODEL_DIR.mkdir(exist_ok=True)

# Load dataset
data = pd.read_csv(DATASET_FILE)

# Input and target
X = data[["area", "bedrooms", "age"]]
y = data["price"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train ML model
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# Evaluate model
predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
rmse = mean_squared_error(y_test, predictions) ** 0.5
r2 = r2_score(y_test, predictions)

print("Model Training Completed!")
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))
print("MAE:", round(mae, 2))
print("RMSE:", round(rmse, 2))
print("R2 Score:", round(r2, 3))

# Save model
MODEL_PATH = MODEL_DIR / "house_price_model.pkl"
joblib.dump(model, MODEL_PATH)

print("Model saved successfully!")
print("Location:", MODEL_PATH)