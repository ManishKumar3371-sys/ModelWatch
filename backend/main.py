import os
import json
from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4
from typing import Literal
import joblib
import pandas as pd
from pathlib import Path
from pydantic import BaseModel
from backend.drift_detection import detect_drift
from backend.email_alert import send_high_drift_alert
from backend.model_registry import (
    get_active_model,
    get_all_models,
    set_active_model
)
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="ModelWatch API",
    description="ML Model Monitoring and Drift Detection Platform",
    version="1.0.0"
)
# House Price Prediction Model

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "trained_models"
    / "property_price_model.pkl"
)
HISTORY_PATH = (
    BASE_DIR
    / "experiments"
    / "prediction_history.json"
)


class HousePredictionInput(BaseModel):
    city: str
    property_type: Literal[
        "Flat",
        "Independent House",
        "Plot"
    ]
    locality: str
    area_sqft: float = Field(gt=0)
    area_basis: str
    bedrooms: int | None = Field(default=None, ge=1)
    property_age: str | None = None
    price_type: Literal["Asking", "Registered"] = "Asking"


@app.post("/predict-house-price")
def predict_house_price(data: HousePredictionInput):

    active_model = get_active_model()

    if active_model is None:
        raise HTTPException(
            status_code=500,
            detail="No active model found in registry. Register a model first."
        )

    active_model_path = BASE_DIR / active_model["model_path"]

    if not active_model_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Active model file not found. Check the model registry."
        )

    try:
        house_price_model = joblib.load(active_model_path)

        input_data = pd.DataFrame([{
            "city": data.city,
            "property_type": data.property_type,
            "locality": data.locality,
            "area_sqft": data.area_sqft,
            "area_basis": data.area_basis,
            "bedrooms": data.bedrooms,
            "property_age": data.property_age,
            "price_type": data.price_type
        }])

        prediction = house_price_model.predict(input_data)[0]
        # Save prediction history
        history = load_json_file(HISTORY_PATH)

        history_record = {
            "id": max((item.get("id", 0) for item in history), default=0) + 1,
            "timestamp": current_timestamp(),
            "city": data.city,
            "property_type": data.property_type,
            "locality": data.locality,
            "area_sqft": data.area_sqft,
            "area_basis": data.area_basis,
            "bedrooms": data.bedrooms,
            "property_age": data.property_age,
            "price_type": data.price_type,
            "predicted_price": round(float(prediction), 2),
            "model": active_model.get(
                "model_name", "Property Price Random Forest"
            ),
            "model_version": active_model["version"]
        }

        HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        history.append(history_record)
        save_json_file(HISTORY_PATH, history)


        return {
            "status": "success",
            "predicted_price": round(float(prediction), 2),
            "currency": "INR",
            "model": active_model.get(
                "model_name", "Property Price Random Forest"
            ),
            "model_version": active_model["version"],
            "warning": "Experimental estimate based on a small dataset; not a verified market valuation."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )
@app.get("/prediction-history")
def get_prediction_history():
    history = load_json_file(HISTORY_PATH)

    return {
        "status": "success",
        "total_predictions": len(history),
        "history": list(reversed(history))
    }
@app.delete("/prediction-history/{prediction_id}")
def delete_prediction(prediction_id: int):

    history = load_json_file(HISTORY_PATH)

    updated_history = [
        item for item in history
        if item.get("id") != prediction_id
    ]

    if len(updated_history) == len(history):
        raise HTTPException(
            status_code=404,
            detail="Prediction not found"
        )

    save_json_file(HISTORY_PATH, updated_history)

    return {
        "status": "success",
        "message": "Prediction deleted successfully",
        "deleted_id": prediction_id
    }
# CORS configuration
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]
custom_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
cors_origins = custom_origins if custom_origins else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dataset and storage paths
DATASET_DIR = BASE_DIR / "datasets"

REFERENCE_FILE = DATASET_DIR / "property_prices.csv"
NEW_DATA_FILE = DATASET_DIR / "new_data.csv"
PERFORMANCE_HISTORY_FILE = DATASET_DIR / "performance_history.json"
DRIFT_HISTORY_FILE = DATASET_DIR / "drift_history.json"
MODEL_REGISTRY_FILE = DATASET_DIR / "models.json"
PROPERTY_DATA_FILE = DATASET_DIR / "property_prices.csv"


# -----------------------------
# Model Registry Request Schemas
# -----------------------------

