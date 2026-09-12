# NETRA — NER Landslide Early Warning & Decision-Support Platform
## Production Blueprint v2
### SIH 2026 → Pilot → Regional Rollout → Government-Integrated Production

> This is the production target architecture. It is **not** the SIH implementation checklist. See `HACKATHON_PLAN.md` for Phase 0.

## 1. Executive Summary

NETRA is a regional disaster-intelligence and decision-support platform for landslide risk in the North Eastern Region of India. It is not a single ML model and not an autonomous evacuation system.

The production platform fuses static geospatial susceptibility factors, historical landslide inventories, rainfall observations/forecasts/nowcasts, soil moisture, remote sensing, optional physical precursor signals such as SAR deformation, roads/villages/population/critical infrastructure, citizen and field observations, and data-quality/provenance signals.

It produces six operational layers: **susceptibility, dynamic hazard risk, evidence strength, model confidence/data quality, exposure/impact, and response priority**, followed by controlled alerts with human authority in the loop.

Core loop:

```text
Predict → Verify → Quantify Impact → Prioritize → Alert → Respond → Learn
```

NETRA complements existing GSI, ISRO, IMD and government capabilities rather than claiming to replace them.

## 2. Core Product Principles

### Separate susceptibility from dynamic trigger

- **Susceptibility:** How vulnerable is this location structurally?
- **Dynamic trigger:** Are current/forecast conditions pushing it toward failure?

Use separate models rather than forcing one model to answer both.

### Keep risk, confidence, evidence and impact separate

Every zone should expose:

- Hazard Risk
- Model Confidence
- Evidence Strength
- Data Quality
- Exposure / Impact
- Trend

Do not collapse them into one arbitrary score.

### Evidence fusion

No single citizen report, sensor stream, satellite observation, external API response or model output should independently trigger a high-severity public warning. Inputs are validated, assigned provenance/quality, and combined by a decision layer.

### Human authority

AI recommends and prioritizes. Authorized authorities approve high-severity operational actions.

### Graceful degradation

External sources can fail or become stale. Retain last valid observations, expose freshness/data-quality state, degrade confidence when critical inputs are missing, and continue serving precomputed/cached products. Never silently zero-fill missing values.

### No unsupported claims

Never claim arbitrary accuracy, exact failure-time prediction, guaranteed cloud-free optical monitoring, direct SACHET connectivity without authorization, or autonomous evacuation decisions.

## 3. Production Logical Architecture

```text
DATA SOURCES
  IMD weather / forecasts / nowcasts
  GSI + ISRO inventories
  DEM / geology / land use
  SMAP / soil observations
  Sentinel-1 / Sentinel-2
  Roads / population / infrastructure
  Citizen / field reports
  Sensors where available
          ↓
DATA TRUST GATE
  freshness / completeness / provenance / reliability
  spatial + temporal validation
          ↓
FEATURE / EARTH-OBSERVATION LAYER
  terrain + weather + soil + validated EO/change features
          ↓
┌──────────────────────────┬──────────────────────────┐
│ MODEL A                  │ MODEL B                  │
│ Static Susceptibility    │ Dynamic Trigger          │
│ XGBoost / LightGBM       │ XGBoost / LightGBM       │
└─────────────┬────────────┴──────────────┬───────────┘
              └──────────────┬─────────────┘
                             ↓
OBSERVATION / EVIDENCE LAYER
  citizen + field evidence
  vision evidence adapter
  SAR precursor engine
                             ↓
EVIDENCE + RISK ENGINE
  calibrated risk + confidence + evidence + data quality
                             ↓
RISK STATE MACHINE
  NORMAL → WATCH → ELEVATED → HIGH → CRITICAL
  with de-escalation
                             ↓
EXPOSURE ENGINE
  roads / villages / population / critical infrastructure / routes
                             ↓
RESPONSE PRIORITIZATION
  hazard + confidence + evidence + exposure + connectivity + urgency
                             ↓
┌───────────────────────────┬──────────────────────────┐
│ AUTHORITY COMMAND CENTER  │ ALERT / INTEGRATION      │
│ GIS + queues + actions    │ CAP + SMS/push adapters  │
└──────────────┬────────────┴──────────────┬───────────┘
               ↓                           ↓
        Field verification             Community
               └──────────────→ Ground truth → Learning
```

## 4. Data Architecture

### Core domains

`risk_cells`, `historical_landslides`, `rainfall_observations`, `weather_forecasts`, `terrain_features`, `soil_observations`, `remote_sensing_observations`, `precursor_observations`, `citizen_reports`, `field_reports`, `assets`, `roads`, `villages`, `alerts`, `risk_states`, `model_versions`, `feature_versions`, `data_quality_records`, `audit_logs`.

