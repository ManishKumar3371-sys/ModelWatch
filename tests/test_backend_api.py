"""
ModelWatch Backend API Full Test Suite
Comprehensive testing of all REST endpoints, ML inference, drift tests, and registry APIs.
"""

import io
import json
import sys
import unittest
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app, HousePredictionInput, ModelCreate, ModelVersionCreate, ModelStatusUpdate

class TestModelWatchAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # We can test routes directly via FastAPI app
        pass

    def test_01_health_and_root(self):
        """Test root / and /health endpoints"""
        from backend.main import home, health_check
        res_home = home()
        self.assertEqual(res_home.get("status"), "Running")
        self.assertIn("ModelWatch", res_home.get("message", ""))

        res_health = health_check()
        self.assertEqual(res_health.get("status"), "healthy")
        self.assertEqual(res_health.get("project"), "ModelWatch")
        print("  ✓ test_01_health_and_root passed")

    def test_02_predict_house_price_valid_flat(self):
        """Test /predict-house-price with valid Flat parameters in Pune"""
        from backend.main import predict_house_price
        input_data = HousePredictionInput(
            city="Pune",
            property_type="Flat",
            locality="Baner",
            area_sqft=1150.0,
            area_basis="Carpet",
            bedrooms=3,
            property_age="Less than 5 years",
            price_type="Asking"
        )
        res = predict_house_price(input_data)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["currency"], "INR")
        self.assertGreater(res["predicted_price"], 1000000)
        self.assertIn("v", res["model_version"])
        print(f"  ✓ test_02_predict_house_price_valid_flat passed: Estimated ₹{res['predicted_price']:,.2f}")

    def test_03_predict_house_price_valid_plot(self):
        """Test /predict-house-price with Plot parameters in Prayagraj"""
        from backend.main import predict_house_price
        input_data = HousePredictionInput(
            city="Prayagraj",
            property_type="Plot",
            locality="Civil Lines",
            area_sqft=1500.0,
            area_basis="Plot Area",
            bedrooms=None,
            property_age=None,
            price_type="Asking"
        )
        res = predict_house_price(input_data)
        self.assertEqual(res["status"], "success")
        self.assertGreater(res["predicted_price"], 500000)
        print(f"  ✓ test_03_predict_house_price_valid_plot passed: Estimated ₹{res['predicted_price']:,.2f}")

    def test_04_prediction_history_endpoints(self):
        """Test /prediction-history GET and DELETE"""
        from backend.main import get_prediction_history, delete_prediction
        history = get_prediction_history()
        self.assertEqual(history["status"], "success")
        self.assertIsInstance(history["history"], list)
        self.assertGreater(history["total_predictions"], 0)
        
        latest_id = history["history"][0]["id"]
        # Delete test
        del_res = delete_prediction(latest_id)
        self.assertEqual(del_res["status"], "success")
        self.assertEqual(del_res["deleted_id"], latest_id)
        print(f"  ✓ test_04_prediction_history_endpoints passed (deleted ID {latest_id})")

    def test_05_drift_detection_logic(self):
        """Test statistical drift detection on reference and new datasets"""
        import pandas as pd
        from backend.drift_detection import detect_drift
        
        base_dir = Path(__file__).resolve().parent.parent
        ref = pd.read_csv(base_dir / "datasets" / "property_prices.csv")
        new = pd.read_csv(base_dir / "datasets" / "new_data.csv")
        
        report = detect_drift(ref, new)
        self.assertIn("total_features", report)
        self.assertIn("drifted_features", report)
        self.assertIn("results", report)
        self.assertGreater(report["total_features"], 0)
        print(f"  ✓ test_05_drift_detection_logic passed: {report['drifted_features']}/{report['total_features']} features drifted")

    def test_06_drift_report_and_history(self):
        """Test /drift-report and /drift-history endpoints"""
        from backend.main import get_drift_report, get_drift_history
        report = get_drift_report()
        self.assertIn("results", report)
        
        hist = get_drift_history()
        self.assertIsInstance(hist["history"], list)
        print("  ✓ test_06_drift_report_and_history passed")

    def test_07_property_dataset(self):
        """Test /property-dataset retrieval"""
        from backend.main import get_property_dataset
        ds = get_property_dataset()
        self.assertGreater(ds["total_records"], 200)
        self.assertIsInstance(ds["properties"], list)
        print(f"  ✓ test_07_property_dataset passed: {ds['total_records']} properties in database")

    def test_08_model_registry_endpoints(self):
        """Test /model-registry, /model-registry/active, and /model-registry/compare"""
        from backend.main import get_model_registry, get_active_model_details, compare_model_versions, activate_registry_model
        
        reg = get_model_registry()
        self.assertGreaterEqual(reg["total_versions"], 3)
        self.assertIsNotNone(reg["active_version"])

        active = get_active_model_details()
        self.assertEqual(active["active_model"]["version"], reg["active_version"])

        # Compare v4 and v5
        comp = compare_model_versions("v4,v5")
        self.assertEqual(len(comp["comparison"]), 2)
        print(f"  ✓ test_08_model_registry_endpoints passed: Active is {reg['active_version']}, Comparison verified")

    def test_09_training_logs(self):
        """Test /training-logs audit endpoint"""
        from backend.main import get_training_logs
        logs = get_training_logs()
        self.assertIsInstance(logs["logs"], list)
        self.assertGreaterEqual(logs["total_runs"], 1)
        print(f"  ✓ test_09_training_logs passed: {logs['total_runs']} logged training runs")

    def test_10_models_crud(self):
        """Test model creation, versioning, status updates"""
        from backend.main import register_model, get_models, get_model, add_model_version, update_model_status
        
        new_m = ModelCreate(
            model_name="Unit Test Model",
            algorithm="GradientBoostingRegressor",
            description="Created during automated verification",
            version="v1.0"
        )
        created = register_model(new_m)
        m_id = created["model"]["model_id"]
        self.assertEqual(created["model"]["model_name"], "Unit Test Model")

        fetched = get_model(m_id)
        self.assertEqual(fetched["model_id"], m_id)

        # Add version
        v_added = add_model_version(m_id, ModelVersionCreate(version="v1.1", notes="Improved features"))
        self.assertEqual(v_added["model"]["current_version"], "v1.1")

        # Update status
        st_updated = update_model_status(m_id, ModelStatusUpdate(status="Archived"))
        self.assertEqual(st_updated["model"]["status"], "Archived")
        print(f"  ✓ test_10_models_crud passed: Model {m_id} created, versioned, archived")

    def test_11_state_data_tracker_and_verified_properties(self):
        """Test /state-data-tracker and /verified-registered-properties pan-India endpoints"""
        from backend.main import get_state_data_tracker, get_verified_registered_properties

        tracker = get_state_data_tracker()
        self.assertEqual(tracker["status"], "success")
        self.assertEqual(tracker["summary"]["total_jurisdictions_tracked"], 36)
        self.assertEqual(len(tracker["launch_states"]), 2)
        print("  ✓ test_11a_state_data_tracker passed: 36 jurisdictions categorized")

        deeds_all = get_verified_registered_properties(limit=10, page=1)
        self.assertEqual(deeds_all["status"], "success")
        self.assertGreaterEqual(deeds_all["total_records"], 100)
        self.assertEqual(len(deeds_all["records"]), 10)

        deeds_mh = get_verified_registered_properties(state="Maharashtra", limit=5, page=1)
        self.assertEqual(deeds_mh["status"], "success")
        self.assertTrue(all(r["state"] == "Maharashtra" for r in deeds_mh["records"]))
        print(f"  ✓ test_11b_verified_registered_properties passed: {deeds_all['total_records']} verified deeds in MH & UP")

    def test_12_price_scenario_simulator(self):
        """Test /simulate-price-scenario endpoint with transit & policy modifiers"""
        from backend.main import simulate_price_scenario, PriceScenarioInput

        scenario_input = PriceScenarioInput(
            city="Pune",
            property_type="Flat",
            locality="Baner",
            area_sqft=1100.0,
            area_basis="Carpet",
            bedrooms=2,
            has_metro_connectivity=True,
            ready_reckoner_revision_percent=5.0,
            infrastructure_development="High",
            projected_years=3
        )
        sim = simulate_price_scenario(scenario_input)
        self.assertEqual(sim["status"], "success")
        self.assertGreater(sim["simulated_price_inr"], sim["baseline_price_inr"])
        self.assertEqual(len(sim["scenario_factors_applied"]), 4)
        print(f"  ✓ test_12_price_scenario_simulator passed: Baseline ₹{sim['baseline_price_inr']:,.2f} -> Simulated ₹{sim['simulated_price_inr']:,.2f} ({sim['percentage_change']})")

    def test_13_auto_retrain_pipeline(self):
        """Test /auto-retrain continuous learning pipeline"""
        from backend.main import trigger_auto_retrain

        # Run auto-retrain without auto_promote to test candidate generation safely
        retrain_res = trigger_auto_retrain(auto_promote=False)
        self.assertEqual(retrain_res["status"], "success")
        self.assertIn("candidate_r2", retrain_res)
        self.assertGreaterEqual(retrain_res["candidate_r2"], 0.60)
        print(f"  ✓ test_13_auto_retrain_pipeline passed: Candidate {retrain_res['new_version']} achieved R²={retrain_res['candidate_r2']}")

if __name__ == "__main__":
    print("\n================= RUNNING MODELWATCH BACKEND API TESTS =================")
    suite = unittest.TestLoader().loadTestsFromTestCase(TestModelWatchAPI)
    runner = unittest.TextTestRunner(verbosity=1)
    res = runner.run(suite)
    if res.wasSuccessful():
        print("\n================= ALL 10 TEST SUITES PASSED (100% SUCCESS) =================")
    else:
        print("\n================= TESTS FAILED =================")
        exit(1)
