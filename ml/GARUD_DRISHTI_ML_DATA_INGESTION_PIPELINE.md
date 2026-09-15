# GARUD DRISHTI — ML + DATA INGESTION PIPELINE COMPLETION PLAN

## Purpose

This is the execution specification for completing the GARUD DRISHTI ML pipeline and operational data-ingestion layer now that the two final ML-ready datasets are available.

**Primary owner:** Tejasvi — Data + ML  
**Backend integration owner:** Yashwanth  
**Source of truth:** `AGENTS.md`, `README.md`, `contracts/ml.md`, `contracts/risk.md`, `contracts/CONTRACT_DECISIONS.md`  
**Canonical configuration:** `configs/susceptibility.yaml`, `configs/dynamic_risk.yaml`, `configs/feature_schema.yaml`

---

## 1. Objective

Turn the final datasets into a reproducible pipeline that can:

1. Validate both final datasets.
2. Preprocess them deterministically.
3. Train Model 1 — Base Susceptibility.
4. Train Model 2 — Dynamic Risk.
5. Use spatial/temporal validation rather than relying on random splitting.
6. Detect future-data leakage before training.
7. Evaluate and assess calibration.
8. Generate SHAP explanations.
9. Save versioned model + preprocessing artifacts.
10. Expose deterministic inference.
11. Integrate inference with the FastAPI risk service.
12. Establish the live/near-real-time environmental data ingestion layer.
13. Generate production feature vectors using the same definitions as training.
14. Keep provider acquisition, feature engineering, ML inference, and API concerns separated.

The architecture is:

```text
External Providers
 IMD / GPM / SMAP / Sentinel
          |
          v
   Provider Adapters
          |
          v
 Observation Validation/QC
          |
          v
 Normalized Observation Store
          |
          v
 Feature Engineering
          |
          +----------------------+
          |                      |
          v                      v
 Static Feature Store     Dynamic Feature Store
          |                      |
          v                      |
       Model 1                   |
          |                      |
          v                      |
 base_susceptibility             |
          +----------+-----------+
                     |
                     v
                  Model 2
               /           \
              v             v
       current_risk      risk_24h
              \           /
               v         v
                 Risk Engine
                     |
                     v
                FastAPI API
                 /       \
                v         v
          Authority      Citizen
           Dashboard       App
```

---

# 2. Current ML scope

## Model 1 — Base Susceptibility

Question:

> How inherently susceptible is this location to a landslide?

Expected static/slow features:

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

Model 1 must not use current rainfall or future dynamic observations.

Output:

```text
base_susceptibility
```

Use a 0–100 index unless the repository contract specifies otherwise.

Do not describe an uncalibrated score such as `84` as `84% probability`.

## Model 2 — Dynamic Risk

Question:

> Given current environmental conditions, how elevated is landslide risk?

Expected features:

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

forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm
```

Current hackathon training scope:

```text
current
24h
```

Do not mark 6h/48h/72h as trained or validated unless actually trained and evaluated.

---

# 3. Final dataset contracts

## 3.1 Susceptibility dataset

File:

```text
data/final/susceptibility_dataset.csv
```

Expected columns:

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

Target:

```text
label = 1 -> landslide
label = 0 -> control/non-landslide
```

The exact current `contracts/ml.md` definition takes precedence if different.

## 3.2 Dynamic-risk dataset

File:

```text
data/final/dynamic_risk_dataset.csv
```

Expected columns:

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

For the current scope, train current-risk and 24h-risk targets.

Never use target columns as features.

---

# 4. Phase 0 — repository audit

Before modifying code, read:

```text
AGENTS.md
README.md
contracts/ml.md
contracts/risk.md
contracts/CONTRACT_DECISIONS.md
configs/susceptibility.yaml
configs/dynamic_risk.yaml
configs/feature_schema.yaml
```

Inspect:

```text
ml/
├── preprocessing/
├── feature_engineering/
├── training/
├── evaluation/
├── inference/
└── explainability/