class ModelCreate(BaseModel):
    model_name: str = Field(min_length=2, max_length=100)
    algorithm: str = Field(min_length=2, max_length=100)
    description: str = ""
    version: str = Field(default="v1.0", min_length=1, max_length=30)


class ModelVersionCreate(BaseModel):
    version: str = Field(min_length=1, max_length=30)
    notes: str = ""


class ModelStatusUpdate(BaseModel):
    status: Literal["Active", "Inactive", "Archived"]


# -----------------------------
# General Helper Functions
# -----------------------------

def current_timestamp():
    return datetime.now(timezone.utc).isoformat()


def load_json_file(file_path):
    if not file_path.exists():
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        return data if isinstance(data, list) else []

    except (json.JSONDecodeError, OSError):
        return []


def save_json_file(file_path, data):
    DATASET_DIR.mkdir(parents=True, exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)


# -----------------------------
# Home and Health Endpoints
# -----------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to ModelWatch API",
        "status": "Running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": "ModelWatch"
    }
@app.post("/detect-drift")
async def detect_drift_api(
    reference_file: UploadFile = File(...),
    new_file: UploadFile = File(...)
):
    try:
        reference_data = pd.read_csv(reference_file.file)
        new_data = pd.read_csv(new_file.file)

        report = detect_drift(reference_data, new_data)

        return {
    "status": "success",
    **report
}

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )



@app.get("/drift-report")
def get_drift_report():

    if not REFERENCE_FILE.exists() or not NEW_DATA_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Reference or new dataset not found"
        )

    reference_data = pd.read_csv(REFERENCE_FILE)
    new_data = pd.read_csv(NEW_DATA_FILE)

    report = detect_drift(reference_data, new_data)

    history = load_json_file(DRIFT_HISTORY_FILE)
    latest = history[-1] if history else {}

    return {
        "filename": latest.get("filename", NEW_DATA_FILE.name),
        "uploaded_at": latest.get("uploaded_at"),
        "report_generated_at": latest.get("report_generated_at"),
        **report
    }


@app.get("/drift-history")
def get_drift_history():

    history = load_json_file(DRIFT_HISTORY_FILE)

    return {
        "total_reports": len(history),
        "history": list(reversed(history))
    }




@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    if not REFERENCE_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Reference dataset not found"
        )
    try:
        contents = await file.read()
        new_data = pd.read_csv(BytesIO(contents))
        reference_data = pd.read_csv(REFERENCE_FILE)

        if new_data.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV is empty"
            )

        report = detect_drift(reference_data, new_data)

        # Generate HIGH severity drift alerts
        high_drift_features = [
            item.get("feature")
            for item in report.get("results", [])
            if item.get("status") != "INSUFFICIENT DATA"
            and item.get("severity") == "HIGH"
        ]

        has_alert = len(high_drift_features) > 0

        alert = {
            "has_alert": has_alert,
            "alert_level": "HIGH" if has_alert else "NONE",
            "alert_message": (
                f"High drift detected in: {', '.join(high_drift_features)}"
                if has_alert
                else "No high severity drift detected"
            ),
            "alert_features": high_drift_features
        }

        report.update(alert)
        new_data.to_csv(NEW_DATA_FILE, index=False)

        timestamp = current_timestamp()

        history_record = {
            "filename": file.filename,
            "uploaded_at": timestamp,
            "report_generated_at": timestamp,
            **report
        }

        history = load_json_file(DRIFT_HISTORY_FILE)
        history.append(history_record)
        save_json_file(DRIFT_HISTORY_FILE, history)

                # Debug HIGH drift email trigger
        print("[ModelWatch] has_alert:", has_alert)

        email_status = "NOT_REQUIRED"

        if has_alert:
            print("[ModelWatch] HIGH drift detected. Sending email...")

            email_sent = await send_high_drift_alert(
                file.filename,
                high_drift_features
            )

            print("[ModelWatch] Email send result:", email_sent)

            if email_sent:
                email_status = "SENT"
            else:
                email_status = "FAILED"

        else:
            print("[ModelWatch] No HIGH drift. Email not required.")
            history_record["email_status"] = email_status
        history[-1]["email_status"] = email_status

        save_json_file(DRIFT_HISTORY_FILE, history)
        return history_record

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV file"
        )

    except pd.errors.ParserError:
        raise HTTPException(
            status_code=400,
            detail="Unable to parse CSV"
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=400,
            detail=str(ve)
        )


        # -----------------------------
