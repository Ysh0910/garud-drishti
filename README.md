# 🦅 GARUD DRISHTI (गरुड़ दृष्टि)

> **AI-Powered Geospatial Early Warning & Landslide Risk Monitoring Platform for the North Eastern Region of India**
>
> *Smart India Hackathon (SIH 2026) · Ministry of Mines / Geological Survey of India (GSI) & National Disaster Management Authority (NDMA)*

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge&logo=shield)](https://github.com/Ysh0910/garud-drishti)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial%203.3-0064a5?style=for-the-badge&logo=postgresql)](https://supabase.com)
[![FastAPI](https://img.shields.io/badge/ML%20Engine-FastAPI%20%2B%20XGBoost-009688?style=for-the-badge&logo=fastapi)](https://garud-ml.onrender.com/health)
[![Node.js](https://img.shields.io/badge/Gateway-Express%20%2B%20TypeScript-339933?style=for-the-badge&logo=nodedotjs)](https://garud-drishti-1.onrender.com/health)
[![MapLibre](https://img.shields.io/badge/GIS%20Map-MapLibre%20WebGL-3969ff?style=for-the-badge&logo=maplibre)](https://maplibre.org)

```
SENSE ──► ANALYSE ──► PREDICT ──► VISUALISE ──► WARN ──► PRIORITISE ──► RESPOND
```

GARUD DRISHTI is an enterprise-grade, decision-support and early-warning platform that transforms raw satellite precipitation, geotechnical terrain parameters, live IMD meteorological feeds, and citizen ground observations into **continuous spatial hazard heatmaps, multi-horizon predictive risk forecasts, and instant life-saving emergency broadcasts**.

---

## 📑 Table of Contents

- [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
- [System Architecture](#-system-architecture)
- [Key Innovations & Core Features](#-key-innovations--core-features)
- [Multi-Tier Machine Learning Pipeline](#-multi-tier-machine-learning-pipeline)
- [Geospatial & Continuous Risk Heatmap](#-geospatial--continuous-risk-heatmap)
- [Alert Lifecycle & Notification Pipeline](#-alert-lifecycle--notification-pipeline)
- [Platform Applications & Interfaces](#-platform-applications--interfaces)
- [Repository Structure](#-repository-structure)
- [Cloud Deployment & Live Endpoints](#-cloud-deployment--live-endpoints)
- [Local Development Setup](#-local-development-setup)
- [Verification & Hardening Suite](#-verification--hardening-suite)
- [Compliance & Scientific Integrity](#-compliance--scientific-integrity)

---

## 🎯 Executive Summary & Problem Statement

The North Eastern Region (NER) of India—comprising Sikkim, Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, and Tripura—faces some of the world's most severe landslide hazards due to intense monsoonal precipitation, high tectonic fragility, steep slope gradients, and complex lithology.

### Traditional Limitations:
1. **Static Susceptibility Only:** Historical hazard maps do not dynamically account for real-time 24h/72h rainfall saturation spikes.
2. **Coarse Spatial Boundaries:** Arbitrary administrative boundaries hide localized slope failure corridors.
3. **Delayed Field Feedback:** Lack of verified citizen crowdsourcing leaves authorities blind to early tension cracks and slope creep.
4. **Siloed Alerting:** Emergency declarations are delayed, missing critical evacuation windows before cut-slope collapses.

### The GARUD DRISHTI Solution:
- **Two-Stage Physical AI:** Separates intrinsic geological susceptibility ($M_1$) from dynamic hydrometeorological triggers ($M_2$).
- **Multi-Horizon Forecasts:** Predicts landslide risk across **Nowcast, +6 Hours, +24 Hours, +48 Hours, and +72 Hours**.
- **Continuous WebGL Risk Heatmap:** Continuous Gaussian density heat surfaces instead of boxy discrete tiles.
- **Bi-Directional Citizen Integration:** Direct GPS + Photo crowdsourcing with AI pre-screening and authority verification.
- **Instant Mobile Alert Dispatch:** 1-click official emergency broadcasts with localized field precautions.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph SENSE["1. SENSE · Ingestion Layer"]
        A1[IMD Weather AWS] --> ING[Ingestion Pipeline & QC Engine]
        A2[NASA GPM IMERG 0.1°] --> ING
        A3[NASA SMAP Soil Moisture] --> ING
        A4[USGS SRTM 30m DEM] --> ING
        A5[GSI Landslide Inventory] --> ING
        A6[Citizen Field Evidence] --> ING
    end

    subgraph STORE["2. STORE · Geospatial Feature Store"]
        ING --> FS[(Supabase PostgreSQL + PostGIS 3.3)]
        FS --> T1[85 Monitored NER Risk Cells]
        FS --> T2[Critical Corridors NH-10 / NH-106 / NH-54]
        FS --> T3[Terrain & Environmental Features]
    end

    subgraph PREDICT["3. PREDICT · Two-Stage XGBoost Engine"]
        FS --> M1[Model 1: Static Susceptibility XGBoost]
        M1 --> M2[Model 2: Dynamic Trigger Risk XGBoost]
        M2 --> SHAP[SHAP Feature Attribution Engine]
        M2 --> FC[5-Horizon Forecast Engine: Now, 6h, 24h, 48h, 72h]
    end

    subgraph GATEWAY["4. GATEWAY · Node.js Express API"]
        M2 --> API[Express TypeScript Gateway]
        SHAP --> API
        FS <--> API
        API --> PRIO[Multi-Factor Response Prioritization]
        API --> ALT[Stateful Alert Engine]
    end

    subgraph SURFACES["5. RESPOND · Presentation Surfaces"]
        API <==> WEB[Authority GIS Web Console<br/>MapLibre GL Heatmap]
        API <==> MOB[Citizen Mobile App<br/>React Native / Web PWA]
        ALT --> SMS[Simulated SMS / Push Notification Engine]
    end
```

---

## ⚡ Key Innovations & Core Features

| Feature | Technical Implementation | Operational Benefit |
| :--- | :--- | :--- |
| **Continuous WebGL Heatmap** | MapLibre GL Gaussian density surface driven by continuous model risk weights ($0\to 100$) | Seamless terrain overlay eliminating unnatural square grid artifacts. |
| **Two-Stage Modeling** | XGBoost $M_1$ (Susceptibility) + XGBoost $M_2$ (Dynamic Risk) | Clear physical separation between slow geological factors and dynamic rainfall triggers. |
| **Multi-Horizon Forecasting** | Dynamic sliding-window aggregation across Now, $+6\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$ | Enables proactive slope evacuation rather than reactive post-disaster response. |
| **SHAP Explainability** | Real-time TreeSHAP delta calculation ($\Delta \text{SHAP}$) | Transparent rationale for disaster authorities (*"Why is risk critical right now?"*). |
| **Response Prioritization** | Multi-attribute formula: $\text{Hazard} \times \text{Exposure} \times \text{Vulnerability}$ | Direct ranking of relief resources prioritizing hospitals, highways, and high populations. |
| **Live Citizen Hazard Triage** | Exif GPS tagging, multipart photo upload, offline queue, and authority verification | Rapid field crowdsourcing for tension cracks, slope seepage, and rockfalls. |
| **Instant Emergency Broadcast** | Sub-second active alert polling + system push notification + in-app safety checklist | Direct life-saving early warning delivery to citizen smartphones. |

---

## 🧠 Multi-Tier Machine Learning Pipeline

```
STATIC / SLOW FEATURES (DEM, Lithology, Faults, Landcover)
        ↓
XGBoost Model #1 — Geological Susceptibility
        ↓
Base Susceptibility Score (0–100)
        +
ANTECEDENT & FORECAST RAINFALL (IMD / NASA GPM 1h, 3h, 6h, 12h, 24h, 72h, 7d)
        +
SOIL MOISTURE SATURATION (NASA SMAP)
        ↓
XGBoost Model #2 — Dynamic Landslide Trigger Risk
        ↓
Risk Estimates: Current · +6h · +24h · +48h · +72h
        ↓
TreeSHAP Contribution & Confidence Bounds
```

### Risk Bands (Configurable Institutional Thresholds)

| Score Range | Risk Level | Canonical Color | Action Protocol |
| :--- | :--- | :--- | :--- |
| **$81 - 100$** | `CRITICAL` | `#8E2420` (Crimson) | Immediate evacuation of unstable slope corridors; emergency broadcast. |
| **$61 - 80$** | `HIGH` | `#C9631B` (Amber-Red) | Deploy field inspection teams; place SDRF/NDRF units on high alert. |
| **$41 - 60$** | `MODERATE` | `#E3A130` (Yellow) | Monitor rainfall saturation thresholds; issue advisory for highway cuts. |
| **$21 - 40$** | `LOW` | `#7D9C3C` (Olive Green) | Standard baseline monitoring; normal traffic movement. |
| **$0 - 20$** | `VERY_LOW` | `#2E7D5B` (Deep Green) | Geotechnically stable conditions. |

---

## 🗺️ Geospatial & Continuous Risk Heatmap

GARUD DRISHTI uses **MapLibre GL** with high-performance WebGL raster heat surfaces:

- **Density Interpolation:** Smooth Gaussian density ramp mapping from deep green through amber to crimson.
- **Dynamic Zoom Kernel:** Radius scales automatically ($26\text{px}\to 110\text{px}$) maintaining optimal visual density across regional and block-level zoom levels.
- **Vector Focus Nodes:** Center point markers display numerical risk scores ($0\to 100$) and capture click events to inspect zone details.
- **Selected Boundary Highlighting:** Only the actively inspected zone displays boundary geometry, keeping the regional map clean and uncluttered.
- **Interactive Layers:** Toggle between **Dynamic Risk Surface**, **GSI Landslide Inventory (820 historical events)**, **IMD Rainfall**, and **Active Citizen Reports**.

---

## 🚨 Alert Lifecycle & Notification Pipeline

The platform enforces a deterministic, state-machine alert lifecycle:

```
[ TRIGGER DETECTED ] ──► PENDING_APPROVAL ──► [ AUTHORITY APPROVES / DISPATCHES ]
                                                       │
                                                       ▼
                                                     ACTIVE (Broadcast to Citizen App)
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
                       ESCALATED                                               RESOLVED
             (Risk increases to CRITICAL)                            (Conditions return to normal)
```

1. **Authority Dispatch:** Officials click **`🚨 SEND ALERT NOTIFICATION`** from the Selected Zone Inspector or approve candidate alerts in the **Alert Center**.
2. **Instant Sync:** Express Gateway stores the event in PostGIS and broadcasts state `ACTIVE`.
3. **Citizen Reception:** Citizen devices poll active alerts, display an **Emergency Alert Banner**, sound audio alerts, and trigger native web push notifications.
4. **Safety Action Guidance:** Expandable guidelines provide emergency helpline numbers (`1077 / 112`), evacuation routes, and slope clearance steps.

---

## 💻 Platform Applications & Interfaces

### 1. Authority Web Dashboard (`apps/authority-web`)
*Built with React 18, Vite, MapLibre GL, and ECharts.*
- **Regional Risk Surface:** Continuous interactive WebGL landslide risk heatmap.
- **Zone Triage Panel:** Sort and filter monitored zones by **Risk $\times$ Exposure**, **Risk Score**, or **6h Trend**.
- **Selected Zone Inspector:** Multi-horizon forecast bar charts, TreeSHAP contribution waterfalls, population/highway exposure metrics, and live alert dispatch.
- **Citizen Report Verification Console:** Review GPS-tagged photographic evidence submitted from the field, approve probable hazards, or reject false alarms.
- **Situation Report Generator:** One-click exportable PDF/summary for State Disaster Management Authorities (SDMAs).

### 2. Citizen Mobile Application (`apps/citizen-mobile`)
*Built with React Native, React Native Web, and Vite.*
- **Tactical Local Risk Telemetry:** Displays current hyper-local slope risk, 24h forecast, 72h antecedent rainfall, and soil moisture saturation.
- **Ground Hazard Dispatch:** 1-tap reporting for **Cracks, Rockfalls, Road Blockages, Soil Movement, and Flooding** with camera capture and EXIF GPS accuracy metadata.
- **Offline Resilient Queue:** Saves reports in local storage when mobile towers lose connectivity; automatically syncs when network returns.
- **Emergency Early Warning Banners:** Displays official disaster alerts with field safety precautions.

---

## 📁 Repository Structure

```
garud-drishti/
├── AGENTS.md                   # AI development contract & non-negotiable scientific rules
├── TECH_STACK.md               # Architectural decisions & component rationales
├── requirements.txt            # Python ML inference dependencies
├── Dockerfile.ml               # Containerization for ML microservice
│
├── apps/
│   ├── authority-web/          # Authority GIS Management Console (React + MapLibre)
│   │   ├── src/components/     # Map, Zone Inspector, Alert Center, Triage, Reports
│   │   ├── src/store/          # Zustand state management
│   │   └── vercel.json         # SPA routing configuration
│   │
│   └── citizen-mobile/         # Field & Citizen Mobile App (React Native + Web)
│       ├── src/components/     # Emergency Alert Banner, Hazard Form, Risk Cards
│       ├── src/services/       # Alert listener, API client, Offline queue
│       └── vercel.json         # SPA routing configuration
│
├── backend/                    # Express.js REST API Gateway (TypeScript)
│   ├── src/adapters/           # HttpMLAdapter, MockMLAdapter, CompositeMLAdapter
│   ├── src/controllers/        # Risk, Alerts, Reports, Exposure, Prioritization
│   ├── src/db/                 # PostGIS client, migrations, seed, sync_grid (85 zones)
│   ├── src/repositories/       # PostgreSQL / PostGIS data access layer
│   └── src/routes/             # Express API routers (/api/v1/*)
│
├── ml/                         # Python Machine Learning Subsystem
│   ├── data_validation/        # Dataset contract checks & leakage audit
│   ├── evaluation/             # ROC-AUC, PR-AUC, Brier score, calibration curves
│   ├── explainability/         # TreeSHAP explanation generators
│   ├── feature_engineering/    # Rolling rainfall windows, terrain extractor, feature store
│   ├── inference/              # FastAPI server (server.py) & Predictor engine (predictor.py)
│   ├── ingestion/              # IMD, GPM, SMAP, Sentinel observation providers
│   └── training/               # XGBoost susceptibility & dynamic risk training pipelines
│
├── models/                     # Versioned serialized model artifacts (.joblib, metadata.json)
├── data/                       # Spatial rasters, GeoJSON grids, raw/processed datasets
├── contracts/                  # Integration specifications (enums, risk, alerts, reports)
└── scripts/                    # Demo rehearsal & automated hardening suite
```

---

## 🌐 Cloud Deployment & Live Endpoints

| Service | Technology | Hosting Platform | Live URL |
| :--- | :--- | :--- | :--- |
| **ML Inference Engine** | Python / FastAPI / XGBoost | **Render** | [`https://garud-ml.onrender.com`](https://garud-ml.onrender.com/health) |
| **Backend API Gateway** | Express / Node.js / TypeScript | **Render** | [`https://garud-drishti-1.onrender.com`](https://garud-drishti-1.onrender.com/health) |
| **Geospatial Database** | PostgreSQL 15 + PostGIS 3.3 | **Supabase** | `aws-0-ap-northeast-1.pooler.supabase.com` |
| **Authority Web Console** | React / Vite / MapLibre GL | **Vercel** | *(Deployable via `apps/authority-web`)* |
| **Citizen Mobile Web** | React Native / Vite PWA | **Vercel** | *(Deployable via `apps/citizen-mobile`)* |

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js** $\ge 20.0.0$
- **Python** $\ge 3.10$
- **Git**

### 1. Clone Repository & Setup Backend
```powershell
git clone https://github.com/Ysh0910/garud-drishti.git
cd garud-drishti/backend
npm install
```

Configure `backend/.env`:
```env
PORT=8000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
SMS_MODE=mock
ML_ADAPTER_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres.wcoemstemozsaurfxafm:Youcandoit%3C3@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

Run migrations & start backend:
```powershell
npm run db:migrate
npm run dev
```

### 2. Start ML Inference Microservice
In a new terminal:
```powershell
pip install -r requirements.txt
python ml/inference/server.py
```
*(Server listens on `http://localhost:5000`)*

### 3. Start Authority Web Dashboard
In a new terminal:
```powershell
cd apps/authority-web
npm install
npm run dev
```
*(Dashboard opens on `http://localhost:3000`)*

### 4. Start Citizen Mobile App (Web Mode)
In a new terminal:
```powershell
cd apps/citizen-mobile
npm install
npm run web
```
*(App opens on `http://localhost:3001`)*

---

## 🧪 Verification & Hardening Suite

GARUD DRISHTI includes an end-to-end rehearsal test suite validating all 8 core disaster response journeys against live services:

```powershell
npx tsx scripts/rehearse_demo.ts
```

```text
================================================================
🦅 GARUD DRISHTI — LIVE DEMO REHEARSAL & HARDENING SUITE
🎯 Target API Gateway: http://localhost:8000
================================================================

⏳ [REHEARSAL] 1. Verify Gateway Health & PostGIS / ML Subsystem Readiness... ✅ PASSED (106ms)
⏳ [REHEARSAL] 2. Query Regional Risk Grid Heatmap FeatureCollection...       ✅ PASSED (12ms)
⏳ [REHEARSAL] 3. Retrieve Zone Details & SHAP Explainability for CELL_NER_001. ✅ PASSED (15ms)
⏳ [REHEARSAL] 4. Query Nearby Infrastructure & Population Exposure...         ✅ PASSED (15ms)
⏳ [REHEARSAL] 5. Ingest Citizen Hazard Observation (GPS + Photo Evidence)...  ✅ PASSED (13ms)
⏳ [REHEARSAL] 6. Execute Authority Incident Verification for Report...        ✅ PASSED (7ms)
⏳ [REHEARSAL] 7. Evaluate Multi-Factor Response Priority Ranking...           ✅ PASSED (5ms)
⏳ [REHEARSAL] 8. Complete Stateful Alert Lifecycle & Verify Live Dashboard... ✅ PASSED (37ms)

================================================================
🎉 DEMO REHEARSAL SUCCESSFUL — ALL 8 CORE JOURNEYS VALIDATED (100%)
================================================================
```

---

## 📜 Compliance & Scientific Integrity

- **No Data Fabrication:** Model outputs and sensor streams strictly distinguish zero values from missing observations (`DataQuality: GOOD | DEGRADED | STALE | MISSING`).
- **No Temporal Leakage:** Dynamic risk training uses only antecedent rainfall windows ($\le T$) and excludes future observations.
- **Probabilistic Transparency:** Hazard risk scores ($0\to 100$) represent calibrated statistical risk estimates, not deterministic guarantees.
- **Geographic Projection:** Spatial buffers and distance calculations use projected coordinate reference systems (EPSG:4326 to UTM metrics).

---

## 👥 Authors & Acknowledgements

Developed for **Smart India Hackathon 2026** by Team **GARUD DRISHTI**.

Special acknowledgement to the **Geological Survey of India (GSI)** (Bhukosh / Bhusanket portals), **India Meteorological Department (IMD)**, **ISRO / NRSC Landslide Atlas of India**, and **NASA Earth Science Data Systems (GPM / SMAP)** for open scientific data access.
