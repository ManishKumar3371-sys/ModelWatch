import { useState, useEffect } from "react";

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
  History
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import "./App.css";

const API_URL = "http://127.0.0.1:8000";

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

  const [driftData, setDriftData] = useState(null);
  const [apiStatus, setApiStatus] = useState("Checking...");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [performanceFile, setPerformanceFile] = useState(null);
  const [performanceResult, setPerformanceResult] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  // Regression Evaluation states
const [regressionFile, setRegressionFile] = useState(null);
const [regressionResult, setRegressionResult] = useState(null);
const [regressionLoading, setRegressionLoading] = useState(false);      
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
    area: "",
    bedrooms: "2",
    age: ""
  });

  const [housePrediction, setHousePrediction] = useState(null);
  const [houseLoading, setHouseLoading] = useState(false);
  const [houseError, setHouseError] = useState("");

  // Performance history states
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Model comparison states
  const [comparisonRunA, setComparisonRunA] = useState("");
  const [comparisonRunB, setComparisonRunB] = useState("");

  // Model registry states
  const [registeredModels, setRegisteredModels] = useState([]);
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
  // Sidebar menu
  const menuItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Models", icon: BrainCircuit },
    { name: "House Price Predictor", icon: TrendingUp },
    { name: "Drift Monitoring", icon: Activity },
    { name: "Performance History", icon: History },
    { name: "Model Comparison", icon: TrendingUp },
    { name: "Datasets", icon: Database },
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

  // Performance chart data
  const historyChartData = performanceHistory
  .filter((item) => item.metrics?.accuracy !== undefined)
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
  .filter((item) => item.metrics?.mae !== undefined)
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

  // Initial data loading
  useEffect(() => {
    fetchPerformanceHistory();
    fetchRegisteredModels();
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
      !houseForm.area ||
      !houseForm.bedrooms ||
      houseForm.age === ""
    ) {
      setHouseError("Please fill all property details.");
      return;
    }

    const area = Number(houseForm.area);
    const bedrooms = Number(houseForm.bedrooms);
    const age = Number(houseForm.age);

    if (
      !Number.isFinite(area) ||
      !Number.isFinite(bedrooms) ||
      !Number.isFinite(age) ||
      area <= 0 ||
      bedrooms < 1 ||
      age < 0
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
          area,
          bedrooms,
          age
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Prediction failed");
      }

      setHousePrediction(data);

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

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit size={24} />
          </div>
          <span>ModelWatch</span>
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
                onClick={() => setActivePage(item.name)}
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
          <div>
            <h2>{activePage}</h2>
            <p>Monitor your machine learning models</p>
          </div>

          <div className="top-actions">
            <button className="icon-button">
              <Search size={19} />
            </button>

            <button className="icon-button">
              <Bell size={19} />
            </button>

            <div className="avatar">MW</div>
          </div>
        </header>

        {/* OVERVIEW PAGE */}
        {activePage === "Overview" && (
          <>
            <section className="welcome-section">
              <div>
               <h1>MODELWATCH TEST 123</h1>
                <p>
                  Track model health, detect data drift and monitor performance.
                </p>
              </div>
            </section>

            {/* DATASET UPLOAD */}
            <div className="upload-section">
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
                <Upload size={17} />
                {uploadLoading ? "Uploading..." : "Upload Dataset"}
              </button>

              {uploadResult && (
                <div className="upload-result">
                  <h3>Drift Detection Result</h3>
                  <p>File: {uploadResult.filename}</p>
                  <p>Total Features: {uploadResult.total_features}</p>
                  <p>Drifted Features: {uploadResult.drifted_features}</p>
                </div>
              )}
            </div>

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
<section className="panel" style={{ marginBottom: "20px" }}>
  <div className="panel-heading">
    <div>
      <h3>Regression Model Evaluation</h3>
      <p>Evaluate regression predictions using actual and predicted values.</p>
    </div>
  </div>

  <p>Upload a CSV file containing <b>actual</b> and <b>predicted</b> columns.</p>

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

  {regressionResult && (
    <div className="stats-grid" style={{ marginTop: "20px" }}>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient
                          id="performanceGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#25283a" />
                      <XAxis dataKey="day" stroke="#9296aa" />
                      <YAxis domain={[70, 100]} stroke="#9296aa" />
                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#a78bfa"
                        fill="url(#performanceGradient)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
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
          </>
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

        {/* HOUSE PRICE PREDICTOR PAGE */}
        {activePage === "House Price Predictor" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>House Price Prediction</h3>
                <p>
                  Estimate property prices using your trained Random Forest model.
                </p>
              </div>
              <BrainCircuit size={28} />
            </div>

            <form onSubmit={handleHousePrediction} className="model-form">
              <div className="form-group">
                <label>Area (Square Feet)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter area e.g. 2000"
                  value={houseForm.area}
                  onChange={(e) => {
                    setHouseForm({
                      ...houseForm,
                      area: e.target.value
                    });
                    setHouseError("");
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Number of Bedrooms</label>
                <select
                  value={houseForm.bedrooms}
                  onChange={(e) =>
                    setHouseForm({
                      ...houseForm,
                      bedrooms: e.target.value
                    })
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

              <div className="form-group">
                <label>Property Age (Years)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Enter property age"
                  value={houseForm.age}
                  onChange={(e) => {
                    setHouseForm({
                      ...houseForm,
                      age: e.target.value
                    });
                    setHouseError("");
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={houseLoading}
              >
                {houseLoading ? "Predicting..." : "Predict House Price"}
              </button>
            </form>

            {houseError && (
              <p className="error-message">{houseError}</p>
            )}

            {housePrediction && (
              <div className="upload-result">
                <h3>Prediction Result</h3>

                <p>Property Area: {houseForm.area} sq. ft.</p>
                <p>Bedrooms: {houseForm.bedrooms}</p>
                <p>Property Age: {houseForm.age} years</p>

                <div className="stat-card">
                  <span>Estimated House Price</span>
                  <h2>
                    {formatINR(housePrediction.predicted_price)}
                  </h2>
                </div>

                <p>
                  Prediction generated successfully by the trained ML model.
                </p>
              </div>
            )}

            <p>
              Note: This is an educational demonstration using a small
              synthetic dataset. It is not a reliable real-estate valuation.
            </p>
          </section>
        )}

        {/* DRIFT MONITORING PAGE */}
        {activePage === "Drift Monitoring" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Drift Detection Report</h3>
                <p>Statistical analysis of uploaded dataset</p>
              </div>
            </div>

            {uploadResult ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Total Features</span>
                    <h2>{uploadResult.total_features}</h2>
                  </div>

                  <div className="stat-card">
                    <span>Drifted Features</span>
                    <h2>{uploadResult.drifted_features}</h2>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>KS Statistic</th>
                        <th>P-value</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {uploadResult.results?.map((item) => (
                        <tr key={item.feature}>
                          <td>{item.feature}</td>
                          <td>{item.ks_statistic}</td>
                          <td>{item.p_value}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p>Please upload a CSV dataset from Overview first.</p>
            )}
          </section>
        )}

        {/* PERFORMANCE HISTORY PAGE */}
        {activePage === "Performance History" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Performance Evaluation History</h3>
                <p>Previously evaluated model results</p>
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
                <span>Total Evaluations</span>
                <h2>{performanceHistory.length}</h2>
              </div>

              <div className="stat-card">
                <span>Latest Accuracy</span>
                <h2>
  {(() => {
    const latestClassification = [...performanceHistory]
      .reverse()
      .find(
       (item) =>
  typeof item.metrics?.f1_score === "number" &&
  Number.isFinite(item.metrics.f1_score) &&
  !item.filename?.toLowerCase().includes("regression")
      );

    return latestClassification
      ? `${(latestClassification.metrics.accuracy * 100).toFixed(2)}%`
      : "--";
  })()}
</h2>
              </div>

              <div className="stat-card">
                <span>Latest F1 Score</span>
                <h2>
  {(() => {
    const latestClassification = [...performanceHistory]
      .reverse()
      .find(
       (item) =>
  typeof item.metrics?.f1_score === "number" &&
  Number.isFinite(item.metrics.f1_score) &&
  !item.filename?.toLowerCase().includes("regression")
      );

    return latestClassification
      ? `${(latestClassification.metrics.f1_score * 100).toFixed(2)}%`
      : "--";
  })()}
</h2>
              </div>
              <div className="stat-card">
  <span>Latest R² Score</span>
  <h2>
    {(() => {
      const latestRegression = [...performanceHistory]
        .reverse()
        .find(
          (item) =>
            typeof item.metrics?.r2_score === "number" &&
            Number.isFinite(item.metrics.r2_score)
        );

      return latestRegression
        ? latestRegression.metrics.r2_score.toFixed(4)
        : "--";
    })()}
  </h2>
</div>
            </div>
            

            <div className="panel history-chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Performance Trend Analysis</h3>
                  <p>Accuracy and F1 Score across evaluation runs</p>
                </div>
              </div>
              
{/* REGRESSION PERFORMANCE TREND */}
<div className="panel history-chart-panel">
  <div className="panel-heading">
    <div>
      <h3>Regression Performance Trend</h3>
      <p>MAE and RMSE across evaluation runs</p>
    </div>
  </div>

  {regressionChartData.length > 0 ? (
    <div className="chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={regressionChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#25283a" />
          <XAxis dataKey="name" stroke="#9296aa" />
          <YAxis stroke="#9296aa" />
          <Tooltip />
          <Legend />

          <Area
            type="monotone"
            dataKey="mae"
            name="MAE"
            stroke="#a78bfa"
            fill="#8b5cf6"
            fillOpacity={0.15}
          />

          <Area
            type="monotone"
            dataKey="rmse"
            name="RMSE"
            stroke="#35d69a"
            fill="#35d69a"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <p>No regression evaluation history available yet.</p>
  )}
</div>


              {historyChartData.length > 0 ? (
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#25283a" />
                      <XAxis dataKey="name" stroke="#9296aa" />
                      <YAxis domain={[0, 100]} stroke="#9296aa" />
                      <Tooltip />
                      <Legend />

                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy"
                        stroke="#a78bfa"
                        fill="#8b5cf6"
                        fillOpacity={0.15}
                      />

                      <Area
                        type="monotone"
                        dataKey="f1"
                        name="F1 Score"
                        stroke="#35d69a"
                        fill="#35d69a"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p>No performance history available yet.</p>
              )}
            </div>

            
<div className="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>CSV FILE</th>
        <th>DATE & TIME</th>
        <th>PREDICTIONS</th>
        <th>ACCURACY</th>
        <th>PRECISION</th>
        <th>RECALL</th>
        <th>F1 SCORE</th>
        <th>MAE</th>
        <th>MSE</th>
        <th>RMSE</th>
        <th>R² SCORE</th>
      </tr>
    </thead>

    <tbody>
      {performanceHistory.length > 0 ? (
        [...performanceHistory].reverse().map((item, index) => (
          <tr key={`${item.evaluated_at}-${index}`}>
            <td>{item.filename}</td>

            <td>
              {item.evaluated_at
                ? new Date(item.evaluated_at).toLocaleString()
                : "Date unavailable"}
            </td>

            <td>{item.total_predictions}</td>

            <td>
              {item.metrics?.accuracy !== undefined
                ? `${(item.metrics.accuracy * 100).toFixed(2)}%`
                : "—"}
            </td>

            <td>
              {item.metrics?.precision !== undefined
                ? `${(item.metrics.precision * 100).toFixed(2)}%`
                : "—"}
            </td>

            <td>
              {item.metrics?.recall !== undefined
                ? `${(item.metrics.recall * 100).toFixed(2)}%`
                : "—"}
            </td>

            <td>
              {item.metrics?.f1_score !== undefined
                ? `${(item.metrics.f1_score * 100).toFixed(2)}%`
                : "—"}
            </td>

            <td>{item.metrics?.mae ?? "—"}</td>
            <td>{item.metrics?.mse ?? "—"}</td>
            <td>{item.metrics?.rmse ?? "—"}</td>
            <td>{item.metrics?.r2_score ?? "—"}</td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="11">
            {historyLoading
              ? "Loading history..."
              : "No performance evaluations found."}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

          </section>
        )}

        {/* MODEL COMPARISON PAGE */}
        {activePage === "Model Comparison" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Model Performance Comparison</h3>
                <p>Compare two saved evaluation runs</p>
              </div>

              <button
                className="primary-button"
                onClick={fetchPerformanceHistory}
                disabled={historyLoading}
              >
                Refresh
              </button>
            </div>

            {performanceHistory.length < 2 ? (
              <div className="empty-history">
                <h3>Not Enough Evaluation Data</h3>
                <p>
                  Evaluate at least two CSV files from Overview first.
                </p>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Select Evaluation Run A</span>
                    <select
                      value={comparisonRunA}
                      onChange={(e) => setComparisonRunA(e.target.value)}
                    >
                      {performanceHistory.map((item, index) => (
                        <option key={index} value={String(index)}>
                          Run {index + 1} - {item.filename}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="stat-card">
                    <span>Select Evaluation Run B</span>
                    <select
                      value={comparisonRunB}
                      onChange={(e) => setComparisonRunB(e.target.value)}
                    >
                      {performanceHistory.map((item, index) => (
                        <option key={index} value={String(index)}>
                          Run {index + 1} - {item.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {comparisonRunA === comparisonRunB ? (
  <p>Please select two different runs.</p>
) : comparisonA && comparisonB ? (
  (() => {
    const isRegressionA =
      typeof comparisonA.metrics?.mae === "number";

    const isRegressionB =
      typeof comparisonB.metrics?.mae === "number";

    if (isRegressionA !== isRegressionB) {
      return (
        <p>
          Please select two classification runs or two regression runs.
        </p>
      );
    }

    const metrics = isRegressionA
      ? regressionMetrics
      : classificationMetrics;

    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Run A</th>
              <th>Run B</th>
              <th>Difference</th>
              <th>Better Result</th>
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
                ? "Equal"
                : lowerIsBetter
                ? difference < 0 ? "Run B" : "Run A"
                : difference > 0 ? "Run B" : "Run A";

              const formatValue = (value) =>
                isPercentage
                  ? `${(value * 100).toFixed(2)}%`
                  : value.toFixed(2);

              return (
                <tr key={metric.key}>
                  <td>{metric.label}</td>
                  <td>{valid ? formatValue(valueA) : "—"}</td>
                  <td>{valid ? formatValue(valueB) : "—"}</td>
                  <td>
                    {valid
                      ? `${difference > 0 ? "+" : ""}${formatValue(difference)}`
                      : "—"}
                  </td>
                  <td>{winner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  })()
) : null}
              </>
            )}
          </section>
        )}

        {/* DATASETS PAGE */}
        {activePage === "Datasets" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Dataset Management</h3>
                <p>Manage your datasets</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Reference Dataset</span>
                <h2>reference.csv</h2>
                <p>Baseline dataset</p>
              </div>

              <div className="stat-card">
                <span>Uploaded Dataset</span>
                <h2>
                  {uploadResult ? uploadResult.filename : "No dataset"}
                </h2>
                <p>Monitoring dataset</p>
              </div>
            </div>

            <div className="panel" style={{ marginTop: "20px" }}>
  <div className="panel-heading">
    <div>
      <h3>Bulk Property Import</h3>
      <p>Upload a CSV containing multiple property records.</p>
    </div>
  </div>

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
    onClick={handlePropertyImport}
    disabled={!propertyFile || propertyImportLoading}
  >
    {propertyImportLoading ? "Importing..." : "Import Properties"}
  </button>

  {propertyImportError && (
    <p className="error-message">{propertyImportError}</p>
  )}

  {propertyImportResult && (
    <div style={{ marginTop: "20px" }}>
      <h3>Import Results</h3>
      <p>Imported: {propertyImportResult.imported_count}</p>
      <p>Rejected: {propertyImportResult.rejected_count}</p>
      <p>Total Records: {propertyImportResult.total_records}</p>

      {propertyImportResult.rejected_rows?.length > 0 && (
        <div>
          <h4>Rejected Rows</h4>
          {propertyImportResult.rejected_rows.map((item, index) => (
            <p key={index}>
              Row {item.row}: {item.property_id} — {item.errors.join(", ")}
            </p>
          ))}
        </div>
      )}
    </div>
  )}
</div>
          </section>
        )}

        {/* REPORTS PAGE */}
        {activePage === "Reports" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>ModelWatch Reports</h3>
                <p>Dataset analysis and drift detection</p>
              </div>
            </div>

            {uploadResult ? (
              <>
                <h4>Latest Dataset Report</h4>
                <p>Filename: {uploadResult.filename}</p>
                <p>Total Features: {uploadResult.total_features}</p>
                <p>Drifted Features: {uploadResult.drifted_features}</p>

                <button
                  className="primary-button"
                  onClick={downloadReport}
                >
                  Download Report
                </button>
              </>
            ) : (
              <p>No reports available. Upload a CSV file first.</p>
            )}
          </section>
        )}

        {/* SETTINGS PAGE */}
        {activePage === "Settings" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Settings</h3>
                <p>ModelWatch configuration</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Application</span>
                <h2>ModelWatch</h2>
              </div>

              <div className="stat-card">
                <span>Version</span>
                <h2>1.0.0</h2>
              </div>

              <div className="stat-card">
                <span>Backend API</span>
                <h2>127.0.0.1:8000</h2>
              </div>

              <div className="stat-card">
                <span>Monitoring</span>
                <h2>KS Test</h2>
              </div>
            </div>
          </section>
        )}

        <footer>
          ModelWatch © 2026 · ML Observability Platform
        </footer>

      </main>
    </div>
  );
}

export default App;

