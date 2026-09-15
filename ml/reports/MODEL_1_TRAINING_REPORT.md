# GARUD DRISHTI — Model 1 (Base Susceptibility) Training Report

## 1. Overview
- **Model Name:** `susceptibility_xgboost_v1`
- **Model Version:** `v1.0`
- **Dataset SHA-256:** `0b1d89377354bf597f8cade7c83daac45fdf9a7534be38753c6c0a82d339753f`
- **Target:** `label` (1 = Landslide, 0 = Control non-landslide)
- **Validation Strategy:** Spatial Block Split (10km x 10km grid cells)
- **Algorithm:** XGBoost Classifier

## 2. Input Features (Static & Slow Features Only)
1. `elevation_m`
2. `slope_deg`
3. `aspect_deg`
4. `curvature`
5. `landcover` (ESA WorldCover 10m)
6. `geology` (SoilGrids WRB Group)
7. `geomorphology` (DEM-derived landform unit)
8. `hydrological_condition` (Drainage convergence index)
9. `distance_to_drainage_m`
10. `historical_ls_density` (Events / km²)
11. `distance_to_historical_ls_m`

## 3. Evaluation Metrics (Validation Set)
- **ROC-AUC:** `0.9931`
- **PR-AUC:** `0.9918`
- **Precision:** `0.9551`
- **Recall:** `0.9675`
- **F1 Score:** `0.9613`
- **Brier Score:** `0.0258`
- **False Negative Rate:** `0.0325` (3.25%)
- **False Alarm Rate:** `0.0429` (4.29%)
- **Mean Calibration Error:** `0.1586`

## 4. Confusion Matrix
- **True Negatives:** 156
- **False Positives:** 7
- **False Negatives:** 5
- **True Positives:** 149

## 5. Artifact Package Location
- Artifact Path: `models/susceptibility/v1/`
  - `model.json`
  - `preprocessor.json` & `preprocessor_meta.json`
  - `metadata.json`
  - `metrics.json`
  - `shap/`
  - `validation_report.md`
  - `environment.json`