### Storage

**PostgreSQL + PostGIS** for spatial entities, grids, reports, predictions, alerts and audit metadata.

**S3-compatible object storage** for photographs, videos, large rasters, EO artifacts and model artifacts. Store metadata/URLs in the relational database, not large blobs.

### Immutable raw data

Raw source data is append-only/immutable. Derived data can be recomputed. Retain source ID, observation time, ingestion time, CRS, quality status, feature version and model version where applicable.

## 5. Earth Observation Strategy

Remote sensing is an **extensible observation layer**, not a mandatory dependency for every prediction.

### Sentinel-2

Use optical multispectral observations for vegetation indicators, land-cover context, spectral change and surface-change indicators. Represent cloud coverage in data quality.

### Sentinel-1

Use SAR as a complementary observation layer for deformation/movement and change detection, especially under monsoon conditions where optical observations can be obscured. A mature SAR/InSAR precursor engine answers:

> **Is this slope already behaving abnormally?**

This is distinct from Model B:

> **Are current environmental conditions becoming dangerous?**

### DEM/GIS

DEM-derived terrain factors remain fundamental: elevation, slope, aspect, curvature, wetness-related indices, drainage relationships and ruggedness. EO augments rather than replaces GIS/DEM terrain modelling.

## 6. ML Strategy

### Model A — Static Susceptibility

Benchmark Logistic Regression / Random Forest against XGBoost / LightGBM. Candidate features include slope, elevation, aspect, curvature, geology/lithology, land cover, historical event density and validated road/drainage relationships.

Output: calibrated susceptibility over the chosen spatial unit.

### Model B — Dynamic Trigger

Inputs can include Model A susceptibility, rainfall windows (1h/6h/24h/72h/7d), forecast rainfall, soil moisture and soil-moisture change. Start with tree ensembles. Add temporal/deep models only when data volume and temporal resolution justify them.

Output: probability of landslide occurrence over a defined forecast horizon.

### Vision Adapter

Vision is an **evidence-validation service**, not the primary landslide-risk model. Candidate classes: crack, landslide/soil movement, rockfall/debris, road deformation, seepage, other/uncertain. Low confidence becomes **Needs Review**, not automatic rejection.

Custom segmentation/richer models should wait until an adequately labeled dataset exists.

### Precursor Engine

Phase-2+ capability for Sentinel-1/SAR deformation, validated sensors and field observations. Treat precursor signals as observations/evidence rather than silently mixing them into the predictive target.

## 7. Training and Evaluation Discipline

Before training:

1. Define target.
2. Define spatial unit.
3. Define forecast horizon.
4. Define information available at prediction time.
5. Build labels and negative/control samples.

Then timestamp features, prevent future leakage, use spatial/temporal holdouts, benchmark simple models, train tree ensembles, calibrate probabilities, evaluate on untouched data, use SHAP and version data/features/models.

Metrics:

- Precision, Recall, F1
- PR-AUC, ROC-AUC where meaningful
- Brier score and calibration/reliability
- lead time
- false-alarm rate
- missed-event rate
- alert burden
- human-verification rate

Rare-event systems should not optimize raw accuracy alone.

## 8. Risk and Evidence Decision Layer

Avoid `risk > 80 → alert`. Use a stateful risk engine:

```text
NORMAL → WATCH → ELEVATED → HIGH → CRITICAL
```

States can de-escalate. The decision layer considers calibrated hazard risk, model confidence, data quality, independent evidence, corroboration, exposure and urgency. Exact thresholds/fusion logic must be calibrated before safety-critical use.

## 9. Citizen and Field Evidence

Reports may contain photo/video, GPS/PIN, timestamp, category, description, road condition, cracks, seepage, debris and slope movement.

Evidence weighting can consider field officer, verified sensor, validated precursor, previously verified citizen and new citizen. Repeated false reports reduce trust.

Prefer spatial/temporal corroboration over a fixed “N reports required” rule. Preserve rejected reports for authorized review and audit.

## 10. Exposure and Response

The exposure engine identifies roads, villages, population, hospitals, schools, power, communications, critical facilities and route connectivity where data supports it.

Response priority ranks incidents for limited field resources. It does not replace authority judgment.

## 11. Authority Command Center

The dashboard should answer:

**Where?** Risk heatmap + events + reports + assets.

**Why?** Risk, confidence, evidence, data quality, trend, rainfall/soil context and model factors.

**What first?** Critical zones, reports awaiting verification, active alerts, exposed assets and connectivity impact.

2D GIS is sufficient; 3D is optional.

