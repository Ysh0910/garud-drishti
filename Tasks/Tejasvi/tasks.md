# Tejasvi — Data Ingestion + ML `tasks.md`

## Role

You own the complete **data → features → ML → inference artifact** path.

Your work must produce outputs that Yashwanth can consume through the backend without needing to understand your internal ML implementation.

You are responsible for:

- real/defensible data acquisition
- raw-data preservation
- preprocessing
- terrain/geospatial feature generation
- rainfall feature generation
- training dataset construction
- susceptibility model
- dynamic risk model only if the data supports it
- evaluation
- inference
- model metadata
- SHAP explainability if time permits

You are **not** responsible for FastAPI routes, React UI, or mobile code.

---

# Phase 1 — Inspect the existing repository

## Task 1.1 — Establish the ML baseline

Inspect:

```text
AGENTS.md
TECH_STACK.md
configs/susceptibility.yaml
configs/dynamic_risk.yaml
configs/feature_schema.yaml
ml/
data/
models/
backend/app/providers/
```

Do not rewrite existing configuration blindly.

Document:

- features already declared
- model hyperparameters already declared
- expected risk horizons
- missing-value policies
- existing provider adapter interfaces
- existing folder/module conventions

### Acceptance criteria

- You understand the existing schema before adding features.
- No existing configuration is silently contradicted.
- Any required schema changes are deliberate and documented.

---

# Phase 2 — Build the data foundation

## Task 2.1 — Acquire a defensible NER study area

Use a **small representative NER study area** suitable for the hackathon rather than attempting the entire Northeast.

The dataset must contain enough spatial information to demonstrate:

```text
terrain
+
historical landslide occurrence
+
rainfall
```

Prefer authoritative/open sources already referenced by the project documentation.

Do not invent missing records.

### Required output

Create a reproducible data acquisition/preparation process under the appropriate `data/` or `ml/` module.

Keep downloaded source data under:

```text
data/raw/
```

and never modify raw files in-place.

---

## Task 2.2 — Build terrain features

From the selected DEM derive the features that are actually available and defensible.

At minimum evaluate:

- elevation
- slope
- aspect
- curvature

Add other terrain features only when the source resolution and computation justify them.

Where feasible, derive terrain using GeoPandas/Rasterio/GDAL or the existing project stack.

### Acceptance criteria

For each feature:

- unit is known
- CRS is known
- resolution is known
- nodata behavior is defined
- output can be reproduced

---

## Task 2.3 — Prepare historical landslide labels

Convert the historical landslide inventory into a clean training target.

Document:

- source
- event date if available
- geometry
- CRS
- deduplication approach
- spatial aggregation/grid mapping
- what constitutes a positive sample

Do not create synthetic landslide events merely to increase sample count.

If event dates are insufficient for dynamic temporal training, explicitly flag that limitation.

---

## Task 2.4 — Prepare rainfall data

Build a rainfall dataset that can support rolling windows.

Target windows:

```text
1h
6h
24h
72h
7d
```

Only implement windows for which source temporal resolution actually supports a defensible calculation.

Document:

- source
- timestamp semantics
- timezone
- spatial resolution
- units
- missing values
- interpolation/aggregation method

Do not use future rainfall observations to predict an earlier timestamp.

---

# Phase 3 — Complete the feature schema

## Task 3.1 — Finalize `configs/feature_schema.yaml`

Expand the current partial schema into the actual feature set used by the implemented model.

Every feature needs:

```yaml
name:
  type:
  unit:
  source:
  required:
  missing_policy:
```

Also document whether it is:

```text
static
dynamic
target
metadata
```

Do not list features merely because the architecture mentions them. The schema must describe what the code actually consumes.

### Acceptance criteria

The training pipeline and inference pipeline use the same canonical feature names.

No training-only feature can accidentally appear as an inference feature.

---

# Phase 4 — Build preprocessing

## Task 4.1 — Implement deterministic preprocessing

Create preprocessing code under:

```text
ml/preprocessing/
```

Responsibilities:

- schema validation
- type conversion
- nodata handling
- missing-value handling
- invalid-coordinate detection
- CRS consistency checks
- deterministic feature ordering

Do not bury scientific transformations inside random notebook code.

### Acceptance criteria

The same input produces the same processed output.

---

## Task 4.2 — Implement spatial validation

Do not randomly split neighboring spatial cells into train and test.

Implement spatial block/region holdout consistent with the project's scientific rules.

Where event timestamps are available, also avoid temporal leakage.

Record the split definition so evaluation is reproducible.

---

# Phase 5 — Feature engineering

## Task 5.1 — Build the susceptibility feature matrix

Create:

```text
ml/feature_engineering/
```

code that produces the Model 1 feature matrix.

The matrix should be reproducible from processed source data.

Candidate features include:

