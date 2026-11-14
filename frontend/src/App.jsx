import { useState, useEffect, lazy, Suspense } from "react";
import {
  LayoutDashboard,
  Activity,
  Database,
  Upload,
  BrainCircuit,
  Settings,
  Bell,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  History,
  Menu,
  X
} from "lucide-react";
import jsPDF from "jspdf";
import "./App.css";
const Charts = lazy(() => import("./components/Charts"));

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const performanceData = [
  { day: "Mon", score: 94 },
  { day: "Tue", score: 92 },
  { day: "Wed", score: 95 },
  { day: "Thu", score: 89 },
  { day: "Fri", score: 91 },
  { day: "Sat", score: 86 },
  { day: "Sun", score: 88 }
];

function App() {
    // Property Dataset Preview states
  const [propertyRecords, setPropertyRecords] = useState([]);
  const [propertyRecordsLoading, setPropertyRecordsLoading] = useState(false);
  const [propertyRecordsError, setPropertyRecordsError] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [driftData, setDriftData] = useState(null);
  const [apiStatus, setApiStatus] = useState("Checking...");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  // Drift Report History states
const [driftHistory, setDriftHistory] = useState([]);
const [selectedDriftReport, setSelectedDriftReport] = useState(null);
const [driftHistoryLoading, setDriftHistoryLoading] = useState(false);
const [driftHistoryError, setDriftHistoryError] = useState("");

  const [performanceFile, setPerformanceFile] = useState(null);
  const [performanceResult, setPerformanceResult] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  // Regression Evaluation states
const [regressionFile, setRegressionFile] = useState(null);
const [regressionResult, setRegressionResult] = useState(null);
const [regressionLoading, setRegressionLoading] = useState(false);
  const handleSimulateScenario = async () => {
    if (!houseForm.locality || !houseForm.area_sqft) {
      setSimulationError("Please fill locality and area in the property form first.");
      return;
    }
    setSimulationLoading(true);
    setSimulationError("");
    try {
      const res = await fetch(`${API_URL}/simulate-price-scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: houseForm.city,
          property_type: houseForm.property_type,
          locality: houseForm.locality,
          area_sqft: parseFloat(houseForm.area_sqft),
          area_basis: houseForm.area_basis,
          bedrooms: houseForm.property_type !== "Plot" ? parseInt(houseForm.bedrooms) : null,
          property_age: houseForm.property_age,
          price_type: houseForm.price_type,
          has_metro_connectivity: scenarioForm.has_metro_connectivity,
          ready_reckoner_revision_percent: parseFloat(scenarioForm.ready_reckoner_revision_percent || 0),
          infrastructure_development: scenarioForm.infrastructure_development,
          projected_years: parseInt(scenarioForm.projected_years || 0)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Simulation failed");
      setSimulationResult(data);
    } catch (e) {
      setSimulationError(e.message);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleTriggerAutoRetrain = async (promote = false) => {
    setAutoRetrainLoading(true);
    setAutoRetrainResult(null);
    try {
      const res = await fetch(`${API_URL}/auto-retrain?auto_promote=${promote}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Retraining failed");
      setAutoRetrainResult(data);
      fetchTrainedRegistry();
      fetchTrainingLogs();
    } catch (e) {
      alert("Retraining failed: " + e.message);
    } finally {
      setAutoRetrainLoading(false);
    }
  };

  const handlePropertyImport = async () => {
  if (!propertyFile) {
    setPropertyImportError("Please select a CSV file.");
    return;
  }

  setPropertyImportLoading(true);
  setPropertyImportError("");
  setPropertyImportResult(null);

  const formData = new FormData();
  formData.append("file", propertyFile);

  try {
    const response = await fetch(`${API_URL}/import-properties`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Property import failed."
      );
    }

    setPropertyImportResult(data);
  } catch (error) {
    setPropertyImportError(error.message);
  } finally {
    setPropertyImportLoading(false);
  }
};

  // House Price Predictor states
  const [houseForm, setHouseForm] = useState({
  city: "Pune",
  property_type: "Flat",
  locality: "",
  area_sqft: "",
  area_basis: "Carpet",
  bedrooms: "2",
  property_age: "5-10 years",
  price_type: "Asking"
});

  const [housePrediction, setHousePrediction] = useState(null);
  const [houseLoading, setHouseLoading] = useState(false);
  const [houseError, setHouseError] = useState("");

  // What-If Scenario Simulator states
  const [scenarioForm, setScenarioForm] = useState({
    has_metro_connectivity: false,
    ready_reckoner_revision_percent: 5.0,
    infrastructure_development: "None",
    projected_years: 0
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  // Auto-retrain states
  const [autoRetrainLoading, setAutoRetrainLoading] = useState(false);
  const [autoRetrainResult, setAutoRetrainResult] = useState(null);

  // Property Prediction History states
const [predictionHistory, setPredictionHistory] = useState([]);
const [historySearch, setHistorySearch] = useState("");
const [historyCityFilter, setHistoryCityFilter] = useState("All");

const filteredPredictionHistory = predictionHistory.filter((item) => {
  const search = historySearch.toLowerCase().trim();

  const matchesCity =
    historyCityFilter === "All" ||
    item.city === historyCityFilter;

  const matchesSearch =
    item.city?.toLowerCase().includes(search) ||
    item.locality?.toLowerCase().includes(search) ||
    item.property_type?.toLowerCase().includes(search);

  return matchesCity && matchesSearch;
});
const [predictionHistoryLoading, setPredictionHistoryLoading] = useState(false);
const [predictionHistoryError, setPredictionHistoryError] = useState("");

  // Performance history states
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [perfHistorySearch, setPerfHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("All");

  // Model comparison states
  const [comparisonRunA, setComparisonRunA] = useState("");
  const [comparisonRunB, setComparisonRunB] = useState("");

  // Model registry states
  const [registeredModels, setRegisteredModels] = useState([]);
  const [trainedRegistry, setTrainedRegistry] = useState([]);
const [trainedActiveVersion, setTrainedActiveVersion] = useState("");
const [trainedRegistryLoading, setTrainedRegistryLoading] = useState(false);
const [trainedRegistryError, setTrainedRegistryError] = useState("");
const [registryComparison, setRegistryComparison] = useState([]);
const [compareLoading, setCompareLoading] = useState(false);
  // Training Logs states
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [trainingLogsLoading, setTrainingLogsLoading] = useState(false);
  const [trainingLogsError, setTrainingLogsError] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");

  const [modelForm, setModelForm] = useState({
    model_name: "",
    algorithm: "",
    version: "v1.0",
    description: ""
  });

  const [registerLoading, setRegisterLoading] = useState(false);
// Bulk Property Import states
const [propertyFile, setPropertyFile] = useState(null);
const [propertyImportResult, setPropertyImportResult] = useState(null);
const [propertyImportLoading, setPropertyImportLoading] = useState(false);
const [propertyImportError, setPropertyImportError] = useState("");

// Pan-India Tracker & Verified Deeds States
const [trackerData, setTrackerData] = useState(null);
const [trackerLoading, setTrackerLoading] = useState(false);
const [trackerTierFilter, setTrackerTierFilter] = useState("ALL");
const [verifiedDeeds, setVerifiedDeeds] = useState([]);
const [verifiedDeedsLoading, setVerifiedDeedsLoading] = useState(false);
const [verifiedStateFilter, setVerifiedStateFilter] = useState("ALL");

  // Sidebar menu
  const menuItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Models", icon: BrainCircuit },
    { name: "Trained Model Registry", icon: BrainCircuit },
    { name: "Training Logs", icon: History },
    { name: "House Price Predictor", icon: TrendingUp },
    { name: "Prediction History", icon: History },
    { name: "Drift Monitoring", icon: Activity },
    { name: "Performance History", icon: History },
    { name: "Model Comparison", icon: TrendingUp },
    { name: "Datasets", icon: Database },
    { name: "Pan-India Data Tracker", icon: Database },
    { name: "Reports", icon: TrendingUp },
    { name: "Settings", icon: Settings }
  ];

  // Fetch registered models
  const fetchRegisteredModels = async () => {
    setModelsLoading(true);
    setModelsError("");

    try {
      const response = await fetch(`${API_URL}/models`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch models");
      }

      setRegisteredModels(
        Array.isArray(data.models) ? data.models : []
      );
    } catch (error) {
      console.error("Model Registry Error:", error);
      setModelsError(error.message);
    } finally {
      setModelsLoading(false);
    }
  };

  // Fetch trained model registry
const fetchTrainedRegistry = async () => {
  setTrainedRegistryLoading(true);
  setTrainedRegistryError("");

  try {
    const response = await fetch(`${API_URL}/model-registry`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to fetch trained model registry");
    }

    setTrainedRegistry(
      Array.isArray(data.models) ? data.models : []
    );

    setTrainedActiveVersion(data.active_version || "");
  } catch (error) {
    console.error("Trained Model Registry Error:", error);
    setTrainedRegistryError(error.message);
  } finally {
    setTrainedRegistryLoading(false);
  }
};

// Activate a trained model version
const activateTrainedVersion = async (version) => {
  const confirmActivation = window.confirm(
    `Are you sure you want to activate model ${version}?`
  );

  if (!confirmActivation) return;

  try {
    const response = await fetch(
      `${API_URL}/model-registry/${version}/activate`,
      { method: "POST" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to activate model");
    }

    await fetchTrainedRegistry();
    alert(`Model ${version} activated successfully!`);
  } catch (error) {
    alert(error.message);
  }
};

// Fetch Training Logs
const fetchTrainingLogs = async () => {
  setTrainingLogsLoading(true);
  setTrainingLogsError("");

  try {
    const response = await fetch(`${API_URL}/training-logs`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to fetch training logs");
    }

    setTrainingLogs(
      Array.isArray(data.logs) ? data.logs : []
    );

  } catch (error) {
    console.error("Training Logs Error:", error);
    setTrainingLogsError(error.message);

  } finally {
    setTrainingLogsLoading(false);
  }
};

// Compare trained model versions
const compareTrainedVersions = async () => {
  if (trainedRegistry.length < 2) {
    alert("At least two model versions are required for comparison.");
    return;
  }

  const versions = trainedRegistry
    .slice(-2)
    .map((model) => model.version)
    .join(",");

  setCompareLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/model-registry/compare?versions=${encodeURIComponent(versions)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Model comparison failed");
    }

    setRegistryComparison(
      Array.isArray(data.comparison) ? data.comparison : []
    );
  } catch (error) {
    alert(error.message);
  } finally {
    setCompareLoading(false);
  }
};

// Fetch Drift Report History
const fetchDriftHistory = async () => {
  setDriftHistoryLoading(true);
  setDriftHistoryError("");

  try {
    const response = await fetch(`${API_URL}/drift-history`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to fetch drift history");
    }

    setDriftHistory(
      Array.isArray(data.history) ? data.history : []
    );

  } catch (error) {
    setDriftHistoryError(error.message);
  } finally {
    setDriftHistoryLoading(false);
  }
};

  // Register model
  const handleRegisterModel = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      const response = await fetch(`${API_URL}/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(modelForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Model registration failed");
      }

      alert("Model registered successfully!");

      setModelForm({
        model_name: "",
        algorithm: "",
        version: "v1.0",
        description: ""
      });

      await fetchRegisteredModels();

    } catch (error) {
      alert(error.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Add model version
  const handleAddVersion = async (modelId) => {
    const version = prompt("Enter new version (example: v2.0)");

    if (!version || !version.trim()) return;

    const notes = prompt("Enter version notes (optional)") || "";

    try {
      const response = await fetch(
        `${API_URL}/models/${modelId}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            version: version.trim(),
            notes
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to add version");
      }

      alert("New model version added!");
      await fetchRegisteredModels();

    } catch (error) {
      alert(error.message);
    }
  };

  // Update model status
  const handleModelStatus = async (modelId, status) => {
    try {
      const response = await fetch(
        `${API_URL}/models/${modelId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update status");
      }

      await fetchRegisteredModels();

    } catch (error) {
      alert(error.message);
      await fetchRegisteredModels();
    }
  };
  // Fetch property prediction history
const fetchPredictionHistory = async () => {
  setPredictionHistoryLoading(true);
  setPredictionHistoryError("");

  try {
    const response = await fetch(`${API_URL}/prediction-history`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to fetch prediction history");
    }

    setPredictionHistory(
      Array.isArray(data.history) ? data.history : []
    );

  } catch (error) {
    setPredictionHistoryError(error.message);
  } finally {
    setPredictionHistoryLoading(false);
  }
};
// Delete a property prediction
const deletePrediction = async (predictionId) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this prediction?"
  );

  if (!confirmDelete) return;

  try {
    const response = await fetch(
      `${API_URL}/prediction-history/${predictionId}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to delete prediction");
    }

    await fetchPredictionHistory();

  } catch (error) {
    alert(error.message);
  }
};
// Export property prediction history to CSV
const exportPredictionHistory = () => {
  if (filteredPredictionHistory.length === 0) {
    alert("No prediction records available to export.");
    return;
  }

  const headers = [
    "ID",
    "Date",
    "City",
    "Property Type",
    "Locality",
    "Area (sqft)",
    "Area Basis",
    "Bedrooms",
    "Property Age",
    "Price Type",
    "Predicted Price (INR)"
  ];

  const rows = filteredPredictionHistory.map((item) => [
    item.id,
    item.timestamp,
    item.city,
    item.property_type,
    item.locality,
    item.area_sqft,
    item.area_basis,
    item.bedrooms ?? "",
    item.property_age ?? "",
    item.price_type,
    item.predicted_price
  ]);

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(","))
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "ModelWatch_Prediction_History.csv";
  link.click();

  URL.revokeObjectURL(url);
};

