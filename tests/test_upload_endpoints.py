"""
ModelWatch File Upload & Multi-part Endpoints Test Suite
Tests /upload-dataset, /import-properties, /evaluate-model, /evaluate-regression.
"""
import tempfile
import backend.main as main_module
from unittest.mock import patch
import os
import sys
import io
import asyncio
import unittest
from pathlib import Path

os.environ["DISABLE_EMAIL_ALERT"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import (
    upload_dataset,
    import_properties,
    evaluate_model,
    evaluate_regression
)

class MockUploadFile:
    def __init__(self, filename, content_bytes):
        self.filename = filename
        self._content = content_bytes
        self.file = io.BytesIO(content_bytes)

    async def read(self):
        return self._content

class TestUploadEndpoints(unittest.IsolatedAsyncioTestCase):

    async def test_01_upload_dataset(self):
        """Test /upload-dataset with valid CSV"""
        base_dir = Path(__file__).resolve().parent.parent
        with open(base_dir / "datasets" / "new_data.csv", "rb") as f:
            content = f.read()

        upload_file = MockUploadFile("new_data.csv", content)
        res = await upload_dataset(upload_file)
        self.assertEqual(res["filename"], "new_data.csv")
        self.assertIn("drifted_features", res)
        self.assertIn("has_alert", res)
        print(f"  ✓ test_01_upload_dataset passed: {res['drifted_features']} drifted features detected, alert level: {res['alert_level']}")

    
    async def test_02_import_properties(self):
        """Test /import-properties without modifying the real dataset"""

        sample_csv = (
            "property_id,city,property_type,locality,area_sqft,area_basis,bedrooms,property_age,price_inr,price_type,source_name,source_url,collected_date\n"
            "TEST_BULK_01,Pune,Flat,Kothrud,1250,Carpet,3,New,12000000,Asking,Magicbricks,https://magicbricks.com/p1,2026-11-13\n"
            "TEST_BULK_02,Prayagraj,Plot,Civil Lines,1800,Plot Area,,,9000000,Asking,99acres,https://99acres.com/p2,2026-11-13\n"
            "TEST_BULK_INVALID,,Flat,Kothrud,-500,Carpet,2,New,0,Asking,Invalid,invalid_url,2026-11-13\n"
        )

        upload_file = MockUploadFile(
            "bulk_import_test.csv",
            sample_csv.encode("utf-8")
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            test_dataset = Path(temp_dir) / "property_prices.csv"

            with patch.object(main_module, "PROPERTY_DATA_FILE", test_dataset):
                res = await import_properties(upload_file)

        self.assertEqual(res["status"], "success")
        self.assertEqual(res["imported_count"], 2)
        self.assertEqual(res["rejected_count"], 1)
        self.assertEqual(
            res["rejected_rows"][0]["property_id"],
            "TEST_BULK_INVALID"
        )


    async def test_03_evaluate_classification(self):
        """Test /evaluate-model (Classification)"""
        csv_data = "actual,predicted\n1,1\n0,0\n1,0\n1,1\n0,1\n0,0\n1,1\n1,1\n"
        upload_file = MockUploadFile("classification_eval.csv", csv_data.encode("utf-8"))

        res = await evaluate_model(upload_file)
        self.assertEqual(res["evaluation_type"], "classification")
        self.assertIn("accuracy", res["metrics"])
        self.assertIn("f1_score", res["metrics"])
        self.assertGreater(res["metrics"]["accuracy"], 0.5)
        print(f"  ✓ test_03_evaluate_classification passed: Accuracy={res['metrics']['accuracy']*100:.1f}%, F1={res['metrics']['f1_score']*100:.1f}%")

    async def test_04_evaluate_regression(self):
        """Test /evaluate-regression"""
        csv_data = "actual,predicted\n100,105\n200,195\n300,310\n400,390\n500,505\n"
        upload_file = MockUploadFile("regression_eval.csv", csv_data.encode("utf-8"))

        res = await evaluate_regression(upload_file)
        self.assertEqual(res["evaluation_type"], "regression")
        self.assertIn("mae", res["metrics"])
        self.assertIn("r2_score", res["metrics"])
        self.assertGreater(res["metrics"]["r2_score"], 0.95)
        print(f"  ✓ test_04_evaluate_regression passed: R2={res['metrics']['r2_score']:.4f}, MAE={res['metrics']['mae']:.2f}")

if __name__ == "__main__":
    print("\n================= RUNNING MULTIPART & UPLOAD TESTS =================")
    unittest.main(verbosity=1)
