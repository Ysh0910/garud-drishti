# AGENTS.md — AI Development Guide
## AI-Based Early Warning and Landslide Risk Monitoring System for NER

This document is the development contract for AI coding agents and developers working on the project.

## 1. Mission

Build a reliable, explainable, reproducible geospatial AI platform for landslide early warning across the North Eastern Region of India.

Core flow:

```text
SENSE → ANALYSE → PREDICT → VISUALISE → WARN → PRIORITISE → RESPOND
```

The system combines historical landslides, terrain, geology, rainfall, soil moisture, satellite observations, citizen reports, GIS exposure layers and AI/ML.

It is a decision-support and early-warning system, **not a deterministic landslide oracle** and not an autonomous emergency-declaration system.

---

# 2. Non-Negotiable Rules

## Never fabricate data

Never invent:

- landslide records
- rainfall/sensor readings
- satellite detections
- API responses
- model metrics
- risk probabilities
- government warnings
- coordinates

If mock data is required, label it explicitly as `mock`, `synthetic`, or `simulation`, and prevent it from entering production training data.

## Never claim certainty

Use:

> Elevated landslide risk is estimated within the next 24 hours.

Do not use:

> A landslide will definitely happen tomorrow.

## Prevent leakage

Only information available at or before prediction time may be a predictor.

Never use post-event:

- final landslide dimensions
- runout
- damage
- road blockage caused by the event
- post-event satellite observations
- verification information
- future observed rainfall

## Preserve raw data

Never overwrite:

```text
data/raw/
```

Use:

```text
data/raw/
data/processed/
data/final/
```

## Reproducibility

Every feature must be traceable to:

```text
source
timestamp
units
CRS
processing version
```

---

# 3. AI Architecture

```text
STATIC / SLOW FEATURES
        ↓
XGBoost #1
Susceptibility
        ↓
Base susceptibility
        +
Rainfall
Soil moisture
Satellite features
Field evidence
        ↓
XGBoost #2
Dynamic Risk
        ↓
Current / 6h / 24h / 48h / 72h
        ↓
Risk Engine
        ↓
GIS + Alerts + Dashboard + Citizen App
```

## Model 1 — Susceptibility

Answers:

> How inherently susceptible is this location?

Core features:

```text
elevation_m
slope_deg
aspect_deg
curvature
landcover
geology
geomorphology
hydrological_condition
distance_to_drainage_m
historical_ls_density
distance_to_historical_ls_m
```

Potential additions:

```text
roughness
local_relief
TWI
distance_to_fault
distance_to_road_cut
soil_class
lithology
```

Do not add a feature merely because it exists. Document its physical/geoscientific rationale.

Output may be a probability internally:

```text
p ∈ [0,1]
```

The UI may display:

```text
base_susceptibility = 100 × p
```

Do not call this a percentage probability unless calibrated and explicitly defined as such.

## Model 2 — Dynamic Risk

Answers:

> Given current conditions, how elevated is landslide risk?

Core inputs:

```text
base_susceptibility
rainfall_1h_mm
rainfall_3h_mm
rainfall_6h_mm
rainfall_12h_mm
rainfall_24h_mm
rainfall_72h_mm
rainfall_7d_mm
soil_moisture
```

Potential forecast inputs:

```text
forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm
```

Advanced inputs:

```text
satellite_change_score
deformation_score
validated_field_report_score
```

---

# 4. Prediction Horizons

Support:

```text
CURRENT
NEXT 6 HOURS
NEXT 24 HOURS
NEXT 48 HOURS
NEXT 72 HOURS
```

Example:

```json
{
  "current_risk": 82,
  "risk_6h": 78,
  "risk_24h": 91,
  "risk_48h": 94,
  "risk_72h": 81
}
```

These are risk estimates, not guarantees.

Future forecasts become more uncertain as the horizon increases.

---

# 5. Historical Forecast Rule

Do not train future-horizon models using information that would not have been available at prediction time.

Correct:

```text
Prediction time T
      ↓
Forecast available at T
      ↓
Forecast rain T→T+24h
      ↓
Observed event after T
```

