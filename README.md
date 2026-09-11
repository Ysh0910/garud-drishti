# NETRA — Landslide Early Warning & Risk Monitoring System for NER

> **AI-based Geospatial Platform for Landslide Susceptibility, Dynamic Risk Forecasting, Citizen Reporting, and Emergency Response Prioritization across the North Eastern Region of India.**

---

## 📌 Mission & Core Flow

Landslides in the North Eastern Region (NER) of India cause severe loss of life, isolate mountainous communities, and destroy critical infrastructure every monsoon season. **NETRA** (Garud-Drishti) is a decision-support and early-warning geospatial platform designed to empower disaster management authorities and local citizens with actionable, explainable, and real-time landslide risk intelligence.

```text
SENSE ──► ANALYSE ──► PREDICT ──► VISUALISE ──► WARN ──► PRIORITISE ──► RESPOND
```

---

## 🌟 Key Features

- 🧠 **Two-Stage XGBoost AI Architecture**:
  - **Model 1 (Susceptibility)**: Evaluates intrinsic slope vulnerability using terrain DEM, geology, landcover, distance to drainage, and historical landslide density.
  - **Model 2 (Dynamic Risk)**: Fuses base susceptibility with dynamic rainfall rolling windows (1h to 7d), NASA SMAP soil moisture, and weather forecasts.
- ⏱️ **Multi-Horizon Risk Forecasting**: Predicts landslide risk across **Current, 6h, 24h, 48h, and 72h** timeframes.
- 🗺️ **Interactive GIS Heatmap**: Vector/Raster tile grid visualization powered by MapLibre GL JS and PostGIS.
- 🚨 **Stateful Alert Engine & Multi-Channel Warnings**: Threshold-based alert generation (Watch, Elevated, High, Critical) with deduplication and SMS/Push notifications.
- 🛣️ **Impact & Response Prioritization**: Merges hazard risk with exposure layers (critical roads, village access, population density, hospitals) to prioritize emergency response.
- 📱 **Citizen Hazard Reporting & Offline Mode**: Enables citizens and field personnel to report cracks, rockfalls, and road blockages with GPS, photos, offline sync, and AI pre-screening.
- 🔍 **SHAP Explainability**: Provides transparent, factor-by-factor model explanations for every risk prediction.
- 💬 **Risk Assistant Chatbot**: Natural-language retrieval interface providing real-time risk, weather, and safety guidance.

---

## 📐 System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                 EXTERNAL DATA SOURCES                  │
               │ GSI Inventory | IMD Rainfall | NASA GPM | SMAP | DEM   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ Ingestion Pipeline  │
                                └──────────┬──────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ Feature Store &     │
                                │ PostGIS Spatial DB  │
                                └──────────┬──────────┘
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                       ▼
            ┌─────────────────────┐                 ┌─────────────────────┐
            │ XGBoost Suscepti-   │                 │ Dynamic Risk Engine │
            │ bility Model (M1)   │                 │ XGBoost Model (M2)  │
            └──────────┬──────────┘                 └──────────┬──────────┘
                       │                                       │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ FastAPI REST Server │
                                └──────────┬──────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       ▼                                   ▼                                   ▼
┌──────────────┐                 ┌──────────────────┐               ┌────────────────────┐
│ Authority    │                 │ Citizen Mobile   │               │ Alert Engine       │
│ Web Dashboard│                 │ App(React Native)│               │ (SMS / FCM Push)   │
└──────────────┘                 └──────────────────┘               └────────────────────┘
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Backend API** | Python, FastAPI, Pydantic | High-performance REST APIs & OpenAPI docs |
| **Machine Learning** | XGBoost, SHAP, scikit-learn | Susceptibility, dynamic risk & explainability |
| **Geospatial Processing** | PostGIS, GeoPandas, Rasterio, GDAL | Vector/raster grid processing & spatial indexing |
| **Authority Dashboard** | React, TypeScript, Vite, Tailwind CSS | Command & control web interface |
| **Web GIS Engine** | MapLibre GL JS | High-performance vector tile web mapping |
| **Citizen Mobile App** | React Native, TypeScript | Android & iOS field reporting & alert app |
| **Cache & Queue** | Redis, Celery | Feature caching & scheduled ingestion tasks |
| **Database** | PostgreSQL + PostGIS extension | Spatial store for grids, roads, reports & alerts |
| **Infrastructure** | Docker, Nginx | Containerized deployment architecture |

---

## 📁 Repository File Structure