data/
├── raw/
├── processed/
└── final/

models/
├── susceptibility/
└── dynamic_risk/

backend/
contracts/
tests/ml/
```

Report existing implementation before creating new files.

```text
REPOSITORY AUDIT
----------------
Existing ML code:
Existing training scripts:
Existing inference:
Existing configs:
Existing tests:
Existing model artifacts:
Existing provider adapters:
Missing components:
```

Do not replace working repository conventions unnecessarily.

---

# 5. Phase 1 — final dataset validation

Create/reuse a deterministic command such as:

```bash
python -m ml.preprocessing.validate_datasets
```

Validate:

### Files

```text
exists
readable
non-empty
CSV parses
```

### Schema

```text
required columns
unexpected columns
duplicate column names
target columns
```

### Types

```text
numeric columns
categorical columns
timestamps
coordinates
```

### Spatial validity

```text
latitude/longitude ranges
NER membership where boundary is available
impossible coordinates
```

### Missing/infinite values

Check:

```text
NaN
null
empty strings
inf
-inf
```

### Duplicates

Check:

```text
sample_id
coordinate duplicates where unexpected
timestamp + spatial-cell duplicates
```

### Ranges

Check source-aware ranges for:

```text
elevation
slope
rainfall
soil moisture
base susceptibility
```

Do not silently clip or invent values.

### Target balance

Report:

```text
positive count
negative count
positive %
negative %
```

Do not silently rebalance.

---

# 6. Dataset versioning

Every training run must identify the exact dataset.

Generate SHA-256 fingerprints for:

```text
data/final/susceptibility_dataset.csv
data/final/dynamic_risk_dataset.csv
```

Record:

```json
{
  "dataset_name": "...",
  "dataset_version": "v1",
  "sha256": "...",
  "rows": 0,
  "columns": 0
}
```

A changed CSV must receive a changed dataset fingerprint/version.

---

# 7. Phase 2 — deterministic preprocessing

Pipeline:

```text
CSV
 |
schema validation
 |
feature selection
 |
missing-value policy
 |
categorical preprocessing
 |
numeric preprocessing if required
 |
feature ordering
 |
model matrix
```

Potential categorical features:

```text
landcover
geology
geomorphology
hydrological_condition
```

Metadata-only fields normally include:

```text
sample_id
latitude
longitude
state
district
timestamp
```

Do not automatically feed identifiers into XGBoost.

Do not replace categorical classes with arbitrary integers when that introduces false ordinal meaning.

If preprocessing is fitted, save it.

Training and inference must use the same fitted preprocessing artifact.

---

# 8. Phase 3 — Model 1 pipeline

Required flow:

```text
susceptibility_dataset.csv
        |
schema validation
        |
feature selection
        |
preprocessing
        |
spatial split
        |
XGBoost training
        |
validation
        |
calibration assessment
        |
SHAP
        |
artifact packaging
        |
metadata
        |
training report
```

Suggested modules, subject to existing repository structure:

```text
ml/preprocessing/
    dataset_validation.py
    spatial_split.py
    preprocessing.py

ml/training/
    train_susceptibility.py

ml/evaluation/
    evaluate_susceptibility.py

ml/explainability/
    shap_susceptibility.py
```

---

# 9. Model 1 spatial validation

Do not use a naive random train/test split as the only validation.

Prefer:

```text
spatial block split
```

and/or:

```text
district holdout
event-based holdout
```

The exact strategy must be documented.

Validation must prevent nearby samples from appearing in both training and validation where that creates spatial leakage.

Report:

```text
train rows
validation rows
train regions
validation regions
positive rate
negative rate
```

---

# 10. Model 1 evaluation

At minimum:

```text
ROC-AUC
PR-AUC
precision
recall
F1
confusion matrix
Brier score where applicable
calibration assessment
```

Also report:

```text
false negative rate
false alarm rate
```

Do not choose thresholds only because they improve demo appearance.

---

# 11. Model 1 artifacts

Create a versioned artifact equivalent to:

```text
models/
└── susceptibility/
    └── v1/
        ├── model/
        ├── preprocessing/
        ├── metadata.json
        ├── metrics.json
        ├── feature_importance.csv
        ├── shap/
        ├── validation_report.md
        └── environment.json