# Bulk Property Dataset Import
# -----------------------------

PROPERTY_COLUMNS = [
    "property_id",
    "city",
    "property_type",
    "locality",
    "area_sqft",
    "area_basis",
    "bedrooms",
    "property_age",
    "price_inr",
    "price_type",
    "source_name",
    "source_url",
    "collected_date"
]


@app.post("/import-properties")
async def import_properties(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    try:
        contents = await file.read()

        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 5 MB"
            )

        uploaded_data = pd.read_csv(BytesIO(contents))

        if uploaded_data.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV is empty"
            )

        missing_columns = [
            col for col in PROPERTY_COLUMNS
            if col not in uploaded_data.columns
        ]

        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Missing required columns",
                    "missing_columns": missing_columns
                }
            )

        uploaded_data = uploaded_data[PROPERTY_COLUMNS].copy()

        # Load existing property dataset
        if PROPERTY_DATA_FILE.exists():
            existing_data = pd.read_csv(PROPERTY_DATA_FILE)
        else:
            existing_data = pd.DataFrame(columns=PROPERTY_COLUMNS)

        existing_ids = set(
            existing_data["property_id"].dropna().astype(str).str.strip()
        )

        seen_ids = set()
        valid_rows = []
        rejected_rows = []

        required_fields = [
            "property_id",
            "city",
            "property_type",
            "locality",
            "area_sqft",
            "area_basis",
            "price_inr",
            "price_type",
            "source_name",
            "source_url",
            "collected_date"
        ]

        for index, row in uploaded_data.iterrows():

            row_number = index + 2
            errors = []

            property_id = str(row["property_id"]).strip()

            # Check required fields
            for field in required_fields:
                value = row[field]

                if pd.isna(value) or str(value).strip() == "":
                    errors.append(f"{field} is required")

            # Check duplicate property ID
            if property_id in existing_ids:
                errors.append("Property ID already exists in dataset")

            if property_id in seen_ids:
                errors.append("Duplicate Property ID in uploaded CSV")

            seen_ids.add(property_id)

            # Validate area
            try:
                area = float(row["area_sqft"])
                if area <= 0:
                    errors.append("Area must be greater than zero")
            except (ValueError, TypeError):
                errors.append("Invalid area value")

            # Validate price
            try:
                price = float(row["price_inr"])
                if price <= 0:
                    errors.append("Price must be greater than zero")
            except (ValueError, TypeError):
                errors.append("Invalid price value")

            # Validate property type
            if row["property_type"] not in [
                "Flat",
                "Independent House",
                "Plot"
            ]:
                errors.append("Invalid property type")

            # Validate price type
            if row["price_type"] not in ["Asking", "Registered"]:
                errors.append("Invalid price type")

            # Validate URL
            source_url = str(row["source_url"]).strip()

            if not (
                source_url.startswith("http://")
                or source_url.startswith("https://")
            ):
                errors.append("Invalid source URL")

            if errors:
                rejected_rows.append({
                    "row": row_number,
                    "property_id": property_id,
                    "errors": errors
                })
            else:
                row["property_id"] = property_id
                row["area_sqft"] = area
                row["price_inr"] = price
                valid_rows.append(row)

        # Save valid records only
        if valid_rows:

            new_records = pd.DataFrame(
                valid_rows,
                columns=PROPERTY_COLUMNS
            )

            combined_data = pd.concat(
                [existing_data, new_records],
                ignore_index=True
            )

            temp_file = PROPERTY_DATA_FILE.with_suffix(".tmp")

            combined_data.to_csv(temp_file, index=False)
            temp_file.replace(PROPERTY_DATA_FILE)

        total_records = (
            len(existing_data) + len(valid_rows)
        )

        return {
            "status": "success",
            "imported_count": len(valid_rows),
            "rejected_count": len(rejected_rows),
            "total_records": total_records,
            "rejected_rows": rejected_rows
        }

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="Invalid or empty CSV file"
        )

    except pd.errors.ParserError:
        raise HTTPException(
            status_code=400,
            detail="Unable to parse CSV file"
        )


# -----------------------------
# Performance History
# -----------------------------

def load_performance_history():
    return load_json_file(PERFORMANCE_HISTORY_FILE)


