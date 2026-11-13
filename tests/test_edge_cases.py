"""
ModelWatch Edge-Case & Error-Handling Test Suite
Covers validation rules, boundary values, error responses, and data integrity checks.
"""

import io
import sys
import unittest
import pandas as pd
from pathlib import Path
from pydantic import ValidationError

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.main import (
    HousePredictionInput,
    ModelCreate,
    delete_prediction,
    activate_registry_model,
    compare_model_versions,
    PROPERTY_COLUMNS,
    HTTPException
)
from backend.drift_detection import detect_drift

class TestEdgeCasesAndValidation(unittest.TestCase):

    def test_01_negative_area_rejected(self):
        """Ensure negative area_sqft is rejected by Pydantic schema"""
        with self.assertRaises(ValidationError) as ctx:
            HousePredictionInput(
                city="Pune",
                property_type="Flat",
                locality="Kothrud",
                area_sqft=-150.0,
                area_basis="Super Built-up",
                bedrooms=2
            )
        self.assertIn("greater than 0", str(ctx.exception))
        print("  ✓ test_01_negative_area_rejected passed")

    def test_02_zero_area_rejected(self):
        """Ensure zero area_sqft is rejected"""
        with self.assertRaises(ValidationError) as ctx:
            HousePredictionInput(
                city="Pune",
                property_type="Flat",
                locality="Kothrud",
                area_sqft=0.0,
                area_basis="Super Built-up",
                bedrooms=2
            )
        self.assertIn("greater than 0", str(ctx.exception))
        print("  ✓ test_02_zero_area_rejected passed")

    def test_03_invalid_property_type(self):
        """Ensure unsupported property types are rejected"""
        with self.assertRaises(ValidationError):
            HousePredictionInput(
                city="Pune",
                property_type="PenthouseVilla",  # Not in Literal
                locality="Baner",
                area_sqft=1400.0,
                area_basis="Carpet"
            )
        print("  ✓ test_03_invalid_property_type passed")

    def test_04_delete_nonexistent_prediction(self):
        """Ensure 404 is returned when attempting to delete invalid ID"""
        with self.assertRaises(HTTPException) as ctx:
            delete_prediction(88888888)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found", ctx.exception.detail.lower())
        print("  ✓ test_04_delete_nonexistent_prediction passed")

    def test_05_activate_nonexistent_model(self):
        """Ensure 404 is returned when attempting to activate invalid version"""
        with self.assertRaises(HTTPException) as ctx:
            activate_registry_model("v9999_does_not_exist")
        self.assertEqual(ctx.exception.status_code, 404)
        print("  ✓ test_05_activate_nonexistent_model passed")

    def test_06_model_comparison_less_than_two_versions(self):
        """Ensure compare endpoint enforces at least two versions"""
        with self.assertRaises(HTTPException) as ctx:
            compare_model_versions("v1")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Provide at least two versions", ctx.exception.detail)
        print("  ✓ test_06_model_comparison_less_than_two_versions passed")

    def test_07_model_comparison_duplicate_versions(self):
        """Ensure compare endpoint detects duplicate version queries"""
        with self.assertRaises(HTTPException) as ctx:
            compare_model_versions("v1,v1")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Duplicate versions", ctx.exception.detail)
        print("  ✓ test_07_model_comparison_duplicate_versions passed")

    def test_08_model_comparison_missing_version(self):
        """Ensure compare endpoint returns 404 for missing version"""
        with self.assertRaises(HTTPException) as ctx:
            compare_model_versions("v1,v999")
        self.assertEqual(ctx.exception.status_code, 404)
        print("  ✓ test_08_model_comparison_missing_version passed")

    def test_09_drift_empty_dataframe_rejection(self):
        """Ensure detect_drift raises ValueError when given empty dataframe"""
        ref_df = pd.DataFrame({"col": [1, 2, 3]})
        empty_df = pd.DataFrame()
        with self.assertRaises(ValueError):
            detect_drift(ref_df, empty_df)
        print("  ✓ test_09_drift_empty_dataframe_rejection passed")

    def test_10_drift_column_mismatch_rejection(self):
        """Ensure detect_drift rejects datasets with mismatching columns"""
        ref_df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
        new_df = pd.DataFrame({"a": [1, 2, 3], "c": [7, 8, 9]})
        with self.assertRaises(ValueError) as ctx:
            detect_drift(ref_df, new_df)
        self.assertIn("columns must match", str(ctx.exception))
        print("  ✓ test_10_drift_column_mismatch_rejection passed")

    def test_11_model_create_name_length_bounds(self):
        """Ensure ModelCreate enforces min/max length on model name"""
        with self.assertRaises(ValidationError):
            ModelCreate(model_name="A", algorithm="Random Forest")
        print("  ✓ test_11_model_create_name_length_bounds passed")

if __name__ == "__main__":
    print("\n================= RUNNING MODELWATCH EDGE-CASE & ERROR-HANDLING TESTS =================")
    unittest.main(verbosity=1)