```

Follow existing repository conventions if already defined.

The saved artifact must be sufficient for another machine to perform inference without refitting preprocessing.

---

# 12. Phase 4 — Model 2 pipeline

Required flow:

```text
dynamic_risk_dataset.csv
        |
schema validation
        |
timestamp validation
        |
feature selection
        |
leakage checks
        |
preprocessing
        |
spatial/temporal split
        |
current-risk training
        |
current-risk evaluation
        |
24h training
        |
24h evaluation
        |
calibration assessment
        |
SHAP
        |
artifact packaging
        |
metadata
        |
training report
```

Use separate current and 24h artifacts unless the repository contract explicitly specifies another implementation.

---

# 13. Model 2 leakage gate

For prediction time `T`:

```text
FEATURES <= information available at T
TARGET   > information available at T
```

Explicitly test for:

```text
future observed rainfall
future soil moisture
post-event observations
post-event satellite information
future labels
future report verification
future-derived features
```

If leakage is detected:

```text
STOP TRAINING
REPORT COLUMN
REPORT JOIN
REPORT TIMESTAMP RELATIONSHIP
FIX PIPELINE
RERUN VALIDATION
```

Never continue merely because the metrics look unusually good.

---

# 14. Model 2 temporal validation

Validation should respect time.

Preferred:

```text
earlier historical period -> training
later period/event -> validation
```

Combine with spatial separation where feasible.

Report:

```text
training time range
validation time range
training regions
validation regions
```

---

# 15. Model 2 outputs

Expected:

```text
current_risk
risk_24h
```

Treat them as risk scores/indices unless explicit calibration justifies probability language.

The 24h output is a forecasted risk estimate, not a guarantee.

---

# 16. Risk semantics

Keep these separate:

```text
risk_score
risk_level
risk_state
confidence
data_quality
base_susceptibility
response_priority
trend
```

Risk levels:

```text
VERY_LOW
LOW
MODERATE
HIGH
CRITICAL
```

Operational states:

```text
NORMAL
WATCH
ELEVATED
HIGH
CRITICAL
```

A score of `91` must not be displayed as `91% probability` unless calibrated.

Risk thresholds must come from:

```text
configs/dynamic_risk.yaml
```

Do not hard-code them inside Python.

---

# 17. SHAP

Generate SHAP for:

```text
Model 1
Model 2 current
Model 2 24h
```

At minimum:

```text
global feature importance
summary plot
representative local explanations
```

SHAP describes feature contribution, not causal proof.

The output must follow `contracts/risk.md` when exposed through the backend.

---

# 18. Calibration

If model outputs are interpreted as probabilities, explicitly evaluate calibration.

Possible methods:

```text
Platt scaling
isotonic calibration
```

If calibration is not performed:

```text
output = model score/index
```

not a literal probability.

---

# 19. Model metadata

Every model version must record:

```text
model_id
model_version
dataset_version
feature_schema_version
training_timestamp
git commit/code version
validation_method
metrics
thresholds
random seed
Python version
package versions
OS
CPU
GPU
```

Recommended:

```text
feature names
target
numeric/categorical feature lists
preprocessing version
calibration method
training duration
row counts
```

Never overwrite an active model without versioning.

---

# 20. Inference layer

Create/reuse:

```text
ml/inference/
```

Logical interface:

```text
predict_base_susceptibility(static_features)
predict_dynamic_risk(dynamic_features)
```

Flow:

```text
static features
   |
stored preprocessor
   |
Model 1
   |
