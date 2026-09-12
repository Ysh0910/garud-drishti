# GARUD DRISHTI

> **See the Risk. Act Before the Disaster.**

GARUD DRISHTI is an AI-assisted landslide risk monitoring and early-warning platform being built for the 2026 Smart India Hackathon. It targets the North Eastern Region (NER) of India, where intense monsoon rainfall, fragile geology, and steep terrain make landslides a recurring and devastating hazard.

**The project is currently under active development.**

```
SENSE ──► ANALYSE ──► PREDICT ──► VISUALISE ──► WARN ──► PRIORITISE ──► RESPOND
```

The system is a decision-support and early-warning platform — not a deterministic landslide oracle and not an autonomous emergency-declaration system.

---

## Contents

- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Development Workstreams](#development-workstreams)
- [Shared Contracts](#shared-contracts)
- [Risk Semantics](#risk-semantics)
- [ML Architecture](#ml-architecture)
- [Citizen Reporting](#citizen-reporting)
- [Alert Workflow](#alert-workflow)
- [Geospatial Layer](#geospatial-layer)
- [API Surface](#api-surface)
- [Technology Stack](#technology-stack)
- [Branching and Git Workflow](#branching-and-git-workflow)
- [Local Development Setup](#local-development-setup)
- [Testing](#testing)
- [Development Principles](#development-principles)
- [Current Project Status](#current-project-status)
- [Documentation Map](#documentation-map)

---

## System Architecture

```
Terrain + Historical Landslides
Rainfall / Environmental Observations
                │
                ▼
       [ Data Ingestion ]       ◄── IMD / GPM / SMAP / GSI / SRTM
                │
                ▼
       [ Feature Pipeline ]
                │
                ▼
   ┌────────────┴────────────┐
   │                         │
[ Model 1            [ Model 2
  Susceptibility ]     Dynamic Risk ]
   │                         │
   └────────────┬────────────┘
                │
                ▼
       [ Spatial Risk Grid ]
         (PostGIS cells)
                │
                ▼
         [ Backend API ]
          (FastAPI)
         /            \
        /              \
[ Authority Web    [ Citizen Mobile
  Dashboard ]        App ]
  (Debarshi)         (Taarun)
        ▲                │
        │                │ Citizen Reports
        │                ▼
        └──── [ Evidence Review ] ◄── Authority
                         │
                         ▼
              [ Exposure Analysis ]
                         │
                         ▼
              [ Response Priority ]
                         │
                         ▼
              [ Alert Workflow ]
                         │
                         ▼
              [ Simulated Notification ]
```

---

## Repository Structure

```
garud-drishti/
│
├── AGENTS.md                   # Development contract and scientific rules (read first)
├── TECH_STACK.md               # Technology selection rationale
├── README.md                   # This file
│
├── contracts/                  # ★ Shared integration contracts (single source of truth)
│   ├── README.md               # Contract ownership and rules
│   ├── CONTRACT_DECISIONS.md   # Conflict resolutions and provisional decisions
│   ├── enums.md                # Canonical enum values
│   ├── risk.md                 # Risk representation contract
│   ├── reports.md              # Citizen report contract
│   ├── exposure.md             # Roads/villages/assets contract
│   ├── alerts.md               # Alert lifecycle contract
│   ├── dashboard.md            # Authority dashboard contract
│   ├── ml.md                   # ML ↔ backend interface contract
│   └── examples/               # Valid JSON examples for all major objects
│
├── apps/
│   ├── authority-web/          # React + TypeScript + Vite — authority dashboard (Debarshi)
│   └── citizen-mobile/         # React Native + TypeScript — citizen app (Taarun)
│
├── backend/
│   ├── main.py                 # FastAPI application entrypoint
│   ├── requirements.txt        # Python dependencies
│   └── app/
│       ├── api/                # API route definitions
│       ├── auth/               # JWT/RBAC authentication
│       ├── risk/               # Risk calculation and forecasting
│       ├── gis/                # PostGIS spatial grid and tile services
│       ├── reports/            # Report ingestion and pre-screening
│       ├── alerts/             # Alert lifecycle state machine
│       ├── chatbot/            # Risk assistant interface (P2)
│       ├── providers/          # External data provider adapters
│       │                       # (IMD, GPM, SMAP, Sentinel, Mock)
│       └── jobs/               # Background ingestion tasks
│
├── ml/
│   ├── preprocessing/          # Spatial splitting and cleaning
│   ├── feature_engineering/    # Rainfall rolling windows, terrain metrics
│   ├── training/               # Model training pipelines
│   ├── evaluation/             # Metrics and validation
│   ├── inference/              # Risk scoring for backend integration
│   └── explainability/         # SHAP feature contribution
│
├── configs/
│   ├── susceptibility.yaml     # Model 1 hyperparameters and feature list
│   ├── dynamic_risk.yaml       # Model 2 hyperparameters, horizons, risk bands
│   └── feature_schema.yaml     # Feature units, sources, missing-value policies
│
├── data/
│   ├── raw/                    # ★ Immutable — never overwrite
│   ├── processed/              # Cleaned and transformed layers
│   └── final/                  # Training-ready datasets
│
├── models/
│   ├── susceptibility/         # Trained Model 1 artifacts
│   └── dynamic_risk/           # Trained Model 2 artifacts
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml  # Backend + PostGIS + Redis
│       └── Dockerfile.backend
│
├── Master_Plans/               # Hackathon execution plan and production blueprint
│   ├── HACKATHON_PLAN.md
│   └── PRODUCTION_BLUEPRINT_V2.md
│
├── docs/
│   └── fetures/                # Feature specifications (13 docs)
│
├── Tasks/                      # Per-developer task files
│   ├── Tejasvi/
│   ├── Yashwanth/
│   ├── Debarshi/
│   └── Taarun/
│
└── tests/
    ├── backend/
    ├── ml/
    └── apps/
```

---

## Development Workstreams

| Developer | Responsibility | Primary Area |
|---|---|---|
| **Tejasvi** | Data ingestion + ML | `ml/`, `data/`, `configs/`, `models/` |
| **Yashwanth** | Backend/API + integration | `backend/` |
| **Debarshi** | Complete authority web UI | `apps/authority-web/` |
| **Taarun** | Citizen mobile app | `apps/citizen-mobile/` |

### Tejasvi — Data + ML

Owns the full ML pipeline: acquiring historical landslide inventory (GSI/ISRO) and terrain data (SRTM), building `data/final/susceptibility_dataset.csv` and `data/final/dynamic_risk_dataset.csv`, training and validating both XGBoost models, and exposing an inference interface that the backend integrates. Responsible for SHAP explanations once models are trained. Primary contracts: `contracts/ml.md`, `contracts/risk.md`.

### Yashwanth — Backend + API + Integration

Owns the FastAPI service, all API endpoints, database models, PostGIS spatial grid, provider adapters, alert engine, and the integration between Tejasvi's inference layer and the API. Responsible for making the contracts' response shapes real. Primary contracts: all of `contracts/`.

### Debarshi — Authority Web Dashboard

Owns the full React/TypeScript authority dashboard: risk heatmap (MapLibre GL), KPI row, zone detail panel with forecast and SHAP explanation, citizen report review workflow, alert center with approval actions, exposure panels (roads, villages, assets), and response priority display. Builds against the shared contracts using `contracts/examples/` as mock data while the backend is in progress. Primary contracts: `contracts/dashboard.md`, `contracts/risk.md`, `contracts/alerts.md`, `contracts/reports.md`, `contracts/exposure.md`.

### Taarun — Citizen Mobile App

Owns the citizen-facing React Native application. Responsibilities include: the hazard report creation flow (category, description, GPS, photo), offline report queuing and retry when connectivity resumes, report history and status display, local risk card (current risk level and 24h forecast), and alert/warning display. **Taarun does not implement backend services.** Primary contracts: `contracts/reports.md`, `contracts/risk.md`, `contracts/enums.md`.

---

## Shared Contracts

The `contracts/` directory is the **single source of truth for every interface that crosses a workstream boundary**. It is not implementation code — it is the agreement that makes parallel development safe.

Before implementing anything that touches a boundary between workstreams, read the relevant contract file first.

| Contract file | What it defines |
|---|---|
| `contracts/enums.md` | All shared string enumerations (`RiskLevel`, `RiskState`, `ReportCategory`, `ReportStatus`, `AlertState`, `Trend`, `DataQuality`, `ResponsePriority`) |
| `contracts/risk.md` | Point risk response, risk zone GeoJSON, forecast horizons, zone detail, SHAP explanation response |
| `contracts/reports.md` | Report create request, report response, report lifecycle, verification endpoint |
| `contracts/exposure.md` | Asset summary, road risk GeoJSON, village risk, asset types |
| `contracts/alerts.md` | Alert object, alert lifecycle, trigger rules, deduplication, notification summary |
| `contracts/dashboard.md` | Dashboard summary response, which endpoints Debarshi calls for each panel, polling guidance |
| `contracts/ml.md` | Model 1 and Model 2 input features, output fields, inference interface, dataset column contracts, metadata |
| `contracts/CONTRACT_DECISIONS.md` | Every conflict found between existing docs and how it was resolved |

### Rules

- Internal implementation details (DB column names, variable names, component state) may change freely.
- The external shape of what crosses a boundary must match the contract.
- Adding a nullable field is non-breaking — notify affected developers.
- Renaming a field, changing a type, removing a field, or changing an enum value is a **breaking change** and requires explicit agreement from all four developers before merging.
- Contract changes must be in a dedicated commit, never silently embedded in an implementation PR.

`contracts/examples/` contains valid JSON for every major object. Debarshi and Taarun should use these as mock data while the backend is not yet ready.

---

## Risk Semantics

The following concepts are **separate fields** in every API response. They must not be collapsed into a single number.

| Concept | Meaning |
|---|---|
| `risk_score` | 0–100 hazard probability estimate from the XGBoost model |
| `risk_level` | Band label derived from score: `VERY_LOW / LOW / MODERATE / HIGH / CRITICAL` |
| `risk_state` | Operational state machine state: `NORMAL / WATCH / ELEVATED / HIGH / CRITICAL` |
| `confidence` | 0.0–1.0 reliability of the prediction; nullable if model is uncalibrated |
| `data_quality` | Freshness and completeness of inputs: `GOOD / DEGRADED / STALE / MISSING` |
| `base_susceptibility` | 0–100 static terrain/geology score from Model 1 |
| `response_priority` | Combined hazard + exposure urgency: `LOW / MEDIUM / HIGH / IMMEDIATE` |
| `trend` | Direction of recent risk change: `INCREASING / DECREASING / STABLE` |

`RiskLevel` (score bands) and `RiskState` (state machine) share the values `HIGH` and `CRITICAL` but are different enumerations serving different purposes. See `contracts/CONTRACT_DECISIONS.md` CD-001.

A score of 91 must not be presented as "91% probability of landslide" unless the model has been explicitly calibrated.

---

## ML Architecture

### Model 1 — Susceptibility

Answers: *How inherently susceptible is this location?*

Inputs: terrain features derived from DEM (elevation, slope, aspect, curvature), geological and geomorphological class, hydrological condition, distance to drainage, historical landslide density and distance. No current rainfall — this model represents static/slow susceptibility only.

Output: `base_susceptibility` (0–100 index). Configuration: `configs/susceptibility.yaml`.

### Model 2 — Dynamic Risk

Answers: *Given current environmental conditions, how elevated is landslide risk?*

Inputs: `base_susceptibility` from Model 1 plus rainfall rolling windows (1h, 3h, 6h, 12h, 24h, 72h, 7d), soil moisture (P1), and forecast rainfall where archived forecasts are defensible.

Output: `current_risk` and optionally `risk_24h` (0–100 each). Configuration: `configs/dynamic_risk.yaml`.

### Horizons

Architecture supports: `current`, `6h`, `24h`, `48h`, `72h`. At hackathon scope, only `current` and `24h` are being trained initially (see `Master_Plans/HACKATHON_PLAN.md §5`). Every forecast entry in the API carries a `validated` boolean — the UI must visually distinguish unvalidated horizons from trained ones.

### Validation

- Random train/test splits are not acceptable.
- Use spatial block split, district holdout, or event-based holdout.
- Only data available at or before prediction time `T` may be a feature.
- Post-event variables (damage, final dimensions, road blockage caused by the event) are prohibited as predictors.

See `contracts/ml.md` for the full interface specification.

---

## Citizen Reporting

```
Citizen Mobile App (Taarun)
           │
           │  POST /api/v1/reports
           ▼
    Backend API (Yashwanth)
           │
           │  Evidence record — status: PENDING
           ▼
    Authority Review (Debarshi)
           │
           │  POST /api/v1/reports/{id}/verify
           ▼
   VERIFIED / REJECTED / PROBABLE
```

**A citizen report is evidence, not an automatic critical-alert trigger.** An authority remains in the decision loop for all severe warnings. Verified reports contribute to situational awareness; they do not independently trigger public emergency alerts.

Report lifecycle: `PENDING → REVIEW → PROBABLE / VERIFIED / REJECTED`

See `contracts/reports.md` for the full request/response shape, field definitions, and lifecycle.

---

## Alert Workflow

```
Risk computation / manual authority action
              │
              ▼
       Candidate alert
       (state: CREATED)
              │
              ▼
    PENDING_APPROVAL
    (authority review)
              │
        ┌─────┴─────┐
     approve      reject
        │          │
        ▼         (discarded)
      ACTIVE
   (notification sent
    or simulated)
        │
   ┌────┴────┐
  risk      risk
  rises     falls
   │          │
   ▼          ▼
ESCALATED  RESOLVED
```

No alert transitions to `ACTIVE` without an explicit authority approval action. The current demo/development setup uses simulated notification channels (`SMS_MODE=mock` in `infrastructure/docker/docker-compose.yml`). Real SMS delivery is not implemented.

See `contracts/alerts.md` for trigger rules, deduplication semantics, and the full alert object.

---

## Geospatial Layer

The risk grid is built on **PostgreSQL + PostGIS**. Each grid cell (target: 1 km) stores `base_susceptibility`, `current_risk`, forecast risk scores, `risk_state`, `response_priority`, `trend`, `updated_at`, and geometry.

Backend geospatial processing uses **GeoPandas**, **Rasterio**, and **GDAL**. The authority dashboard map is rendered with **MapLibre GL JS**.

The grid endpoint returns **GeoJSON FeatureCollections** in WGS84 (EPSG:4326, lon/lat order per GeoJSON RFC 7946). Bounding-box filtering is supported via `?bbox=west,south,east,north`. Horizon switching is via `?horizon=current|6h|24h|48h|72h`.

Distance and area computations must use an appropriate projected CRS internally. Degree-difference distance calculations are prohibited.

---

## API Surface

The following endpoints are **documented** in `contracts/` and `docs/fetures/`. Implementation is in progress.

Only `GET /api/v1/risk/{latitude}/{longitude}` and `GET /health` currently return responses (both are stubs — see `backend/app/api/v1/router.py`). All other endpoints are planned.

### Risk

```
GET  /api/v1/risk/{latitude}/{longitude}   ← stub exists (hardcoded values)
GET  /api/v1/risk/grid?bbox=               ← planned
GET  /api/v1/risk/{cell_id}               ← planned
GET  /api/v1/risk/{cell_id}/explain       ← planned (P1 — requires SHAP)
GET  /api/v1/risk/forecast/{zone_id}      ← planned
```

### Reports

```
POST /api/v1/reports                       ← planned
GET  /api/v1/reports                       ← planned
GET  /api/v1/reports/{report_id}          ← planned
POST /api/v1/reports/{id}/verify          ← planned
GET  /api/v1/hotspots                     ← planned (P1)
```

### Exposure

```
GET  /api/v1/roads/risk                   ← planned
GET  /api/v1/villages/risk                ← planned
GET  /api/v1/assets/nearby                ← planned
```

### Alerts

```
GET  /api/v1/alerts                        ← planned
POST /api/v1/alerts                        ← planned
POST /api/v1/alerts/{id}/acknowledge       ← planned
POST /api/v1/alerts/{id}/resolve           ← planned
```

### Dashboard

```
GET  /api/v1/dashboard/summary             ← planned
```

### Health

```
GET  /health                               ← implemented
```

Canonical request/response shapes are in `contracts/`, not here. Refer to those files when implementing or consuming any endpoint.

---

## Technology Stack

### Backend
| | |
|---|---|
| Language | Python 3.11 |
| Framework | FastAPI + Pydantic |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache / Queue | Redis 7, Celery |
| Geospatial | GeoPandas, Rasterio, GDAL, GeoAlchemy2 |

### Machine Learning
| | |
|---|---|
| Primary model | XGBoost |
| Explainability | SHAP |
| Supporting | scikit-learn, pandas, numpy |

### Authority Web
| | |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| GIS engine | MapLibre GL JS 4 |
| Charts | ECharts 5 |
| State / query | Zustand, TanStack Query |

### Citizen Mobile
| | |
|---|---|
| Framework | React Native 0.73 + TypeScript |
| Navigation | React Navigation 6 |
| Maps | react-native-maps |
| Storage | AsyncStorage |

### Infrastructure
| | |
|---|---|
| Containers | Docker + Docker Compose |
| Base images | `python:3.11-slim`, `postgis/postgis:16-3.4`, `redis:7-alpine` |

---

## Branching and Git Workflow

`main` is the integration branch. Development happens on separate workstream branches.

```
main
├── Tejasvi    — data ingestion + ML
├── Yashwanth  — backend / API
├── Debarshi   — authority web UI
└── Taarun     — citizen mobile app
```

- Do not develop unrelated work directly on `main`.
- Keep work isolated to your assigned workstream.
- Use `contracts/examples/` as mock data so your workstream is not blocked waiting for another.
- A contract change that affects another developer's work requires explicit coordination before merging.
- Integrate incrementally — do not accumulate large divergent branches.
- Tejasvi has an active branch and active work in progress; do not restart or overwrite it.

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker Desktop (or Docker Engine + Compose)

### Backend (via Docker — recommended)

```bash
cd infrastructure/docker
docker-compose up -d
```

This starts:
- FastAPI backend on port 8000
- PostgreSQL + PostGIS on port 5432
- Redis on port 6379

Environment variables are set in `docker-compose.yml`. `SMS_MODE=mock` is set by default — no real SMS will be sent.

### Backend (local, without Docker)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify at `http://localhost:8000/health`.

**Note:** A local run without Docker will not have a database or Redis available. Most endpoints will not function until these are running.

### Authority Web Dashboard

```bash
cd apps/authority-web
npm install
npm run dev
```

Opens at `http://localhost:3000`. No source files exist yet — scaffold the `src/` directory before running.

### Citizen Mobile App

```bash
cd apps/citizen-mobile
npm install
npx react-native run-android  # or run-ios
```

No source files exist yet — scaffold the app before running.

### Setup notes

- Database migrations are not yet created. PostGIS will be running but the schema will be empty.
- Model artifacts in `models/` do not yet exist. The backend returns stub values until real models are trained.
- Setup instructions will evolve as implementation progresses.

---

## Testing

The following testing layers are intended per `AGENTS.md §50`. Test files do not yet exist — test directories are scaffolded at `tests/backend/`, `tests/ml/`, `tests/apps/`.

| Layer | What to test |
|---|---|
| ML / data | Rainfall aggregation correctness, target label generation, leakage checks, feature range validation |
| Feature validation | Dataset column presence, coordinate validity, missing-value flagging |
| Backend / API | Endpoint responses, schema conformance against contracts, error handling |
| Contract compatibility | API responses match contract shapes in `contracts/` |
| Frontend | Component rendering, form validation, mock API integration |
| Integration | Report submission → backend → dashboard appearance |

No tests currently pass because no tests currently exist. Write tests alongside implementation.

---

## Development Principles

These rules are non-negotiable. They are established in `AGENTS.md` and apply to all workstreams.

1. **Never fabricate data.** No invented landslide records, rainfall readings, coordinates, model metrics, or risk probabilities. Mock data must be explicitly labelled as mock.
2. **Never claim absolute certainty.** Risk is expressed as an estimated score and band, not a deterministic guarantee. "A landslide will definitely happen" is never an acceptable output.
3. **Prevent data leakage.** Only data available at or before prediction time `T` may be a model feature. Post-event variables are prohibited as predictors.
4. **Keep `data/raw/` immutable.** Never overwrite raw source data. All transformations live in `data/processed/` and `data/final/`.
5. **Use spatially appropriate validation.** Random train/test splits are not acceptable. Use spatial block splits or geographic holdouts.
6. **Do not fabricate probabilities.** A risk score is not a calibrated probability unless the model has been explicitly calibrated.
7. **Do not present unvalidated forecasts as validated.** Every forecast entry carries a `validated` flag. The UI must communicate this honestly.
8. **Citizen reports are evidence, not alerts.** A single citizen report must never independently trigger a public emergency warning. Authority remains in the loop.
9. **Keep risk concepts semantically distinct.** Hazard score, confidence, exposure, data quality, and response priority are separate fields. Never merge them into one number.

---

## Current Project Status

| Component | Status |
|---|---|
| Project architecture and documentation | Established |
| Shared contracts layer (`contracts/`) | Complete |
| Docker / infrastructure setup | Complete |
| Backend skeleton (FastAPI app, provider adapters) | Scaffolded — implementation in progress |
| Database models and migrations | Not yet implemented |
| ML pipeline (preprocessing, training, inference) | In progress (Tejasvi) |
| Trained model artifacts | Not yet produced |
| Backend API endpoints | Stub only (`/health`, one risk stub) |
| Authority web UI | Dependency manifest only — implementation in progress (Debarshi) |
| Citizen mobile app | Dependency manifest only — implementation in progress (Taarun) |
| Integration (API ↔ ML) | Not yet integrated |
| Tests | Not yet written |

---

## Documentation Map

| Document | What it is |
|---|---|
| `AGENTS.md` | The full development contract: scientific rules, architecture, dataset specs, validation requirements, API surface, alert rules, security, and coding constraints. **Read before making any significant decision.** |
| `contracts/` | Shared machine-readable integration contracts. The single source of truth for cross-workstream interfaces. |
| `contracts/CONTRACT_DECISIONS.md` | Records every conflict between existing docs and the resolution chosen. |
| `TECH_STACK.md` | Technology selection rationale for every component. |
| `Master_Plans/HACKATHON_PLAN.md` | The 72-hour hackathon execution plan: scope hierarchy (P0/P1/P2), build order, per-developer responsibilities, and demo script. |
| `Master_Plans/PRODUCTION_BLUEPRINT_V2.md` | The full production architecture target (beyond hackathon scope). |
| `docs/fetures/` | Thirteen feature specification documents covering every major system feature in detail. |
| `configs/susceptibility.yaml` | Model 1 hyperparameters and canonical feature list. |
| `configs/dynamic_risk.yaml` | Model 2 hyperparameters, forecast horizons, risk band thresholds, and alert thresholds. |
| `configs/feature_schema.yaml` | Feature units, sources, types, and missing-value policies. (Partially populated — Tejasvi completes this during dataset preparation.) |
| `Tasks/` | Per-developer task breakdowns for the current development phase. |

---

*Licensed under the MIT License.*
