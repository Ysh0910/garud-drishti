# Citizen AI & Vision Model Feature Walkthrough

The Citizen AI Intelligence, Computer Vision, Credibility, and Response Priority Architecture defined in [GARUD_DRISHTI_Citizen_AI_Architecture.md](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/docs/GARUD_DRISHTI_Citizen_AI_Architecture.md) has been fully implemented, tested, and pushed to the new branch `vision-model`.

---

## 1. Summary of Implemented Modules

### 1. Vision & Preprocessing Layer (`ml/vision/`)
- **Stage A — Image Quality Gate ([quality.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/quality.py))**:
  - Validates image payload integrity, dimensions, and aspect ratio.
  - Computes Laplacian variance for blur detection, mean luminance for extreme darkness (<20) and overexposure (>238), and standard deviation for blank/zero-contrast images.
  - Emits `image_quality_score` (0–100) and status (`ACCEPT`, `LOW_QUALITY`, `REJECT`).
- **Stage B — Authenticity & Perceptual Hashing ([authenticity.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/authenticity.py))**:
  - Implements 64-bit DCT-based `pHash`, gradient-based `dHash`, and SHA-256 digests.
  - Bitwise Hamming distance comparison for exact duplicates ($\le 3$ bits), near duplicates ($\le 10$ bits), and unique submissions ($>10$ bits).
- **Stage C1 — Fast Landslide Classifier ([classifier.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/classifier.py))**:
  - MobileNetV3/EfficientNet-compatible architecture outputting calibrated probabilities for `LANDSLIDE`, `NON_LANDSLIDE`, and `UNCERTAIN`.
  - Records `model_name` and `model_version` with every inference.
- **Stage C2 — Landslide Segmentation ([segmentation.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/segmentation.py))**:
  - SegFormer-compatible architecture computing bounding box, scarp geometry, and `visible_affected_fraction`.
- **Stage D — Visual Impact Extractor ([impact.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/impact.py))**:
  - Extracts structured indicators: `debris_detected`, `road_blockage_detected`, `water_or_mud_detected`, `vegetation_loss_detected`, `structure_damage_detected`.
  - Computes `observed_impact_score` (0–100) and impact level (`LOW`, `MEDIUM`, `HIGH`, `SEVERE`).

### 2. Consistency, Credibility & Response Priority (`ml/vision/`)
- **Stage E & F — GPS & Temporal Consistency ([consistency.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/consistency.py))**:
  - Enforces North Eastern Region (NER) bounding box ($21.5^\circ\text{N} - 29.5^\circ\text{N}$, $89.5^\circ\text{E} - 97.5^\circ\text{E}$) and terrain slope consistency.
  - Validates submission latency and ensures missing EXIF is **never** penalized as fraud.
- **Stage G — Individual Credibility Engine ([credibility.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/credibility.py))**:
  - Synthesizes 6 component scores (Quality, Authenticity, CV Confidence, GPS, Time, Environmental Risk) into `credibility_score` (0–100) with auditable explanation signals.
- **Stage H — Coordinated Fraud Detection ([coordination.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/coordination.py))**:
  - Evaluates report clusters across accounts for synchronized bursts, repeated pHash across multiple users, and spatial concentration vs. low environmental risk.
  - Triggers cluster `QUARANTINE` when coordination risk exceeds thresholds.
- **Stage J & Section 20-21 — Exposure & Response Priority Engine ([priority.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/priority.py))**:
  - PostGIS exposure scoring across road corridors, settlements, and critical assets.
  - Fuses Environmental Risk + Credibility + Observed Impact + Exposure + Corroboration into `response_priority_score` (0–100).
  - Strictly preserves separation of all 7 underlying scores.
- **Pipeline Orchestrator ([pipeline.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/ml/vision/pipeline.py))**:
  - End-to-end execution of Stages A through J + 20 and lifecycle management (`PENDING` $\rightarrow$ `AI_ANALYSIS` $\rightarrow$ `AUTHORITY_REVIEW` / `QUARANTINE` / `NEEDS_EVIDENCE` / `REJECTED`).

### 3. Backend API & Authority Decision Gate (`backend/app/`)
- **Data Models ([models.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/backend/app/reports/models.py))**:
  - Pydantic models for report submission, responses, AI analysis breakdown, and authority reviews.
- **Report Service ([service.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/backend/app/reports/service.py))**:
  - In-memory/repository lifecycle management, client idempotency deduplication on `client_report_id`, known pHash registry, and cluster analysis.
- **API Endpoints ([router.py](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/backend/app/api/v1/router.py))**:
  - `POST /api/v1/citizen/reports` & `POST /api/v1/reports`
  - `GET /api/v1/citizen/reports` & `GET /api/v1/reports`
  - `GET /api/v1/citizen/reports/{report_id}` & `GET /api/v1/reports/{report_id}`
  - `GET /api/v1/citizen/reports/{report_id}/analysis`
  - `POST /api/v1/authority/reports/{report_id}/review` (`APPROVE`, `REJECT`, `REQUEST_MORE_EVIDENCE`, `HOLD`)
  - `POST /api/v1/citizen/reports/batch-analyze`

---

## 2. Test Verification

All 33 automated tests across ML, Vision, and Backend modules execute and pass cleanly:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.0.1, pluggy-1.6.0
rootdir: C:\Users\tejasvi javagal\Desktop\New folder\garud-drishti\garud-drishti
collected 33 items

tests\backend\test_citizen_reports_api.py ......                         [ 18%]
tests\ml\test_credibility_and_coordination.py ......                     [ 36%]
tests\ml\test_leakage.py .                                               [ 39%]
tests\ml\test_preprocessing.py .                                         [ 42%]
tests\ml\test_risk_service.py .                                          [ 45%]
tests\ml\test_vision_authenticity.py ......                              [ 63%]
tests\ml\test_vision_pipeline.py ......                                  [ 81%]
tests\ml\test_vision_quality.py ......                                   [100%]

======================= 33 passed, 36 warnings in 3.49s =======================
```

---

## 3. Git Branch & Remote Push

- **Branch Created**: `vision-model`
- **Commit**: `eccf525` (`feat(vision): implement Citizen AI intelligence, computer vision, credibility and response priority pipeline`)
- **Remote Push**: `origin/vision-model` tracking setup at `https://github.com/Ysh0910/garud-drishti.git`