base_susceptibility
```

Then:

```text
base_susceptibility
+
dynamic features
   |
stored preprocessor
   |
Model 2 current
Model 2 24h
   |
current_risk
risk_24h
```

Inference must:

```text
NOT retrain
NOT fit preprocessing
NOT invent missing data
USE versioned artifacts
USE canonical feature ordering
```

---

# 21. Inference smoke test

After saving artifacts:

```text
load models from disk
load preprocessors
load metadata
load known validation rows
run inference
validate output range
validate feature order
validate categorical mapping
run SHAP
```

Run identical inputs twice and verify deterministic output within numerical tolerance.

---

# 22. Data-ingestion layer

The operational ingestion layer must be separate from model training.

Target:

```text
Provider
  |
Provider Adapter
  |
Raw Observation
  |
Quality Control
  |
Normalized Observation
  |
Feature Engineering
  |
Feature Store/PostGIS
  |
ML Inference
```

The model must not directly call IMD/GPM/SMAP/Sentinel APIs.

---

# 23. Provider adapters

Use the existing provider architecture under:

```text
backend/app/providers/
```

Conceptual adapters:

```text
imd.py
gpm.py
smap.py
sentinel.py
mock.py
```

Each adapter should separate:

```text
fetch()
validate()
normalize()
metadata()
```

Provider code supplies observations.

It must not contain XGBoost model logic.

---

# 24. Normalized observation schema

Use a common internal representation such as:

```json
{
  "source": "GPM",
  "variable": "rainfall",
  "timestamp": "...",
  "latitude": 0.0,
  "longitude": 0.0,
  "value": 0.0,
  "unit": "mm",
  "quality": "GOOD"
}
```

Retain useful provenance:

```text
provider
product
product version
source timestamp
retrieval timestamp
resolution
nodata/fill
quality flag
```

---

# 25. Operational database

PostgreSQL + PostGIS is the authoritative operational database.

Relevant entities:

```text
risk_cells
weather_observations
rainfall_observations
soil_moisture_observations
satellite_observations
model_versions
prediction_logs
```

Use PostGIS for:

```text
spatial joins
distance queries
risk grids
point-in-polygon
road proximity
village proximity
```

Use GiST/spatial indexes.

Do not use Redis as the authoritative database.

---

# 26. Static feature store

Do not recompute Model 1 inputs for every user request.

Maintain a spatial feature layer:

```text
cell_id
geometry
latitude
longitude

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

Then:

```text
static feature grid
       |
Model 1
       |
base_susceptibility
       |
risk_cells
```

This enables fast point/grid inference.

---

# 27. Dynamic feature store

Maintain current features per spatial cell/time:

```text
cell_id
timestamp

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

data_quality
```

Then:

```text
risk_cells
+
latest dynamic feature row
       |
       v
Model 2
```

---

# 28. Live feature engineering

Production feature definitions MUST match training definitions.

Rainfall windows:

```text
rainfall_1h_mm
rainfall_3h_mm
rainfall_6h_mm
rainfall_12h_mm
rainfall_24h_mm
rainfall_72h_mm
rainfall_7d_mm
```

Document:

```text
time zone
window boundary
sampling frequency
aggregation method
missing-data handling
```

Example:

```text
rainfall_24h(T)
=
sum of valid rainfall observations
covering the defined 24-hour interval ending at T
```

Do not silently change this definition between training and production.

---

# 29. Forecast handling

Forecast inputs must represent forecasts that would genuinely have been available at prediction time.

Never fabricate historical forecasts.

For historical training:

```text
archived forecast available -> may be used
no defensible archived forecast -> do not invent one
```

For production:

```text
latest valid forecast
+
retrieval timestamp
+
provider metadata
```

must be tracked.

---

# 30. Data-quality states

Operational predictions must distinguish:

```text
GOOD
DEGRADED
STALE
MISSING
```

If an input is stale, do not present it as current.

If required inputs are unavailable, follow the risk contract's degraded-data behavior.

