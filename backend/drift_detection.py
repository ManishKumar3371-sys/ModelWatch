import pandas as pd
from scipy.stats import ks_2samp
import os


def detect_drift(reference_data, new_data):

    results = []

    # Check common columns
    common_columns = [
        column for column in reference_data.columns
        if column in new_data.columns
    ]

    for column in common_columns:

        # Only numeric columns
        if not pd.api.types.is_numeric_dtype(reference_data[column]):
            continue

        reference_values = reference_data[column].dropna()
        new_values = new_data[column].dropna()

        if len(reference_values) == 0 or len(new_values) == 0:
            continue

        statistic, p_value = ks_2samp(
            reference_values,
            new_values
        )

        drift_detected = p_value < 0.05

        if not drift_detected:
            severity = "LOW"
        elif statistic >= 0.7:
            severity = "HIGH"
        else:
            severity = "MEDIUM"

        results.append({
            "feature": column,
            "reference_count": len(reference_values),
            "new_count": len(new_values),
            "ks_statistic": round(statistic, 4),
            "p_value": round(p_value, 5),
            "drift_detected": drift_detected,
            "severity": severity
        })

    return pd.DataFrame(results)


# Sample testing data

reference_data = pd.DataFrame({
    "area": [800, 1000, 1200, 1500, 1800, 2000, 2200, 2500, 2700, 2900],
    "bedrooms": [1, 2, 2, 3, 3, 3, 4, 4, 5, 5],
    "age": [2, 5, 8, 3, 10, 12, 7, 15, 18, 20]
})

new_data = pd.DataFrame({
    "area": [5000, 5200, 5500, 6000, 6200, 6500, 7000, 7200, 7500, 8000],
    "bedrooms": [3, 4, 4, 5, 5, 4, 5, 5, 6, 6],
    "age": [2, 3, 5, 4, 6, 5, 8, 7, 9, 10]
})


# Generate drift report

report = detect_drift(reference_data, new_data)

os.makedirs("experiments", exist_ok=True)

report.to_csv(
    "experiments/drift_report.csv",
    index=False
)

print("\nMODELWATCH ADVANCED DRIFT REPORT")
print(report.to_string(index=False))

print("\nReport saved: experiments/drift_report.csv")