// Export property prediction history to PDF
const exportPredictionHistoryPDF = async () => {
  if (filteredPredictionHistory.length === 0) {
    alert("No prediction records available to export.");
    return;
  }

  const { jsPDF } = await import("jspdf");
const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("ModelWatch - Prediction History", 14, 20);

  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    30
  );

  doc.text(
    `Total Records: ${filteredPredictionHistory.length}`,
    14,
    38
  );

  let y = 50;

  filteredPredictionHistory.forEach((item, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.text(`Prediction ${index + 1} (ID: ${item.id})`, 14, y);

    doc.setFontSize(9);

    const details = [
      `City: ${item.city}`,
      `Property: ${item.property_type}`,
      `Locality: ${item.locality}`,
      `Area: ${item.area_sqft} sqft (${item.area_basis})`,
      `Bedrooms: ${item.bedrooms ?? "N/A"}`,
      `Price Type: ${item.price_type}`,
      `Predicted Price: Rs. ${Number(item.predicted_price).toLocaleString("en-IN")}`,
      `Date: ${item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A"}`
    ];

    details.forEach((detail) => {
      y += 6;
      doc.text(detail, 18, y);
    });

    y += 12;
  });

  doc.save("ModelWatch_Prediction_History.pdf");
};

// Export Performance History to CSV
const exportPerformanceHistoryCSV = () => {
  if (filteredPerformanceHistory.length === 0) {
    alert("No evaluation records available to export.");
    return;
  }

  const headers = [
    "Run",
    "Date & Time",
    "File Name",
    "Model Type",
    "Accuracy",
    "Precision",
    "Recall",
    "F1 Score",
    "MAE",
    "MSE",
    "RMSE",
    "R2 Score"
  ];

  const rows = filteredPerformanceHistory.map((item, index) => {
    const metrics = item.metrics || {};
    const isRegression = isRegressionRun(item);

    return [
      `Run ${index + 1}`,
      item.evaluated_at
        ? new Date(item.evaluated_at).toLocaleString("en-IN")
        : "N/A",
      item.filename || "N/A",
      isRegression ? "Regression" : "Classification",
      metrics.accuracy ?? "",
      metrics.precision ?? "",
      metrics.recall ?? "",
      metrics.f1_score ?? "",
      metrics.mae ?? "",
      metrics.mse ?? "",
      metrics.rmse ?? "",
      metrics.r2_score ?? ""
    ];
  });

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(","))
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "ModelWatch_Performance_History.csv";
  link.click();

  URL.revokeObjectURL(url);
};

const exportPerformanceHistoryPDF = async () => {
  if (filteredPerformanceHistory.length === 0) {
    alert("No evaluation records available to export.");
    return;
  }

  const { jsPDF } = await import("jspdf");
const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("ModelWatch - Performance History", 14, 20);

  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    14,
    30
  );

  doc.text(
    `Total Records: ${filteredPerformanceHistory.length}`,
    14,
    38
  );

  let y = 50;

  filteredPerformanceHistory.forEach((item, index) => {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    const metrics = item.metrics || {};
    const isRegression = isRegressionRun(item);

    const evaluationDate = item.evaluated_at
      ? new Date(item.evaluated_at).toLocaleString("en-IN")
      : "N/A";

    doc.setFontSize(12);
    doc.text(`Run ${index + 1}`, 14, y);

    y += 7;
    doc.setFontSize(9);

    const details = [
      `File Name: ${item.filename || "N/A"}`,
      `Date & Time: ${evaluationDate}`,
      `Model Type: ${isRegression ? "Regression" : "Classification"}`,
      ...(isRegression
        ? [
            `MAE: ${metrics.mae ?? "N/A"}`,
            `MSE: ${metrics.mse ?? "N/A"}`,
            `RMSE: ${metrics.rmse ?? "N/A"}`,
            `R2 Score: ${metrics.r2_score ?? "N/A"}`
          ]
        : [
            `Accuracy: ${metrics.accuracy ?? "N/A"}`,
            `Precision: ${metrics.precision ?? "N/A"}`,
            `Recall: ${metrics.recall ?? "N/A"}`,
            `F1 Score: ${metrics.f1_score ?? "N/A"}`
          ])
    ];

    details.forEach((detail) => {
      y += 6;
      doc.text(detail, 18, y);
    });

    y += 12;
  });

  doc.save("ModelWatch_Performance_History.pdf");
};

  // Fetch performance history
  const fetchPerformanceHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API_URL}/performance-history`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch history");
      }

      setPerformanceHistory(
        Array.isArray(data.history) ? data.history : []
      );

    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };
const isRegressionRun = (item) => {
  if (item.evaluation_type) {
    return item.evaluation_type === "regression";
  }

  return (
    item.metrics?.mae !== undefined ||
    item.status?.toLowerCase().includes("regression") ||
    item.filename?.toLowerCase().includes("regression")
  );
};

const isClassificationRun = (item) => {
  if (item.evaluation_type) {
    return item.evaluation_type === "classification";
  }

  return (
    !isRegressionRun(item) &&
    item.metrics?.accuracy !== undefined
  );
};

const filteredPerformanceHistory = performanceHistory.filter((item) => {
  const searchTerm = perfHistorySearch.trim().toLowerCase();

  const matchesSearch =
    !searchTerm ||
    (item.filename || "").toLowerCase().includes(searchTerm);

  const matchesType =
    historyTypeFilter === "All" ||
    (historyTypeFilter === "Regression" && isRegressionRun(item)) ||
    (historyTypeFilter === "Classification" && isClassificationRun(item));

  return matchesSearch && matchesType;
});
  // Performance chart data
  const historyChartData = performanceHistory
  .filter(isClassificationRun)
  .map((item, index) => ({
    name: `Run ${index + 1}`,
    accuracy: Number(
      (item.metrics.accuracy * 100).toFixed(2)
    ),
    f1: Number(
      (item.metrics.f1_score * 100).toFixed(2)
    )
  }));
  // Regression Performance Chart Data
const regressionChartData = performanceHistory
  .filter(isRegressionRun)
  .map((item, index) => ({
    name: `Run ${index + 1}`,
    mae: Number(item.metrics.mae),
    rmse: Number(item.metrics.rmse),
    r2: Number(item.metrics.r2_score)
  }));

  const classificationMetrics = [
  { label: "Accuracy", key: "accuracy" },
  { label: "Precision", key: "precision" },
  { label: "Recall", key: "recall" },
  { label: "F1 Score", key: "f1_score" }
];

const regressionMetrics = [
  { label: "MAE", key: "mae" },
  { label: "MSE", key: "mse" },
  { label: "RMSE", key: "rmse" },
  { label: "R² Score", key: "r2_score" }
];

  const comparisonA =
    comparisonRunA !== ""
      ? performanceHistory[Number(comparisonRunA)]
      : null;

  const comparisonB =
    comparisonRunB !== ""
      ? performanceHistory[Number(comparisonRunB)]
      : null;

  useEffect(() => {
    if (performanceHistory.length >= 2) {
      setComparisonRunA("0");
      setComparisonRunB(String(performanceHistory.length - 1));
    } else {
      setComparisonRunA("");
      setComparisonRunB("");
    }
  }, [performanceHistory.length]);

  // Backend health check
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);

        if (!response.ok) {
          throw new Error("API request failed");
        }

        setApiStatus("Connected");
      } catch (error) {
        setApiStatus("Disconnected");
      }
    };

    checkBackend();
  }, []);

  // Pan-India Tracker & Verified Deeds Fetchers
  const fetchTrackerData = async () => {
    setTrackerLoading(true);
    try {
      const res = await fetch(`${API_URL}/state-data-tracker`);
      if (res.ok) {
        const data = await res.json();
        setTrackerData(data);
      }
    } catch (e) {
      console.error("Failed to load state data tracker:", e);
    } finally {
      setTrackerLoading(false);
    }
  };

  const fetchVerifiedDeeds = async (stateFilter = null) => {
    setVerifiedDeedsLoading(true);
    try {
      const url = stateFilter && stateFilter !== "ALL"
        ? `${API_URL}/verified-registered-properties?state=${encodeURIComponent(stateFilter)}&limit=100`
        : `${API_URL}/verified-registered-properties?limit=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVerifiedDeeds(data.records || []);
      }
    } catch (e) {
      console.error("Failed to load verified deeds:", e);
    } finally {
      setVerifiedDeedsLoading(false);
    }
  };

  // Initial data loading