Never silently fill missing provider data with made-up values.

---

# 31. Idempotent ingestion

Repeated provider jobs must not create duplicate observations.

Use a deterministic identity appropriate to the provider, based on fields such as:

```text
source
product
timestamp
spatial cell
variable
```

Repeated ingestion should:

```text
existing observation -> update/ignore according to policy
new observation      -> insert
```

---

# 32. Background jobs

Use the project's recommended:

```text
Celery + Redis
```

for expensive or recurring jobs.

Potential jobs:

```text
ingest_imd
ingest_gpm
ingest_smap
process_sentinel
update_rainfall_features
update_soil_moisture_features
update_risk_grid
evaluate_alerts
```

The FastAPI request must not block on large satellite processing.

---

# 33. Failure handling

Provider failures must be isolated.

Conceptual behavior:

```text
provider unavailable
       |
record failure
       |
keep last valid observation if policy permits
       |
mark stale
       |
continue other providers
```

Do not silently turn a failed provider into fake data.

Keep a mock provider for:

```text
development
frontend integration
tests
demo mode
provider outage simulation
```

---

# 34. Model registry / active model

Backend needs to identify the active validated model.

Store:

```text
model_id
model_version
dataset_version
feature_schema_version
status
created_at
```

Possible statuses:

```text
TRAINED
VALIDATED
ACTIVE
RETIRED
```

Only validated artifacts may become ACTIVE.

---

# 35. Prediction logging

Log enough information to reproduce/debug a prediction:

```text
prediction_id
cell_id
timestamp
model_version
base_susceptibility
current_risk
risk_24h
data_quality
feature_schema_version
```

Do not put unnecessary personal information into ML logs.

---

# 36. Testing

Create/reuse:

```text
tests/ml/
```

Minimum tests:

```text
test_dataset_schema.py
test_dataset_validation.py
test_preprocessing.py
test_spatial_split.py
test_temporal_split.py
test_leakage.py
test_feature_engineering.py
test_model_loading.py
test_model_inference.py
test_risk_bands.py
test_shap.py
```

Integration tests should cover:

```text
provider
  -> normalized observation
  -> feature builder
  -> inference
  -> risk response
```

---

# 37. Pipeline commands

Provide simple reproducible commands, following repository conventions:

```bash
python -m ml.preprocessing.validate_datasets

python -m ml.training.train_susceptibility

python -m ml.training.train_dynamic_risk

python -m ml.evaluation.evaluate_susceptibility

python -m ml.evaluation.evaluate_dynamic_risk

python -m ml.explainability.generate_shap

python -m ml.inference.smoke_test
```

Training must be runnable from scripts, not depend on a notebook.

---

# 38. Configuration

Use:

```text
configs/susceptibility.yaml
configs/dynamic_risk.yaml
configs/feature_schema.yaml
```

Configuration should control:

```text
feature lists
hyperparameters
random seed
risk thresholds
target horizon
preprocessing policy
```

Do not scatter these values throughout Python files.

---

# 39. Training sequence

## Stage A — Data readiness

```text
dataset validation
config validation
contract validation
feature-schema validation
```

Expected:

```text
DATA READY
```

## Stage B — Smoke test

Small deterministic subset:

```text
preprocessing
training
evaluation
saving
loading
SHAP
```

## Stage C — Full Model 1

```text
train
evaluate
SHAP
save
report
```

## Stage D — Full Model 2

```text
current
24h
```

Train/evaluate/save both.

## Stage E — Inference

Reload from disk and predict known rows.

## Stage F — Backend integration

Connect ML inference to the FastAPI risk service.

## Stage G — Operational ingestion

Connect normalized observations to dynamic feature generation and risk inference.

---

# 40. Model 1 acceptance criteria

