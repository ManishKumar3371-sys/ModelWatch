"""
ModelWatch Automated Continuous Retraining Pipeline
Blends incoming drift datasets with reference data, trains a candidate Random Forest regressor,
evaluates metrics against active production model, and registers/promotes the candidate.
"""

from datetime import datetime, timezone
from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent.parent
REFERENCE_CSV = BASE_DIR / "datasets" / "property_prices.csv"
NEW_DATA_CSV = BASE_DIR / "datasets" / "new_data.csv"
MODEL_REGISTRY_JSON = BASE_DIR / "experiments" / "model_registry.json"
TRAINED_MODELS_DIR = BASE_DIR / "trained_models"
VERSIONS_DIR = TRAINED_MODELS_DIR / "versions"
ACTIVE_MODEL_PKL = TRAINED_MODELS_DIR / "property_price_model.pkl"

def run_continuous_retraining(auto_promote: bool = False, custom_data_path: Path | None = None) -> dict:
    if not REFERENCE_CSV.exists():
        raise FileNotFoundError(f"Reference dataset not found at {REFERENCE_CSV}")

    ref_df = pd.read_csv(REFERENCE_CSV)
    new_data_file = custom_data_path or NEW_DATA_CSV

    if new_data_file.exists():
        try:
            new_df = pd.read_csv(new_data_file)
            common_cols = [c for c in ref_df.columns if c in new_df.columns]
            combined_df = pd.concat([ref_df[common_cols], new_df[common_cols]], ignore_index=True)
            combined_df = combined_df.drop_duplicates(subset=["city", "locality", "property_type", "area_sqft", "price_inr"])
        except Exception:
            combined_df = ref_df
    else:
        combined_df = ref_df

    # Target and features
    combined_df = combined_df.dropna(subset=["price_inr", "area_sqft", "locality", "property_type"])
    
    # Feature engineering / dummy encoding matching train_model.py
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.pipeline import Pipeline

    features = [
        "city",
        "property_type",
        "locality",
        "area_sqft",
        "area_basis",
        "bedrooms",
        "property_age",
        "price_type"
    ]
    
    available_features = [f for f in features if f in combined_df.columns]
    X = combined_df[available_features]
    y = combined_df["price_inr"]

    # Stratified/Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    categorical_cols = [c for c in ["city", "property_type", "locality", "area_basis", "property_age", "price_type"] if c in X.columns]
    numerical_cols = [c for c in ["area_sqft", "bedrooms"] if c in X.columns]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols)
        ],
        remainder="passthrough"
    )

    candidate_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=220, max_depth=18, min_samples_split=3, random_state=42))
    ])

    candidate_pipeline.fit(X_train, y_train)

    # Evaluate
    preds = candidate_pipeline.predict(X_test)
    candidate_r2 = round(float(r2_score(y_test, preds)), 4)
    candidate_mae = round(float(mean_absolute_error(y_test, preds)), 2)
    candidate_rmse = round(float(mean_squared_error(y_test, preds) ** 0.5), 2)

    # Read registry
    from backend.model_registry import load_registry, save_registry

    registry_data = load_registry()
    models = registry_data.get("models", [])
    active_version = registry_data.get("active_version")

    active_model = next((m for m in models if m.get("version") == active_version), None)
    active_r2 = active_model.get("r2_score", 0.0) if active_model else 0.0

    # Determine next version
    existing_versions = [m.get("version", "") for m in models]
    next_ver_num = len(existing_versions) + 1
    new_version = f"v{next_ver_num}"

    VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    version_filename = f"{new_version}_property_price_model.pkl"
    version_save_path = VERSIONS_DIR / version_filename
    joblib.dump(candidate_pipeline, version_save_path)

    # Decision on promotion
    should_promote = auto_promote or (candidate_r2 >= active_r2 and candidate_r2 > 0.65)

    if should_promote:
        for m in models:
            m["status"] = "Archived" if m.get("version") == "v1" else "Inactive"

        # Copy to active model path
        joblib.dump(candidate_pipeline, ACTIVE_MODEL_PKL)
        registry_data["active_version"] = new_version
        status_label = "Active"
    else:
        status_label = "Inactive"

    new_model_record = {
        "version": new_version,
        "model_name": f"Continuous Retrained Random Forest ({new_version})",
        "algorithm": "RandomForestRegressor (Auto-Retrained)",
        "model_path": f"trained_models/versions/{version_filename}",
        "dataset": "property_prices_merged.csv",
        "records": len(combined_df),
        "training_samples": len(y_train),
        "testing_samples": len(y_test),
        "features": available_features,
        "target": "price_inr",
        "mae": candidate_mae,
        "mse": round(candidate_rmse ** 2, 2),
        "r2_score": candidate_r2,
        "parameters": {
            "n_estimators": 220,
            "max_depth": 18,
            "min_samples_split": 3
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "status": status_label,
        "notes": f"Auto-retrained on {len(combined_df)} records. R2 delta: {candidate_r2 - active_r2:+.4f}"
    }

    models.append(new_model_record)
    registry_data["models"] = models
    save_registry(registry_data)

    return {
        "status": "success",
        "new_version": new_version,
        "candidate_r2": candidate_r2,
        "candidate_mae": candidate_mae,
        "candidate_rmse": candidate_rmse,
        "active_r2": active_r2,
        "r2_improvement": round(candidate_r2 - active_r2, 4),
        "is_promoted_to_active": should_promote,
        "total_training_records": len(combined_df),
        "test_samples": len(y_test)
    }

if __name__ == "__main__":
    res = run_continuous_retraining(auto_promote=False)
    print("Auto-retrain execution result:", json.dumps(res, indent=2))
