# Model 2 (Dynamic Risk) Validation Report
Generated: 2026-09-15T13:52:41.404308+00:00

## Model Identity
- **Model ID:** dynamic_risk_xgboost_v1
- **Dataset SHA-256:** `cce91c9a93696404ee7c4f1c82e36c7d95a01f6ef75020d2ca8dc12858abe2dc`
- **Validation Strategy:** Temporal Split (Training: ['2024-07-01T12:00:00Z', '2024-07-04T12:00:00Z'], Val: ['2024-07-05T12:00:00Z', '2024-07-05T12:00:00Z'])

## Performance Metrics

### Current Risk Horizon (T+6h target proxy)
- **ROC-AUC:** 1.0
- **PR-AUC:** 1.0
- **Precision:** 0.9841
- **Recall:** 1.0
- **F1 Score:** 0.992
- **Brier Score:** 0.0012
- **Mean Calibration Error:** 0.1617

### 24h Risk Horizon (T+24h target)
- **ROC-AUC:** 1.0
- **PR-AUC:** 0.9998
- **Precision:** 1.0
- **Recall:** 0.9859
- **F1 Score:** 0.9929
- **Brier Score:** 0.0016
- **Mean Calibration Error:** 0.001

## Unsupported Horizons
Horizons `6h`, `48h`, and `72h` are marked `validated: false` until explicit training is requested.