```text
[ ] dataset validation passes
[ ] schema matches contract
[ ] leakage review passes
[ ] spatial validation exists
[ ] preprocessing is versioned
[ ] XGBoost training succeeds
[ ] evaluation succeeds
[ ] calibration assessed
[ ] SHAP generated
[ ] model saved
[ ] preprocessor saved
[ ] metadata saved
[ ] reload succeeds
[ ] inference smoke test passes
[ ] report generated
```

---

# 41. Model 2 acceptance criteria

```text
[ ] dataset validation passes
[ ] timestamp validation passes
[ ] future leakage checks pass
[ ] spatial/temporal validation exists
[ ] current model trained
[ ] 24h model trained
[ ] current metrics generated
[ ] 24h metrics generated
[ ] calibration assessed
[ ] SHAP generated
[ ] artifacts saved
[ ] metadata saved
[ ] reload succeeds
[ ] inference smoke test passes
```

---

# 42. Data-ingestion acceptance criteria

MVP ingestion is complete when:

```text
[ ] provider adapter interface exists
[ ] IMD adapter exists or is explicitly PENDING
[ ] GPM adapter exists or is explicitly PENDING
[ ] SMAP adapter exists or is explicitly PENDING
[ ] Sentinel adapter/processor is explicitly classified
[ ] mock provider exists
[ ] normalized observation schema exists
[ ] quality control exists
[ ] persistence exists
[ ] duplicate protection exists
[ ] freshness tracking exists
[ ] GOOD/DEGRADED/STALE/MISSING states work
[ ] rainfall feature builder works
[ ] soil-moisture feature builder works
[ ] forecast feature handling works
[ ] static feature lookup works
[ ] dynamic feature lookup works
[ ] inference integration works
[ ] prediction logging works
[ ] background jobs do not block API requests
```

Sentinel-1/Sentinel-2 can remain an advanced branch if operational processing is not stable enough for the MVP.

---

# 43. End-to-end target

The final system should demonstrate:

```text
IMD / GPM / SMAP
      |
      v
Provider adapters
      |
      v
Observation validation
      |
      v
Normalized observation store
      |
      v
Dynamic feature engineering
      |
      +----------------------+
      |                      |
      v                      v
Static feature store   Dynamic feature store
      |                      |
      v                      |
    Model 1                  |
      |                      |
      v                      |
base_susceptibility          |
      +----------+-----------+
                 |
                 v
              Model 2
             /       \
            v         v
     current_risk   risk_24h
            \       /
             v     v
            Risk Engine
                 |
                 v
              FastAPI
            /         \
           v           v
      Authority      Citizen
       Dashboard      Mobile
```

---

# 44. Required reports

Maintain:

```text
docs/data/
├── DATA_DICTIONARY.md
├── DATA_SOURCES.md
├── DATA_QUALITY_REPORT.md
└── PROCESSING_REPORT.md
```

Training reports:

```text
ml/reports/
├── MODEL_1_TRAINING_REPORT.md
├── MODEL_2_TRAINING_REPORT.md
├── TRAINING_SUMMARY.md
├── validation/
├── figures/
└── metadata/
```

Use the repository's existing locations if different.

---

# 45. Final training summary

The final report must contain:

```text
Project:
GARUD DRISHTI

Git commit:
...

Dataset version:
...

Feature schema version:
...

Python:
...

XGBoost:
...

SHAP:
...

Hardware:
...

GPU:
...

Model 1:
    samples:
    features:
    validation:
    ROC-AUC:
    PR-AUC:
    precision:
    recall:
    F1:
    calibration:
    training time:

Model 2 current:
    samples:
    features:
    validation:
    ROC-AUC:
    PR-AUC:
    precision:
    recall:
    F1:
    calibration:
    training time:

Model 2 24h:
    samples:
    features:
    validation:
    ROC-AUC:
    PR-AUC:
    precision:
    recall:
    F1:
    calibration:
    training time:

Inference:
    Model 1:
    Model 2 current:
    Model 2 24h:

Data ingestion:
    IMD:
    GPM:
    SMAP:
    Sentinel:
```

