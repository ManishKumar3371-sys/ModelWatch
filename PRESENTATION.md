# ModelWatch: ML Model Monitoring & Statistical Drift Detection Platform
## Final Year Engineering Project Defense & Presentation Deck

---

### Slide 1: Title & Introduction
- **Project Title:** ModelWatch
- **Subtitle:** An Enterprise MLOps Model Monitoring & Statistical Drift Detection Platform
- **Presenter:** Manish Kumar (Computer Engineering – Final Year)
- **Domain:** MLOps, Statistical Machine Learning, Real Estate Valuation
- **Core Stack:** Python, FastAPI, Scikit-Learn, SciPy, React 19, Vite, Recharts

---

### Slide 2: The Problem – The Silent Failure of Machine Learning
- **Traditional Software:** Fails loudly via exceptions, crashes, or HTTP 500 status codes.
- **Machine Learning Models:** Fail **silently**.
  - Models continue returning output predictions with high confidence even after real-world data patterns change.
- **Covariate Shift / Data Drift:** $P_{\text{production}}(X) \neq P_{\text{training}}(X)$ while $P(Y|X)$ remains approximately constant.
- **Impact:** Misleading valuations, financial exposure, operational decay without developer notification.

---

### Slide 3: ModelWatch – The Solution
- **Continuous Statistical Oversight:** Automated hypothesis testing for numeric and categorical attributes.
- **MLOps Model Registry:** Model versioning, hyperparameter cataloging, and atomic hot-swapping in production.
- **Automated Incident Alerting:** SMTP notifications dispatched when severe drift ($>40\%$) is identified.
- **Real-Time Property Predictor:** Live valuation across Pune (tier-1 metro) and Prayagraj (tier-2 growth market).
- **Executive Dashboard:** Modern interface built in an ergonomic Sage, Linen Off-White, and Tomato Red color scheme.

---

### Slide 4: System Architecture
```
[ React 19 Client Dashboard ]
         |
         | HTTP REST / Multipart
         v
[ FastAPI Asynchronous Backend ]
  ├── Prediction Routing (Active Model Inference)
  ├── Drift Detection Service (KS-Test & Chi-Square Engine)
  ├── Model Registry Manager (Dynamic Hot-Swapping)
  └── Notification Dispatcher (Automated SMTP Alerts)
         |
         v
[ Storage & MLOps Persistence Layer ]
  ├── Canonical Dataset (302 Clean Records)
  ├── Drift Event History (JSON Time-Series)
  ├── Model Registry Catalog (experiments/model_registry.json)
  └── Serialized Model Pickle (v1 through v5 .pkl)
```

---

### Slide 5: Statistical Drift Engine – Methodology
1. **Continuous / Numerical Variables** (`area_sqft`, `bedrooms`, `price_inr`):
   - **Method:** Two-Sample Kolmogorov-Smirnov Test ($KS$).
   - **Statistic:** $D_{n,m} = \sup_x |F_{1,n}(x) - F_{2,m}(x)|$.
   - **Hypothesis:** Tests whether incoming distribution matches baseline eCDF. Rejects $H_0$ if $p < 0.05$.
2. **Categorical Variables** (`city`, `locality`, `property_type`, `area_basis`, `property_age`):
   - **Method:** Pearson's Chi-Square Contingency Test ($\chi^2$).
   - **Statistic:** $\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$, $df = (r-1)(c-1)$.
3. **Threshold Classification:**
   - $\text{Drift Ratio} > 40\%$: **HIGH Severity** (Automated Email Alert)
   - $\text{Drift Ratio} > 20\%$: **MEDIUM Severity** (Dashboard Warning)
   - $\text{Drift Ratio} \le 20\%$: **NORMAL** (System Healthy)

---

### Slide 6: Dataset Architecture & Quality Improvement
- **Geographic Representation:**
  - **Pune:** Kothrud, Baner, Wakad, Hinjewadi, Viman Nagar, Koregaon Park.
  - **Prayagraj:** Civil Lines, Ashok Nagar, Katra, Georgetown, Jhalwa, Naini, Phaphamau.
- **Dataset Size:** Expanded from an unrepresentative 22 records to **302 standardized records**.
- **Automated 7-Rule Data Validation:**
  - Schema adherence (13 columns)
  - Row threshold ($N \ge 300$)
  - Unique primary keys (100% unique property IDs)
  - Mandatory fields check
  - Non-negative area values ($\text{area} > 0$)
  - Non-negative price valuations ($\text{price} > 0$)
  - Valid HTTPS listing URLs

---

### Slide 7: Model Evolution & Empirical Results
| Version | Model Description | Train / Test Setup | $R^2$ Score | MAE (₹) | RMSE (₹) | Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **v1** | Baseline Random Forest | 17 train / 5 test | $-1.919$ | ₹84.20 L | ₹126.40 L | Archived |
| **v2** | Decision Tree | 241 train / 61 test | $+0.412$ | ₹48.60 L | ₹79.20 L | Inactive |
| **v3** | Gradient Boosting | 241 train / 61 test | $+0.684$ | ₹34.50 L | ₹58.10 L | Inactive |
| **v4** | Ridge Regressor | 241 train / 61 test | $+0.590$ | ₹39.80 L | ₹66.30 L | Inactive |
| **v5** | **Tuned Random Forest** | **241 train / 61 test** | **$+0.721$** | **₹31.79 L** | **₹54.70 L** | **ACTIVE** |

