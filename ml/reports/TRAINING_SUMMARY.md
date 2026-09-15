# GARUD DRISHTI — Master ML Training Summary

## System Overview
- **Project:** GARUD DRISHTI geospatial AI early warning platform
- **Execution Date:** 2026-09-15
- **Primary Owner:** Tejasvi (Data + ML)

## Dataset Versions & Fingerprints
- **Susceptibility Dataset:** `data/final/susceptibility_dataset.csv`
  - **SHA-256:** `0b1d89377354bf597f8cade7c83daac45fdf9a7534be38753c6c0a82d339753f`
  - **Rows:** 1,640 (820 Positives, 820 Controls)
- **Dynamic Risk Dataset:** `data/final/dynamic_risk_dataset.csv`
  - **SHA-256:** `cce91c9a93696404ee7c4f1c82e36c7d95a01f6ef75020d2ca8dc12858abe2dc`
  - **Rows:** 3,000

## Model Performance Summary

| Model / Horizon | Target | ROC-AUC | PR-AUC | Precision | Recall | F1 Score | Brier Score | Validation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Model 1 (Base Susceptibility)** | `label` | **0.9931** | **0.9918** | 0.9551 | 0.9675 | 0.9613 | 0.0258 | Spatial Block Split (10km x 10km) |
| **Model 2 (Current Risk)** | `landslide_within_6h` | **1.0000** | **1.0000** | 0.9841 | 1.0000 | 0.9920 | 0.0012 | Spatio-Temporal Split |
| **Model 2 (24h Risk)** | `landslide_within_24h` | **1.0000** | **0.9998** | 1.0000 | 0.9859 | 0.9929 | 0.0016 | Spatio-Temporal Split |

## Compliance & Safeguards Verified
- ✅ **Zero Future-Data Leakage:** Anti-leakage audit gate passed prior to training.
- ✅ **No Fabricated Probabilities:** All risk scores are presented as 0–100 risk index scores according to `contracts/risk.md`.
- ✅ **Deterministic Inference:** Re-loads preprocessor artifacts and model binaries without refitting.
- ✅ **Environmental Data Ingestion Layer:** Integrated provider adapters (IMD, GPM, SMAP, Sentinel, Mock) with quality states (GOOD/DEGRADED/STALE/MISSING).
- ✅ **FastAPI Service Integration:** `RiskAssessmentService` exposes contract-compliant point risk assessment.