```text
terrain
geology/lithology if actually available
landcover if actually available
distance to drainage if actually available
historical landslide density
```

Do not silently substitute fake data for unavailable layers.

If a candidate feature cannot be sourced reliably, remove it or mark it unavailable rather than inventing values.

---

## Task 5.2 — Build dynamic rainfall features

Add the defensible rainfall rolling windows to the dynamic feature pipeline.

The dynamic model should conceptually consume:

```text
base susceptibility
+
recent rainfall conditions
+
optional soil moisture/weather features only if real data is available
```

Do not make SMAP or forecast data a hard dependency if the hackathon dataset cannot support it.

---

# Phase 6 — Model 1: susceptibility

## Task 6.1 — Train baseline

Implement at least one transparent baseline, preferably:

```text
Logistic Regression
```

or another justified baseline.

Record:

- features
- split
- hyperparameters
- metrics
- limitations

---

## Task 6.2 — Train XGBoost susceptibility model

Implement the primary candidate under:

```text
ml/training/
```

Use `configs/susceptibility.yaml`.

Output a versioned artifact under:

```text
models/susceptibility/
```

The artifact must include enough metadata to identify:

- model version
- training data version
- feature list
- training timestamp
- preprocessing version

Do not commit huge raw datasets into Git.

---

# Phase 7 — Evaluation

## Task 7.1 — Evaluate the model properly

Implement evaluation under:

```text
ml/evaluation/
```

At minimum report:

- Precision
- Recall
- F1
- PR-AUC where appropriate
- ROC-AUC where appropriate

If probabilistic outputs are used, evaluate calibration/Brier score where practical.

Also record false positives and false negatives.

Do not optimize for an impressive accuracy number.

### Required conclusion

The evaluation output must clearly state whether the model is useful for the hackathon prototype and what its limitations are.

---

# Phase 8 — Model 2: dynamic risk

## Task 8.1 — Decide whether dynamic ML is scientifically defensible

Before implementing Model 2, inspect whether historical timestamps and rainfall data allow a valid temporal target.

If yes:

```text
susceptibility
+
rainfall windows
+
other defensible dynamic features
→ dynamic risk model
```

If no:

**do not fabricate a temporal ML dataset.**

Instead, produce a transparent dynamic risk scoring layer using defensible rainfall/susceptibility relationships and clearly label it as a risk score rather than a trained temporal probability model.

This decision is critical.

---

## Task 8.2 — Train Model 2 if justified

Use:

```text
configs/dynamic_risk.yaml
models/dynamic_risk/
```

Support only the horizons that the data can actually justify.

The README mentions current, 6h, 24h, 48h and 72h forecasting, but those horizons must not be presented as scientifically validated if the training data cannot support them. fileciteturn7file0L21-L31

---

# Phase 9 — Inference contract

## Task 9.1 — Build the inference interface

Implement:

```text
ml/inference/
```

Expose a simple Python interface conceptually equivalent to:

```python
predict_risk(features) -> RiskPrediction
```

The exact internal implementation is yours, but the output must contain at least:

```text
risk_score
risk_state
confidence
trend
model_version
timestamp
```

Keep these concepts separate.

Do not return a single mysterious "risk" number with no semantics.

---

## Task 9.2 — Produce a spatial prediction dataset

Generate predictions for the selected study-area grid.

The output must allow Yashwanth to load/query:

```text
grid_id
geometry
risk_score
risk_state
confidence
trend
model_version
timestamp
```

This becomes the main handoff to PostGIS/backend.

---

# Phase 10 — SHAP

## Task 10.1 — Add SHAP explanations

Only after the model works.

Implement:

```text
ml/explainability/
```

Generate top contributing features for a prediction.

Example conceptual output:

```json
{
  "top_factors": [
    {"feature": "rainfall_24h", "impact": 0.18},
    {"feature": "slope", "impact": 0.12},
    {"feature": "historical_density", "impact": 0.08}
  ]
}
```

If SHAP becomes a time sink, stop after producing a working batch explanation rather than blocking the core model.

---

# Final handoff to Yashwanth

Deliver a short `ML_HANDOFF.md` containing:

1. Study-area definition.
2. Data sources.
3. Feature list.
4. Units.
5. Grid resolution.
6. Model artifact paths.
7. Model version.
8. Exact inference input schema.
9. Exact inference output schema.
10. Risk-state thresholds.
11. Missing-data behavior.
12. Model limitations.
13. Example input/output.

### Final acceptance test

A fresh checkout should be able to reproduce:

```text
raw data
→ processed data
→ features
→ trained model
→ prediction grid
```

without relying on undocumented local files.

## Do not do

Do not spend time on:

- FastAPI
- React
- React Native
- chatbot
- Kubernetes
- Kafka
- live Sentinel processing
- InSAR
- custom image classification
- fake IoT streams
- fabricated historical events

until the core data/model pipeline is working.
