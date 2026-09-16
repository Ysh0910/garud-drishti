# GARUD DRISHTI — Model 2 (Dynamic Risk) Training Report

## 1. Overview
- **Model Name:** `dynamic_risk_xgboost_v1`
- **Model Version:** `v1.0`
- **Dataset SHA-256:** `cce91c9a93696404ee7c4f1c82e36c7d95a01f6ef75020d2ca8dc12858abe2dc`
- **Leakage Gate Audit:** PASSED (0 target or future observation features)
- **Validation Strategy:** Spatio-Temporal Split
- **Algorithm:** XGBoost Classifier

## 2. Input Features
1. `base_susceptibility` (Model 1 output handoff)
2. `rainfall_1h_mm`
3. `rainfall_3h_mm`
4. `rainfall_6h_mm`
5. `rainfall_12h_mm`
6. `rainfall_24h_mm`
7. `rainfall_72h_mm`
8. `rainfall_7d_mm`
9. `soil_moisture` (NASA SMAP)
10. `forecast_rain_6h_mm`
11. `forecast_rain_24h_mm`
12. `forecast_rain_48h_mm`

## 3. Horizon Metrics

### Current Risk Horizon (`landslide_within_6h` proxy)
- **ROC-AUC:** `1.0000`
- **PR-AUC:** `1.0000`
- **Precision:** `0.9841`
- **Recall:** `1.0000`
- **F1 Score:** `0.9920`
- **Brier Score:** `0.0012`
- **False Negative Rate:** `0.0000` (0.0%)
- **False Alarm Rate:** `0.0019` (0.19%)

### 24h Risk Horizon (`landslide_within_24h`)
- **ROC-AUC:** `1.0000`
- **PR-AUC:** `0.9998`
- **Precision:** `1.0000`
- **Recall:** `0.9859`
- **F1 Score:** `0.9929`
- **Brier Score:** `0.0016`
- **False Negative Rate:** `0.0141` (1.41%)
- **False Alarm Rate:** `0.0000` (0.0%)

## 4. Unsupported Horizons
Horizons `6h`, `48h`, and `72h` are marked `validated: false` in the API contract until explicit training is requested.

## 5. Artifact Package Location
- Artifact Path: `models/dynamic_risk/v1/`
  - `model_current.json`
  - `model_24h.json`
  - `preprocessor.json` & `preprocessor_meta.json`
  - `metadata.json`
  - `metrics.json`
  - `shap_current/`, `shap_24h/`
  - `validation_report.md`
  - `environment.json`
