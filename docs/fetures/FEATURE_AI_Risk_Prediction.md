# Feature: AI-Powered Landslide Risk Prediction

> **Category:** Core ML Engine  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

The core intelligence of NETRA is a **two-stage XGBoost prediction pipeline** that separates static susceptibility from dynamic trigger risk. This design avoids conflating "where can landslides occur?" with "are conditions currently dangerous?"

---

## Model A — Static Susceptibility

### Purpose

Determine how inherently susceptible a location is to landslides based on static or slowly changing terrain and geological characteristics.

### Input Features

| Feature | Source |
|---|---|
| Elevation (m) | SRTM / DEM |
| Slope (degrees) | DEM-derived |
| Aspect (degrees) | DEM-derived |
| Curvature | DEM-derived |
| Land cover class | Satellite / survey |
| Geology / lithology | GSI |
| Geomorphology | GSI |
| Hydrological condition | DEM-derived |
| Distance to drainage (m) | DEM-derived |
| Historical landslide density | GSI / ISRO inventory |
| Distance to historical landslides (m) | GSI / ISRO inventory |

### Output

```text
Base Susceptibility Score = 0–100
```

### Key Rule

**Do not include current rainfall in Model A.** This model represents static/slow susceptibility only.

---

## Model B — Dynamic Trigger Risk

### Purpose

Estimate current and near-future landslide risk by combining intrinsic susceptibility with changing environmental conditions.

### Input Features

| Feature | Source |
|---|---|
| Base susceptibility (Model A output) | Model A |
| Rainfall 1h, 3h, 6h, 12h, 24h, 72h, 7d (mm) | IMD / GPM IMERG |
| Soil moisture | NASA SMAP |
| Forecast rainfall 6h, 24h, 48h (mm) | IMD / GPM |
| Satellite-change features (Phase 2+) | Sentinel-1 |
| Validated field-report signals (Phase 2+) | Citizen reports |

### Output

```text
Current Risk       = 0–100
Risk within 6h     = 0–100
Risk within 24h    = 0–100
Risk within 48h    = 0–100
Risk within 72h    = 0–100
```

---

## Why XGBoost?

- Strong performance on structured/tabular geospatial data
- Handles nonlinear relationships and feature interactions
- Faster to train than deep-learning alternatives
- Explainable with SHAP
- Works effectively without enormous labelled datasets
- Suitable for SIH-scale and production implementation

Deep learning (CNN / Vision Transformer) can be added later for image analysis as a complementary capability.

---

## Prediction Horizons

| Horizon | Confidence | Primary Use |
|---|---|---|
| 0–6 hours | Highest | Immediate/short-term warning |
| 6–24 hours | High | Operational warning window |
| 24–48 hours | Moderate | Advance preparedness |
| 48–72 hours | Lower | Planning/awareness forecast |

> **Important:** Future risk forecasts depend on forecast rainfall quality. Uncertainty increases with horizon length. The UI must communicate this honestly.

---

## Risk Scoring Bands

```text
0–20     VERY LOW
21–40    LOW
41–60    MODERATE
61–80    HIGH
81–100   CRITICAL
```

Thresholds are configurable and should be calibrated using validation data, missed-event cost, false-alarm tolerance, and expert guidance.

---

## Confidence vs Risk

These are separate concepts:

- **Risk = 91/100** → Estimated hazard level
- **Confidence = 0.87** → Reliability of the prediction/data/model

Both should be tracked and surfaced separately.

---

## Training Pipeline

### Dataset 1 — Susceptibility

```text
data/final/susceptibility_dataset.csv
```

### Dataset 2 — Dynamic Risk

```text
data/final/dynamic_risk_dataset.csv
```

### Workflow

```text
Raw GSI → Clean → Filter NER → Controls → Join terrain/geology/hydrology → Dataset 1 → Train XGBoost #1
Historical events → Attach rainfall → Attach soil moisture → Attach susceptibility → Dataset 2 → Train XGBoost #2
```

---

## Validation Requirements

- **Spatial validation:** Use geographic/district/state holdout or spatial block cross-validation (no random train/test split)
- **Metrics:** ROC-AUC, PR-AUC, Precision, Recall, F1, Brier score, calibration, false alarm rate, missed-event rate
- **Priority:** Recall and missed-event rate are especially important for early-warning systems
- **Data leakage prevention:** Only information available before or at prediction time may be used

---

## Model Versioning & Monitoring

- Every production prediction must record which model version produced it
- Monitor: prediction distribution, missing features, data drift, false alarms, missed events
- Retrain periodically as more verified data becomes available

---

## References

- Sections 5–15, 19–21, 54–60 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 6 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Sections 5–6 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
