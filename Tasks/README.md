# GARUD DRISHTI — Parallel Development Task Pack

## Purpose

This task pack is written against the **current repository state described in the project README**, not against an ideal future architecture.

The active implementation team is now:

| Developer | Ownership |
|---|---|
| **Tejasvi** | Data ingestion + ML model |
| **Yashwanth** | API gateway + backend + integration |
| **Debarshi** | Complete authority web UI |
| **Taarun** | Citizen mobile app |

Sudha and Sohum are not part of the active implementation plan.

## Current repository baseline

The repository already defines the following structure:

```text
garud-drishti/
├── apps/
│   ├── authority-web/
│   └── citizen-mobile/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api/
│       ├── auth/
│       ├── risk/
│       ├── gis/
│       ├── reports/
│       ├── alerts/
│       ├── chatbot/
│       ├── providers/
│       └── jobs/
├── ml/
│   ├── preprocessing/
│   ├── feature_engineering/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── explainability/
├── configs/
│   ├── susceptibility.yaml
│   ├── dynamic_risk.yaml
│   └── feature_schema.yaml
├── data/
│   ├── raw/
│   ├── processed/
│   └── final/
├── models/
│   ├── susceptibility/
│   └── dynamic_risk/
├── infrastructure/
└── tests/
```

The README currently specifies a FastAPI backend, XGBoost/SHAP ML stack, GeoPandas/Rasterio/GDAL/PostGIS geospatial stack, React/TypeScript/MapLibre for authority UI, and React Native/TypeScript for the citizen app. fileciteturn7file0L123-L145

The repository README also identifies the core P0 features as AI risk prediction, GIS heatmap, authority dashboard, alerts, citizen reporting, live data ingestion, risk fusion/response priority, and backend API/database. fileciteturn7file0L265-L289

## Important scientific rules

All developers must follow the project's existing scientific/governance rules:

1. **Never fabricate data.**
2. **Never claim absolute certainty.**
3. **Prevent temporal and spatial data leakage.**
4. Keep `data/raw/` immutable.
5. Use spatial validation/holdout regions where model validation is performed.

These principles are explicitly defined in the current README. fileciteturn7file0L391-L403

## Parallel development rule

Each developer works on their own branch:

```text
main
├── feature/tejasvi-data-ml
├── feature/taarun-mobile
├── feature/debarshi-authority-ui
└── feature/yashwanth-backend-integration
```

Do **not** modify another developer's owned application/module unless explicitly coordinated.

### Shared integration boundary

The main integration boundary is the API.

- Tejasvi produces model/data artifacts and a stable inference interface.
- Yashwanth exposes those capabilities through FastAPI.
- Debarshi consumes the API for the authority dashboard.
- Taarun consumes the API for citizen reporting/status.

Until Yashwanth's real API is available, Debarshi and Taarun should use local mock services that reproduce the exact agreed response shapes.

## Definition of Done

A task is not complete merely because code exists.

For every task:

- Code is placed in the correct repository path.
- Existing conventions are followed.
- The feature can be run locally.
- No fake scientific claims are introduced.
- Errors and missing data are handled explicitly.
- A focused test or reproducible verification step exists where practical.
- README/docs are updated only when the behavior actually changes.
- Commit messages clearly identify the completed task.

## Dependency strategy

The team should not wait for the entire system to finish.

### Tejasvi → Yashwanth

Tejasvi's first integration deliverable should be a reproducible model/inference package with:

- exact feature names
- expected units
- required vs optional features
- model artifact location
- model version
- risk score semantics
- risk-band thresholds if defined
- missing-data behavior
- example input/output

### Yashwanth → Debarshi/Taarun

Yashwanth should publish stable API contracts early, even if the implementation initially returns controlled mock/demo data.

### Debarshi/Taarun

Frontend/mobile development must not wait for the ML model. Use deterministic mock JSON matching the backend contract, then replace the transport layer when the real API is available.

## Priority

### P0 — Must work for the hackathon demo

```text
Real/defensible data
→ feature pipeline
→ model
→ risk grid
→ PostGIS
→ FastAPI
→ authority map
```

plus:

```text
Citizen report
→ API
→ authority review
```

### P0.5 — Strong differentiator

```text
Risk
+ Evidence
+ Exposure
→ Response Priority
→ Human approval
→ Simulated alert
```

### P1 — Add if the core vertical slice is stable

- SHAP explanations
- risk trends
- report clustering
- offline mobile queue
- simulated alert delivery
- stronger state transitions

### P2 — Never block the demo

- live Sentinel processing
- InSAR
- custom computer vision
- real IoT
- real SACHET integration
- Kafka/RabbitMQ/Kubernetes
- chatbot
- complex streaming infrastructure

## Integration checkpoints

### Checkpoint 1
Tejasvi has a reproducible dataset/model artifact.

### Checkpoint 2
Yashwanth can return a real risk response from FastAPI.

### Checkpoint 3
Debarshi displays real risk data on the map.

### Checkpoint 4
Taarun submits a real citizen report through the API.

### Checkpoint 5
Authority can review a report and see risk + evidence + exposure.

### Checkpoint 6
The system can demonstrate a human-approved simulated alert.

The goal is not to finish every folder in the repository. The goal is to produce one coherent, defensible end-to-end disaster-intelligence workflow.