@app.get("/performance-history")
def get_performance_history():

    history = load_performance_history()

    return {
        "total_evaluations": len(history),
        "history": history
    }


# -----------------------------
# Model Performance Evaluation
# -----------------------------

@app.post("/evaluate-model")
async def evaluate_model(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )
    if "regression" in file.filename.lower():
        raise HTTPException(
        status_code=400,
        detail="This is a regression dataset. Please use Regression Evaluation."
    )

    try:
        contents = await file.read()
        data = pd.read_csv(BytesIO(contents))

        required_columns = ["actual", "predicted"]

        if not all(column in data.columns for column in required_columns):
            raise HTTPException(
                status_code=400,
                detail="CSV must contain actual and predicted columns"
            )

        if data.empty:
            raise HTTPException(
                status_code=400,
                detail="CSV file is empty"
            )

        if data[required_columns].isnull().any().any():
            raise HTTPException(
                status_code=400,
                detail="CSV contains missing values"
            )

        actual = data["actual"]
        predicted = data["predicted"]

        accuracy = accuracy_score(actual, predicted)

        precision = precision_score(
            actual,
            predicted,
            average="weighted",
            zero_division=0
        )

        recall = recall_score(
            actual,
            predicted,
            average="weighted",
            zero_division=0
        )

        f1 = f1_score(
            actual,
            predicted,
            average="weighted",
            zero_division=0
        )

        result = {
            "evaluation_type": "classification",
             "filename": file.filename,
            "evaluated_at": current_timestamp(),
            "total_predictions": int(len(data)),
            "metrics": {
                "accuracy": round(float(accuracy), 4),
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1_score": round(float(f1), 4)
            },
            "status": "Performance evaluation successful"
        }

        history = load_performance_history()
        history.append(result)

        save_json_file(PERFORMANCE_HISTORY_FILE, history)

        return result

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV file"
        )

    except pd.errors.ParserError:
        raise HTTPException(
            status_code=400,
            detail="Unable to parse CSV"
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=400,
            detail=str(ve)
        )
    # -----------------------------
# Regression Model Evaluation
# -----------------------------

@app.post("/evaluate-regression")
async def evaluate_regression(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )
    if "performance" in file.filename.lower():
        raise HTTPException(
        status_code=400,
        detail="This is a classification dataset. Please use Classification Evaluation."
    )
    try:
        contents = await file.read()
        data = pd.read_csv(BytesIO(contents))

        required_columns = ["actual", "predicted"]

        if not all(column in data.columns for column in required_columns):
            raise HTTPException(
                status_code=400,
                detail="CSV must contain actual and predicted columns"
            )

        if len(data) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 predictions are required"
            )

        actual = pd.to_numeric(data["actual"], errors="coerce")
        predicted = pd.to_numeric(data["predicted"], errors="coerce")

        if actual.isnull().any() or predicted.isnull().any():
            raise HTTPException(
                status_code=400,
                detail="Actual and predicted must contain valid numeric values"
            )

        mae = mean_absolute_error(actual, predicted)
        mse = mean_squared_error(actual, predicted)
        rmse = mse ** 0.5
        r2 = r2_score(actual, predicted)

        result = {
            "evaluation_type": "regression",
            "filename": file.filename,
            "evaluated_at": current_timestamp(),
            "total_predictions": int(len(data)),
            "metrics": {
                "mae": round(float(mae), 4),
                "mse": round(float(mse), 4),
                "rmse": round(float(rmse), 4),
                "r2_score": round(float(r2), 4)
            },
            "status": "Regression evaluation successful"
        }

        history = load_performance_history()
        history.append(result)

        save_json_file(PERFORMANCE_HISTORY_FILE, history)

        return result

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV file"
        )

    except pd.errors.ParserError:
        raise HTTPException(
            status_code=400,
            detail="Unable to parse CSV file"
        )
# -----------------------------
# PROPERTY DATASET MANAGEMENT
# -----------------------------

@app.get("/property-dataset")
def get_property_dataset():

    if not PROPERTY_DATA_FILE.exists():
        return {
            "total_records": 0,
            "properties": []
        }

    try:
        data = pd.read_csv(PROPERTY_DATA_FILE)
        data = data.astype(object).where(pd.notna(data), "")

        return {
            "total_records": len(data),
            "properties": data.to_dict(orient="records")
        }

    except pd.errors.EmptyDataError:
        return {
            "total_records": 0,
            "properties": []
        }