Never report PASS when a critical validation gate fails.

---

# 46. Coding-agent execution order

When giving this document to the coding agent, execute in exactly this order:

```text
1. Read AGENTS.md.
2. Read contracts/ml.md.
3. Read contracts/risk.md.
4. Read CONTRACT_DECISIONS.md.
5. Read all ML configuration files.
6. Audit existing ml/ implementation.
7. Validate both final CSV datasets.
8. Generate dataset fingerprints.
9. Identify missing implementation.
10. Implement/reuse deterministic preprocessing.
11. Implement/reuse spatial validation.
12. Implement/reuse temporal validation.
13. Implement leakage tests.
14. Implement Model 1 training.
15. Implement Model 1 evaluation.
16. Implement Model 1 SHAP.
17. Package Model 1 artifacts.
18. Implement Model 2 current training.
19. Implement Model 2 24h training.
20. Implement Model 2 evaluation.
21. Implement Model 2 SHAP.
22. Package Model 2 artifacts.
23. Implement metadata/versioning.
24. Implement inference loading.
25. Run inference smoke tests.
26. Implement/reuse provider adapters.
27. Implement normalized observation persistence.
28. Implement dynamic feature generation.
29. Integrate inference with risk service.
30. Add tests.
31. Run the complete pipeline.
32. Generate reports.
33. Report every missing capability explicitly.
```

Do not jump directly to full model training.

---

# 47. Agent output format

At completion return:

```text
GARUD DRISHTI — ML/INGESTION IMPLEMENTATION REPORT
====================================================

Repository audit: PASS/FAIL
Dataset validation: PASS/FAIL

Dataset versions:
    susceptibility: ...
    dynamic_risk: ...

Preprocessing: PASS/FAIL

Model 1:
    training: PASS/FAIL
    validation: PASS/FAIL
    SHAP: PASS/FAIL
    artifact: PASS/FAIL

Model 2 current:
    training: PASS/FAIL
    validation: PASS/FAIL
    SHAP: PASS/FAIL
    artifact: PASS/FAIL

Model 2 24h:
    training: PASS/FAIL
    validation: PASS/FAIL
    SHAP: PASS/FAIL
    artifact: PASS/FAIL

Inference:
    Model 1: PASS/FAIL
    Model 2 current: PASS/FAIL
    Model 2 24h: PASS/FAIL

Data ingestion:
    IMD: PASS/FAIL/PENDING
    GPM: PASS/FAIL/PENDING
    SMAP: PASS/FAIL/PENDING
    Sentinel: PASS/FAIL/PENDING

Backend integration: PASS/FAIL
Tests: PASS/FAIL

Artifacts:
    ...

Reports:
    ...

Known limitations:
    ...

Recommended next step:
    ...
```

---

# 48. Non-negotiable rules

Never:

```text
fabricate observations
fabricate historical forecasts
use future observations as features
use target columns as features
use random split as the only validation
fit preprocessing again during inference
hard-code risk thresholds
duplicate canonical feature lists
overwrite model artifacts without versioning
call uncalibrated scores probabilities
claim unsupported horizons are validated
put provider API calls inside model code
block API requests on satellite processing
add Kubernetes/Kafka/Spark without a real requirement
replace XGBoost with deep learning without validation
```

The final goal is:

```text
TRUSTWORTHY DATA
      |
REPRODUCIBLE FEATURES
      |
LEAKAGE-SAFE TRAINING
      |
SPATIALLY/TEMPORALLY VALIDATED MODELS
      |
VERSIONED ARTIFACTS
      |
DETERMINISTIC INFERENCE
      |
OPERATIONAL DATA INGESTION
      |
FASTAPI RISK SERVICE
      |
EARLY WARNING SYSTEM
```

The project should remain scientifically defensible and practical for the SIH prototype. Advanced automated retraining, large distributed infrastructure, and deep-learning satellite models remain future extensions unless explicitly required.
