import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.drift_detection import detect_drift

base = Path(__file__).resolve().parent.parent
ref = pd.read_csv(base / "datasets" / "property_prices.csv")
new = pd.read_csv(base / "datasets" / "new_data.csv")

print("Ref shape:", ref.shape)
print("New shape:", new.shape)

try:
    rep = detect_drift(ref, new)
    print("SUCCESS: Drift detected!")
    print("Total features:", rep["total_features"])
    print("Drifted features:", rep["drifted_features"])
except Exception as e:
    print("ERROR:", e)
