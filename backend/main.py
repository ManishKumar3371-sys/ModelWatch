import json
from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4
from typing import Literal
import joblib
import pandas as pd
from pathlib import Path
from pydantic import BaseModel
from drift_detection import detect_drift as sample_detect_drift

import pandas as pd
from scipy.stats import ks_2samp, chi2_contingency
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="ModelWatch API",
    description="ML Model Monitoring and Drift Detection Platform",
    version="1.0.0"
)# House Price Prediction Model
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "trained_models" / "house_price_model.pkl"

house_price_model = joblib.load(MODEL_PATH)


class HousePredictionInput(BaseModel):
    area: float
    bedrooms: int
    age: float


@app.post("/predict-house-price")
def predict_house_price(data: HousePredictionInput):

    input_data = pd.DataFrame([{
        "area": data.area,
        "bedrooms": data.bedrooms,
        "age": data.age
    }])

    prediction = house_price_model.predict(input_data)[0]

    return {
        "status": "success",
        "predicted_price": round(float(prediction), 2),
        "currency": "INR"
    }


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dataset and storage paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "datasets"

REFERENCE_FILE = DATASET_DIR / "reference.csv"
NEW_DATA_FILE = DATASET_DIR / "new_data.csv"
PERFORMANCE_HISTORY_FILE = DATASET_DIR / "performance_history.json"
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


# -----------------------------
# Drift Detection
# -----------------------------


def detect_drift(reference_data, new_data):

    if list(reference_data.columns) != list(new_data.columns):
        raise HTTPException(
            status_code=400,
            detail="CSV columns must match reference dataset"
        )

    results = []

    print("Reference Data Types:")
    print(reference_data.dtypes)

    print("New Data Types:")
    print(new_data.dtypes)

    
    ignored_columns = [
        "property_id",
        "source_url",
        "collected_date"
    ]

    for column in reference_data.columns:

        if column in ignored_columns:
            continue

        reference_values = reference_data[column].dropna()
        new_values = new_data[column].dropna()

        if len(reference_values) == 0 or len(new_values) == 0:
            continue

        # Numeric Drift Detection
        if pd.api.types.is_numeric_dtype(reference_data[column]):

            statistic, p_value = ks_2samp(
                reference_values,
                new_values
            )

            results.append({
                "feature": column,
                "test_type": "KS Test",
                "ks_statistic": round(float(statistic), 4),
                "p_value": round(float(p_value), 5),
                "status": (
                    "DRIFT DETECTED"
                    if p_value < 0.05
                    else "NO SIGNIFICANT DRIFT"
                )
            })

        # Categorical Drift Detection
        else:

            combined = pd.concat([
                reference_values.astype(str).reset_index(drop=True),
                new_values.astype(str).reset_index(drop=True)
            ], ignore_index=True)

            dataset_labels = (
                ["reference"] * len(reference_values)
                + ["new"] * len(new_values)
            )

            contingency_table = pd.crosstab(
                combined,
                dataset_labels
            )

            if contingency_table.shape[0] < 2:
                continue

            chi2, p_value, dof, expected = chi2_contingency(
                contingency_table
            )

            results.append({
                "feature": column,
                "test_type": "Chi-Square Test",
                "chi2_statistic": round(float(chi2), 4),
                "p_value": round(float(p_value), 5),
                "status": (
                    "DRIFT DETECTED"
                    if p_value < 0.05
                    else "NO SIGNIFICANT DRIFT"
                )
            })
    return {
        "total_features": len(results),
        "drifted_features": sum(
            1 for item in results
            if item["status"] == "DRIFT DETECTED"
        ),
        "results": results
    }



@app.get("/drift-report")
def get_drift_report():

    if not REFERENCE_FILE.exists() or not NEW_DATA_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Reference or new dataset not found"
        )

    reference_data = pd.read_csv(REFERENCE_FILE)
    new_data = pd.read_csv(NEW_DATA_FILE)

    return detect_drift(reference_data, new_data)


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
        
        new_data.to_csv(NEW_DATA_FILE, index=False)

        return {
            "filename": file.filename,
            **report
        }

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
        data = data.fillna("")

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