> **Key Takeaway:** Model fit surged from negative territory ($-1.919$) to **$+0.721$**, yielding realistic valuations and reducing MAE by **$62.2\%$**.

---

### Slide 8: Real-Time Valuation Demonstration
- **Inputs:** City, Locality, Property Type (Flat, Independent House, Plot), Area (sqft), Bedrooms, Age, Price Type.
- **Sample Inference 1 (Pune Flat):**
  - Pune, Kothrud, Flat, 1,250 sqft, 3 BHK, 1-5 Years Old.
  - **Predicted Price:** ₹85.37 Lakhs (Consistent with Kothrud market rates).
- **Sample Inference 2 (Prayagraj Plot):**
  - Prayagraj, Civil Lines, Residential Plot, 1,800 sqft.
  - **Predicted Price:** ₹35.58 Lakhs (Reflects Prayagraj land rates).
- **Audit Logging:** Every transaction is persisted to `experiments/prediction_history.json`.

---

### Slide 9: Drift Induction & Detection Experiment
- **Experimental Setup:** Uploaded `new_data.csv` (60 incoming records) with induced shifts in area and price.
- **Engine Findings:**
  - Total Monitored Features: 10
  - Drifted Features Detected: 2 (`area_sqft` with $p = 0.007$, `price_inr` with $p = 0.003$)
  - Undrifted Features: 8 features preserved statistical parity ($p > 0.05$)
  - Overall Drift Ratio: $20.0\%$
- **Platform Response:** Visual warning badge displayed, drift report stored, and historical trend logged.

---

### Slide 10: Model Registry & Dynamic Hot-Swapping
- **Feature:** Full lifecycle governance for machine learning assets.
- **Capabilities:**
  - Dynamic model registration with algorithm, version, and metadata.
  - One-click model activation (atomic pointer swap without server restart).
  - Multi-version side-by-side metric comparison (`v1` vs `v5`).
  - Active model status synchronized across the entire inference pipeline.

---

### Slide 11: Enterprise UI Redesign (Sage, Off-White & Tomato)
- **Design Tokens:**
  - **Forest Sage (`#1d331f`):** Header bar, primary branding, navigation.
  - **Linen Off-White (`#f7f5f0`):** Canvas background, reducing screen glare.
  - **Tomato Red (`#d93d2e`):** Alerts, high drift warnings, deletion actions.
- **Key Views:**
  1. Overview & Health Metrics
  2. House Price Predictor
  3. Drift Monitoring & Recharts Visualizer
  4. Trained Model Registry & Version Comparison
  5. Training Run Logs & Audit Trail
  6. Dataset Explorer & Property Importer

---

### Slide 12: Testing & Quality Assurance
- **100% Pass Rate Across 21 Comprehensive Automated Tests:**
  - **Backend API Test Suite (`tests/test_backend_api.py`):** 10/10 passed in 0.77s.
    - Verified `/predict-house-price`, `/drift-report`, `/model-registry`, `/models`, `/training-logs`.
  - **Edge-Case & Validation Suite (`tests/test_edge_cases.py`):** 11/11 passed in 0.03s.
    - Negative area rejection, zero area rejection, invalid property types, 404 handlers, column mismatch rejections.
  - **Frontend Production Build:** `npm run build` completed with 0 errors in 3.88s.

---

### Slide 13: Security & Codebase Hygiene
- **Configuration Segregation:** All sensitive parameters managed through `.env` with a documented `.env.example`.
- **Offline & Sandbox Safety:** Built-in fallback flag (`DISABLE_EMAIL_ALERT=1`) prevents timeouts in disconnected environments.
- **Input Sanitization:** Pydantic v2 schemas strictly validate every request payload before execution.
- **Repository Cleanliness:** 21 legacy backup scripts archived; zero clutter in active codebase.

---

### Slide 14: Summary of Achievements
1. **Solved Silent ML Failures:** Built complete automated statistical drift monitoring engine.
2. **Surged Model Performance:** Boosted $R^2$ from $-1.919$ to **$+0.721$**, cutting MAE by $62.2\%$.
3. **Rigorous Quality Verification:** Passed 21 backend test suites, 7 dataset validation rules, and built clean production frontend.
4. **Complete Documentation:** Delivered full README, Mermaid architecture diagrams, detailed project report, and submission checklist.

---

### Slide 15: Questions & Thank You
- **Developer:** Manish Kumar
- **GitHub:** [https://github.com/ManishKumar3371-sys/ModelWatch](https://github.com/ManishKumar3371-sys/ModelWatch)
- **Live Demo Ready**
- *Thank you to the evaluation committee!*