If archived historical forecasts are unavailable:

1. Train the initial model using observed antecedent rainfall.
2. Document the limitation.
3. Never fabricate forecast values.
4. Add forecast-based training when valid archives become available.

---

# 6. Dataset 1 Contract

File:

```text
data/final/susceptibility_dataset.csv
```

Columns:

```text
sample_id
latitude
longitude
state
district
elevation_m
slope_deg
aspect_deg
curvature
landcover
geology
geomorphology
hydrological_condition
distance_to_drainage_m
historical_ls_density
distance_to_historical_ls_m
label
```

```text
label = 1 → landslide
label = 0 → control/non-landslide sample
```

Dataset 1 should represent static/slow susceptibility and should not contain current rainfall triggers.

---

# 7. Dataset 2 Contract

File:

```text
data/final/dynamic_risk_dataset.csv
```

Recommended:

```text
sample_id
latitude
longitude
timestamp
base_susceptibility

rainfall_1h_mm
rainfall_3h_mm
rainfall_6h_mm
rainfall_12h_mm
rainfall_24h_mm
rainfall_72h_mm
rainfall_7d_mm

soil_moisture

forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm

landslide_within_6h
landslide_within_24h
landslide_within_48h
landslide_within_72h
```

Targets are generated relative to the prediction timestamp.

For timestamp `T`:

```text
within_6h  → event in (T, T+6h]
within_24h → event in (T, T+24h]
within_48h → event in (T, T+48h]
within_72h → event in (T, T+72h]
```

Spatial matching rules must be documented.

---

# 8. Data Sources

## GSI

Primary historical/field-validated inventory where appropriate:

```text
https://bhusanket.gsi.gov.in/
```

## ISRO / NRSC

Secondary inventory and validation:

```text
https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html
```

Do not blindly merge GSI and ISRO because methodologies may differ.

## IMD

Weather, rainfall and forecasts:

```text
https://api.imd.gov.in/public/api_reference.html
```

Historical rainfall:

```text
https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html
```

## NASA GPM IMERG

Satellite precipitation:

```text
https://gpm.nasa.gov/data/directory
```

Use near-real-time products for operational rainfall support and historical products for training.

## NASA SMAP

Soil moisture:

```text
https://nsidc.org/data/smap/data
```

Treat satellite soil moisture as a regional wetness indicator, especially in mountainous terrain.

## SRTM / USGS

DEM:

```text
https://earthexplorer.usgs.gov/
```

Derive:

```text
elevation
slope
aspect
curvature
roughness
relief
```

## Copernicus Sentinel

```text
https://dataspace.copernicus.eu/
```

Sentinel-2:

- land cover
- vegetation
- surface disturbance

Sentinel-1:

- SAR
- deformation/change detection
- cloud-independent observations

---

# 9. Satellite Update Strategy

Monthly satellite updating is feasible for slowly changing features.

Recommended:

```text
Sentinel
   ↓
Scheduled ingestion
   ↓
Quality filtering
   ↓
Feature extraction
   ↓
Feature store/PostGIS
   ↓
Susceptibility inference
```

Do not retrain the model merely because satellite features were updated.

Separate:

```text
feature update
```

from:

```text
model retraining
```

Static terrain such as elevation/slope does not need monthly recomputation.

For Sentinel-2, handle cloud contamination and missing scenes explicitly.

For Sentinel-1, advanced deformation processing is a later phase.

---

# 10. Rainfall Feature Engineering

Required rolling windows:

```text
1h
3h
6h
12h
24h
72h
7d
```

Definitions must be explicit.

Example:

```text
rainfall_24h =
sum of valid rainfall observations during the
24 hours immediately preceding prediction time
```

Never include future observations.

Never turn unavailable rainfall into zero.

---

# 11. Missing Data

Distinguish:

```text
rainfall = 0
```

from:

```text
rainfall = unavailable
```

Store:

```text
value
source
observed_at
quality
stale
```

Example:

```json
{
  "rainfall_24h_mm": 142.3,
  "source": "IMD",
  "observed_at": "...",
  "stale": false,
  "quality": "valid"
}
```

