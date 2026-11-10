# ModelWatch – ML Model Monitoring & Drift Detection Platform

**ModelWatch** is a machine learning model monitoring platform designed to monitor model performance, detect data drift, evaluate datasets, and maintain model reproducibility.

The project focuses on real-estate price prediction using property data from **Pune and Prayagraj, India**.

## 🚀 Project Overview

Machine learning models can become less accurate over time when real-world data changes. ModelWatch helps identify these changes by monitoring incoming datasets and comparing them with reference data.

It provides a dashboard to monitor machine learning models, evaluate performance, and detect potential data drift.

## ✨ Key Features

- **Model Monitoring:** Monitor machine learning model information and performance.
- **Data Drift Detection:** Detect changes between reference and incoming datasets.
- **Dataset Management:** Upload and validate datasets.
- **Performance Tracking:** Track model evaluation metrics and performance history.
- **House Price Prediction:** Predict property prices using a trained machine learning model.
- **Model Comparison:** Compare model evaluation results.
- **Reports:** Generate and view drift monitoring reports.
- **Interactive Dashboard:** Visualize monitoring results through a web interface.

## 🏗️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, JavaScript, CSS |
| Backend | Python, FastAPI |
| Machine Learning | Scikit-learn |
| Data Processing | Pandas, NumPy |
| Statistical Testing | Kolmogorov–Smirnov Test |
| Visualization | Recharts |
| Development Tools | VS Code, Git, GitHub |

## 📂 Project Structure

```text
ModelWatch/
│
├── backend/
│   ├── main.py
│   ├── drift_detection.py
│   ├── predict.py
│   ├── train_model.py
│   └── validate_dataset.py
│
├── datasets/
│   ├── reference.csv
│   ├── property_prices.csv
│   ├── property_prices_clean.csv
│   └── new_property_data.csv
│
├── experiments/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── models/
├── trained_models/
├── clean_dataset.py
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/ManishKumar3371-sys/ModelWatch.git
cd ModelWatch
```

### 2. Start the Backend

Activate your Python virtual environment:

```bash
.\venv\Scripts\Activate.ps1
```

Run the FastAPI server from the project root:

```bash
python -m uvicorn backend.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite in your browser.

## 📊 Project Objective

The primary objective of ModelWatch is to provide an accessible monitoring solution for machine learning models by identifying data distribution changes and tracking model performance over time.

The real-estate dataset includes properties from Pune and Prayagraj, covering flats, independent houses, and residential plots.

## 🔍 Data Drift Detection

ModelWatch compares reference data with newly uploaded data to identify changes in feature distributions.

It uses statistical techniques such as the Kolmogorov–Smirnov test for numerical features.

## 🎯 Future Enhancements

- Automated model retraining.
- Advanced drift monitoring and alerts.
- Model versioning and experiment tracking.
- Cloud deployment.
- Enhanced monitoring and reporting.

## 👨‍💻 Developer

**Manish Kumar**

Computer Engineering – Final Year

GitHub: [ManishKumar3371-sys](https://github.com/ManishKumar3371-sys)

---

*ModelWatch – Monitor. Detect. Improve.*
