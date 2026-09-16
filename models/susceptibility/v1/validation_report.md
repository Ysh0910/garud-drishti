# Model 1 (Base Susceptibility) Validation Report
Generated: 2026-09-15T13:52:28.991917+00:00

## Model Identity
- **Model ID:** susceptibility_xgboost_v1
- **Dataset SHA-256:** `0b1d89377354bf597f8cade7c83daac45fdf9a7534be38753c6c0a82d339753f`
- **Validation Strategy:** Spatial Block Split (10km x 10km grid)

## Performance Metrics
- **ROC-AUC:** 0.9931
- **PR-AUC:** 0.9918
- **Precision:** 0.9551
- **Recall:** 0.9675
- **F1 Score:** 0.9613
- **Brier Score:** 0.0258
- **False Negative Rate:** 0.0325
- **False Alarm Rate:** 0.0429
- **Mean Calibration Error:** 0.1586

## Confusion Matrix
- True Negatives: 156
- False Positives: 7
- False Negatives: 5
- True Positives: 149

## Top SHAP Features
historical_ls_density, distance_to_historical_ls_m, slope_deg, elevation_m, distance_to_drainage_m
