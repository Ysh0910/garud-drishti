# ML Contract

This is the interface between Tejasvi's ML pipeline and Yashwanth's backend. It defines what the ML layer must produce and what the backend consumes. It does not specify implementation internals (no Python dataclasses, no training code, no model file format).

Source: AGENTS.md §§3–7, §§10–16, §37–39; `configs/susceptibility.yaml`; `configs/dynamic_risk.yaml`; `configs/feature_schema.yaml`; `docs/fetures/FEATURE_AI_Risk_Prediction.md`; HACKATHON_PLAN.md §§5–6.

---

## Scientific constraints — non-negotiable

These rules are inherited from AGENTS.md and must be preserved by every implementation decision.

1. **No future-data leakage.** Only data available at or before prediction time `T` may be a feature. Post-event variables (damage, final dimensions, road blockage caused by the event) are prohibited as features.
2. **Raw data immutability.** `data/raw/` is never overwritten. All transformation is in `data/processed/` and `data/final/`.
3. **Spatial validation required.** Random train/test splits are not acceptable. Use spatial block split, district holdout, or event-based holdout.
4. **No fabricated probabilities.** A score of 91 must not be presented as "91% probability of landslide" unless the model has been explicitly calibrated. Use the language defined in `risk.md` (risk score, not probability).
5. **Missing data is not zero.** Distinguish `rainfall = 0` from `rainfall = unavailable`. Missing values must be flagged in `ObservationMeta`.
6. **No unsupported forecast claims.** A forecast horizon that has not been trained and evaluated must be marked `validated: false` in the API response.

---

## Model 1 — Susceptibility

### Purpose

> How inherently susceptible is this location based on static/slowly-changing terrain and geology?

### Input features

These are the canonical feature names. They must match exactly in the training dataset, the inference input, and `configs/susceptibility.yaml`.

| Feature name | Unit | Source |
|---|---|---|
| `elevation_m` | metres | SRTM / USGS DEM |
| `slope_deg` | degrees | DEM-derived |
| `aspect_deg` | degrees | DEM-derived |
| `curvature` | dimensionless | DEM-derived |
| `landcover` | categorical class | Satellite / survey |
| `geology` | categorical class | GSI |
| `geomorphology` | categorical class | GSI |
| `hydrological_condition` | categorical class | DEM-derived |
| `distance_to_drainage_m` | metres | DEM-derived |
| `historical_ls_density` | events/km² | GSI / ISRO inventory |
| `distance_to_historical_ls_m` | metres | GSI / ISRO inventory |

**Do not add current rainfall to Model 1.** This model represents static/slow susceptibility only.

Categorical features (`landcover`, `geology`, `geomorphology`, `hydrological_condition`) must have documented encoding. Tejasvi must record the encoding in `configs/feature_schema.yaml` as part of dataset preparation.

### Output

```
base_susceptibility_raw:  float   // raw model output, p ∈ [0, 1]
base_susceptibility:      integer // 0–100, computed as round(base_susceptibility_raw * 100)
```

`base_susceptibility` (the 0–100 integer) is what the backend stores and the API returns. `base_susceptibility_raw` is an internal ML artifact.

**Do not label `base_susceptibility` as a percentage probability** unless the model has been explicitly calibrated.

---

## Model 2 — Dynamic Risk

### Purpose

> Given current environmental conditions and base susceptibility, how elevated is landslide risk?

### Input features

| Feature name | Unit | Source | Required |
|---|---|---|---|
| `base_susceptibility` | 0–100 index | Model 1 output | Required |
| `rainfall_1h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_3h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_6h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_12h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_24h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_72h_mm` | mm | IMD / GPM IMERG | Required |
| `rainfall_7d_mm` | mm | IMD / GPM IMERG | Required |
| `soil_moisture` | volumetric water content | NASA SMAP | P1 — optional at hackathon scope |
| `forecast_rain_6h_mm` | mm | IMD forecast | Optional — only if archived forecasts available |
| `forecast_rain_24h_mm` | mm | IMD forecast | Optional — only if archived forecasts available |
| `forecast_rain_48h_mm` | mm | IMD forecast | Optional — only if archived forecasts available |
| `satellite_change_score` | dimensionless index | Sentinel-1 | P2 — out of hackathon scope |

**Rainfall feature definitions** (from AGENTS.md §10):

```
rainfall_Xh_mm = sum of valid observations during the X hours
                 immediately preceding prediction time T.

DO NOT include the observation at time T or after T.
DO NOT substitute 0 for unavailable observations.
Mark unavailable windows in observation metadata.
```

### Output

```
current_risk_raw:   float   // raw model output, p ∈ [0, 1]
current_risk:       integer // 0–100
risk_24h_raw:       float   // only if 24h model is trained and defensible
risk_24h:           integer // 0–100, null if not available
```

At hackathon scope, only `current` and `24h` horizons are in scope for a trained model. All other horizons (`6h`, `48h`, `72h`) must be marked `validated: false` in the API if returned. See `risk.md` §5.

### Model versioning

