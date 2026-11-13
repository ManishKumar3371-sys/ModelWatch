
import json
import joblib
import pandas as pd

from pathlib import Path
from datetime import datetime, timezone

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from backend.model_registry import register_trained_model
from backend.training_logger import (
    start_training_run,
    finish_training_run,
    install_failure_handler
)

# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_FILE = BASE_DIR / "datasets" / "property_prices.csv"
MODEL_DIR = BASE_DIR / "trained_models"
REPORT_DIR = BASE_DIR / "experiments"

MODEL_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODEL_DIR / "property_price_model.pkl"
METRICS_PATH = REPORT_DIR / "training_metrics.json"

# Start training run logging
training_run = start_training_run()
install_failure_handler(training_run)

# Load dataset
data = pd.read_csv(DATASET_FILE)

print("Dataset loaded successfully!")
print("Total records:", len(data))

# Required columns
FEATURES = [
    "city",
    "property_type",
    "locality",
    "area_sqft",
    "area_basis",
    "bedrooms",
    "property_age",
    "price_type"
]

TARGET = "price_inr"

required_columns = FEATURES + [TARGET]

missing_columns = [
    column for column in required_columns
    if column not in data.columns
]

if missing_columns:
    raise ValueError(
        f"Missing required columns: {missing_columns}"
    )

# Prepare data
data = data[required_columns].copy()

data[TARGET] = pd.to_numeric(
    data[TARGET], errors="coerce"
)

data["area_sqft"] = pd.to_numeric(
    data["area_sqft"], errors="coerce"
)

data["bedrooms"] = pd.to_numeric(
    data["bedrooms"], errors="coerce"
)

data = data.dropna(subset=[TARGET, "area_sqft"])

data = data[
    (data[TARGET] > 0) &
    (data["area_sqft"] > 0)
]

if len(data) < 10:
    raise ValueError(
        "At least 10 valid property records are required "
        "for this training experiment. Current records: "
        f"{len(data)}"
    )

X = data[FEATURES]
y = data[TARGET]

# Identify feature types
NUMERIC_FEATURES = [
    "area_sqft",
    "bedrooms"
]

CATEGORICAL_FEATURES = [
    "city",
    "property_type",
    "locality",
    "area_basis",
    "property_age",
    "price_type"
]

# Numeric preprocessing
numeric_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median"))
    ]
)

# Categorical preprocessing
categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="most_frequent")
        ),
        (
            "encoder",
            OneHotEncoder(handle_unknown="ignore")
        )
    ]
)

# Combine preprocessing
preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        (
            "categorical",
            categorical_pipeline,
            CATEGORICAL_FEATURES
        )
    ]
)

# Complete ML pipeline
model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                max_depth=16,
                random_state=42,
                min_samples_leaf=1
            )
        )
    ]
)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# Train model
model.fit(X_train, y_train)

# Predictions
predictions = model.predict(X_test)

# Evaluation
mae = mean_absolute_error(y_test, predictions)
mse = mean_squared_error(y_test, predictions)
rmse = mse ** 0.5
r2 = r2_score(y_test, predictions)

# Model will be saved as a version by the model registry.

# Save training metrics
metrics = {
    "model_name": "Property Price Random Forest",
    "dataset": "property_prices.csv",
    "records": int(len(data)),
    "training_samples": int(len(X_train)),
    "testing_samples": int(len(X_test)),
    "features": FEATURES,
    "target": TARGET,
    "mae": float(mae),
    "mse": float(mse),
    "rmse": float(rmse),
    "r2_score": float(r2),
    "trained_at": datetime.now(timezone.utc).isoformat()
}

with open(METRICS_PATH, "w", encoding="utf-8") as file:
    json.dump(metrics, file, indent=4)

# Register the successfully trained model as a new version.
registered_model = register_trained_model(model, metrics)

# Save successful training run log
training_log = finish_training_run(
    training_run,
    status="SUCCESS",
    details={
        "model_version": registered_model["version"],
        "algorithm": "RandomForestRegressor",
        "dataset": DATASET_FILE.name,
        "records": int(len(data)),
        "training_samples": int(len(X_train)),
        "testing_samples": int(len(X_test)),
        "mae": float(mae),
        "mse": float(mse),
        "rmse": float(rmse),
        "r2_score": float(r2)
    }
)

print("Training Run ID:", training_log["run_id"])
print("Training Duration:", training_log["duration_seconds"], "seconds")


print("\nModel Training Completed!")
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))
print("MAE:", round(mae, 2))
print("MSE:", round(mse, 2))
print("RMSE:", round(rmse, 2))
print("R2 Score:", round(r2, 3))

print("\nModel version saved:", registered_model["model_path"])
print("Active version:", registered_model["version"])
print("Metrics saved:", METRICS_PATH)