# -----------------------------
# MODEL REGISTRATION & VERSION MANAGEMENT
# -----------------------------

def load_models():
    return load_json_file(MODEL_REGISTRY_FILE)


def save_models(models):
    save_json_file(MODEL_REGISTRY_FILE, models)


# Register a new model
@app.post("/models", status_code=201)
def register_model(model: ModelCreate):

    models = load_models()

    new_model = {
        "model_id": str(uuid4()),
        "model_name": model.model_name.strip(),
        "algorithm": model.algorithm.strip(),
        "description": model.description.strip(),
        "status": "Active",
        "current_version": model.version.strip(),
        "versions": [
            {
                "version": model.version.strip(),
                "notes": "Initial model version",
                "created_at": current_timestamp()
            }
        ],
        "created_at": current_timestamp(),
        "updated_at": current_timestamp()
    }

    if not new_model["model_name"] or not new_model["algorithm"]:
        raise HTTPException(
            status_code=400,
            detail="Model name and algorithm cannot be empty"
        )

    models.append(new_model)
    save_models(models)

    return {
        "message": "Model registered successfully",
        "model": new_model
    }


# Get all registered models
@app.get("/models")
def get_models():

    models = load_models()

    return {
        "total_models": len(models),
        "models": models
    }


# Get one model by ID
@app.get("/models/{model_id}")
def get_model(model_id: str):

    models = load_models()

    for model in models:
        if model["model_id"] == model_id:
            return model

    raise HTTPException(
        status_code=404,
        detail="Model not found"
    )


# Add a new version to an existing model
@app.post("/models/{model_id}/versions")
def add_model_version(model_id: str, version_data: ModelVersionCreate):

    models = load_models()

    for model in models:

        if model["model_id"] == model_id:

            version_name = version_data.version.strip()

            if any(
                item["version"] == version_name
                for item in model["versions"]
            ):
                raise HTTPException(
                    status_code=409,
                    detail="This model version already exists"
                )

            new_version = {
                "version": version_name,
                "notes": version_data.notes.strip(),
                "created_at": current_timestamp()
            }

            model["versions"].append(new_version)
            model["current_version"] = version_name
            model["updated_at"] = current_timestamp()

            save_models(models)

            return {
                "message": "Model version added successfully",
                "model": model
            }

    raise HTTPException(
        status_code=404,
        detail="Model not found"
    )


# Update model status
@app.patch("/models/{model_id}/status")
def update_model_status(model_id: str, status_data: ModelStatusUpdate):

    models = load_models()

    for model in models:

        if model["model_id"] == model_id:

            model["status"] = status_data.status
            model["updated_at"] = current_timestamp()

            save_models(models)

            return {
                "message": "Model status updated successfully",
                "model": model
            }

    raise HTTPException(
        status_code=404,
        detail="Model not found"
    )


# ----------------------------
# MODEL REGISTRY API ROUTES
# ----------------------------

# MODEL_REGISTRY_API_ROUTES

@app.get("/model-registry")
def get_model_registry():
    models = get_all_models()

    return {
        "total_versions": len(models),
        "active_version": (
            get_active_model()["version"]
            if get_active_model() else None
        ),
        "models": models
    }


@app.get("/model-registry/active")
def get_active_model_details():
    model = get_active_model()

    if model is None:
        raise HTTPException(
            status_code=404,
            detail="No active model found."
        )

    return {
        "active_model": model
    }



@app.post("/model-registry/{version}/activate")
def activate_registry_model(version: str):
    try:
        selected_model = set_active_model(version)

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Model version {version} not found."
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )

    return {
        "message": f"Model {version} activated successfully.",
        "active_model": selected_model
    }



@app.get("/model-registry/compare")
def compare_model_versions(versions: str):
    requested_versions = [
        item.strip() for item in versions.split(",") if item.strip()
    ]

    if len(requested_versions) < 2:
        raise HTTPException(
            status_code=400,
            detail="Provide at least two versions, e.g. v1,v2."
        )

    if len(set(requested_versions)) != len(requested_versions):
        raise HTTPException(
            status_code=400,
            detail="Duplicate versions are not allowed."
        )

    all_models = get_all_models()
    model_lookup = {
        model["version"]: model for model in all_models
    }

    missing_versions = [
        version for version in requested_versions
        if version not in model_lookup
    ]

    if missing_versions:
        raise HTTPException(
            status_code=404,
            detail=f"Versions not found: {', '.join(missing_versions)}"
        )

    comparison = []

    for version in requested_versions:
        model = model_lookup[version]

        comparison.append({
            "version": model["version"],
            "algorithm": model.get("algorithm"),
            "trained_at": model.get("trained_at"),
            "r2_score": model.get("r2_score"),
            "mae": model.get("mae"),
            "rmse": model.get("rmse"),
            "status": model.get("status")
        })

    return {
        "comparison": comparison
    }