Every trained artifact must record:

```
model_id:              string   // e.g. "susceptibility_xgb_v1", "dynamic_xgb_v1"
model_version:         string   // semver or date-stamped, e.g. "v1.0" or "2026-09-01"
dataset_version:       string   // which dataset file was used
feature_schema_version: string  // which version of feature_schema.yaml
training_timestamp:    ISO 8601 UTC string
validation_method:     string   // e.g. "spatial_block_10km", "district_holdout"
metrics: {
  roc_auc:       float,
  pr_auc:        float,
  precision:     float,
  recall:        float,
  f1:            float,
  brier_score:   float  // optional
}
thresholds: {
  positive_class_threshold: float  // the decision threshold used to convert p → binary prediction
}
```

This metadata is stored in the `model_versions` database table (Yashwanth) and must be produced by Tejasvi alongside the model artifact file.

---

## Inference Interface (conceptual)

This is the logical boundary between Tejasvi's `ml/inference/` module and Yashwanth's backend service. It is described here as a conceptual interface, not as Python code.

```
Input:
  SusceptibilityFeatureVector
    elevation_m, slope_deg, aspect_deg, curvature,
    landcover, geology, geomorphology, hydrological_condition,
    distance_to_drainage_m, historical_ls_density,
    distance_to_historical_ls_m

Output:
  SusceptibilityPrediction
    base_susceptibility_raw:  float
    base_susceptibility:      integer
    model_version:            string
    predicted_at:             ISO 8601 UTC string
```

```
Input:
  DynamicRiskFeatureVector
    base_susceptibility:   integer
    rainfall_1h_mm:        float | null
    rainfall_3h_mm:        float | null
    rainfall_6h_mm:        float | null
    rainfall_12h_mm:       float | null
    rainfall_24h_mm:       float | null
    rainfall_72h_mm:       float | null
    rainfall_7d_mm:        float | null
    soil_moisture:         float | null  (P1)
    forecast_rain_6h_mm:   float | null  (optional)
    forecast_rain_24h_mm:  float | null  (optional)
    forecast_rain_48h_mm:  float | null  (optional)
    observation_quality:   ObservationMeta

Output:
  DynamicRiskPrediction
    current_risk:           integer 0–100
    risk_24h:               integer 0–100 | null
    model_version:          string
    predicted_at:           ISO 8601 UTC string
    data_quality_used:      DataQuality
```

The exact function signatures and module paths within `ml/inference/` are Tejasvi's responsibility. The field names in the output must match this contract so Yashwanth can integrate.

---

## Dataset contracts

These are defined in AGENTS.md §6 and §7 and are reproduced here as the authoritative columns.

### Dataset 1 — `data/final/susceptibility_dataset.csv`

```
sample_id, latitude, longitude, state, district,
elevation_m, slope_deg, aspect_deg, curvature,
landcover, geology, geomorphology, hydrological_condition,
distance_to_drainage_m, historical_ls_density,
distance_to_historical_ls_m,
label   (1 = landslide, 0 = control)
```

### Dataset 2 — `data/final/dynamic_risk_dataset.csv`

```
sample_id, latitude, longitude, timestamp, base_susceptibility,
rainfall_1h_mm, rainfall_3h_mm, rainfall_6h_mm, rainfall_12h_mm,
rainfall_24h_mm, rainfall_72h_mm, rainfall_7d_mm,
soil_moisture,
forecast_rain_6h_mm, forecast_rain_24h_mm, forecast_rain_48h_mm,
landslide_within_6h, landslide_within_24h,
landslide_within_48h, landslide_within_72h
```

Target columns are binary (0/1). `landslide_within_Xh = 1` means a landslide was observed within the `(T, T+Xh]` window at or near this spatial point.

Forecast columns must only be populated if reliable archived forecasts exist. If unavailable, they must be `NaN`/null — never fabricated.

---

## SHAP Explainability (P1 scope)

When Model 1 and/or Model 2 are trained, SHAP values should be computed for inference. The output is consumed by `GET /api/v1/risk/{cell_id}/explain`.

Tejasvi must produce per-prediction SHAP values in the following shape:

```
shap_values: [
  { "feature": "rainfall_72h_mm",     "shap_value": +18.3 },
  { "feature": "base_susceptibility", "shap_value": +12.1 },
  ...
]
```

Feature names must match the canonical names in this contract. The backend stores the top N factors (suggest N=5) and returns them in `ExplanationSummary` (see `risk.md`).

SHAP values explain model contribution, not physical causation. The API response and UI must not claim physical causality.

---

## Missing data behaviour

| Scenario | Required behaviour |
|---|---|
| A rainfall window is unavailable | Set to `null` in feature vector; do NOT substitute 0 |
| IMD unavailable | Use last valid observation; set `data_quality = "DEGRADED"`; set `stale = true` in `ObservationMeta` |
| All rainfall unavailable | Do not run Model 2; return `null` risk with `data_quality = "MISSING"` |
| Model artifact not found | Return HTTP 503 from the API; do not return a fabricated score |