External-provider failure must not silently become a zero measurement.

---

# 12. Coordinates and CRS

Default geographic storage:

```text
WGS84 / EPSG:4326
```

Use an appropriate projected CRS for:

- distances
- areas
- spatial measurements

Never calculate kilometre distances directly from degree differences.

---

# 13. Negative Samples

GSI/ISRO inventories provide positive events, but controls are required.

Controls should:

- remain within NER
- be environmentally comparable
- avoid known landslide locations where appropriate
- use documented spatial/temporal sampling rules

Important:

> Absence from an inventory does not prove absence of a landslide.

Record the control-generation method and version.

---

# 14. Validation

Never rely only on a random train/test split.

Prefer:

```text
spatial block split
district holdout
state holdout where feasible
temporal holdout
event-based holdout
```

Reason:

Nearby points are correlated and can create spatial leakage.

Metrics:

```text
ROC-AUC
PR-AUC
Precision
Recall
F1
Confusion Matrix
Brier Score
Calibration
False Alarm Rate
Missed Event Rate
```

Early-warning evaluation should pay particular attention to missed events while controlling false alarms.

---

# 15. Class Imbalance

Evaluate:

```text
class weights
scale_pos_weight
careful sampling
PR-AUC
threshold optimization
```

Resampling must occur only inside training data.

Never oversample the test set or allow test examples to leak into training.

---

# 16. SHAP

Use SHAP for model explanations.

Example:

```text
Risk = HIGH

Major model contributors:
+ High 72h rainfall
+ High base susceptibility
+ High soil moisture
+ Steep slope
```

SHAP explains model contribution, not physical causality.

Do not present SHAP as proof that a variable physically caused a landslide.

---

# 17. Risk Bands

Initial UI bands:

```text
0–20     VERY LOW
21–40    LOW
41–60    MODERATE
61–80    HIGH
81–100   CRITICAL
```

These thresholds are configurable and must ultimately be validated.

Do not equate a score of 91 with 91% probability without calibration.

---

# 18. Risk vs Exposure

Hazard risk is not the same as impact.

Example:

```text
Zone A:
Risk = 95
No nearby infrastructure

Zone B:
Risk = 85
Major road + village + hospital nearby
```

Zone B may deserve greater response priority.

Use an exposure/priority layer containing:

```text
population
road importance
hospital proximity
school proximity
critical infrastructure
connectivity
```

Keep this layer conceptually separate from hazard prediction.

---

# 19. GIS Heatmap

Recommended implementation:

```text
NER
 ↓
Spatial grid
 ↓
Static feature extraction
 ↓
Model 1
 ↓
Base susceptibility
 ↓
Dynamic feature update
 ↓
Model 2
 ↓
Current/forecast risk
 ↓
PostGIS
 ↓
Map layer
```

Each grid cell may contain:

```text
cell_id
geometry
base_susceptibility
current_risk
risk_6h
risk_24h
risk_48h
risk_72h
updated_at
```

For large maps, use vector tiles/raster tiles rather than sending huge GeoJSON payloads.

Map layers:

```text
base map
susceptibility
current risk
6h risk
24h risk
48h risk
72h risk
landslide inventory
roads
villages
rivers
rainfall
soil moisture
satellite change
citizen reports
```

Risk should not rely on color alone; provide labels/tooltips.

---

# 20. Authority Dashboard

The dashboard must answer:

```text
WHERE is the risk?
WHY is it high?
WHEN may it increase?
WHAT is exposed?
WHAT has been reported?
WHAT should be prioritized?
```

Recommended sections:

### KPI cards

```text
Critical zones
High-risk zones
Active alerts
Affected roads
Villages at risk
New reports
```

### Live map

Filters:

```text
state
district
risk level
time horizon
road risk
incident status
data freshness
```

### Forecast panel

```text
Current       76 HIGH
6h            81 CRITICAL
24h           93 CRITICAL
48h           88 CRITICAL
72h           71 HIGH
```

### Explanation panel

Show major SHAP/model drivers and data-quality state.

### Exposure panel

Show roads, villages, hospitals, schools and critical infrastructure.