## 12. Citizen / Field Application

Production requirements: local risk view, rapid reporting, GPS/PIN, media, status, alerts, history, offline-first capture, queued synchronization and conflict handling. Field officers additionally receive assigned incidents, navigation, inspection forms, confirm/deny, severity and resolution workflows.

Verified outcomes become ground truth for future model improvement.

## 13. Alerting and Government Integration

Alert lifecycle:

```text
CREATED → SHOWN/SENT → ACTIVE → UPDATED → RESOLVED
```

Key alerts by zone + event type to prevent duplicates.

Generate CAP-compatible payloads through an adapter. Design toward the authorized government dissemination ecosystem; do not claim direct SACHET production connectivity without onboarding/API access.

Use staged escalation: monitoring → human verification → high-priority escalation. Emergency messages should use verified fixed templates, not unconstrained generative text.

## 14. Technology Architecture

- **Frontend:** React + TypeScript + Tailwind; MapLibre GL JS or Leaflet.
- **Gateway/BFF:** Node.js + Express + TypeScript for auth, validation, rate limiting, request IDs, routing and aggregation.
- **ML/geospatial:** Python + FastAPI; scikit-learn, XGBoost, LightGBM, SHAP, GeoPandas, Rasterio/GDAL.
- **Database:** PostgreSQL + PostGIS.
- **Object storage:** S3-compatible.
- **Mobile:** React Native + Expo.
- **Deployment:** containerized stateless services, externalized config, portable storage. Kubernetes is not a day-one requirement.
- Event-driven messaging can be introduced later when scale justifies it.

## 15. Security, Privacy and Auditability

Treat all external input as untrusted. Production requirements include RBAC, authority-only layers, secure authentication, validation, upload restrictions, audit logs, model/version provenance, alert/manual-override history, contributor privacy and rate limiting.

AI-manipulated-media detection is supporting evidence, never an authenticity oracle.

## 16. Production Scaling

```text
Entire NER
  ↓
Coarse screening
  ↓
High-risk regions
  ↓
Detailed processing
  ↓
Critical zones
  ↓
Satellite / sensor / field verification
```

Prefer scheduled ingestion and precomputed risk products over per-request external calls. Continue serving last-valid data with an explicit freshness/degradation state.

## 17. Phased Roadmap

### Phase 0 — SIH Prototype

Defined separately in `HACKATHON_PLAN.md`.

### Phase 1 — Pilot

Real weather integration; selected high-risk NER districts; field-officer app; hardened offline sync; initial SAR precursor experiments; held-out calibration; district-authority feedback.

### Phase 2 — Regional Rollout

NER-wide coverage; available sensors; mature SAR pipeline; formal CAP generation; security/audit hardening; verified multilingual templates.

### Phase 3 — Production / Government Integration

Authorized government onboarding; continuous retraining/drift monitoring; full RBAC/audit compliance; multi-state scaling; field-validation and operational governance.

## 18. Production Definition of Done

A release requires traceable inventory, reproducible and leakage-free model evaluation, calibrated or explicitly uncalibrated probabilities, explanations, spatial risk products, reliable report synchronization, source freshness/data-quality tracking, alert lifecycle, provenance/model versioning, access control, auditability, graceful source failure, versioned APIs, monitoring and a documented human-approval policy validated with domain/government stakeholders before safety-critical use.

## 19. Major Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Insufficient NER labels | Regional/national transfer framing; transparent fallback; field-validation program |
| Rainfall-only false alarms | Combine susceptibility, dynamic state, soil/evidence |
| Citizen spam | Trust + corroboration + clustering |
| External outage | Scheduled ingestion + last valid observation + quality state |
| Leakage | Strict spatial/temporal splits |
| Model drift | Monitor → validate → retrain → deploy |
| EO limitations | Treat EO as complementary; track freshness |
| Safety-critical automation | Human governance + staged escalation |

## 20. Non-Negotiable Claims

Do not say “99% accurate”, “exact failure time”, “one citizen report triggers evacuation”, “AI independently orders evacuation”, “real-time Sentinel-2 through heavy cloud”, or “we are directly connected to SACHET” unless demonstrably true.

Use:

> “We provide probabilistic risk estimation over defined forecast horizons.”

> “Remote sensing provides complementary observations.”

> “Citizen observations are evidence requiring corroboration.”

> “The AI recommends; authorized authorities decide.”

> “NETRA complements existing government capabilities.”

## 21. Architectural Decisions to Freeze

Before implementation, freeze: canonical spatial unit; initial forecast horizon; API version; DB schema; feature schema; model I/O contract; risk-state definitions; alert lifecycle; evidence semantics; and service ownership.