```text
garud-drishti/
├── AGENTS.md                   # AI Agent development contract & scientific rules
├── TECH_STACK.md               # Technology choices & architectural decisions
├── README.md                   # Project documentation index (this file)
│
├── apps/                       # Frontend User Interfaces
│   ├── authority-web/          # React + TypeScript + Vite operations dashboard
│   └── citizen-mobile/         # React Native + TypeScript citizen application
│
├── backend/                    # Core Server Platform
│   ├── main.py                 # FastAPI application entrypoint
│   ├── requirements.txt        # Python backend dependencies
│   └── app/
│       ├── api/                # API routes & endpoint definitions
│       ├── auth/               # OAuth2, JWT, and RBAC authentication
│       ├── risk/               # Risk calculation engine & forecasting logic
│       ├── gis/                # PostGIS spatial grid & vector tile services
│       ├── reports/            # Citizen report ingestion & AI pre-screening
│       ├── alerts/             # Alert lifecycle state machine & SMS dispatch
│       ├── chatbot/            # Natural-language risk assistant API
│       ├── providers/          # Adapter interfaces (IMD, GPM, SMAP, Sentinel, Mock)
│       └── jobs/               # Background task ingestion scripts
│
├── ml/                         # Machine Learning Modules
│   ├── preprocessing/          # Spatial block splitting & cleaning
│   ├── feature_engineering/    # Rainfall rolling windows (1h-7d) & terrain metrics
│   ├── training/               # XGBoost model training pipelines
│   ├── evaluation/             # ROC-AUC, PR-AUC, calibration metrics
│   ├── inference/              # Real-time risk scoring engine
│   └── explainability/         # SHAP feature importance calculation
│
├── configs/                    # Model & System Configurations
│   ├── susceptibility.yaml     # Model 1 hyperparameters & feature list
│   ├── dynamic_risk.yaml       # Model 2 hyperparameters, horizons & risk bands
│   └── feature_schema.yaml     # Feature schemas, units & missing-value policies
│
├── data/                       # Data Pipeline (Git-ignored large files)
│   ├── raw/                    # Immutable raw source datasets (GSI, DEM, Weather)
│   ├── processed/              # Cleaned & merged geospatial layers
│   └── final/                  # Training datasets (susceptibility & dynamic risk)
│
├── models/                     # Versioned Trained Model Artifacts
│   ├── susceptibility/         # Trained Model 1 artifacts
│   └── dynamic_risk/           # Trained Model 2 artifacts
│
├── infrastructure/             # Deployment & Containerization
│   ├── docker/                 # Dockerfile.backend & docker-compose.yml
│   ├── nginx/                  # Reverse proxy configurations
│   └── ci/                     # Automated testing & deployment pipelines
│
├── docs/                       # Detailed Architecture & Feature Docs
│   └── fetures/                # Comprehensive specification for all 13 features
│
└── tests/                      # Automated Test Suites (backend, ml, apps)
```

---

## 📖 Feature Documentation Map

Detailed technical specifications for every system feature can be found in the [`docs/fetures/`](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/) directory:

| Feature Specification | Category | Priority |
|---|---|---|
| 🤖 [AI Risk Prediction](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_AI_Risk_Prediction.md) | Core ML Engine | P0 |
| 🗺️ [GIS Heatmap Visualization](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_GIS_Heatmap_Visualization.md) | Operations Dashboard | P0 |
| 📊 [Authority Operations Dashboard](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Authority_Dashboard.md) | Operations Dashboard | P0 |
| 🚨 [Alert Engine & Notifications](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Alert_Engine.md) | Warning & Communication | P0 |
| 📱 [Citizen Reporting Pipeline](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Citizen_Reporting.md) | Field Collection | P0 |
| 🔄 [Live Data Ingestion Pipeline](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Data_Ingestion_Pipeline.md) | Data Platform | P0 |
| 🔀 [Risk Fusion & Response Priority](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Risk_Fusion_Response_Priority.md) | Impact & Decision Support | P0 |
| 🌐 [Backend API & Database](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Backend_API_Database.md) | Infrastructure | P0 |
| 🛡️ [Citizen Mobile App](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Citizen_App.md) | User Application | P1 |
| 💡 [SHAP Model Explainability](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_SHAP_Explainability.md) | AI Transparency | P1 |
| 📴 [Offline & Low-Network Mode](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Offline_Mode.md) | Field Resilience | P1 |
| 🛰️ [Satellite Change Detection](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Satellite_Change_Detection.md) | Earth Observation | P2 |
| 💬 [Risk Assistant Chatbot](file:///e:/teju/garud-drishti/garud-drishti/docs/fetures/FEATURE_Chatbot.md) | Information Interface | P2 |

---

## ⚡ Quick Start & Development Setup

### Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18+ and npm/yarn
- **Docker**: Desktop / Docker Engine with Docker Compose
- **PostgreSQL**: 15+ with PostGIS extension (or run via Docker)

---

### Step 1: Clone Repository & Configuration

```bash
git clone https://github.com/Ysh0910/garud-drishti.git
cd garud-drishti
```

---

### Step 2: Start Database & Backend Services via Docker

```bash
cd infrastructure/docker
docker-compose up -d
```

This starts PostgreSQL with PostGIS, Redis, and the FastAPI backend service.

---

### Step 3: Run FastAPI Backend Locally (Alternative)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Verify backend health at `http://localhost:8000/health`.

---

### Step 4: Run Authority Web Dashboard

```bash
cd apps/authority-web
npm install
npm run dev
```

Open browser at `http://localhost:3000`.

---

### Step 5: Run Citizen Mobile App

```bash
cd apps/citizen-mobile
npm install
npx react-native run-android  # or run-ios
```

---

## 📜 Scientific & Governance Principles

As established in [`AGENTS.md`](file:///e:/teju/garud-drishti/garud-drishti/AGENTS.md):

1. **Never Fabricate Data**: No invented landslide records, rainfall readings, coordinates, or model probabilities.
2. **Never Claim Absolute Certainty**: Risk is expressed as probability estimates and elevated risk bands, not deterministic guarantees.
3. **Data Leakage Prevention**: Features strictly use data available at or before prediction time $T$. No post-event variables or future observed rainfall are permitted in predictors.
4. **Raw Data Preservation**: `data/raw/` remains strictly immutable. All transformations are stored in `data/processed/` and `data/final/`.
5. **Spatial Validation**: Model validation uses spatial block splitting and holdout regions to prevent spatial autocorrelation leakage.

---

## ⚖️ License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <b>Built for Disaster Management Authorities & Citizens across the North Eastern Region of India.</b>
</p>
