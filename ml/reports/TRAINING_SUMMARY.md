# GARUD DRISHTI — Master ML Training & Industry Benchmark Summary

## System Overview
- **Project:** GARUD DRISHTI geospatial AI early warning platform
- **Execution Date:** 2026-09-15
- **Primary Owner:** Tejasvi (Data + ML)

## Dataset Fingerprints
- **Susceptibility Dataset:** `data/final/susceptibility_dataset.csv`
  - **SHA-256:** `0b1d89377354bf597f8cade7c83daac45fdf9a7534be38753c6c0a82d339753f` (1,640 rows)
- **Dynamic Risk Dataset:** `data/final/dynamic_risk_dataset.csv`
  - **SHA-256:** `cce91c9a93696404ee7c4f1c82e36c7d95a01f6ef75020d2ca8dc12858abe2dc` (3,000 rows)

---

## Comprehensive Industry Benchmark Metrics

| Metric Category | Metric Name | Model 1 (Base Susceptibility) | Model 2 (Current Risk) | Model 2 (24h Risk) |
| :--- | :--- | :--- | :--- | :--- |
| **Validation Strategy** | Strategy Type | 10km Spatial Block Split | Spatio-Temporal Split | Spatio-Temporal Split |
| **Classification Accuracy**| **Accuracy** | **96.21%** | **99.83%** | **99.83%** |
| **Precision & Recall** | **Precision** | **95.51%** | **98.41%** | **100.00%** |
| | **Recall / Sensitivity** | **96.75%** | **100.00%** | **98.59%** |
| | **Specificity (TNR)** | **95.71%** | **99.81%** | **100.00%** |
| | **F1 Score** | **96.13%** | **99.20%** | **99.29%** |
| **Statistical Association**| **Matthews Corr. (MCC)**| **0.9243** | **0.9911** | **0.9920** |
| | **Cohen's Kappa ($\kappa$)**| **0.9243** | **0.9911** | **0.9920** |
| **Discrimination (Ranking)**| **ROC-AUC** | **0.9931** | **1.0000** | **1.0000** |
| | **PR-AUC (Avg. Prec.)** | **0.9918** | **1.0000** | **0.9998** |
| **Probabilistic Quality** | **Brier Score (MSE)** | **0.0258** | **0.0012** | **0.0016** |
| | **Log Loss (Cross-Entropy)**| **0.0908** | **0.0038** | **0.0067** |
| **Error Rates** | **False Negative Rate (FNR)**| **3.25%** | **0.00%** | **1.41%** |
| | **False Positive Rate (FPR)**| **4.29%** | **0.19%** | **0.00%** |
| **Calibration** | **Expected Calib. Error (ECE)**| **0.3443** | **0.1617** | **0.0010** |

---

## Model 1 Threshold Sensitivity Analysis (Decision Boundary Sweep)

| Threshold | Accuracy | Precision | Recall (Sensitivity) | Specificity | F1 Score | MCC |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.10 | 97.48% | 95.06% | 100.00% | 95.09% | 0.9747 | 0.9508 |
| 0.20 | 97.48% | 95.06% | 100.00% | 95.09% | 0.9747 | 0.9508 |
| 0.30 | 96.53% | 94.97% | 98.05% | 95.09% | 0.9649 | 0.9311 |
| 0.40 | 96.85% | 95.57% | 98.05% | 95.71% | 0.9679 | 0.9372 |
| **0.50 (Default)** | **96.21%** | **95.51%** | **96.75%** | **95.71%** | **0.9613** | **0.9243** |
| 0.60 | 96.53% | 96.13% | 96.75% | 96.32% | 0.9644 | 0.9306 |
| 0.70 | 96.85% | 96.75% | 96.75% | 96.93% | 0.9675 | 0.9369 |
| 0.80 | 95.27% | 96.64% | 93.51% | 96.93% | 0.9505 | 0.9057 |
| 0.90 | 93.06% | 97.14% | 88.31% | 97.55% | 0.9252 | 0.8641 |

---

## Verification & Compliance Highlights
1. ✅ **Spatial Block Split (10km Grid):** Tested against spatial autocorrelation leakage on out-of-fold grid blocks.
2. ✅ **Spatio-Temporal Split:** Validated on future temporal intervals.
3. ✅ **Zero Future-Data Leakage:** Anti-leakage gate passed prior to training.
4. ✅ **Contract Compliance:** Mapped output risk indices to 0–100 integer scores per `contracts/risk.md`.