### Incident panel

```text
New
Pending
Verified
Rejected
Resolved
```

### Alert center

Show:

```text
severity
area
created_at
recipients
delivery status
current state
```

---

# 21. Road Risk

Road segments should have:

```text
risk
rainfall
nearby landslides
nearby verified reports
connectivity status
```

Authorities can use this for inspection and prioritization.

Do not automatically close a road solely from an ML prediction unless an authorized operational policy explicitly permits it.

---

# 22. Village Exposure

Recommended fields:

```text
village
population
current_risk
risk_24h
nearest_high_risk_zone
road_access
```

Use authoritative population/exposure sources in production.

---

# 23. Citizen Reports

Report fields:

```text
report_id
location
timestamp
category
description
photo
video
severity
status
```

Categories:

```text
LANDSLIDE
CRACK
ROCKFALL
ROAD_BLOCKAGE
SOIL_MOVEMENT
EROSION
FLOODING
OTHER
```

Citizen reports are not automatically ground truth.

Workflow:

```text
Citizen
 ↓
Report
 ↓
Spam/duplicate detection
 ↓
AI pre-screen
 ↓
Authority/field verification
 ↓
Verified
 ↓
Situational evidence
```

Only validated/quality-controlled reports should enter model training.

---

# 24. Image AI

Future image model:

```text
CNN / Vision Transformer
```

Possible classes:

```text
landslide
crack
erosion
rockfall
blocked_road
flooding
normal
```

Output example:

```json
{
  "class": "crack",
  "score": 0.91
}
```

This is evidence, not an emergency declaration.

---

# 25. Chatbot

The chatbot is a retrieval/explanation interface.

It must call backend APIs for actual values.

```text
User
 ↓
Chatbot
 ↓
Risk API
Forecast API
Alert API
Road API
Report API
Safety information
```

For:

> What is my nearby risk?

The chatbot should retrieve the real risk result and explain it.

It must never invent:

- risk values
- rainfall
- alerts
- evacuation orders
- sensor readings

It must distinguish current risk from forecast risk.

---

# 26. Authority Authentication

Recommended roles:

```text
SUPER_ADMIN
DISTRICT_ADMIN
DISASTER_MANAGEMENT_OFFICER
FIELD_OFFICER
ANALYST
VIEW_ONLY
```

Use RBAC.

Example:

```text
SUPER_ADMIN
→ all functions

DISTRICT_ADMIN
→ district data + alerts

FIELD_OFFICER
→ reports + assigned areas

ANALYST
→ data/model functions

VIEW_ONLY
→ read-only
```

---

# 27. Alert Engine

Flow:

```text
Risk updated
 ↓
Evaluate thresholds
 ↓
Check exposure
 ↓
Check previous alert state
 ↓
Create/update/escalate
 ↓
Send notification
```

Example:

```text
IF current_risk >= threshold
THEN create alert
```

Early-warning example:

```text
IF current_risk < critical
AND risk_24h >= critical
THEN early warning
```

Use configurable thresholds.

---

# 28. Alert Deduplication

Use states:

```text
ALERT_CREATED
ALERT_SENT
ALERT_ACTIVE
ALERT_ESCALATED
ALERT_RESOLVED
```

Example:

```text
Risk 83 → send
Risk 84 → no duplicate
Risk 95 → escalate
Risk 55 → resolve
```

Development environments must never send real emergency SMS accidentally.

---

# 29. SMS

For SIH, investigate government Mobile Seva:

```text
https://services.mgov.gov.in/
```

Do not assume unlimited free SMS.

Production disaster alerts require the appropriate authorized government process and communication infrastructure.

Use mock SMS in development:

```text
SMS_MODE=mock
```

---

# 30. Multilingual Alerts

Use approved templates.

```text
Risk event
 ↓
Approved alert template
 ↓
Language selection
 ↓
SMS / app / push
```

Do not use unrestricted generated text for critical warning content.

---

# 31. Database

Recommended:

```text
PostgreSQL + PostGIS
```

Tables:

```text
users
roles
permissions

landslide_inventory
terrain_features
risk_cells
dynamic_observations

roads
villages
infrastructure

citizen_reports
report_media

alerts
alert_recipients
alert_delivery_log

weather_observations
rainfall_observations
soil_moisture_observations
satellite_observations

model_versions
prediction_logs
```

---

# 32. Backend API

Suggested:

```http
GET /api/v1/risk/{latitude}/{longitude}
GET /api/v1/risk/grid
GET /api/v1/risk/forecast/{zone_id}

POST /api/v1/reports
GET /api/v1/reports
GET /api/v1/reports/{report_id}

GET /api/v1/alerts
POST /api/v1/alerts

GET /api/v1/roads/risk
GET /api/v1/villages/risk
GET /api/v1/dashboard/summary
```

Risk response:

```json
{
  "base_susceptibility": 82,
  "current_risk": 91,
  "risk_level": "CRITICAL",
  "risk_6h": 88,
  "risk_24h": 94,
  "risk_48h": 91,
  "risk_72h": 79,
  "updated_at": "..."
}
```

---

# 33. Live Data Architecture

Never make a user request call every external provider.

Use scheduled ingestion:

```text
IMD ─────┐
GPM ─────┤
SMAP ────┤
Sentinel ┤
          ↓
Data ingestion
          ↓
Quality checks
          ↓
Feature store
          ↓
PostGIS
          ↓
Risk engine
```

User request:

```text
Frontend
 ↓
FastAPI
 ↓
Feature store/PostGIS
 ↓
XGBoost
```

---

# 34. Provider Abstraction

Use adapters/interfaces:

```text
providers/
├── imd.py
├── gpm.py
├── smap.py
├── sentinel.py
└── mock.py
```

Application code should depend on provider interfaces, not hard-coded vendor behavior.

Every provider should support:

```text
timeout
retry
quality
timestamp
source
error handling
```

---

# 35. API Failure Handling

If IMD fails:

```text
Use latest valid data where scientifically acceptable
+
mark data stale
+
degrade quality indicator
```

If GPM fails:

```text
Use another valid rainfall source if available
+
mark missing source
```

Never silently treat missing data as zero.

---

# 36. Data Freshness

Track:

```text
source_timestamp
ingestion_timestamp
processing_timestamp
```

HTTP success does not mean the observation is current.

---

# 37. Model Versioning

Every deployed model must have:

```text
model_id
model_version
dataset_version
feature_schema_version
training_timestamp
code_version
validation_method
metrics
thresholds
```

Example:

```text
dynamic_xgb_v1.0
dataset: dynamic_v3
feature_schema: schema_2
```

Never overwrite production models without versioning.

---

# 38. Prediction Logging

Where appropriate, store:

```text
prediction_id
timestamp
latitude
longitude
model_version
base_susceptibility
current_risk
risk_6h
risk_24h
risk_48h
risk_72h
data_quality
```

Avoid unnecessary personal information.

---

# 39. Feature Schema

Training and inference must use identical definitions.

Maintain:

```text
configs/feature_schema.yaml
```

Every feature needs:

```text
name
unit
source
definition
transformation
missing-value policy
```

---

# 40. Training Code Organization

Recommended:

```text
ml/
├── preprocessing/
├── feature_engineering/
├── training/
├── evaluation/
├── inference/
└── explainability/
```

Training should be runnable from scripts rather than only notebooks.

Notebooks are for exploration; production logic belongs in modules.

---

# 41. Configuration

Do not scatter hyperparameters throughout code.

Use configuration files:

```text
configs/
├── susceptibility.yaml
├── dynamic_risk.yaml
└── feature_schema.yaml
```

Example:

```yaml
model:
  algorithm: xgboost
  n_estimators: 500
  max_depth: 6
  learning_rate: 0.05
  subsample: 0.8
  colsample_bytree: 0.8
```

Do not claim these values are optimal without validation.

---

# 42. Inference

Load models once at application startup where practical.

```text
Application startup
 ↓
Load model
 ↓
Keep in memory
 ↓
Serve predictions
```

Before prediction:

```text
validate schema
validate ranges
check missingness
check staleness
validate coordinates
```