@app.get("/training-logs")
def get_training_logs():

    log_path = BASE_DIR / "experiments" / "training_logs.jsonl"

    if not log_path.exists():
        return {
            "total_runs": 0,
            "logs": []
        }

    logs = []

    try:
        with open(log_path, "r", encoding="utf-8") as file:
            for line in file:
                if not line.strip():
                    continue

                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read training logs: {error}"
        )

    logs.reverse()

    return {
        "total_runs": len(logs),
        "logs": logs
    }


# -----------------------------
# Pan-India State Data Tracker & Verified Registry APIs
# -----------------------------

VERIFIED_DEEDS_CSV = DATASET_DIR / "verified_registered_prices_mh_up.csv"
GOV_AUDIT_LOG_FILE = BASE_DIR / "experiments" / "gov_source_audit.json"

@app.get("/state-data-tracker")
def get_state_data_tracker():
    """
    Returns state-wise data access tiers, registration portal metadata,
    and transparency classifications across Indian States and UTs.
    """
    tracker_file = BASE_DIR / "docs" / "STATE_DATA_ACCESS_TRACKER.md"

    # Read latest audit if available
    latest_audit = None
    if GOV_AUDIT_LOG_FILE.exists():
        try:
            with open(GOV_AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                audit_history = json.load(f)
                if audit_history:
                    latest_audit = audit_history[-1]
        except Exception:
            pass

    return {
        "status": "success",
        "framework": "Pan-India Federated Land Registry Architecture",
        "launch_states": [
            {
                "state": "Maharashtra",
                "code": "MH",
                "status": "ACTIVE_PILOT",
                "portal": "IGR Maharashtra (SARITA 2.0 / e-Search)",
                "data_tier": 1,
                "data_type": "Registered Transaction Deeds + Ready Reckoner (ASR)",
                "verified_deeds_available": 71,
                "coverage_cities": ["Pune", "Mumbai MMR", "Nagpur"]
            },
            {
                "state": "Uttar Pradesh",
                "code": "UP",
                "status": "ACTIVE_PILOT",
                "portal": "IGRSUP (Stamp & Registration Dept UP)",
                "data_tier": 1,
                "data_type": "Registered Transaction Deeds + District Circle Rates",
                "verified_deeds_available": 53,
                "coverage_cities": ["Prayagraj", "Lucknow", "Noida", "Varanasi"]
            }
        ],
        "summary": {
            "total_jurisdictions_tracked": 36,
            "tier_1_registered_deeds_online": 6,
            "tier_2_guideline_rates_only": 14,
            "tier_3_request_or_visit_required": 16,
            "pilot_verified_deeds_count": 124
        },
        "tiers": {
            "tier_1_registered": [
                {"state": "Maharashtra", "code": "MH", "portal": "igrmaharashtra.gov.in", "access": "Free public e-Search with user login"},
                {"state": "Uttar Pradesh", "code": "UP", "portal": "igrsup.gov.in", "access": "Free public deed search by property details"},
                {"state": "Tamil Nadu", "code": "TN", "portal": "tnreginet.gov.in", "access": "Public EC with transaction consideration"},
                {"state": "Telangana", "code": "TG", "portal": "registration.telangana.gov.in", "access": "Market value & EC with consideration"},
                {"state": "Haryana", "code": "HR", "portal": "jamabandi.nic.in", "access": "Free public deed search by tehsil"},
                {"state": "Andhra Pradesh", "code": "AP", "portal": "registration.ap.gov.in", "access": "Public deed & valuation search"}
            ],
            "tier_2_guideline_only": [
                {"state": "Karnataka", "code": "KA", "portal": "kaverionline.karnataka.gov.in", "benchmark": "Guidance Value"},
                {"state": "Delhi", "code": "DL", "portal": "doris.delhigovt.nic.in", "benchmark": "Circle Rates (A-H)"},
                {"state": "Gujarat", "code": "GJ", "portal": "garvi.gujarat.gov.in", "benchmark": "Jantri Rates"},
                {"state": "West Bengal", "code": "WB", "portal": "wbregistration.gov.in", "benchmark": "Market Value of Property"},
                {"state": "Rajasthan", "code": "RJ", "portal": "epanjiyan.rajasthan.gov.in", "benchmark": "DLC Rates"},
                {"state": "Madhya Pradesh", "code": "MP", "portal": "mpigr.gov.in", "benchmark": "Collector Guideline Rates"},
                {"state": "Kerala", "code": "KL", "portal": "keralaregistration.gov.in", "benchmark": "Fair Value of Land"},
                {"state": "Punjab", "code": "PB", "portal": "punjabrevenue.nic.in", "benchmark": "Collector Rates"},
                {"state": "Odisha", "code": "OD", "portal": "igrodisha.gov.in", "benchmark": "Benchmark Valuation"},
                {"state": "Jharkhand", "code": "JH", "portal": "jharnibandhan.gov.in", "benchmark": "Minimum Evaluation Rate"},
                {"state": "Chhattisgarh", "code": "CG", "portal": "epanjiyan.cg.gov.in", "benchmark": "Collector Guideline"},
                {"state": "Himachal Pradesh", "code": "HP", "portal": "himachal.nic.in/revenue", "benchmark": "Circle Rates"},
                {"state": "Uttarakhand", "code": "UK", "portal": "registration.uk.gov.in", "benchmark": "Circle Rates"},
                {"state": "Goa", "code": "GA", "portal": "ngdrs.goa.gov.in", "benchmark": "Minimum Land Rates"}
            ],
            "tier_3_request_required": [
                {"jurisdiction": "Bihar", "code": "BR", "access_mode": "SRO Certified Copy / RTI Application"},
                {"jurisdiction": "Assam", "code": "AS", "access_mode": "Physical District Registrar Visit"},
                {"jurisdiction": "Jammu & Kashmir", "code": "JK", "access_mode": "SRO In-Person Application"},
                {"jurisdiction": "Chandigarh", "code": "CH", "access_mode": "Departmental Request"},
                {"jurisdiction": "North-Eastern States (7 States)", "code": "NE", "access_mode": "Customary Tribal Council / DC Office"},
                {"jurisdiction": "Union Territories (5 UTs)", "code": "UT", "access_mode": "Collectorate Revenue Office Visit"}
            ]
        },
        "latest_audit": latest_audit
    }


@app.get("/verified-registered-properties")
def get_verified_registered_properties(state: str | None = None, limit: int = 50, page: int = 1):
    """
    Returns verified registered property transactions for Maharashtra and Uttar Pradesh
    including official SRO deed IDs, Ready Reckoner / Circle rates, and stamp duty paid.
    """
    if not VERIFIED_DEEDS_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail="Verified registered deeds dataset not found. Run builder script first."
        )

    try:
        df = pd.read_csv(VERIFIED_DEEDS_CSV)
        if state:
            df = df[df["state"].str.lower() == state.strip().lower()]

        total_records = len(df)
        total_pages = max(1, (total_records + limit - 1) // limit)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit

        paginated_data = df.iloc[start_idx:end_idx].to_dict(orient="records")

        return {
            "status": "success",
            "total_records": total_records,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "state_filter": state,
            "records": paginated_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch verified registered records: {str(e)}"
        )


# -----------------------------
# Continuous Retraining & What-If Scenario Simulator APIs
# -----------------------------

class PriceScenarioInput(BaseModel):
    city: str
    property_type: Literal["Flat", "Independent House", "Plot"]
    locality: str
    area_sqft: float = Field(gt=0)
    area_basis: str
    bedrooms: int | None = Field(default=None, ge=1)
    property_age: str | None = None
    price_type: Literal["Asking", "Registered"] = "Asking"

    # Scenario Modifiers
    has_metro_connectivity: bool = False
    ready_reckoner_revision_percent: float = Field(default=0.0, ge=-20.0, le=50.0)
    infrastructure_development: Literal["None", "Moderate", "High"] = "None"
    projected_years: int = Field(default=0, ge=0, le=20)


@app.post("/auto-retrain")
def trigger_auto_retrain(auto_promote: bool = False):
    """
    Triggers the continuous model retraining pipeline, training a candidate model
    on the latest merged dataset and comparing it against the active production model.
    """
    from backend.auto_retrain import run_continuous_retraining
    try:
        result = run_continuous_retraining(auto_promote=auto_promote)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Continuous retraining pipeline failed: {str(e)}"
        )


