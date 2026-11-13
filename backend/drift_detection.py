
import pandas as pd
from scipy.stats import ks_2samp, chi2_contingency


IGNORED_COLUMNS = [
    "property_id",
    "source_url",
    "collected_date"
]

MINIMUM_SAMPLE_SIZE = 5
SIGNIFICANCE_LEVEL = 0.05


def detect_drift(reference_data, new_data):

    if reference_data.empty or new_data.empty:
        raise ValueError("Reference and new datasets cannot be empty")

    if reference_data.columns.duplicated().any():
        raise ValueError("Duplicate columns found in reference dataset")

    if new_data.columns.duplicated().any():
        raise ValueError("Duplicate columns found in new dataset")

    if list(reference_data.columns) != list(new_data.columns):
        raise ValueError(
            "CSV columns must match reference dataset"
        )

    results = []

    for column in reference_data.columns:

        if column in IGNORED_COLUMNS:
            continue

        reference_values = reference_data[column].dropna()
        new_values = new_data[column].dropna()

        if (
            len(reference_values) < MINIMUM_SAMPLE_SIZE
            or len(new_values) < MINIMUM_SAMPLE_SIZE
        ):
            results.append({
                "feature": column,
                "test_type": "Not evaluated",
                "reference_count": len(reference_values),
                "new_count": len(new_values),
                "p_value": None,
                "status": "INSUFFICIENT DATA",
                "severity": "UNKNOWN",
                "reason": "Minimum 5 valid samples required in each dataset"
            })
            continue

        # Numeric feature drift
        if (
            pd.api.types.is_numeric_dtype(reference_data[column])
            and pd.api.types.is_numeric_dtype(new_data[column])
        ):

            statistic, p_value = ks_2samp(
                reference_values,
                new_values
            )

            drift_detected = p_value < SIGNIFICANCE_LEVEL

            if not drift_detected:
                severity = "LOW"
            elif statistic >= 0.7:
                severity = "HIGH"
            else:
                severity = "MEDIUM"

            results.append({
                "feature": column,
                "test_type": "KS Test",
                "reference_count": len(reference_values),
                "new_count": len(new_values),
                "ks_statistic": round(float(statistic), 4),
                "p_value": round(float(p_value), 6),
                "status": (
                    "DRIFT DETECTED"
                    if drift_detected
                    else "NO SIGNIFICANT DRIFT"
                ),
                "severity": severity
            })

        # Categorical feature drift
        else:

            reference_categories = (
                reference_values.astype(str)
            )

            new_categories = (
                new_values.astype(str)
            )

            combined = pd.concat([
                reference_categories.reset_index(drop=True),
                new_categories.reset_index(drop=True)
            ], ignore_index=True)

            dataset_labels = (
                ["reference"] * len(reference_categories)
                + ["new"] * len(new_categories)
            )

            contingency_table = pd.crosstab(
                combined,
                dataset_labels
            )

            if contingency_table.shape[0] < 2:
                results.append({
                    "feature": column,
                    "test_type": "Chi-Square Test",
                    "reference_count": len(reference_values),
                    "new_count": len(new_values),
                    "p_value": None,
                    "status": "INSUFFICIENT DATA",
                    "severity": "UNKNOWN",
                    "reason": "Feature has fewer than two categories"
                })
                continue

            chi2, p_value, dof, expected = chi2_contingency(
                contingency_table
            )

            if (expected < 5).any():
                results.append({
                    "feature": column,
                    "test_type": "Chi-Square Test",
                    "reference_count": len(reference_values),
                    "new_count": len(new_values),
                    "chi2_statistic": round(float(chi2), 4),
                    "p_value": round(float(p_value), 6),
                    "status": "INSUFFICIENT DATA",
                    "severity": "UNKNOWN",
                    "reason": "Expected frequency below 5; Chi-Square result may be unreliable"
                })
                continue

            drift_detected = p_value < SIGNIFICANCE_LEVEL

            if not drift_detected:
                severity = "LOW"
            elif p_value < 0.001:
                severity = "HIGH"
            else:
                severity = "MEDIUM"

            results.append({
                "feature": column,
                "test_type": "Chi-Square Test",
                "reference_count": len(reference_values),
                "new_count": len(new_values),
                "chi2_statistic": round(float(chi2), 4),
                "p_value": round(float(p_value), 6),
                "status": (
                    "DRIFT DETECTED"
                    if drift_detected
                    else "NO SIGNIFICANT DRIFT"
                ),
                "severity": severity
            })

    return {
        "total_features": len(results),
        "drifted_features": sum(
            1 for item in results
            if item["status"] == "DRIFT DETECTED"
        ),
        "insufficient_features": sum(
            1 for item in results
            if item["status"] == "INSUFFICIENT DATA"
        ),
        "results": results
    }
