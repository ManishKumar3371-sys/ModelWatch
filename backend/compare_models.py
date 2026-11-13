import json
import pandas as pd

from pathlib import Path

from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.model_selection import KFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer


BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_FILE = BASE_DIR / "datasets" / "property_prices_experiment.csv"
REPORT_FILE = BASE_DIR / "experiments" / "model_comparison.json"


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

data = pd.read_csv(DATASET_FILE)

data = data[FEATURES + [TARGET]].copy()

data[TARGET] = pd.to_numeric(data[TARGET], errors="coerce")
data["area_sqft"] = pd.to_numeric(data["area_sqft"], errors="coerce")
data["bedrooms"] = pd.to_numeric(data["bedrooms"], errors="coerce")

data = data.dropna(subset=[TARGET, "area_sqft"])
data = data[(data[TARGET] > 0) & (data["area_sqft"] > 0)]

if len(data) < 10:
    raise ValueError("At least 10 valid records are required.")

X = data[FEATURES]
y = data[TARGET]

NUMERIC_FEATURES = ["area_sqft", "bedrooms"]

CATEGORICAL_FEATURES = [
    "city",
    "property_type",
    "locality",
    "area_basis",
    "property_age",
    "price_type"
]


def create_pipeline(regressor, scale_numeric=False):

    numeric_steps = [
        ("imputer", SimpleImputer(strategy="median"))
    ]

    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))

    numeric_pipeline = Pipeline(steps=numeric_steps)

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore"))
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES)
        ]
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor)
        ]
    )


models = {
    "Dummy Regressor": create_pipeline(
        DummyRegressor(strategy="median")
    ),
    "Ridge Regression": create_pipeline(
        Ridge(alpha=10.0),
        scale_numeric=True
    ),
    "Random Forest": create_pipeline(
        RandomForestRegressor(
            n_estimators=200,
            min_samples_leaf=2,
            random_state=42
        )
    ),
    "Extra Trees": create_pipeline(
        ExtraTreesRegressor(
            n_estimators=200,
            min_samples_leaf=2,
            random_state=42
        )
    )
}


cv = KFold(n_splits=5, shuffle=True, random_state=42)

scoring = {
    "mae": "neg_mean_absolute_error",
    "rmse": "neg_root_mean_squared_error",
    "r2": "r2"
}

results = []

print("Model comparison started...")
print("Dataset records:", len(data))
print("Cross-validation folds: 5")
print("-" * 60)

for name, model in models.items():

    scores = cross_validate(
        model,
        X,
        y,
        cv=cv,
        scoring=scoring,
        error_score="raise"
    )

    result = {
        "model": name,
        "mae": round(float(-scores["test_mae"].mean()), 2),
        "rmse": round(float(-scores["test_rmse"].mean()), 2),
        "r2": round(float(scores["test_r2"].mean()), 4)
    }

    results.append(result)

    print("\nModel:", name)
    print("MAE:", result["mae"])
    print("RMSE:", result["rmse"])
    print("R2:", result["r2"])


results.sort(key=lambda item: item["mae"])

REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)

report = {
    "dataset": DATASET_FILE.name,
    "records": int(len(data)),
    "cross_validation": "5-fold",
    "results": results,
    "best_model_by_mae": results[0]["model"],
    "warning": (
        "Small dataset. Results are experimental and "
        "not reliable market valuation estimates."
    )
}

with open(REPORT_FILE, "w", encoding="utf-8") as file:
    json.dump(report, file, indent=4)

print("\n" + "=" * 60)
print("BEST MODEL BY MAE:", results[0]["model"])
print("Comparison report saved:", REPORT_FILE)
print("=" * 60)
