# NETRA — SIH 2026 Hackathon Execution Plan
## Phase 0: Thin Vertical Slice of the Production Blueprint

> This is the **implementation plan**, not the production architecture. `PRODUCTION_BLUEPRINT_V2.md` remains the target system.

## 1. Objective

Demonstrate one credible end-to-end disaster-intelligence workflow:

```text
DATA → FEATURES → RISK → EVIDENCE → GIS → PRIORITY → AUTHORITY ACTION
```

The core story: a susceptible zone receives worsening conditions; NETRA recalculates risk, explains why, incorporates a citizen observation as supporting evidence, identifies exposed infrastructure/communities, raises response priority, and presents a human-approved alert.

## 2. Scope Hierarchy

### P0 — Must Work

- 2–3 representative NER areas
- historical landslide inventory
- DEM-derived terrain features
- historical/prepared rainfall feed
- baseline + XGBoost susceptibility
- dynamic risk if labels/data are defensible; otherwise transparent dynamic scoring
- PostGIS risk grid
- polished 2D GIS dashboard
- citizen report: GPS/PIN + photo + category + description
- evidence/trust status
- roads/villages/assets exposure
- risk state machine
- authority review
- simulated alert/SMS/in-app notification
- API contracts and reproducible demo data

### P1 — Build if core is stable

- soil moisture
- dynamic XGBoost with defensible temporal labels
- SHAP explanation
- report clustering/hotspots
- offline report queue
- CAP-compatible JSON
- simulated sensor stream using the production contract

### P2 — Never block the demo

- live Sentinel-1/Sentinel-2 processing
- InSAR
- custom trained vision model
- segmentation
- real IoT hardware
- direct SACHET integration
- NER-wide processing
- Kafka/RabbitMQ/Kubernetes
- LSTM/transformer forecasting
- chatbot
- full multilingual NLP

## 3. Two Independent Vertical Slices

### Slice A — Predictive Risk

```text
Historical landslides + DEM + rainfall
        ↓
Feature engineering
        ↓
Susceptibility
        ↓
Dynamic risk (if defensible)
        ↓
Risk grid
        ↓
GIS + explanation
        ↓
Alert recommendation
```

### Slice B — Observational Evidence

```text
Citizen
  ↓
GPS/PIN + photo + category
  ↓
Report API
  ↓
Evidence record
  ↓
Trust / validation
  ↓
Optional clustering
  ↓
GIS
```

### Combined

```text
Predictive risk + Citizen evidence + Exposure
                     ↓
             Response priority
                     ↓
              Human approval
                     ↓
             Simulated alert
```

## 4. Data Plan

Prefer accessible, traceable sources:

- **Historical landslides:** ISRO Landslide Atlas/Bhuvan and GSI public information.
- **Terrain:** SRTM or accessible Indian DEM product.
- **Rainfall:** prepared historical dataset and/or simulated live-compatible feed.
- **Roads/settlements:** OpenStreetMap or another accessible source.
- **Soil moisture:** P1.
- **Satellite:** P2; if shown, use static/reference evidence rather than a live dependency.

Do not spend the hackathon fighting a portal. A smaller traceable subset is better than an incomplete pipeline.

## 5. Freeze the ML Target

Recommended initial scope:

- **Spatial unit:** 1 km grid cell.
- **Forecast horizon:** next 24 hours.
- **Static target:** historical landslide occurrence/susceptibility.
- **Dynamic target:** event within 24h only if timestamps and environmental time series support defensible labels.

Do not build multiple horizons simultaneously.

## 6. Model Plan

1. Build a simple baseline (Logistic Regression or Random Forest).
2. Train XGBoost as primary candidate.
3. Benchmark LightGBM if time permits.
4. Add SHAP for selected zones if model quality is sufficient.
5. Calibrate only if the data supports it.

Minimum evaluation: Precision, Recall, F1, PR-AUC; ROC-AUC where meaningful. Preferred: spatial/temporal holdout and Brier/calibration.

If dynamic labels are not defensible, do **not** fake a dynamic ML model. Use susceptibility + transparent dynamic scoring and clearly label it.