---

# 43. Risk Grid Performance

For regional maps:

```text
scheduled batch prediction
+
cached risk grid
```

rather than recomputing the whole region for every user.

Use:

- vector tiles
- raster tiles
- spatial indexes
- bounding-box queries
- zoom-dependent resolution

---

# 44. Scheduled Jobs

Potential jobs:

```text
ingest_imd
ingest_gpm
ingest_smap
ingest_sentinel
update_features
update_risk_grid
evaluate_alerts
model_monitoring
cleanup_cache
```

The exact schedule must respect each provider's update/latency characteristics.

---

# 45. Cloud Architecture

Conceptual:

```text
Internet
   ↓
Load Balancer
   ↓
FastAPI
   ├── PostgreSQL/PostGIS
   ├── Redis
   ├── Object Storage
   └── Risk Engine
            ↓
         XGBoost
```

Use object storage for large:

- photos
- videos
- satellite files
- rasters

Do not store large media blobs directly in PostgreSQL unless there is a deliberate reason.

---

# 46. Security

Minimum:

- HTTPS
- secure password hashing
- JWT/OAuth2 as appropriate
- RBAC
- input validation
- rate limiting
- secure file uploads
- private object storage
- audit logging
- database backups
- secret management

Never commit:

```text
API keys
database passwords
SMS credentials
JWT secrets
cloud credentials
.env with secrets
```

---

# 47. Citizen Privacy

Location and uploaded media can be sensitive.

Use:

- explicit location permission
- minimal retention
- access control
- aggregation where appropriate
- private media storage

Do not expose exact citizen locations publicly without a legitimate need.

---

# 48. File Upload Security

For photos/videos:

- file-size limits
- MIME validation
- extension validation
- server-side filenames
- malware scanning where available
- private storage
- no executable uploads

Never trust user-supplied filenames.

---

# 49. Environment Separation

Use:

```text
development
staging
production
```

Separate:

- credentials
- databases
- storage
- API keys
- SMS configuration

Development:

```text
SMS_MODE=mock
```

must prevent real alert delivery.

---

# 50. Testing

## Unit tests

Test:

- rainfall aggregation
- target generation
- feature calculations
- coordinate validation
- risk bands
- alert rules

## Integration tests

Test:

```text
API → database → model → response
```

## Data tests

Test:

```text
duplicates
missing values
invalid coordinates
date inconsistencies
spatial joins
```

## Model tests

Test:

```text
model loading
feature schema
prediction range
output structure
```

---

# 51. Monitoring

Monitor:

```text
API latency
prediction latency
ingestion success rate
stale data rate
alert delivery success
prediction distributions
data drift
```

Data drift should trigger investigation, not automatic claims that the model is wrong.

---

# 52. Retraining

Separate:

```text
monthly satellite feature update
```

from:

```text
model retraining
```

Retraining should happen after new validated events accumulate or when monitoring shows a justified need.

Workflow:

```text
new validated data
 ↓
rebuild dataset
 ↓
validate
 ↓
train
 ↓
compare against current model
 ↓
approve
 ↓
deploy version
```

---

# 53. AI Agent Coding Rules

Before changing code:

1. Inspect repository structure.
2. Identify affected modules.
3. Read existing tests.
4. Check data/model contracts.
5. Preserve public interfaces unless change is intentional.

During implementation:

1. Make the smallest coherent change.
2. Reuse existing utilities.
3. Add validation.
4. Add tests.
5. Update documentation.

After implementation:

1. Run tests.
2. Run lint/type checks where configured.
3. Check feature schemas.
4. Review changed files.
5. Document assumptions and limitations.

Never remove validation merely to make tests pass.

---

# 54. AI Agent Must Not

Never:

```text
invent API endpoints
invent API responses
invent dataset columns
invent model metrics
invent satellite values
invent government alerts
invent risk probabilities
```

When uncertain:

```text
TODO: verify official documentation
```

When credentials are unavailable:

```text
Use provider abstraction + mock provider.
```

---

# 55. Git Rules

Do commit:

```text
source code
tests
documentation
safe configuration
small example data
```

