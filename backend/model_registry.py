import json
import shutil
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = BASE_DIR / "trained_models"
VERSION_DIR = MODEL_DIR / "versions"
EXPERIMENT_DIR = BASE_DIR / "experiments"

REGISTRY_PATH = EXPERIMENT_DIR / "model_registry.json"
METRICS_PATH = EXPERIMENT_DIR / "training_metrics.json"


def load_registry():
    EXPERIMENT_DIR.mkdir(parents=True, exist_ok=True)
    VERSION_DIR.mkdir(parents=True, exist_ok=True)

    if not REGISTRY_PATH.exists():
        registry = {
            "active_version": None,
            "models": []
        }
        save_registry(registry)
        return registry

    with open(REGISTRY_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def save_registry(registry):
    """Validate and safely save the model registry."""

    EXPERIMENT_DIR.mkdir(parents=True, exist_ok=True)

    if not isinstance(registry, dict):
        raise ValueError("Registry must be a dictionary.")

    models = registry.get("models")

    if not isinstance(models, list):
        raise ValueError("Registry models must be a list.")

    versions = []

    for model in models:
        if not isinstance(model, dict):
            raise ValueError("Invalid model record in registry.")

        version = model.get("version")

        if not isinstance(version, str) or not version:
            raise ValueError("Every model must have a valid version.")

        if version in versions:
            raise ValueError(f"Duplicate model version: {version}")

        versions.append(version)

    active_version = registry.get("active_version")

    if active_version is not None and active_version not in versions:
        raise ValueError("Active model version does not exist in registry.")

    temp_path = REGISTRY_PATH.with_suffix(".json.tmp")

    try:
        with open(temp_path, "w", encoding="utf-8") as file:
            json.dump(registry, file, indent=4)
            file.flush()

        temp_path.replace(REGISTRY_PATH)

    finally:
        if temp_path.exists():
            temp_path.unlink()


def initialize_registry():
    registry = load_registry()

    if registry["models"]:
        return registry

    source_model = MODEL_DIR / "property_price_model.pkl"
    version_model = VERSION_DIR / "v1_property_price_model.pkl"

    if not version_model.exists() and source_model.exists():
        shutil.copy2(source_model, version_model)

    if not version_model.exists():
        raise FileNotFoundError("Version 1 model file not found.")

    if not METRICS_PATH.exists():
        raise FileNotFoundError("Training metrics file not found.")

    with open(METRICS_PATH, "r", encoding="utf-8") as file:
        metrics = json.load(file)

    model_record = {
        "version": "v1",
        "model_name": metrics.get("model_name", "Property Price Random Forest"),
        "algorithm": "RandomForestRegressor",
        "model_path": "trained_models/versions/v1_property_price_model.pkl",
        "dataset": metrics.get("dataset"),
        "records": metrics.get("records"),
        "training_samples": metrics.get("training_samples"),
        "testing_samples": metrics.get("testing_samples"),
        "features": metrics.get("features", []),
        "target": metrics.get("target"),
        "mae": metrics.get("mae"),
        "mse": metrics.get("mse"),
        "rmse": metrics.get("rmse"),
        "r2_score": metrics.get("r2_score"),
        "trained_at": metrics.get("trained_at"),
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "ACTIVE"
    }

    registry["models"].append(model_record)
    registry["active_version"] = "v1"

    save_registry(registry)
    return registry


def get_all_models():
    return load_registry()["models"]


def get_active_model():
    registry = load_registry()
    active_version = registry.get("active_version")

    for model in registry["models"]:
        if model["version"] == active_version:
            return model

    return None



def set_active_model(version):
    """Activate a model only if its saved file exists."""

    registry = load_registry()

    selected_model = next(
        (
            model for model in registry["models"]
            if model["version"] == version
        ),
        None
    )

    if selected_model is None:
        raise ValueError(f"Model version {version} not found.")

    # Verify that the model file exists before activation
    model_path = BASE_DIR / selected_model["model_path"]

    if not model_path.is_file():
        raise FileNotFoundError(
            f"Model file not found for {version}: {model_path}"
        )

    # Update statuses only after file verification
    for model in registry["models"]:
        model["status"] = (
            "ACTIVE" if model["version"] == version else "INACTIVE"
        )

    # Sync to root model path for seamless fallback
    shutil.copy2(model_path, MODEL_DIR / "property_price_model.pkl")

    registry["active_version"] = version
    save_registry(registry)

    return selected_model


def register_trained_model(model, metrics):
    """Save a newly trained model as the next version."""

    import joblib

    registry = load_registry()

    version_numbers = [
        int(item["version"][1:])
        for item in registry["models"]
        if item["version"].startswith("v")
        and item["version"][1:].isdigit()
    ]

    next_version = max(version_numbers, default=0) + 1
    version = f"v{next_version}"

    model_filename = f"{version}_property_price_model.pkl"
    version_model_path = VERSION_DIR / model_filename

    joblib.dump(model, version_model_path)
    joblib.dump(model, MODEL_DIR / "property_price_model.pkl")

    model_record = {
        "version": version,
        "model_name": metrics.get(
            "model_name", "Property Price Random Forest"
        ),
        "algorithm": "RandomForestRegressor",
        "model_path": f"trained_models/versions/{model_filename}",
        "dataset": metrics.get("dataset"),
        "records": metrics.get("records"),
        "training_samples": metrics.get("training_samples"),
        "testing_samples": metrics.get("testing_samples"),
        "features": metrics.get("features", []),
        "target": metrics.get("target"),
        "mae": metrics.get("mae"),
        "mse": metrics.get("mse"),
        "rmse": metrics.get("rmse"),
        "r2_score": metrics.get("r2_score"),
        "trained_at": metrics.get("trained_at"),
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "ACTIVE"
    }

    for item in registry["models"]:
        item["status"] = "INACTIVE"

    registry["models"].append(model_record)
    registry["active_version"] = version

    save_registry(registry)

    return model_record