## 7. Risk Engine

Use:

```text
NORMAL → WATCH → ELEVATED → HIGH → CRITICAL
```

Implement deterministic demo transition rules around model output/evidence, while keeping model recommendation, evidence and authority decision visually separate.

Example:

```text
High model risk
+ good data quality
+ supporting evidence
+ critical exposure
→ HIGH/CRITICAL recommendation
```

## 8. Citizen Reporting

Under-one-minute form:

- photo
- GPS/PIN
- category
- description
- timestamp

Categories: crack, soil movement, debris/rockfall, road deformation, seepage, other.

Lifecycle:

```text
PENDING → REVIEW → PROBABLE / VERIFIED / REJECTED
```

A report never independently triggers a public emergency alert.

Vision is optional. If no validated model exists, store the image and let an authority review it. If a safe pretrained classifier is available, use it only as supporting evidence and route low confidence to “Needs Review”.

## 9. Exposure

For a selected risk zone show:

- roads intersecting/nearby
- villages
- population where available
- critical assets where available

Use actual data or label demonstration numbers as demo data.

## 10. Authority Dashboard

### KPI row

- critical zones
- high-risk zones
- active alerts
- new reports
- exposed assets

### Map

- risk heatmap
- historical landslides
- citizen reports
- roads
- villages/assets

Optional: rainfall, soil moisture, static satellite reference layer.

### Selected zone

Show risk, confidence, evidence, exposure, trend and top contributing factors.

### Actions

Verify report, acknowledge, escalate, resolve, generate alert.

## 11. Citizen App / PWA

A responsive PWA is acceptable if React Native slows the team down. If Expo is already moving quickly, use it. Do not let mobile deployment block the product.

Minimum flow:

```text
Local risk → Report hazard → Photo + GPS + category → Submit → Status
```

## 12. Backend

Keep logical service boundaries but co-deploy where practical:

```text
React / PWA
    ↓
Node/Express Gateway
    ↓
FastAPI services
  ├─ risk
  ├─ reports
  ├─ GIS
  └─ ML
    ↓
PostgreSQL + PostGIS + Object Storage
```

Gateway: auth, validation, rate limiting, request IDs, routing.

Python: ML inference, geospatial processing and feature computation where appropriate.

## 13. Minimum API Contract

```http
GET  /api/v1/risk/grid?bbox=
GET  /api/v1/risk/{cell_id}
GET  /api/v1/risk/{cell_id}/explain
POST /api/v1/reports
GET  /api/v1/reports
POST /api/v1/reports/{id}/verify
GET  /api/v1/hotspots
GET  /api/v1/assets/nearby
GET  /api/v1/dashboard/summary
GET  /api/v1/alerts
POST /api/v1/alerts/{id}/acknowledge
POST /api/v1/alerts/{id}/resolve
```

Exact schemas live in versioned OpenAPI. AI agents may not silently change them.

## 14. Hackathon Database Minimum

```text
risk_cells
historical_landslides
terrain_features
rainfall_observations
reports
report_media
assets
alerts
risk_states
users
model_versions
audit_logs
```

P1: soil_observations, sensor_readings, data_quality.

## 15. Four-Person Ownership

### DEV 1 — Data + GIS
Historical inventory, DEM, terrain features, rainfall, risk grid, PostGIS, spatial queries, provenance.

### DEV 2 — ML / Risk
Dataset creation, baseline, XGBoost, validation, calibration if feasible, SHAP, inference API, risk-state logic.

### DEV 3 — Dashboard / GIS UI
Authority dashboard, map, heatmap, layers, zone panel, charts, alert UI.

### DEV 4 — Gateway / Mobile / Integration
Express gateway, auth, report APIs, citizen PWA/mobile, notifications, alert adapters, deployment/integration.

## 16. Build Order

Before coding, freeze: spatial unit, 24h target, districts, DB schema, API contracts, risk states and demo scenario.

### Hours 0–6 — Foundation

All: repo, env, Docker Compose, PostGIS, API contract, seed geography.