Do not commit:

```text
API secrets
credentials
large raw satellite datasets
private citizen media
database dumps
large temporary files
```

Use object storage/Git LFS where appropriate.

---

# 56. Documentation Rules

Every important AI feature must document:

```text
Purpose
Input
Output
Source
Units
Timestamp semantics
CRS
Missing-data behavior
Validation
Known limitations
```

Every model needs:

```text
model card
dataset version
feature schema
validation method
metrics
limitations
intended use
```

---

# 57. Model Card Requirements

Example:

```text
Model:
dynamic_xgb_v1

Purpose:
Regional landslide risk screening.

Training data:
dynamic_dataset_vX

Target:
landslide within defined forecast window.

Validation:
spatial/temporal holdout.

Known limitations:
inventory incompleteness,
forecast uncertainty,
satellite spatial resolution,
mountainous-terrain retrieval limitations.

Not intended for:
guaranteed prediction of an individual slope failure.
```

---

# 58. Team Responsibilities

## ML Engineer

- Dataset generation
- Feature engineering
- XGBoost
- Validation
- SHAP
- Model versioning

## GIS/Data Engineer

- GSI/ISRO
- DEM processing
- raster processing
- PostGIS
- risk grid
- heatmap

## Backend Engineer

- FastAPI
- database
- authentication
- provider adapters
- risk APIs
- alerts

## Frontend Engineer

- citizen app
- authority dashboard
- GIS map
- charts
- report UI

## Integration/Cloud Engineer

- external APIs
- storage
- deployment
- monitoring
- SMS
- CI/CD

---

# 59. Recommended MVP

Must have:

```text
✓ GSI historical inventory
✓ SRTM terrain
✓ Dataset 1
✓ XGBoost susceptibility
✓ Historical rainfall
✓ Dataset 2
✓ XGBoost dynamic risk
✓ GIS heatmap
✓ Current + 24h risk
✓ Authority dashboard
✓ Citizen reporting
✓ Authentication
✓ Alert engine
✓ Demonstration notification/SMS
```

Advanced:

```text
6/48/72h forecasting
GPM
SMAP
Sentinel-1
Sentinel-2
image classification
chatbot
offline sync
road prioritization
population exposure
multilingual alerts
```

---

# 60. Recommended Development Order

```text
1. Obtain GSI data
2. Inspect actual schema
3. Build raw → processed pipeline
4. Create Dataset 1
5. Train Model 1
6. Validate Model 1
7. Attach historical rainfall
8. Build Dataset 2
9. Train Model 2
10. Build PostGIS risk grid
11. Build FastAPI
12. Build dashboard heatmap
13. Build authority workflow
14. Build citizen reporting
15. Add live IMD/GPM/SMAP
16. Add alerts/SMS
17. Add chatbot
18. Add Sentinel features
```

Do not build the entire UI before the model/data contracts are stable.

---

# 61. Definition of Done

A feature is complete only when it has:

```text
Implementation
+
Tests
+
Validation
+
Documentation
+
Error handling
+
Observability
```

ML additionally requires:

```text
dataset definition
leakage review
validation strategy
metrics
model version
limitations
```

Live-data integrations additionally require:

```text
provider
authentication
timeout
retry
freshness check
fallback
```

Alerts additionally require:

```text
threshold
deduplication
audit log
delivery status
development safety mode
```

---

# 62. Golden Rule

Prefer:

```text
CORRECT
TRACEABLE
EXPLAINABLE
REPRODUCIBLE
```

over:

```text
FAST
IMPRESSIVE
UNVERIFIED
```

This is a high-impact disaster-management system. Scientific honesty and reproducibility are more important than unsupported accuracy claims.

---

# 63. Project North Star

The final system should answer:

```text
1. WHERE is the hazard?
2. HOW HIGH is the risk?
3. WHEN may risk increase?
4. WHY is the risk high?
5. WHAT is exposed?
6. WHAT has been observed?
7. WHAT should authorities prioritize?
```

If a proposed feature does not improve one of these answers, evaluate whether it belongs in the system.

---

## End of AGENTS.md