@app.post("/simulate-price-scenario")
def simulate_price_scenario(scenario: PriceScenarioInput):
    """
    What-If Real Estate Scenario Simulator.
    Computes baseline valuation via the active model and simulates the price impact
    of transit infrastructure (metro), government circle rate revisions, and time appreciation.
    """
    # 1. Baseline valuation
    baseline_result = predict_house_price(HousePredictionInput(
        city=scenario.city,
        property_type=scenario.property_type,
        locality=scenario.locality,
        area_sqft=scenario.area_sqft,
        area_basis=scenario.area_basis,
        bedrooms=scenario.bedrooms,
        property_age=scenario.property_age,
        price_type=scenario.price_type
    ))

    baseline_price = float(baseline_result["predicted_price"])
    simulated_price = baseline_price
    factors = []

    # Transit premium (Metro connectivity adds 10-14%)
    if scenario.has_metro_connectivity:
        metro_multiplier = 1.12
        simulated_price *= metro_multiplier
        factors.append({
            "factor": "Metro Transit Corridor Proximity",
            "impact_percentage": "+12.0%",
            "description": "High-speed transit accessibility premium based on urban transit surveys."
        })

    # Infrastructure development
    if scenario.infrastructure_development == "Moderate":
        simulated_price *= 1.05
        factors.append({
            "factor": "Zonal Infrastructure Expansion",
            "impact_percentage": "+5.0%",
            "description": "Moderate road widening, utility improvements, or arterial highway proximity."
        })
    elif scenario.infrastructure_development == "High":
        simulated_price *= 1.12
        factors.append({
            "factor": "Major Catalytic Corridor (Ring Road / IT Hub)",
            "impact_percentage": "+12.0%",
            "description": "Transformational arterial connectivity and major commercial catchment zone."
        })

    # Ready Reckoner / Circle rate revision
    if scenario.ready_reckoner_revision_percent != 0.0:
        rate_factor = 1.0 + (scenario.ready_reckoner_revision_percent / 100.0) * 0.45
        simulated_price *= rate_factor
        factors.append({
            "factor": f"Government Benchmark Rate Revision ({scenario.ready_reckoner_revision_percent:+.1f}%)",
            "impact_percentage": f"{scenario.ready_reckoner_revision_percent * 0.45:+.1f}%",
            "description": "Direct baseline floor shift induced by State Revenue Department valuation updates."
        })

    # Time Horizon Projection (Appreciation vs Building Depreciation)
    if scenario.projected_years > 0:
        annual_land_appreciation = 0.065  # 6.5% annual capital appreciation
        annual_depreciation = 0.012 if scenario.property_type != "Plot" else 0.0  # Building wear
        net_annual_growth = annual_land_appreciation - annual_depreciation
        compound_growth = (1.0 + net_annual_growth) ** scenario.projected_years
        simulated_price *= compound_growth
        factors.append({
            "factor": f"Time Horizon ({scenario.projected_years} Years)",
            "impact_percentage": f"{(compound_growth - 1.0) * 100:+.1f}%",
            "description": f"Compounded capital appreciation ({annual_land_appreciation*100:.1f}%) minus structural depreciation."
        })

    simulated_price = round(simulated_price, 2)
    price_delta = round(simulated_price - baseline_price, 2)
    percent_delta = round((price_delta / baseline_price) * 100, 2) if baseline_price > 0 else 0.0

    return {
        "status": "success",
        "city": scenario.city,
        "locality": scenario.locality,
        "property_type": scenario.property_type,
        "baseline_price_inr": baseline_price,
        "simulated_price_inr": simulated_price,
        "price_delta_inr": price_delta,
        "percentage_change": f"{percent_delta:+.2f}%",
        "active_model_version": baseline_result.get("model_version"),
        "scenario_factors_applied": factors
    }


# -----------------------------
# Static Frontend SPA Serving (Single-Container Deployment)
# -----------------------------
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/app", response_class=HTMLResponse)
    @app.get("/app/{full_path:path}", response_class=HTMLResponse)
    def serve_frontend_app(full_path: str = ""):
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return HTMLResponse("<h1>ModelWatch UI build not found.</h1>", status_code=404)