Dev 1: data normalization.
Dev 2: dataset definition + baseline.
Dev 3: map shell + dashboard layout.
Dev 4: gateway + auth + report skeleton.

**Exit:** all services start and communicate.

### Hours 6–18 — Data + First Model

Dev 1: inventory, DEM, terrain, grid, rainfall.
Dev 2: training table, baseline, XGBoost, evaluation, model artifact.
Dev 3: risk grid, historical events, roads/assets.
Dev 4: report creation, media upload, report list.

**Exit:** real grid cells have model risk and the dashboard renders it.

### Hours 18–30 — Dynamic Risk + Explanation

Dev 1: rainfall windows, joins, quality.
Dev 2: dynamic model if defensible, otherwise transparent scoring; SHAP; risk state.
Dev 3: selected-zone panel and explanation.
Dev 4: verification + notification adapter.

**Exit:** selected zone can move through the demo risk states.

### Hours 30–42 — Citizen → Authority Loop

Connect report → API → PostGIS → dashboard → evidence → priority.

Add clustering only if stable. Add exposure and authority actions.

**Exit:** a judge can submit a report and immediately see it in the command center.

### Hours 42–54 — Alerting + Polish

Alert lifecycle, simulated SMS/in-app notification, human approval, CAP JSON if time permits, filters, trend panel and error states.

**Exit:** complete demo works start-to-finish.

### Hours 54–66 — Reliability

Test provider failure, invalid/duplicate reports, missing media, model failure, stale data and unauthorized actions. Add last-valid fallback, clear errors, audit events and demo reset.

### Hours 66–72 — Demo Freeze

No new features. Bug fixes, visual polish, performance, rehearsal, screenshots/video, pitch, backup dataset and local fallback only.

## 17. Demo Script

1. Show regional map.
2. Select a high-risk zone.
3. Show risk, confidence, rainfall, susceptibility and exposure.
4. Load the prepared worsening-rainfall scenario.
5. Risk transitions from WATCH/ELEVATED toward HIGH.
6. Submit citizen GPS + photo + category.
7. Show corroborating evidence rather than claiming the photo alone caused the alert.
8. Show exposed road/villages/assets.
9. Raise response priority.
10. Show AI recommendation → human approval.
11. Show simulated alert/CAP payload if implemented.
12. Close with: **“We don't just predict a landslide; we connect probabilistic risk with evidence, confidence, exposure and response priority.”**

## 18. Failure Strategy

- Live provider fails → last valid/preloaded observation + freshness indicator.
- Dynamic ML cannot be trained defensibly → susceptibility + transparent scoring.
- Image inference fails → photo remains evidence; continue human review.
- Mobile deployment fails → responsive PWA.
- Cloud fails → Docker Compose local demo.

## 19. AI Coding Agent Rules

Agents may implement services, UI, migrations, clients, tests, ingestion scripts and model wrappers.

Agents may **not** independently change schema semantics, risk-state definitions, model target, forecast horizon, API contracts, evidence semantics or security boundaries.

## 20. Repository Structure

```text
netra/
├── apps/authority-dashboard/
├── apps/citizen-app/
├── services/gateway/
├── services/risk-service/
├── services/report-service/
├── services/gis-service/
├── ml/data/
├── ml/training/
├── ml/evaluation/
├── ml/inference/
├── ml/models/
├── data-pipeline/raw/
├── data-pipeline/processed/
├── db/migrations/
├── contracts/openapi.yaml
├── infra/docker-compose.yml
└── docs/
```

## 21. Hackathon Definition of Done

The prototype is done when:

- selected NER areas load
- historical events display
- terrain features exist
- rainfall data exists
- at least one defensible model works
- risk grid renders
- selected zone is explainable
- citizen report can be submitted
- report appears on GIS
- exposure is visible
- authority can verify/acknowledge
- risk state changes through the demo scenario
- simulated alert is generated
- no single report independently triggers emergency action
- system runs from a clean setup
- demo works without fragile live external API dependencies

## 22. Final Rule

**The hackathon is successful if the thin slice is complete. It is not successful because every production box was implemented.**