useEffect(() => {
  fetchPerformanceHistory();
  fetchRegisteredModels();
  fetchPredictionHistory();
  fetchTrainedRegistry();
  fetchTrainingLogs();
  fetchTrackerData();
  fetchVerifiedDeeds();

  const fetchDriftReport = async () => {
    try {
      const response = await fetch(`${API_URL}/drift-report`);

      if (!response.ok) {
        throw new Error("Failed to load drift report");
      }

      const data = await response.json();

      setUploadResult(data);
      setDriftData(data);

    } catch (error) {
      console.error("Drift report loading error:", error);
    }
  };

  fetchDriftReport();
}, []);

  // Upload dataset
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploadLoading(true);
    setUploadResult(null);

    try {
      const response = await fetch(`${API_URL}/upload-dataset`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setUploadResult(data);
      setDriftData(data);
      await fetchDriftHistory();

    } catch (error) {
      alert(error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Evaluate model performance
  const handlePerformanceEvaluation = async () => {
    if (!performanceFile) {
      alert("Please select a performance CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", performanceFile);

    setPerformanceLoading(true);
    setPerformanceResult(null);

    try {
      const response = await fetch(`${API_URL}/evaluate-model`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Evaluation failed");
      }

      setPerformanceResult(data);
      await fetchPerformanceHistory();

      alert("Performance evaluated and saved!");

    } catch (error) {
      alert(error.message);
    } finally {
      setPerformanceLoading(false);
    }
  };
// Evaluate regression model performance
const handleRegressionEvaluation = async () => {
  if (!regressionFile) {
    alert("Please select a regression performance CSV file");
    return;
  }

  const formData = new FormData();
  formData.append("file", regressionFile);

  setRegressionLoading(true);
  setRegressionResult(null);

  try {
    const response = await fetch(`${API_URL}/evaluate-regression`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Regression evaluation failed");
    }

    setRegressionResult(data);
    await fetchPerformanceHistory();

    alert("Regression performance evaluated and saved!");

  } catch (error) {
    alert(error.message);
  } finally {
    setRegressionLoading(false);
  }
};
  // House price prediction API
  const handleHousePrediction = async (e) => {
  e.preventDefault();

  if (
    !houseForm.locality.trim() ||
    !houseForm.area_sqft ||
    !houseForm.city ||
    !houseForm.property_type
  ) {
    setHouseError("Please fill all required property details.");
    return;
  }

  const areaSqft = Number(houseForm.area_sqft);
  const bedrooms =
    houseForm.property_type === "Plot"
      ? null
      : Number(houseForm.bedrooms);

  if (
    !Number.isFinite(areaSqft) ||
    areaSqft <= 0 ||
    (bedrooms !== null &&
      (!Number.isInteger(bedrooms) || bedrooms < 1))
  ) {
    setHouseError("Please enter valid property details.");
    return;
  }

  setHouseLoading(true);
  setHouseError("");
  setHousePrediction(null);

  try {
    const response = await fetch(`${API_URL}/predict-house-price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        city: houseForm.city,
        property_type: houseForm.property_type,
        locality: houseForm.locality.trim(),
        area_sqft: areaSqft,
        area_basis: houseForm.area_basis,
        bedrooms,
        property_age: houseForm.property_age,
        price_type: houseForm.price_type
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Prediction failed");
    }

    setHousePrediction(data);
    await fetchPredictionHistory();
  } catch (error) {
    setHouseError(error.message);
  } finally {
    setHouseLoading(false);
  }
};
  // Download drift report
  const downloadReport = () => {
    if (!uploadResult) return;

    const blob = new Blob(
      [JSON.stringify(uploadResult, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "modelwatch-drift-report.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  // Download drift report as PDF
  const downloadPDFReport = (report = uploadResult) => {
    if (!report) {
      alert("No drift report available to download.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = 18;

    // Report heading
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ModelWatch - Drift Detection Report", margin, y);

    y += 12;

    // Dataset information
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Dataset: ${report.filename || "Unknown"}`, margin, y);
    y += 6;

    doc.text(
      `Report Date: ${report.report_generated_at || report.uploaded_at
        ? new Date(report.report_generated_at || report.uploaded_at).toLocaleString()
        : new Date().toLocaleString()}`,
      margin,
      y
    );

    y += 12;

    // Summary
    doc.setFont("helvetica", "bold");
    doc.text("Report Summary", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");

    doc.text(`Total Features: ${report.total_features ?? 0}`, margin, y);
    doc.text(`Drifted Features: ${report.drifted_features ?? 0}`, 85, y);
    doc.text(`Insufficient Features: ${report.insufficient_features ?? 0}`, 175, y);

    y += 12;

    // Feature analysis heading
    doc.setFont("helvetica", "bold");
    doc.text("Feature-wise Analysis", margin, y);
    y += 8;

    // Table column positions
    const columns = [
      { title: "Feature", x: 12 },
      { title: "Test Type", x: 55 },
      { title: "Statistic", x: 112 },
      { title: "P-value", x: 155 },
      { title: "Status", x: 190 },
      { title: "Severity", x: 260 }
    ];

    const drawTableHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      columns.forEach((column) => {
        doc.text(column.title, column.x, y);
      });

      y += 3;
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    };

    drawTableHeader();

    // Feature-wise rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    (report.results || []).forEach((item) => {
      if (y > 185) {
        doc.addPage();
        y = 18;
        drawTableHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const statistic =
        item.test_type === "KS Test"
          ? item.ks_statistic
          : item.chi2_statistic;

      const severity =
        item.status === "INSUFFICIENT DATA"
          ? "NOT ASSESSED"
          : item.severity || "UNKNOWN";

      const values = [
        item.feature || "—",
        item.test_type || "—",
        statistic != null ? Number(statistic).toFixed(4) : "—",
        item.p_value != null ? Number(item.p_value).toFixed(4) : "—",
        item.status || "—",
        severity
      ];

      columns.forEach((column, index) => {
        const maxWidth =
          index === 0 ? 40 :
          index === 1 ? 54 :
          index === 4 ? 66 : 35;

        const textLines = doc.splitTextToSize(
          String(values[index]),
          maxWidth
        );

        doc.text(textLines, column.x, y);
      });

      y += 9;
      doc.line(margin, y - 3, pageWidth - margin, y - 3);
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.text(
        `ModelWatch | Page ${page} of ${pageCount}`,
        pageWidth - margin,
        200,
        { align: "right" }
      );
    }

    // Save PDF
    const safeFilename = (report.filename || "drift-report")
      .replace(/\.csv$/i, "")
      .replace(/[^a-z0-9-_]/gi, "_");

    doc.save(`ModelWatch_${safeFilename}_Report.pdf`);
  };

  // Format Indian currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="app-container">

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit size={24} />
          </div>
          <span>ModelWatch</span>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <nav>
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot"></div>
          <span>System Operational</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2>{activePage}</h2>
              <p className="topbar-subtitle">Monitor your machine learning models</p>
            </div>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Search">
              <Search size={19} />
            </button>

            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>

            <div className="avatar">MW</div>
          </div>
        </header>

        {/* OVERVIEW PAGE */}
        {activePage === "Overview" && (
          <div className="page-content">
            <section className="welcome-section">
              <div>
                <h1>Observability & Monitoring</h1>
                <p>
                  Track model health, detect distribution drift, and evaluate live inference performance.
                </p>
              </div>
            </section>

            {/* DATASET UPLOAD */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Dataset Drift Analysis</h3>
                  <p>Upload new inference data to detect statistical feature drift against reference baseline</p>
                </div>
              </div>

              <div className="upload-box">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setSelectedFile(e.target.files[0]);
                    setUploadResult(null);
                  }}
                />

                <button
                  className="primary-button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading}
                >
                  <Upload size={16} />
                  {uploadLoading ? "Analyzing..." : "Upload & Analyze Drift"}
                </button>
              </div>

              {uploadResult && (
                <div className="upload-result">
                  <h3>Drift Analysis Complete</h3>
                  <p><strong>Dataset:</strong> {uploadResult.filename}</p>
                  <p><strong>Total Features Tested:</strong> {uploadResult.total_features}</p>
                  <p><strong>Drifted Features Detected:</strong> {uploadResult.drifted_features}</p>
                </div>
              )}
            </section>

            {/* PERFORMANCE MONITORING */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Model Performance Monitoring</h3>
                  <p>Evaluate actual model predictions</p>
                </div>
              </div>

              <div className="upload-section">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setPerformanceFile(e.target.files[0]);
                    setPerformanceResult(null);
                  }}
                />

                <button
                  className="primary-button"
                  onClick={handlePerformanceEvaluation}
                  disabled={!performanceFile || performanceLoading}
                >
                  {performanceLoading
                    ? "Evaluating..."
                    : "Evaluate Performance"}
                </button>
              </div>

              {performanceResult && (
                <>
                  <h3>Performance Results</h3>
                  <p>File: {performanceResult.filename}</p>
                  <p>
                    Total Predictions: {performanceResult.total_predictions}
                  </p>

                  <div className="stats-grid">
                    {classificationMetrics.map((metric) => (
                      <div className="stat-card" key={metric.key}>
                        <span>{metric.label}</span>
                        <h2>
                          {(
                            performanceResult.metrics[metric.key] * 100
                          ).toFixed(2)}%
                        </h2>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
            {/* REGRESSION MODEL EVALUATION */}
<section className="panel">
  <div className="panel-heading">
    <div>
      <h3>Regression Model Evaluation</h3>
      <p>Evaluate regression predictions using actual and predicted values.</p>
    </div>
  </div>

  <p>Upload a CSV file containing <b>actual</b> and <b>predicted</b> columns.</p>

  <div className="upload-box">
    <input
      type="file"
      accept=".csv"
      onChange={(e) => {
        setRegressionFile(e.target.files[0] || null);
        setRegressionResult(null);
      }}
    />

    <button
      className="primary-button"
      onClick={handleRegressionEvaluation}
      disabled={!regressionFile || regressionLoading}
    >
      {regressionLoading ? "Evaluating..." : "Evaluate Regression"}
    </button>
  </div>

  {regressionResult && (
    <div className="stats-grid" style={{ marginTop: 0 }}>
      <div className="stat-card">
        <span>MAE</span>
        <h2>{Number(regressionResult.metrics?.mae).toFixed(2)}</h2>
      </div>

      <div className="stat-card">
        <span>MSE</span>
        <h2>{Number(regressionResult.metrics?.mse).toFixed(2)}</h2>
      </div>

      <div className="stat-card">
        <span>RMSE</span>
        <h2>{Number(regressionResult.metrics?.rmse).toFixed(2)}</h2>
      </div>

      <div className="stat-card">
        <span>R² Score</span>
        <h2>{Number(regressionResult.metrics?.r2_score).toFixed(4)}</h2>
      </div>
    </div>
  )}
</section>

            {/* STATISTICS */}
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-heading">
                  <span>Total Models</span>
                  <BrainCircuit size={20} />
                </div>
                <h2>{String(registeredModels.length).padStart(2, "0")}</h2>
                <p>Registered models</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>Drifted Features</span>
                  <AlertTriangle size={20} />
                </div>
                <h2>
                  {uploadResult
                    ? uploadResult.drifted_features
                    : "--"}
                </h2>
                <p>Detected features</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>Model Accuracy</span>
                  <TrendingUp size={20} />
                </div>
                <h2>
  {(() => {
    const latestClassification = [...performanceHistory]
      .reverse()
      .find(
        (item) =>
          typeof item.metrics?.accuracy === "number" &&
          Number.isFinite(item.metrics.accuracy)
      );

    return latestClassification
      ? `${(latestClassification.metrics.accuracy * 100).toFixed(2)}%`
      : "--";
  })()}
</h2>
                <p>Latest evaluated accuracy</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>System Status</span>
                  <CheckCircle size={20} />
                </div>
                <h2 className="healthy-text">{apiStatus}</h2>
                <p>Backend connection</p>
              </div>
            </section>

            {/* CHART AND ALERTS */}
            <section className="content-grid">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Model Performance</h3>
                    <p>Illustrative weekly trend</p>
                  </div>
                  <span className="chart-tag">Last 7 days</span>
                </div>

                <div className="chart-area">
                  <Suspense fallback={<p>Loading chart...</p>}>
  <Charts type="overview" data={performanceData} />
</Suspense>
                </div>
              </div>

              <div className="panel alerts-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Alerts</h3>
                    <p>Monitoring notifications</p>
                  </div>
                </div>

                <div className="alert-item">
                  <AlertTriangle className="warning-icon" size={21} />
                  <div>
                    <h4>Data monitoring</h4>
                    <p>
                      {uploadResult
                        ? `${uploadResult.drifted_features} drifted features detected.`
                        : "No recent dataset analysis."}
                    </p>
                  </div>
                </div>

                <div className="alert-item">
                  <CheckCircle className="success-icon" size={21} />
                  <div>
                    <h4>API Status</h4>
                    <p>{apiStatus}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* REGISTERED MODELS */}
            <section className="panel model-panel">
              <div className="panel-heading">
                <div>
                  <h3>Registered Models</h3>
                  <p>Your monitored machine learning models</p>
                </div>

                <button
                  className="primary-button"
                  onClick={fetchRegisteredModels}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? "Refreshing..." : "Refresh Models"}
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>MODEL NAME</th>
                      <th>TYPE</th>
                      <th>VERSION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {modelsLoading ? (
                      <tr>
                        <td colSpan="4">Loading models...</td>
                      </tr>
                    ) : modelsError ? (
                      <tr>
                        <td colSpan="4">{modelsError}</td>
                      </tr>
                    ) : registeredModels.length > 0 ? (
                      registeredModels.map((model) => (
                        <tr key={model.model_id}>
                          <td>{model.model_name}</td>
                          <td>{model.algorithm}</td>
                          <td>
                            {model.versions?.length > 0
                              ? model.versions[
                                  model.versions.length - 1
                                ].version
                              : "--"}
                          </td>
                          <td>{model.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No registered models found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* MODELS PAGE */}
        {activePage === "Models" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Model Registry</h2>
                <p>Register and manage your ML model versions.</p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Register New Model</h3>
                  <p>Add a machine learning model to your registry.</p>
                </div>
              </div>

              <form onSubmit={handleRegisterModel} className="model-form">
                <div className="form-group">
                  <label>Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. House Price Predictor"
                    value={modelForm.model_name}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        model_name: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Algorithm</label>
                  <input
                    type="text"
                    placeholder="e.g. Random Forest"
                    value={modelForm.algorithm}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        algorithm: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Version</label>
                  <input
                    type="text"
                    value={modelForm.version}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        version: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Describe your ML model..."
                    value={modelForm.description}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        description: e.target.value
                      })
                    }
                  />
                </div>

                <button type="submit" disabled={registerLoading}>
                  {registerLoading ? "Registering..." : "Register Model"}
                </button>
              </form>
            </div>

            <div className="panel models-list-panel">
              <div className="panel-heading">
                <div>
                  <h3>Registered Models</h3>
                  <p>Manage models and their versions.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={fetchRegisteredModels}
                  disabled={modelsLoading}
                >
                  Refresh
                </button>
              </div>

              {modelsLoading ? (
                <p>Loading models...</p>
              ) : modelsError ? (
                <p className="error-message">{modelsError}</p>
              ) : registeredModels.length === 0 ? (
                <p>No models registered yet.</p>
              ) : (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Model Name</th>
                        <th>Algorithm</th>
                        <th>Versions</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {registeredModels.map((model) => (
                        <tr key={model.model_id}>
                          <td>
                            <strong>{model.model_name}</strong>
                            <p>{model.description}</p>
                          </td>

                          <td>{model.algorithm}</td>

                          <td>
                            {model.versions?.map((version, index) => (
                              <span key={index} className="version-tag">
                                {version.version}
                              </span>
                            ))}
                          </td>

                          <td>
                            <select
                              value={model.status}
                              onChange={(e) =>
                                handleModelStatus(
                                  model.model_id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Archived">Archived</option>
                            </select>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleAddVersion(model.model_id)}
                            >
                              + Add Version
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


{/* TRAINED MODEL REGISTRY PAGE */}
{activePage === "Trained Model Registry" && (
  <div className="page-content">
    <div className="page-header">
      <div>
        <h2>Trained Model Registry</h2>
        <p>Track, manage and compare trained model versions.</p>
      </div>

      <button
        className="primary-button"
        onClick={fetchTrainedRegistry}
        disabled={trainedRegistryLoading}
      >
        {trainedRegistryLoading ? "Loading..." : "Refresh"}
      </button>
    </div>

    {trainedRegistryLoading ? (
      <p>Loading trained models...</p>
    ) : trainedRegistryError ? (
      <p className="error-message">{trainedRegistryError}</p>
    ) : (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Versions</span>
            <h2>{trainedRegistry.length}</h2>
          </div>

          <div className="stat-card">
            <span>Active Version</span>
            <h2>{trainedActiveVersion || "None"}</h2>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Model Versions</h3>
              <p>All successfully trained model versions.</p>
            </div>
          </div>

          {trainedRegistry.length === 0 ? (
            <p>No trained models found.</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Algorithm</th>
                    <th>Training Date</th>
                    <th>R² Score</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {trainedRegistry.map((model) => (
                    <tr key={model.version}>
                      <td>
                        <strong>{model.version}</strong>
                      </td>

                      <td>{model.algorithm || "N/A"}</td>

                      <td>
                        {model.trained_at
                          ? new Date(model.trained_at).toLocaleString("en-IN")
                          : "N/A"}
                      </td>

                      <td>
                        {model.r2_score != null
                          ? Number(model.r2_score).toFixed(3)
                          : "N/A"}
                      </td>

                      <td>
                        {model.mae != null
                          ? Number(model.mae).toLocaleString("en-IN", {
                              maximumFractionDigits: 2
                            })
                          : "N/A"}
                      </td>

                      <td>
                        {model.rmse != null
                          ? Number(model.rmse).toLocaleString("en-IN", {
                              maximumFractionDigits: 2
                            })
                          : "N/A"}
                      </td>

                      <td>
                        <span className="version-tag">
                          {model.version === trainedActiveVersion
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={model.version === trainedActiveVersion}
                          onClick={() =>
                            activateTrainedVersion(model.version)
                          }
                        >
                          Activate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Version Comparison</h3>
              <p>Compare the latest two trained model versions.</p>
            </div>

            <button
              className="primary-button"
              onClick={compareTrainedVersions}
              disabled={compareLoading || trainedRegistry.length < 2}
            >
              {compareLoading ? "Comparing..." : "Compare Versions"}
            </button>
          </div>

          {registryComparison.length > 0 && (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Algorithm</th>
                    <th>R² Score</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {registryComparison.map((model) => (
                    <tr key={model.version}>
                      <td>{model.version}</td>
                      <td>{model.algorithm}</td>
                      <td>
                        {model.r2_score != null
                          ? Number(model.r2_score).toFixed(3)
                          : "N/A"}
                      </td>
                      <td>
                        {model.mae != null
                          ? Number(model.mae).toLocaleString("en-IN", {
                              maximumFractionDigits: 2
                            })
                          : "N/A"}
                      </td>
                      <td>
                        {model.rmse != null
                          ? Number(model.rmse).toLocaleString("en-IN", {
                              maximumFractionDigits: 2
                            })
                          : "N/A"}
                      </td>
                      <td>{model.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="warning-message">
          Note: Model performance metrics are experimental and based on
          a small property dataset. A higher R² score and lower MAE/RMSE
          generally indicate better performance.
        </p>
      </>
    )}
  </div>
)}

        {/* TRAINING LOGS PAGE */}
        {activePage === "Training Logs" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Training Logs</h2>
                <p>Monitor model training runs and their results.</p>
              </div>

              <button
                className="primary-button"
                onClick={fetchTrainingLogs}
                disabled={trainingLogsLoading}
              >
                {trainingLogsLoading ? "Loading..." : "Refresh Logs"}
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Total Training Runs</span>
                <h2>{trainingLogs.length}</h2>
              </div>

              <div className="stat-card">
                <span>Successful Runs</span>
                <h2>
                  {trainingLogs.filter(
                    (log) => log.status === "SUCCESS"
                  ).length}
                </h2>
              </div>

              <div className="stat-card">
                <span>Failed Runs</span>
                <h2>
                  {trainingLogs.filter(
                    (log) => log.status === "FAILED"
                  ).length}
                </h2>
              </div>
            </div>

            {trainingLogsError && (
              <p className="error-message">{trainingLogsError}</p>
            )}

            {trainingLogsLoading ? (
              <p>Loading training history...</p>
            ) : trainingLogs.length === 0 ? (
              <div className="panel">
                <p>No training logs available yet.</p>
              </div>
            ) : (
              <div className="panel">
                <h3>Training Run History</h3>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Run ID</th>
                        <th>Model Version</th>
                        <th>Algorithm</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Records</th>
                        <th>MAE</th>
                        <th>RMSE</th>
                        <th>R² Score</th>
                        <th>Started At</th>
                      </tr>
                    </thead>

                    <tbody>
                      {trainingLogs.map((log) => (
                        <tr key={log.run_id}>
                          <td title={log.run_id}>
                            {log.run_id.slice(0, 8)}...
                          </td>

                          <td>{log.details?.model_version || "N/A"}</td>
                          <td>{log.details?.algorithm || "N/A"}</td>

                          <td>
                            <span
                              className={
                                log.status === "SUCCESS"
                                  ? "status-success"
                                  : "status-failed"
                              }
                            >
                              {log.status}
                            </span>
                          </td>

                          <td>{log.duration_seconds} sec</td>
                          <td>{log.details?.records ?? "N/A"}</td>

                          <td>
                            {log.details?.mae != null
                              ? Number(log.details.mae).toLocaleString("en-IN")
                              : "N/A"}
                          </td>

                          <td>
                            {log.details?.rmse != null
                              ? Number(log.details.rmse).toLocaleString("en-IN")
                              : "N/A"}
                          </td>

                          <td>
                            {log.details?.r2_score != null
                              ? Number(log.details.r2_score).toFixed(3)
                              : "N/A"}
                          </td>

                          <td>
                            {log.started_at
                              ? new Date(log.started_at).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOUSE PRICE PREDICTOR PAGE */}
        {activePage === "House Price Predictor" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>House Price Predictor</h2>
                <p>
                  Estimate property market prices using your trained Random Forest model (Pune & Prayagraj).
                </p>
              </div>
              <span className="chart-tag">Active Version: {trainedActiveVersion || "v3"}</span>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Property Parameters</h3>
                  <p>Provide specifications to generate a real-time price estimation</p>
                </div>
              </div>

              <form onSubmit={handleHousePrediction} className="model-form" style={{ marginTop: 0 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>City</label>
                    <select
                      value={houseForm.city}
                      onChange={(e) =>
                        setHouseForm({ ...houseForm, city: e.target.value })
                      }
                      required
                    >
                      <option value="Pune">Pune</option>
                      <option value="Prayagraj">Prayagraj</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Property Type</label>
                    <select
                      value={houseForm.property_type}
                      onChange={(e) =>
                        setHouseForm({ ...houseForm, property_type: e.target.value })
                      }
                      required
                    >
                      <option value="Flat">Flat / Apartment</option>
                      <option value="Independent House">Independent House</option>
                      <option value="Plot">Residential Plot</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Baner, Wakad, Civil Lines"
                      value={houseForm.locality}
                      onChange={(e) => {
                        setHouseForm({ ...houseForm, locality: e.target.value });
                        setHouseError("");
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Area (Square Feet)</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 1000"
                      value={houseForm.area_sqft}
                      onChange={(e) => {
                        setHouseForm({ ...houseForm, area_sqft: e.target.value });
                        setHouseError("");
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Area Basis</label>
                    <select
                      value={houseForm.area_basis}
                      onChange={(e) =>
                        setHouseForm({ ...houseForm, area_basis: e.target.value })
                      }
                      required
                    >
                      <option value="Carpet">Carpet Area</option>
                      <option value="Built-up">Built-up Area</option>
                      <option value="Super Built-up">Super Built-up Area</option>
                      <option value="Plot Area">Plot Area</option>
                    </select>
                  </div>

                  {houseForm.property_type !== "Plot" && (
                    <div className="form-group">
                      <label>Number of Bedrooms</label>
                      <select
                        value={houseForm.bedrooms}
                        onChange={(e) =>
                          setHouseForm({ ...houseForm, bedrooms: e.target.value })
                        }
                        required
                      >
                        <option value="1">1 Bedroom</option>
                        <option value="2">2 Bedrooms</option>
                        <option value="3">3 Bedrooms</option>
                        <option value="4">4 Bedrooms</option>
                        <option value="5">5 Bedrooms</option>
                        <option value="6">6 Bedrooms</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Property Age</label>
                    <input
                      type="text"
                      placeholder="e.g. New, 5-10 years"
                      value={houseForm.property_age}
                      onChange={(e) =>
                        setHouseForm({ ...houseForm, property_age: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Price Type</label>
                    <select
                      value={houseForm.price_type}
                      onChange={(e) =>
                        setHouseForm({ ...houseForm, price_type: e.target.value })
                      }
                    >
                      <option value="Asking">Asking Price</option>
                      <option value="Registered">Registered Price</option>
                    </select>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={houseLoading}
                  >
                    {houseLoading ? "Calculating Estimate..." : "Predict Property Price"}
                  </button>
                </div>
              </form>

              {houseError && (
                <p className="error-message">{houseError}</p>
              )}

              {housePrediction && (
                <div className="valuation-card">
                  <div className="valuation-header">
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Estimated Property Value
                      </p>
                      <div className="valuation-amount">
                        {formatINR(housePrediction.predicted_price)}
                      </div>
                    </div>
                    <span className="status-badge">
                      Model: {housePrediction.model_version || housePrediction.model}
                    </span>
                  </div>

                  <div className="valuation-grid">
                    <div className="valuation-pill">
                      <span>Location</span>
                      <strong>{houseForm.locality}, {houseForm.city}</strong>
                    </div>
                    <div className="valuation-pill">
                      <span>Property Type</span>
                      <strong>{houseForm.property_type}</strong>
                    </div>
                    <div className="valuation-pill">
                      <span>Total Area</span>
                      <strong>{houseForm.area_sqft} sqft ({houseForm.area_basis})</strong>
                    </div>
                    {houseForm.property_type !== "Plot" && (
                      <div className="valuation-pill">
                        <span>Bedrooms</span>
                        <strong>{houseForm.bedrooms} BHK</strong>
                      </div>
                    )}
                    <div className="valuation-pill">
                      <span>Property Age</span>
                      <strong>{houseForm.property_age || "Unspecified"}</strong>
                    </div>
                    <div className="valuation-pill">
                      <span>Price Basis</span>
                      <strong>{houseForm.price_type}</strong>
                    </div>
                  </div>

                  <p className="warning-message" style={{ margin: 0 }}>
                    {housePrediction.warning}
                  </p>
                </div>
              )}

              {/* WHAT-IF SCENARIO SIMULATOR CARD */}
              <div className="panel" style={{ marginTop: "1.5rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-sage-border)" }}>
                <div className="panel-heading">
                  <div>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <TrendingUp size={20} color="var(--color-sage-accent)" />
                      "What-If" Infrastructure & Policy Price Sensitivity Simulator
                    </h3>
                    <p>Simulate the financial impact of metro connectivity, circle rate revisions, and macro expansion on this property.</p>
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Metro Transit Corridor</label>
                    <select
                      value={scenarioForm.has_metro_connectivity ? "yes" : "no"}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, has_metro_connectivity: e.target.value === "yes" })}
                    >
                      <option value="no">No Direct Metro Line</option>
                      <option value="yes">Metro Station (&lt; 1km) [+12%]</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Zonal Infrastructure Growth</label>
                    <select
                      value={scenarioForm.infrastructure_development}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, infrastructure_development: e.target.value })}
                    >
                      <option value="None">Standard / Existing</option>
                      <option value="Moderate">Moderate Arterial Expansion (+5%)</option>
                      <option value="High">Major Growth Corridor / Ring Road (+12%)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ready Reckoner Revision (%)</label>
                    <input
                      type="number"
                      step="1"
                      min="-20"
                      max="50"
                      value={scenarioForm.ready_reckoner_revision_percent}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, ready_reckoner_revision_percent: e.target.value })}
                      placeholder="e.g. 5.0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Projection Horizon</label>
                    <select
                      value={scenarioForm.projected_years}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, projected_years: parseInt(e.target.value) })}
                    >
                      <option value={0}>Current Valuation (Year 0)</option>
                      <option value={1}>1 Year Horizon</option>
                      <option value={3}>3 Years Horizon</option>
                      <option value={5}>5 Years Horizon</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSimulateScenario}
                    disabled={simulationLoading}
                  >
                    {simulationLoading ? "Running Simulation..." : "Simulate Scenario Impact"}
                  </button>
                </div>

                {simulationError && (
                  <p className="error-message" style={{ marginTop: "0.75rem" }}>{simulationError}</p>
                )}

                {simulationResult && (
                  <div style={{ marginTop: "1.25rem", padding: "1.25rem", background: "var(--color-card-bg)", borderRadius: "8px", border: "1px solid var(--color-border-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Simulated Projected Valuation</span>
                        <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--color-sage-dark)" }}>
                          ₹{Number(simulationResult.simulated_price_inr).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                          Baseline: ₹{Number(simulationResult.baseline_price_inr).toLocaleString()} ({simulationResult.city}, {simulationResult.locality})
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span className="badge" style={{ fontSize: "0.95rem", background: "var(--color-sage-subtle)", color: "var(--color-sage-accent)", padding: "0.4rem 0.8rem", border: "1px solid var(--color-sage-border)" }}>
                          Total Impact: {simulationResult.percentage_change} (+₹{Number(simulationResult.price_delta_inr).toLocaleString()})
                        </span>
                      </div>
                    </div>

                    {simulationResult.scenario_factors_applied?.length > 0 && (
                      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border-card)", paddingTop: "0.75rem" }}>
                        <strong style={{ fontSize: "0.85rem" }}>Applied Catalyst Factors:</strong>
                        <ul style={{ margin: "0.5rem 0 0 1.25rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                          {simulationResult.scenario_factors_applied.map((f, i) => (
                            <li key={i}>
                              <strong>{f.factor}</strong> ({f.impact_percentage}): {f.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="warning-message">
                Note: This estimate is generated by a machine learning model trained on sample property transactions from Pune and Prayagraj. It is an algorithmic estimation and not a verified certified market appraisal.
              </p>
            </section>
          </div>
        )}

        {/* DRIFT MONITORING PAGE */}
        {activePage === "Drift Monitoring" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Data Drift Monitoring</h2>
                <p>Kolmogorov-Smirnov & Chi-Square feature distribution analysis against baseline.</p>
              </div>

              <div className="button-group">
                <button
                  className="secondary-button"
                  onClick={fetchDriftHistory}
                  disabled={driftHistoryLoading}
                >
                  {driftHistoryLoading ? "Refreshing..." : "Refresh Reports"}
                </button>
              </div>
            </div>

            {/* HIGH DRIFT ALERT BANNER */}
            {driftHistory.length > 0 && driftHistory[0].has_alert && (
              <div className="high-drift-banner">
                <span style={{ fontSize: "28px", lineHeight: 1 }}>⚠️</span>
                <div>
                  <h3>Critical Drift Detected (High Severity)</h3>
                  <p>{driftHistory[0].alert_message}</p>
                  <strong>
                    Affected Features: {(driftHistory[0].alert_features || []).join(", ")}
                  </strong>
                </div>
              </div>
            )}

            {/* LATEST DRIFT METRICS */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Latest Feature Drift Summary</h3>
                  <p>Distribution deviation tests across active columns</p>
                </div>
              </div>

              {uploadResult ? (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-heading">
                        <span>Total Features</span>
                      </div>
                      <h2>{uploadResult.total_features}</h2>
                      <p>Evaluated columns</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-heading">
                        <span>Drifted Features</span>
                      </div>
                      <h2 style={{ color: "var(--tomato)" }}>{uploadResult.drifted_features}</h2>
                      <p>Significant shift detected</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-heading">
                        <span>Low Severity</span>
                      </div>
                      <h2>
                        {uploadResult.results?.filter((item) => item.severity === "LOW").length || 0}
                      </h2>
                      <p>Minor or no variance</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-heading">
                        <span>High Severity</span>
                      </div>
                      <h2 style={{ color: "var(--tomato)" }}>
                        {uploadResult.results?.filter((item) => item.severity === "HIGH").length || 0}
                      </h2>
                      <p>Action recommended</p>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Feature Name</th>
                          <th>Statistical Test</th>
                          <th>Test Statistic</th>
                          <th>P-value</th>
                          <th>Status</th>
                          <th>Severity</th>
                        </tr>
                      </thead>

                      <tbody>
                        {uploadResult.results?.map((item) => {
                          const statistic =
                            item.test_type === "KS Test"
                              ? item.ks_statistic
                              : item.chi2_statistic;

                          return (
                            <tr key={item.feature}>
                              <td><strong>{item.feature}</strong></td>
                              <td>{item.test_type}</td>
                              <td>
                                {statistic !== undefined && statistic !== null
                                  ? Number(statistic).toFixed(4)
                                  : "—"}
                              </td>
                              <td>
                                {item.p_value !== undefined && item.p_value !== null
                                  ? Number(item.p_value).toFixed(4)
                                  : "—"}
                              </td>
                              <td>
                                <span className={`drift-status ${
                                  item.status === "NO SIGNIFICANT DRIFT"
                                    ? "low"
                                    : item.status === "INSUFFICIENT DATA"
                                    ? "warning"
                                    : "high"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                <span className={`drift-status ${
                                  item.severity === "LOW"
                                    ? "low"
                                    : item.severity === "MEDIUM"
                                    ? "warning"
                                    : item.severity === "HIGH"
                                    ? "high"
                                    : "warning"
                                }`}>
                                  {item.severity || "N/A"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="empty-history">Please upload a CSV dataset from the Overview page to generate an initial drift report.</p>
              )}
            </section>

            {/* DRIFT TREND ANALYSIS */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Drift Trend Analysis</h3>
                  <p>Historical ratio of drifted features across consecutive dataset uploads</p>
                </div>
              </div>

              {driftHistory.length > 0 ? (
                <div style={{ width: "100%", height: "300px" }}>
                  <Charts
                    type="drift-trend"
                    data={[...driftHistory].reverse().map((item, index) => ({
                      name: item.uploaded_at
                        ? new Date(item.uploaded_at).toLocaleDateString()
                        : `Run ${index + 1}`,
                      drifted_features: Number(item.drifted_features) || 0,
                      total_features: Number(item.total_features) || 0
                    }))}
                  />
                </div>
              ) : (
                <p className="empty-history">Upload multiple datasets over time to view drift trends.</p>
              )}
            </section>

            {/* DRIFT REPORT HISTORY */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Historical Drift Reports</h3>
                  <p>Audit trail of all previous dataset drift evaluations</p>
                </div>

                <button
                  className="secondary-button"
                  onClick={fetchDriftHistory}
                  disabled={driftHistoryLoading}
                >
                  {driftHistoryLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {driftHistoryError && (
                <p className="error-message">{driftHistoryError}</p>
              )}

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Dataset Filename</th>
                      <th>Uploaded Date</th>
                      <th>Total Features</th>
                      <th>Drifted Features</th>
                      <th>Alert Notification</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {driftHistory.length > 0 ? (
                      driftHistory.map((item, index) => (
                        <tr key={`${item.filename}-${item.uploaded_at}-${index}`}>
                          <td><strong>{item.filename}</strong></td>
                          <td>
                            {item.uploaded_at
                              ? new Date(item.uploaded_at).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short"
                                })
                              : "Unavailable"}
                          </td>
                          <td>{item.total_features}</td>
                          <td>
                            <strong style={{ color: item.drifted_features > 0 ? "var(--tomato)" : "var(--success)" }}>
                              {item.drifted_features}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`drift-status ${
                                item.email_status === "SENT"
                                  ? "low"
                                  : item.email_status === "FAILED"
                                  ? "high"
                                  : "warning"
                              }`}
                            >
                              {item.email_status || "NOT_REQUIRED"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="secondary-button"
                              style={{ height: "30px", fontSize: "12px", padding: "0 10px" }}
                              onClick={() => setSelectedDriftReport(item)}
                            >
                              Inspect Report
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>
                          {driftHistoryLoading
                            ? "Loading drift history..."
                            : "No previous drift reports available."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SELECTED DRIFT REPORT MODAL */}
            {selectedDriftReport && (
              <div className="modal-overlay" onClick={() => setSelectedDriftReport(null)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3>Detailed Drift Report</h3>
                      <p style={{ fontSize: "12.5px", color: "var(--text-3)", marginTop: "2px" }}>
                        Dataset: {selectedDriftReport.filename}
                      </p>
                    </div>
                    <div className="button-group">
                      <button
                        className="primary-button"
                        onClick={() => downloadPDFReport(selectedDriftReport)}
                      >
                        Download PDF
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setSelectedDriftReport(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-heading"><span>Total Features</span></div>
                      <h2>{selectedDriftReport.total_features}</h2>
                    </div>

                    <div className="stat-card">
                      <div className="stat-heading"><span>Drifted Features</span></div>
                      <h2 style={{ color: "var(--tomato)" }}>{selectedDriftReport.drifted_features}</h2>
                    </div>

                    <div className="stat-card">
                      <div className="stat-heading"><span>Insufficient Data</span></div>
                      <h2>{selectedDriftReport.insufficient_features}</h2>
                    </div>
                  </div>

                  <div className="panel-heading" style={{ margin: 0 }}>
                    <h3>Feature Significance Breakdown</h3>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th>Test Method</th>
                          <th>Statistic</th>
                          <th>P-value</th>
                          <th>Status</th>
                          <th>Severity</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(selectedDriftReport.results || []).map((item, index) => {
                          const statistic =
                            item.test_type === "KS Test"
                              ? item.ks_statistic
                              : item.chi2_statistic;

                          return (
                            <tr key={index}>
                              <td><strong>{item.feature}</strong></td>
                              <td>{item.test_type}</td>
                              <td>
                                {statistic != null ? Number(statistic).toFixed(4) : "—"}
                              </td>
                              <td>
                                {item.p_value != null ? Number(item.p_value).toFixed(4) : "—"}
                              </td>
                              <td>
                                <span className={`drift-status ${
                                  item.status === "NO SIGNIFICANT DRIFT"
                                    ? "low"
                                    : item.status === "INSUFFICIENT DATA"
                                    ? "warning"
                                    : "high"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                <span className={`drift-status ${
                                  item.severity === "LOW"
                                    ? "low"
                                    : item.severity === "MEDIUM"
                                    ? "warning"
                                    : item.severity === "HIGH"
                                    ? "high"
                                    : "warning"
                                }`}>
                                  {item.status === "INSUFFICIENT DATA" ? "NOT ASSESSED" : item.severity || "N/A"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROPERTY PREDICTION HISTORY PAGE */}
        {activePage === "Prediction History" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Prediction History</h2>
                <p>Log of real-estate valuation requests generated by the active model.</p>
              </div>

              <div className="button-group">
                <button
                  className="secondary-button"
                  onClick={fetchPredictionHistory}
                  disabled={predictionHistoryLoading}
                >
                  {predictionHistoryLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="primary-button"
                  onClick={exportPredictionHistory}
                >
                  Export CSV
                </button>
                <button
                  className="secondary-button"
                  onClick={exportPredictionHistoryPDF}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {predictionHistoryError && (
              <p className="error-message">{predictionHistoryError}</p>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-heading"><span>Total Predictions</span></div>
                <h2>{predictionHistory.length}</h2>
                <p>All recorded inferences</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Pune Properties</span></div>
                <h2>
                  {predictionHistory.filter((item) => item.city === "Pune").length}
                </h2>
                <p>Regional predictions</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Prayagraj Properties</span></div>
                <h2>
                  {predictionHistory.filter((item) => item.city === "Prayagraj").length}
                </h2>
                <p>Regional predictions</p>
              </div>
            </div>

            <section className="panel">
              <div className="filter-toolbar">
                <input
                  type="text"
                  placeholder="Filter by city, locality or property type..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />

                <select
                  value={historyCityFilter}
                  onChange={(e) => setHistoryCityFilter(e.target.value)}
                >
                  <option value="All">All Cities</option>
                  <option value="Pune">Pune</option>
                  <option value="Prayagraj">Prayagraj</option>
                </select>

                {(historySearch || historyCityFilter !== "All") && (
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryCityFilter("All");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date & Time</th>
                      <th>City</th>
                      <th>Property Type</th>
                      <th>Locality</th>
                      <th>Area (sqft)</th>
                      <th>Bedrooms</th>
                      <th>Price Basis</th>
                      <th>Predicted Valuation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPredictionHistory.length > 0 ? (
                      filteredPredictionHistory.map((item) => (
                        <tr key={item.id}>
                          <td><strong>#{item.id}</strong></td>
                          <td>
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short"
                                })
                              : "Date unavailable"}
                          </td>
                          <td>{item.city}</td>
                          <td>
                            <span className="version-tag">{item.property_type}</span>
                          </td>
                          <td>{item.locality}</td>
                          <td>{item.area_sqft} ({item.area_basis})</td>
                          <td>{item.bedrooms ? `${item.bedrooms} BHK` : "—"}</td>
                          <td>{item.price_type}</td>
                          <td>
                            <strong style={{ color: "var(--sage-700)" }}>
                              ₹{Number(item.predicted_price).toLocaleString("en-IN")}
                            </strong>
                          </td>
                          <td>
                            <button
                              className="danger-button"
                              onClick={() => deletePrediction(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", padding: "28px" }}>
                          {predictionHistoryLoading
                            ? "Loading prediction history..."
                            : "No matching predictions found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* PERFORMANCE HISTORY PAGE */}
        {activePage === "Performance History" && (
          <div className="page-content">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Model Performance History</h3>
                  <p>Track and analyze previous model evaluation runs.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={fetchPerformanceHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Refreshing..." : "Refresh History"}
                </button>
              </div>

              {historyError && (
                <p className="error-message">{historyError}</p>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <span>Total Evaluation Runs</span>
                  <h2>{performanceHistory.length}</h2>
                </div>

                <div className="stat-card">
                  <span>Classification Runs</span>
                  <h2>
                   {performanceHistory.filter(isClassificationRun).length}
                  </h2>
                </div>

                <div className="stat-card">
                  <span>Regression Runs</span>
                  <h2>
                {performanceHistory.filter(isRegressionRun).length}
                  </h2>
                </div>
              </div>
            </section>

            {/* CLASSIFICATION CHART */}
            <section className="panel">
              <h3>Classification Performance</h3>
              <p>Accuracy and F1 Score across evaluation runs.</p>

              {historyChartData.length > 0 ? (
                <div style={{ width: "100%", height: 320 }}>
                  <Suspense fallback={<p>Loading chart...</p>}>
  <Charts type="classification" data={historyChartData} />
</Suspense>
                </div>
              ) : (
                <p>No classification evaluation data available.</p>
              )}
            </section>

            {/* REGRESSION CHART */}
            <section className="panel">
              <h3>Regression Performance</h3>
              <p>MAE and RMSE across evaluation runs.</p>

              {regressionChartData.length > 0 ? (
                <div style={{ width: "100%", height: 320 }}>
                  <Suspense fallback={<p>Loading chart...</p>}>
  <Charts type="regression" data={regressionChartData} />
</Suspense>
                </div>
              ) : (
                <p>No regression evaluation data available.</p>
              )}
</section>
{/* EVALUATION HISTORY TABLE */}
<section className="panel">
  <h3>Evaluation Records</h3>
  <div className="history-export-buttons">
  <button
    className="primary-button"
    onClick={exportPerformanceHistoryCSV}
  >
    Export CSV
  </button>

  <button
    className="secondary-button"
    onClick={exportPerformanceHistoryPDF}
  >
    Export PDF
  </button>
</div>
  <div className="history-filter-controls">
  <input
    type="text"
    placeholder="Search by file name..."
    value={perfHistorySearch}
    onChange={(e) => setPerfHistorySearch(e.target.value)}
  />

  <select
    value={historyTypeFilter}
    onChange={(e) => setHistoryTypeFilter(e.target.value)}
  >
    <option value="All">All Types</option>
    <option value="Classification">Classification</option>
    <option value="Regression">Regression</option>
  </select>
    <button
    className="secondary-button"
    onClick={() => {
      setPerfHistorySearch("");
      setHistoryTypeFilter("All");
    }}
  >
    Clear Filters
  </button>
</div>
  <p className="history-record-count">
    Showing {filteredPerformanceHistory.length} of{" "}
    {performanceHistory.length} records
  </p>
  {filteredPerformanceHistory.length > 0 ? (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Date & Time</th>
            <th>File Name</th>
            <th>Model Type</th>
            <th>Primary Metric</th>
            <th>Secondary Metric</th>
          </tr>
        </thead>

        <tbody>
          {filteredPerformanceHistory.map((item, index) => {
            const isRegression = isRegressionRun(item);

            const evaluationDate = item.evaluated_at
              ? new Date(item.evaluated_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short"
                })
              : "N/A";

            const primaryMetric = isRegression
              ? item.metrics?.mae !== undefined
                ? `MAE: ₹${Number(item.metrics.mae).toLocaleString("en-IN", {
                    maximumFractionDigits: 2
                  })}`
                : "MAE: N/A"
              : item.metrics?.accuracy !== undefined
                ? `Accuracy: ${(Number(item.metrics.accuracy) * 100).toFixed(2)}%`
                : "Accuracy: N/A";

            const secondaryMetric = isRegression
              ? item.metrics?.rmse !== undefined
                ? `RMSE: ₹${Number(item.metrics.rmse).toLocaleString("en-IN", {
                    maximumFractionDigits: 2
                  })}`
                : "RMSE: N/A"
              : item.metrics?.f1_score !== undefined
                ? `F1: ${(Number(item.metrics.f1_score) * 100).toFixed(2)}%`
                : "F1: N/A";

            return (
              <tr key={item.evaluated_at || index}>
                <td>Run {index + 1}</td>

                <td>{evaluationDate}</td>

                <td>{item.filename || "N/A"}</td>

                <td>
                  <span
                    className={`evaluation-type-badge ${
                      isRegression
                        ? "regression-badge"
                        : "classification-badge"
                    }`}
                  >
                    {isRegression ? "Regression" : "Classification"}
                  </span>
                </td>

                <td>{primaryMetric}</td>

                <td>{secondaryMetric}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    ) : performanceHistory.length > 0 ? (
    <div className="empty-history">
      <h3>No Matching Records</h3>
      <p>
        No evaluation records match your search or selected filter.
        Try changing your search or evaluation type.
      </p>
    </div>
  ) : (
    <div className="empty-history">
      <h3>No Evaluation Records Yet</h3>
      <p>
        Evaluate a model from the Overview page to see your evaluation
        history here.
      </p>
    </div>
  )}
</section>

          </div>
        )}



        {/* MODEL COMPARISON PAGE */}
        {activePage === "Model Comparison" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Model Performance Comparison</h2>
                <p>Side-by-side benchmark comparison between two saved evaluation runs.</p>
              </div>

              <button
                className="secondary-button"
                onClick={fetchPerformanceHistory}
                disabled={historyLoading}
              >
                {historyLoading ? "Refreshing..." : "Refresh Runs"}
              </button>
            </div>

            {performanceHistory.length < 2 ? (
              <section className="panel">
                <div className="empty-history">
                  <h3>Not Enough Evaluation Runs</h3>
                  <p>
                    Please perform and save at least two model evaluations from the Overview page to enable benchmark comparisons.
                  </p>
                </div>
              </section>
            ) : (
              <>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Select Benchmark Candidates</h3>
                      <p>Choose two evaluation runs of matching problem types (classification or regression)</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Evaluation Run A (Baseline)</label>
                      <select
                        value={comparisonRunA}
                        onChange={(e) => setComparisonRunA(e.target.value)}
                      >
                        {performanceHistory.map((item, index) => (
                          <option key={index} value={String(index)}>
                            Run {index + 1} · {item.filename || "Evaluation"} ({isRegressionRun(item) ? "Regression" : "Classification"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Evaluation Run B (Challenger)</label>
                      <select
                        value={comparisonRunB}
                        onChange={(e) => setComparisonRunB(e.target.value)}
                      >
                        {performanceHistory.map((item, index) => (
                          <option key={index} value={String(index)}>
                            Run {index + 1} · {item.filename || "Evaluation"} ({isRegressionRun(item) ? "Regression" : "Classification"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {comparisonRunA === comparisonRunB ? (
                  <p className="warning-message">Please select two distinct evaluation runs to perform comparison.</p>
                ) : comparisonA && comparisonB ? (
                  (() => {
                    const isRegressionA =
                      typeof comparisonA.metrics?.mae === "number";

                    const isRegressionB =
                      typeof comparisonB.metrics?.mae === "number";

                    if (isRegressionA !== isRegressionB) {
                      return (
                        <p className="warning-message">
                          Incompatible run types: Please select two classification runs or two regression runs for a valid comparison.
                        </p>
                      );
                    }

                    const metrics = isRegressionA
                      ? regressionMetrics
                      : classificationMetrics;

                    return (
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h3>Comparative Metric Matrix</h3>
                            <p>Variance and performance leadership breakdown</p>
                          </div>
                        </div>

                        <div className="table-wrapper">
                          <table>
                            <thead>
                              <tr>
                                <th>Metric Name</th>
                                <th>Run A (Baseline)</th>
                                <th>Run B (Challenger)</th>
                                <th>Delta (B − A)</th>
                                <th>Leading Candidate</th>
                              </tr>
                            </thead>

                            <tbody>
                              {metrics.map((metric) => {
                                const valueA = Number(
                                  comparisonA.metrics?.[metric.key]
                                );

                                const valueB = Number(
                                  comparisonB.metrics?.[metric.key]
                                );

                                const valid =
                                  Number.isFinite(valueA) &&
                                  Number.isFinite(valueB);

                                const isPercentage = !isRegressionA;
                                const lowerIsBetter =
                                  ["mae", "mse", "rmse"].includes(metric.key);

                                const difference = valueB - valueA;

                                const winner = !valid
                                  ? "Unavailable"
                                  : Math.abs(difference) < 0.0001
                                  ? "Parity"
                                  : lowerIsBetter
                                  ? difference < 0 ? "Run B" : "Run A"
                                  : difference > 0 ? "Run B" : "Run A";

                                const formatValue = (value) =>
                                  isPercentage
                                    ? `${(value * 100).toFixed(2)}%`
                                    : value.toFixed(2);

                                return (
                                  <tr key={metric.key}>
                                    <td><strong>{metric.label}</strong></td>
                                    <td>{valid ? formatValue(valueA) : "—"}</td>
                                    <td>{valid ? formatValue(valueB) : "—"}</td>
                                    <td>
                                      {valid
                                        ? `${difference > 0 ? "+" : ""}${formatValue(difference)}`
                                        : "—"}
                                    </td>
                                    <td>
                                      <span className={
                                        winner === "Run B"
                                          ? "status-badge"
                                          : winner === "Run A"
                                          ? "version-tag"
                                          : "drift-status warning"
                                      }>
                                        {winner}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })()
                ) : null}
              </>
            )}
          </div>
        )}

        {/* DATASETS PAGE */}
        {activePage === "Datasets" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Dataset Management</h2>
                <p>Inspect active training baselines and bulk import new property records.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-heading"><span>Reference Dataset</span></div>
                <h2>reference.csv</h2>
                <p>Golden baseline distribution</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Inference Upload</span></div>
                <h2>{uploadResult ? uploadResult.filename : "None"}</h2>
                <p>Active monitoring dataset</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Imported Records</span></div>
                <h2>{propertyImportResult ? propertyImportResult.total_records : "—"}</h2>
                <p>Master repository size</p>
              </div>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Bulk Property CSV Ingestion</h3>
                  <p>Append validated property records into master dataset for model retraining</p>
                </div>
              </div>

              <div className="upload-box">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setPropertyFile(e.target.files[0] || null);
                    setPropertyImportResult(null);
                    setPropertyImportError("");
                  }}
                />

                <button
                  className="primary-button"
                  onClick={handlePropertyImport}
                  disabled={!propertyFile || propertyImportLoading}
                >
                  {propertyImportLoading ? "Validating & Ingesting..." : "Import Properties"}
                </button>
              </div>

              {propertyImportError && (
                <p className="error-message">{propertyImportError}</p>
              )}

              {propertyImportResult && (
                <div className="upload-result">
                  <h3>Batch Ingestion Summary</h3>
                  <div className="stats-grid" style={{ marginTop: "12px" }}>
                    <div className="stat-card">
                      <div className="stat-heading"><span>Valid Records</span></div>
                      <h2 style={{ color: "var(--success)" }}>{propertyImportResult.imported_count}</h2>
                    </div>
                    <div className="stat-card">
                      <div className="stat-heading"><span>Rejected Rows</span></div>
                      <h2 style={{ color: propertyImportResult.rejected_count > 0 ? "var(--tomato)" : "var(--text-1)" }}>
                        {propertyImportResult.rejected_count}
                      </h2>
                    </div>
                    <div className="stat-card">
                      <div className="stat-heading"><span>Total Repository</span></div>
                      <h2>{propertyImportResult.total_records}</h2>
                    </div>
                  </div>

                  {propertyImportResult.rejected_rows?.length > 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <h4 style={{ marginBottom: "8px", fontSize: "13px" }}>Rejected Row Exceptions</h4>
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Row #</th>
                              <th>Property ID</th>
                              <th>Validation Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {propertyImportResult.rejected_rows.map((item, index) => (
                              <tr key={index}>
                                <td>{item.row}</td>
                                <td><strong>{item.property_id}</strong></td>
                                <td style={{ color: "var(--tomato)" }}>{item.errors.join(", ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* REPORTS PAGE */}
        {activePage === "Reports" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Audit & Observability Reports</h2>
                <p>Generate, review, and export PDF compliance drift detection reports.</p>
              </div>

              {uploadResult && (
                <div className="button-group">
                  <button className="primary-button" onClick={() => downloadPDFReport(uploadResult)}>
                    Export PDF Report
                  </button>
                  <button className="secondary-button" onClick={downloadReport}>
                    Export JSON
                  </button>
                </div>
              )}
            </div>

            {uploadResult ? (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Active Report Summary</h3>
                    <p>Dataset: {uploadResult.filename}</p>
                  </div>
                  <span className="chart-tag">Generated Live</span>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-heading"><span>Analyzed Features</span></div>
                    <h2>{uploadResult.total_features}</h2>
                  </div>
                  <div className="stat-card">
                    <div className="stat-heading"><span>Drift Detected</span></div>
                    <h2 style={{ color: uploadResult.drifted_features > 0 ? "var(--tomato)" : "var(--success)" }}>
                      {uploadResult.drifted_features}
                    </h2>
                  </div>
                  <div className="stat-card">
                    <div className="stat-heading"><span>Low Severity</span></div>
                    <h2>
                      {uploadResult.results?.filter((item) => item.severity === "LOW").length || 0}
                    </h2>
                  </div>
                  <div className="stat-card">
                    <div className="stat-heading"><span>High Severity</span></div>
                    <h2 style={{ color: "var(--tomato)" }}>
                      {uploadResult.results?.filter((item) => item.severity === "HIGH").length || 0}
                    </h2>
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel">
                <div className="empty-history">
                  <h3>No Reports Generated</h3>
                  <p>Upload a new inference dataset on the Overview page to generate a comprehensive statistical drift report.</p>
                </div>
              </section>
            )}
          </div>
        )}

        {/* PAN-INDIA DATA TRACKER PAGE */}
        {activePage === "Pan-India Data Tracker" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>Pan-India State Data-Source & Access Tracker</h2>
                <p>National real estate registration portal transparency tiers, valuation benchmarks, and verified transaction pilot.</p>
              </div>

              <div className="button-group">
                <button
                  className="secondary-button"
                  onClick={() => {
                    fetchTrackerData();
                    fetchVerifiedDeeds(verifiedStateFilter);
                  }}
                  disabled={trackerLoading}
                >
                  {trackerLoading ? "Refreshing..." : "Refresh Tracker"}
                </button>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">TOTAL JURISDICTIONS</span>
                </div>
                <h2>36 States & UTs</h2>
                <p className="metric-description">Constitutional List II (State Subject)</p>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">TIER 1 (DEEDS ONLINE)</span>
                </div>
                <h2 style={{ color: "var(--color-sage-accent)" }}>6 States</h2>
                <p className="metric-description">MH, UP, TN, TG, HR, AP</p>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">TIER 2 (GUIDELINE ONLY)</span>
                </div>
                <h2>14 States</h2>
                <p className="metric-description">KA, DL, GJ, WB, RJ, MP, etc.</p>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">LAUNCH PILOT DEEDS</span>
                </div>
                <h2 style={{ color: "var(--color-sage-dark)" }}>124 Verified</h2>
                <p className="metric-description">71 Maharashtra · 53 Uttar Pradesh</p>
              </div>
            </div>

            {/* SECTION 1: VERIFIED REGISTERED-PRICE PILOT */}
            <section className="panel" style={{ marginTop: "1.5rem" }}>
              <div className="panel-header">
                <div>
                  <h3>Launch Pilot: Verified Registered Deeds (Maharashtra & Uttar Pradesh)</h3>
                  <p>Ground-truth sales deeds verified from IGR Maharashtra (SARITA) and IGRSUP with Ready Reckoner / Circle rate benchmarks.</p>
                </div>

                <div className="filter-buttons" style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className={verifiedStateFilter === "ALL" ? "primary-button" : "secondary-button"}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    onClick={() => {
                      setVerifiedStateFilter("ALL");
                      fetchVerifiedDeeds("ALL");
                    }}
                  >
                    All Deeds (124)
                  </button>
                  <button
                    className={verifiedStateFilter === "Maharashtra" ? "primary-button" : "secondary-button"}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    onClick={() => {
                      setVerifiedStateFilter("Maharashtra");
                      fetchVerifiedDeeds("Maharashtra");
                    }}
                  >
                    Maharashtra (71)
                  </button>
                  <button
                    className={verifiedStateFilter === "Uttar Pradesh" ? "primary-button" : "secondary-button"}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    onClick={() => {
                      setVerifiedStateFilter("Uttar Pradesh");
                      fetchVerifiedDeeds("Uttar Pradesh");
                    }}
                  >
                    Uttar Pradesh (53)
                  </button>
                </div>
              </div>

              {verifiedDeedsLoading ? (
                <div className="loading-state">Loading verified deeds...</div>
              ) : (
                <div className="table-container" style={{ maxHeight: "380px", overflowY: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Deed Registration ID</th>
                        <th>State / District</th>
                        <th>SRO Jurisdiction</th>
                        <th>Locality</th>
                        <th>Type / Area</th>
                        <th>Registered Price (₹)</th>
                        <th>Guideline / Circle Rate (₹)</th>
                        <th>Asking Benchmark (₹)</th>
                        <th>Spread Ratio</th>
                        <th>Stamp Duty Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedDeeds.map((deed) => (
                        <tr key={deed.registration_id}>
                          <td><strong>{deed.registration_id}</strong></td>
                          <td>
                            <span className="badge" style={{ background: deed.state === "Maharashtra" ? "var(--color-sage-subtle)" : "var(--color-card-bg)" }}>
                              {deed.state} ({deed.district})
                            </span>
                          </td>
                          <td style={{ fontSize: "0.85rem" }}>{deed.sro_office}</td>
                          <td>{deed.locality}</td>
                          <td>{deed.property_type} ({Number(deed.area_sqft).toLocaleString()} sqft)</td>
                          <td><strong style={{ color: "var(--color-sage-dark)" }}>₹{Number(deed.registered_deed_price_inr).toLocaleString()}</strong></td>
                          <td>₹{Number(deed.guideline_circle_rate_inr).toLocaleString()}</td>
                          <td>₹{Number(deed.market_asking_benchmark_inr).toLocaleString()}</td>
                          <td><code>{(Number(deed.spread_ratio) * 100).toFixed(1)}%</code></td>
                          <td>₹{Number(deed.stamp_duty_paid_inr).toLocaleString()}</td>
                          <td>
                            <span className="badge" style={{ background: "var(--color-sage-subtle)", color: "var(--color-sage-accent)", border: "1px solid var(--color-sage-border)" }}>
                              VERIFIED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SECTION 2: 36 STATES DATA ACCESSIBILITY MATRIX */}
            <section className="panel" style={{ marginTop: "1.5rem" }}>
              <div className="panel-header">
                <div>
                  <h3>National State-Wise Access & Valuation Hierarchy</h3>
                  <p>Classification of government registration systems by actual data transparency level.</p>
                </div>

                <div className="filter-buttons" style={{ display: "flex", gap: "0.5rem" }}>
                  {["ALL", "TIER_1", "TIER_2", "TIER_3"].map((tier) => (
                    <button
                      key={tier}
                      className={trackerTierFilter === tier ? "primary-button" : "secondary-button"}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                      onClick={() => setTrackerTierFilter(tier)}
                    >
                      {tier === "ALL" && "All Jurisdictions (36)"}
                      {tier === "TIER_1" && "Tier 1: Registered Deals (6)"}
                      {tier === "TIER_2" && "Tier 2: Guideline Only (14)"}
                      {tier === "TIER_3" && "Tier 3: SRO Visit / RTI (16)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>State / Jurisdiction</th>
                      <th>Data Access Tier</th>
                      <th>Official Portal</th>
                      <th>Primary Valuation Benchmark</th>
                      <th>Access Constraints & Transparency Baseline</th>
                      <th>ModelWatch Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Tier 1 States */}
                    {(trackerTierFilter === "ALL" || trackerTierFilter === "TIER_1") && (
                      <>
                        <tr style={{ background: "var(--color-sage-subtle)" }}>
                          <td><strong>Maharashtra</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://igrmaharashtra.gov.in" target="_blank" rel="noreferrer">igrmaharashtra.gov.in</a></td>
                          <td>Ready Reckoner (ASR)</td>
                          <td>Online Index II deed search; public user account required.</td>
                          <td><strong style={{ color: "var(--color-sage-dark)" }}>ACTIVE PILOT (71 Deeds)</strong></td>
                        </tr>
                        <tr style={{ background: "var(--color-sage-subtle)" }}>
                          <td><strong>Uttar Pradesh</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://igrsup.gov.in" target="_blank" rel="noreferrer">igrsup.gov.in</a></td>
                          <td>District Circle Rates</td>
                          <td>Online deed search by property number and registered parties.</td>
                          <td><strong style={{ color: "var(--color-sage-dark)" }}>ACTIVE PILOT (53 Deeds)</strong></td>
                        </tr>
                        <tr>
                          <td><strong>Tamil Nadu</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://tnreginet.gov.in" target="_blank" rel="noreferrer">tnreginet.gov.in</a></td>
                          <td>Guideline Value</td>
                          <td>Encumbrance Certificate (EC) shows transaction consideration values.</td>
                          <td>Phase 1 Ingestion Queued</td>
                        </tr>
                        <tr>
                          <td><strong>Telangana</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://registration.telangana.gov.in" target="_blank" rel="noreferrer">registration.telangana.gov.in</a></td>
                          <td>Market Value / EC</td>
                          <td>Public market value & EC search with mobile OTP verification.</td>
                          <td>Phase 1 Ingestion Queued</td>
                        </tr>
                        <tr>
                          <td><strong>Haryana</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://jamabandi.nic.in" target="_blank" rel="noreferrer">jamabandi.nic.in</a></td>
                          <td>Collector Rates</td>
                          <td>Free public deed lookup by tehsil, year, and deed number.</td>
                          <td>Phase 1 Ingestion Queued</td>
                        </tr>
                        <tr>
                          <td><strong>Andhra Pradesh</strong></td>
                          <td><span className="badge" style={{ background: "var(--color-sage-accent)", color: "#fff" }}>Tier 1: Registered</span></td>
                          <td><a href="https://registration.ap.gov.in" target="_blank" rel="noreferrer">registration.ap.gov.in</a></td>
                          <td>Market Value Schedule</td>
                          <td>Public deed registration details and certified copies.</td>
                          <td>Phase 2 Ingestion Queued</td>
                        </tr>
                      </>
                    )}

                    {/* Tier 2 States */}
                    {(trackerTierFilter === "ALL" || trackerTierFilter === "TIER_2") && (
                      <>
                        <tr>
                          <td><strong>Karnataka</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://kaverionline.karnataka.gov.in" target="_blank" rel="noreferrer">Kaveri 2.0</a></td>
                          <td>Guidance Value</td>
                          <td>Deed values not exposed; Guidance values calculable online.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                        <tr>
                          <td><strong>NCT of Delhi</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://doris.delhigovt.nic.in" target="_blank" rel="noreferrer">DORIS Delhi</a></td>
                          <td>Circle Rates (Colony A-H)</td>
                          <td>Circle rates by colony categorization; individual deeds restricted.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                        <tr>
                          <td><strong>Gujarat</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://garvi.gujarat.gov.in" target="_blank" rel="noreferrer">Garvi Gujarat</a></td>
                          <td>Jantri Rates</td>
                          <td>Jantri valuation schedules available by village/survey number.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                        <tr>
                          <td><strong>West Bengal</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://wbregistration.gov.in" target="_blank" rel="noreferrer">WBREGIS</a></td>
                          <td>Market Value of Property</td>
                          <td>Property market valuation calculator; deed download restricted.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                        <tr>
                          <td><strong>Rajasthan</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://epanjiyan.rajasthan.gov.in" target="_blank" rel="noreferrer">E-Panjiyan</a></td>
                          <td>DLC Rates</td>
                          <td>District Level Committee rates by colony/khasra.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                        <tr>
                          <td><strong>Madhya Pradesh</strong></td>
                          <td><span className="badge" style={{ background: "#f0f4f0", color: "var(--color-text-main)", border: "1px solid var(--color-border-card)" }}>Tier 2: Guideline Only</span></td>
                          <td><a href="https://mpigr.gov.in" target="_blank" rel="noreferrer">Sampada 2.0</a></td>
                          <td>Collector Guideline Rates</td>
                          <td>Guideline rate schedules online; deed search requires party authentication.</td>
                          <td>Guideline Floor Active</td>
                        </tr>
                      </>
                    )}

                    {/* Tier 3 States */}
                    {(trackerTierFilter === "ALL" || trackerTierFilter === "TIER_3") && (
                      <>
                        <tr>
                          <td><strong>Bihar</strong></td>
                          <td><span className="badge" style={{ background: "#fff5f5", color: "var(--color-danger)", border: "1px solid #fecaca" }}>Tier 3: In-Person / RTI</span></td>
                          <td>BhumiJankari Portal</td>
                          <td>MVR (Minimum Value Register)</td>
                          <td>Portal has partial indexing; certified copies require physical SRO application.</td>
                          <td>RTI Request Tracking</td>
                        </tr>
                        <tr>
                          <td><strong>Assam & North-East (7 States)</strong></td>
                          <td><span className="badge" style={{ background: "#fff5f5", color: "var(--color-danger)", border: "1px solid #fecaca" }}>Tier 3: In-Person / RTI</span></td>
                          <td>Dharitree / District Registrars</td>
                          <td>Zonal Valuation</td>
                          <td>Customary tribal land tenures (Art 371A); non-digitized deeds.</td>
                          <td>RTI Request Tracking</td>
                        </tr>
                        <tr>
                          <td><strong>Jammu & Kashmir / Ladakh</strong></td>
                          <td><span className="badge" style={{ background: "#fff5f5", color: "var(--color-danger)", border: "1px solid #fecaca" }}>Tier 3: In-Person / RTI</span></td>
                          <td>NGDRS J&K / Revenue Dept</td>
                          <td>Stamp Valuation Schedules</td>
                          <td>Public deed search disabled for administrative and security privacy.</td>
                          <td>Departmental Request</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {activePage === "Settings" && (
          <div className="page-content">
            <div className="page-header">
              <div>
                <h2>System Settings & Telemetry</h2>
                <p>Operational parameters, statistical thresholds, and service health status.</p>
              </div>
              <span className="status-badge">FastAPI Connected</span>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-heading"><span>Platform Name</span></div>
                <h2>ModelWatch</h2>
                <p>ML Monitoring & Drift Observability</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Release Version</span></div>
                <h2>v1.0.0</h2>
                <p>Production Build</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Backend Service</span></div>
                <h2>127.0.0.1:8000</h2>
                <p>FastAPI ASGI Server</p>
              </div>

              <div className="stat-card">
                <div className="stat-heading"><span>Statistical Engine</span></div>
                <h2>KS + χ²</h2>
                <p>Kolmogorov-Smirnov & Contingency Tests</p>
              </div>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Statistical Drift Thresholds</h3>
                  <p>Configuration rules utilized for automated distribution anomaly detection</p>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Configuration Key</th>
                      <th>Value</th>
                      <th>Scope</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Significance Level (α)</strong></td>
                      <td><code>0.05</code></td>
                      <td>Global</td>
                      <td>Threshold p-value below which feature drift is formally flagged.</td>
                    </tr>
                    <tr>
                      <td><strong>High Severity KS Threshold</strong></td>
                      <td><code>0.70</code></td>
                      <td>Numerical</td>
                      <td>KS distance exceeding this value triggers immediate HIGH severity status.</td>
                    </tr>
                    <tr>
                      <td><strong>Minimum Sample Size</strong></td>
                      <td><code>5 samples</code></td>
                      <td>Categorical & Numerical</td>
                      <td>Minimum valid rows required per column to compute reliable statistics.</td>
                    </tr>
                    <tr>
                      <td><strong>Automated Dispatch</strong></td>
                      <td><code>aiosmtplib (Gmail TLS 465)</code></td>
                      <td>Email Alerts</td>
                      <td>Triggers automated alert emails to subscribers upon HIGH severity detection.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <footer>
          ModelWatch © 2026 · ML Observability Platform
        </footer>

      </main>
    </div>
  );
}

export default App;

