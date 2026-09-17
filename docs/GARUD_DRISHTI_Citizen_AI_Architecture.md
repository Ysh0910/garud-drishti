# GARUD DRISHTI — Citizen AI Intelligence, Credibility & Impact Architecture

## 1. Purpose

This document defines the **Citizen Intelligence Layer** of GARUD DRISHTI.

A citizen submits a photo, phone GPS, timestamp and optional incident details. The system validates the evidence, detects and segments a landslide, estimates observed impact, checks credibility, detects coordinated fake-report campaigns, combines the evidence with the existing environmental XGBoost risk and GIS exposure, and produces an explainable response-priority score.

**Important:** a citizen report is untrusted evidence initially. It must not directly trigger a public emergency alert.

---

## 2. Core Principle

GARUD DRISHTI has two complementary intelligence paths.

### Predictive intelligence

```text
Terrain + Geology + Historical Landslides
                    ↓
             Model 1 — XGBoost
                    ↓
          Base Susceptibility
                    ↓
Rainfall + Soil Moisture + Forecast
                    ↓
             Model 2 — XGBoost
                    ↓
           Dynamic Environmental Risk
```

### Observational intelligence

```text
Citizen Photo + GPS + Timestamp
                    ↓
            Citizen AI Layer
                    ↓
      Evidence + Credibility + Impact
```

Fusion:

```text
Environmental Risk
        +
Citizen Visual Evidence
        +
Report Credibility
        +
Observed Impact
        +
GIS Exposure
        +
Independent Corroboration
        ↓
Response Priority Engine
        ↓
Authority Review
        ↓
Alert / Dispatch / Monitor
```

The citizen module **supplements, not replaces**, the existing XGBoost risk engine.

---

## 3. Final Technology Stack

| Component | Technology | Role |
|---|---|---|
| Citizen mobile | React Native + TypeScript | Photo/GPS/report submission |
| API | FastAPI + Pydantic | Report and inference APIs |
| Async processing | Redis + Celery | Image-processing jobs |
| Database | PostgreSQL + PostGIS | Reports, scores, spatial analysis |
| Image storage | S3-compatible object storage | Original/processed images |
| Image preprocessing | OpenCV + Pillow | Quality and metadata checks |
| Fast classifier | MobileNetV3 or EfficientNet-B0 | Landslide/non-landslide triage |
| Segmentation | SegFormer fine-tuned for landslides | Landslide mask |
| Embeddings | CLIP/SigLIP | Visual similarity |
| Duplicate detection | pHash/dHash | Reused-image detection |
| Credibility model | XGBoost | Structured credibility scoring |
| Coordinated fraud | Isolation Forest + clustering + PostGIS | Campaign/anomaly detection |
| Existing risk | XGBoost Model 1 + Model 2 | Susceptibility + dynamic risk |
| Explainability | SHAP | Structured model explanations |
| GIS | GeoPandas + Rasterio + PostGIS | Location/exposure analysis |
| Authority UI | React + TypeScript + MapLibre + ECharts | Review/operations |
| Deployment | Docker/Compose | Reproducible deployment |

---

## 4. Why a Multi-Model System?

Do not create one giant `fraud_model`.

Different problems require different techniques:

- **CNN/vision model:** understand image content.
- **pHash:** detect exact/near-exact image reuse.
- **CLIP/SigLIP embeddings:** retrieve visually similar evidence.
- **XGBoost:** combine structured credibility signals once reviewed labels exist.
- **Isolation Forest:** detect unusual report patterns when fraud labels are limited.
- **DBSCAN/HDBSCAN:** detect spatial/temporal clusters.
- **PostGIS:** perform geospatial consistency and exposure queries.

This makes the system modular and explainable.

---

# 5. End-to-End Pipeline

```text
Citizen
  ↓
Capture Photo + GPS
  ↓
Local Validation
  ↓
FastAPI
  ↓
Store Image + Create Report
  ↓
Celery / Redis
  ↓
Image Quality
  ↓
Authenticity / Duplicate Checks
  ↓
Landslide Classification
  ↓
Landslide Segmentation
  ↓
Visual Impact Extraction
  ↓
GPS + GIS Analysis
  ↓
Cross-Report Correlation
  ↓
Credibility Engine
  ↓
Existing XGBoost Risk Retrieval
  ↓
Exposure Analysis
  ↓
Danger / Response Priority
  ↓
Authority Review
  ↓
APPROVE / REJECT / REQUEST_MORE_EVIDENCE
  ↓
Alert / Response / Archive
```

---

# 6. Citizen Submission

Collect:

```json
{
  "report_id": "uuid",
  "user_id": "uuid",
  "latitude": 27.XXXX,
  "longitude": 92.XXXX,
  "captured_at": "ISO-8601 timestamp",
  "uploaded_at": "ISO-8601 timestamp",
  "incident_type": "LANDSLIDE",
  "description": "Road blocked by debris",
  "image_id": "uuid"
}
```

The server records:

- server receipt time;
- authenticated user ID;
- submitted GPS;
- image SHA-256;
- image dimensions;
- MIME type;
- processing/model versions.

Client metadata must not be blindly trusted.

---

# 7. Stage A — Image Quality Gate

Check:

- corrupted image;
- unsupported format;
- extremely low resolution;
- excessive blur;
- extreme darkness/overexposure;
- blank/unrelated image;
- screenshot-like input where detectable.

Output:

```text
image_quality_score: 0–100

status:
  ACCEPT
  LOW_QUALITY
  REJECT
```

Low quality is **not automatically fraud**. Ask the user for another image when appropriate.

---

# 8. Stage B — Image Authenticity and Reuse

## 8.1 Perceptual Hash

Generate:

- pHash;
- dHash.

Compare against previous submissions using Hamming distance.

```text
New image
   ↓
pHash
   ↓
Nearest previous hashes
   ↓
Very small distance?
   ├── YES → possible reused evidence
   └── NO  → continue
```

A match is a **fraud signal**, not automatic proof.

## 8.2 Visual Embeddings

Generate CLIP/SigLIP embeddings.

Use FAISS for prototype-scale similarity search.

Detect:

- same photograph;
- cropped versions;
- resized versions;
- filtered versions;
- visually similar previous evidence.

Two genuine photos of the same event can naturally be similar, so similarity must be combined with other signals.

---

# 9. Stage C — Landslide Computer Vision

Use a two-stage architecture.

## C1 — Fast Classifier

Recommended initial backbone:

**MobileNetV3**

Alternative:

**EfficientNet-B0**

Classes:

```text
LANDSLIDE
NON_LANDSLIDE
UNCERTAIN
```

Purpose:

- fast triage;
- reject obviously unrelated images;
- reduce expensive segmentation calls.

The final classifier must be fine-tuned on landslide-specific ground/citizen imagery. Generic ImageNet classification is not sufficient.

## C2 — Segmentation

Use:

**SegFormer fine-tuned for landslide segmentation.**

Output:

```text
landslide_mask
landslide_confidence
visible_affected_fraction
```

The mask represents visible image-region extent. A normal phone image cannot reliably provide physical soil volume/depth without additional scale/depth information.

---

# 10. Stage D — Visual Impact

Extract structured observations such as:

```text
landslide_present
landslide_confidence
visible_area_fraction
debris_detected
road_blockage_detected
water_or_mud_detected
vegetation_loss_detected
structure_damage_detected
```

Where training data supports them, add dedicated detectors/classifiers for:

- road blockage;
- building/structure damage;
- debris;
- rockfall;
- mud/water;
- infrastructure damage.

Start small and reliable rather than attempting one huge universal damage model.

---

# 11. Stage E — GPS/GIS Consistency

Use PostGIS to query the report location against:

- current risk grid;
- slope/elevation;
- historical landslides;
- roads;
- villages;
- hospitals;
- schools;
- critical infrastructure;
- drainage;
- administrative boundaries.

Calculate signals such as:

```text
slope_consistency
historical_event_proximity
road_proximity
village_proximity
critical_asset_proximity
environmental_risk_at_location
```

GPS consistency is supporting evidence, not proof that the photo was taken there.

---

# 12. Stage F — Temporal Consistency

Compare:

- EXIF timestamp when available;
- report timestamp;
- server receipt timestamp;
- nearby reports;
- rainfall/event conditions;
- current environmental risk.

Missing EXIF metadata must **not** automatically mean fraud because mobile platforms can strip metadata.

---

# 13. Stage G — Individual Credibility Engine

Signals can include:

```text
image_quality_score
landslide_cv_confidence
segmentation_confidence
image_reuse_score
embedding_similarity_score
gps_consistency_score
temporal_consistency_score
environmental_consistency_score
description_consistency
reviewed_user_history_features
```

Once enough reviewed/labeled cases exist:

**XGBoost classifier → report credibility score 0–100**

Initially, use transparent rules/weights if labeled fraud data is insufficient, and collect authority-reviewed cases for later supervised training.

Do not claim the score is calibrated until calibration is actually evaluated.

---

# 14. Stage H — Coordinated Fraud Detection

This handles the case where many different accounts submit fake reports.

Do not rely only on account reputation.

Analyse the **report cluster**.

### Temporal signals

- reports per minute;
- burst duration;
- synchronized submissions.

### Spatial signals

- report density;
- geographic clustering;
- repeated coordinates.

### Visual signals

- same pHash;
- near-identical pHash;
- embedding similarity.

### Text signals

- repeated descriptions;
- template-like descriptions.

### Behavioural signals

Use only legitimately available and appropriate signals. Do not make invasive device/network fingerprinting a core dependency.

---

# 15. Coordinated Fraud Architecture

```text
                 ALL REPORTS
                      ↓
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       IMAGE       TIME         LOCATION
       GRAPH       GRAPH          GRAPH
          │           │           │
          └───────────┼───────────┘
                      ↓
             Feature Extraction
                      ↓
          ┌──────────────────────┐
          │ Isolation Forest     │
          │ + Spatial/Temporal   │
          │   Clustering         │
          └──────────┬───────────┘
                     ↓
             Coordination Risk
                     ↓
       ┌─────────────┴─────────────┐
       ↓                           ↓
  Normal cluster             Suspicious cluster
       ↓                           ↓
 Continue analysis             QUARANTINE
```

Use:

- Isolation Forest for aggregate anomaly detection;
- DBSCAN/HDBSCAN for spatial-temporal clustering;
- pHash/embeddings for evidence linkage;
- PostGIS for spatial queries.

Flag **reports/events**, not people as criminals.

---

# 16. Independent Evidence Convergence

Report count alone is not enough.

### Strong corroboration

```text
Citizen A → Image A → Location X
Citizen B → Image B → Location X + 300m
Citizen C → Image C → Location X
Citizen D → Image D → Location X + 500m

Different images
Different accounts
Nearby locations
Similar time
High CV confidence
High environmental risk

        ↓

STRONG EVENT EVIDENCE
```

### Suspicious coordination

```text
30 accounts
    ↓
same image / cropped variants
    ↓
2-minute submission burst
    ↓
weak CV evidence
    ↓
environmental risk LOW
    ↓
HIGH COORDINATION RISK
    ↓
QUARANTINE
```

The system should prefer **independent evidence convergence** over raw report volume.

---

# 17. Stage I — Observed Impact Score

Estimate what appears to be affected:

```text
visible_landslide_extent
road_blockage
debris_severity
structure_damage
vegetation_loss
water_mud_presence
```

Output:

```text
observed_impact_score: 0–100
```

This is an **observed impact estimate**, not a prediction of future consequences.

---

# 18. Stage J — Exposure Analysis

PostGIS should determine proximity/intersection with:

- road segments;
- villages;
- population estimates;
- hospitals;
- schools;
- critical infrastructure;
- evacuation routes;
- major connectivity corridors.

Example:

```text
Landslide location
       ↓
Road within 80m
Village within 1.2km
Hospital within 5.4km
Highway segment potentially affected
       ↓
HIGH EXPOSURE
```

Hazard risk and exposure remain separate concepts.

---

# 19. Stage K — Existing XGBoost Risk

Retrieve the environmental risk for the citizen GPS location.

Existing architecture:

```text
Model 1
Static terrain/geology/history
        ↓
Base Susceptibility

Model 2
Base Susceptibility
+ rainfall
+ soil moisture
+ forecast
        ↓
Dynamic Environmental Risk
```

The citizen layer provides additional observed evidence.

---

# 20. Response Priority Engine

Fuse:

```text
Environmental Risk
        +
Observed Visual Impact
        +
Exposure
        +
Credible Corroboration
```

Use credibility/coordination as **gating/modulating signals**, not as a reason to increase danger merely because many reports exist.

Conceptual logic:

```text
IF credibility LOW:
    reduce citizen-evidence contribution
    keep environmental risk unchanged

IF coordination risk HIGH:
    quarantine cluster
    do not trigger public alert

IF credibility HIGH
AND CV confidence HIGH
AND environmental risk HIGH:
    increase incident priority

IF multiple independent reports corroborate:
    increase confidence
```

Do not arbitrarily claim these rules are scientifically optimal; validate weights/thresholds using reviewed cases.

---

# 21. Keep Scores Separate

Do not create an opaque single AI score.

Store:

```text
environmental_risk_score       0–100
image_confidence_score         0–100
report_credibility_score       0–100
coordination_risk_score        0–100
observed_impact_score          0–100
exposure_score                 0–100
response_priority_score        0–100
```

The UI may display a simplified:

```text
DANGER / RESPONSE PRIORITY
        88 / 100
```

but authorities must be able to inspect the components and explanations.

**Danger score is a system score, not a probability unless calibrated accordingly.**

---

# 22. Alert State Machine

Never implement:

```text
Citizen upload → PUBLIC ALERT
```

Use:

```text
PENDING
   ↓
AI_ANALYSIS
   ↓
┌──────────────┬─────────────────┐
↓              ↓                 ↓
SUSPICIOUS   CREDIBLE         NEEDS_EVIDENCE
↓              ↓
QUARANTINE   IMPACT_ANALYSIS
                  ↓
             AUTHORITY_REVIEW
                  ↓
          ┌───────┼────────┐
          ↓       ↓        ↓
        APPROVE  REJECT   HOLD
          ↓
       ACTIVE ALERT
```

This maintains human-in-the-loop control.

---

# 23. API Design

## Submit report

```http
POST /api/v1/citizen/reports
```

Multipart fields:

```text
image
latitude
longitude
captured_at
incident_type
description
```

Response:

```json
{
  "report_id": "uuid",
  "status": "PENDING_ANALYSIS"
}
```

## Get report

```http
GET /api/v1/citizen/reports/{report_id}
```

## Get analysis

```http
GET /api/v1/citizen/reports/{report_id}/analysis
```

Example:

```json
{
  "report_id": "uuid",
  "status": "AUTHORITY_REVIEW",
  "environmental_risk": 76,
  "image_confidence": 94,
  "credibility": 93,
  "observed_impact": 86,
  "exposure": 91,
  "response_priority": 88,
  "coordination_risk": 8
}
```

## Authority review

```http
POST /api/v1/authority/reports/{report_id}/review
```

Decisions:

```text
APPROVE
REJECT
REQUEST_MORE_EVIDENCE
```

---

# 24. Database Design

## citizen_reports

```text
id
user_id
latitude
longitude
captured_at
submitted_at
incident_type
description
status
created_at
updated_at
```

## report_images

```text
id
report_id
object_storage_key
sha256
phash
image_width
image_height
mime_type
metadata_json
```

## cv_results

```text
id
report_id
model_version
landslide_confidence
segmentation_confidence
visible_area_fraction
road_blockage
debris_score
structure_damage_score
created_at
```

## credibility_results

```text
id
report_id
image_quality_score
image_reuse_score
gps_consistency_score
temporal_consistency_score
environmental_consistency_score
credibility_score
model_version
```

## coordination_results

```text
id
report_id
cluster_id
coordination_risk
cluster_size
visual_similarity_score
temporal_burst_score
spatial_cluster_score
model_version
```

## impact_results

```text
id
report_id
observed_impact_score
exposure_score
environmental_risk_score
response_priority_score
explanation_json
```

Every inference must retain model/version information.

---

# 25. Async Processing

Image processing must not block the mobile API request.

```text
Mobile
  ↓
FastAPI
  ↓
Store image
  ↓
Create report
  ↓
Redis
  ↓
Celery
  ├── quality
  ├── duplicate
  ├── CV
  ├── GIS
  ├── fraud
  └── impact
          ↓
       Database
          ↓
     Authority UI
```

This allows scaling and keeps API latency low.

---

# 26. Remote-Sensing vs Citizen-Photo Models

Keep these pipelines separate.

### Citizen photographs

```text
Ground-level phone image
↓
MobileNetV3/EfficientNet
↓
SegFormer
```

### Satellite/remote sensing

```text
Sentinel-1/2
↓
Remote-sensing model such as TerraFM
↓
Regional landslide/change evidence
```

Remote-sensing models are not automatically suitable for ordinary phone photographs.

Both pipelines can provide complementary evidence.

---

# 27. Security and Abuse Controls

Implement:

- authenticated submissions;
- rate limiting;
- file-size limits;
- MIME/content validation;
- malware scanning where available;
- report throttling;
- duplicate detection;
- suspicious-cluster quarantine;
- audit logs;
- authority-only alert activation;
- model/version logging.

Avoid making sensitive personal data or invasive fingerprinting central to fraud detection.

Do not expose internal fraud thresholds in a way that makes the system easy to bypass.

---

# 28. Offline / Low-Connectivity Integration

Citizen app:

```text
No Internet
    ↓
Capture report
    ↓
Encrypted local queue
    ↓
GPS + timestamp preserved
    ↓
Connectivity returns
    ↓
Automatic upload
```

Field sensors:

```text
Soil sensor
    ↓
LoRa/LoRaWAN
    ↓
Local gateway
    ↓
Store-and-forward
    ↓
Internet available
    ↓
GARUD DRISHTI backend
```

Large images should be deferred until connectivity returns. Small emergency metadata can use low-bandwidth channels.

---

# 29. MVP Scope

## Phase 1 — SIH core

- React Native photo/GPS submission;
- FastAPI report API;
- image storage;
- OpenCV quality checks;
- pHash duplicate detection;
- MobileNetV3/EfficientNet landslide classifier;
- SegFormer segmentation;
- PostGIS location analysis;
- existing XGBoost risk lookup;
- basic credibility scoring;
- observed impact scoring;
- authority review;
- response priority calculation.

## Phase 2 — Differentiator

- CLIP/SigLIP similarity;
- independent-report corroboration;
- DBSCAN/HDBSCAN spatial-temporal clustering;
- Isolation Forest coordination anomaly detection;
- road blockage classifier;
- improved impact classification.

## Phase 3 — Advanced

- stronger image-forensics model;
- dedicated damage detection;
- satellite cross-validation;
- Sentinel-1 deformation/change evidence;
- learned credibility model from reviewed reports;
- calibrated response-priority model;
- field-sensor corroboration.

Do not claim Phase 2/3 components as implemented until they actually exist.

---

# 30. Training Strategy

Build a landslide-specific dataset containing:

```text
LANDSLIDE
NON_LANDSLIDE
```

with variation in:

- lighting;
- rain;
- fog;
- camera angle;
- road scenes;
- vegetation;
- rocks;
- mud;
- construction;
- mountains;
- unrelated disaster scenes.

For segmentation, use pixel-level landslide masks.

For impact, where labels exist:

```text
road_blocked
road_clear
structure_damage
no_structure_damage
high_debris
low_debris
```

For fraud, collect reviewed examples:

```text
original
reused
edited
irrelevant
AI-generated
duplicate
coordinated
legitimate corroboration
```

Do not claim production-grade fraud detection without evaluation data.

---

# 31. Evaluation

## Classifier

Track:

- precision;
- recall;
- F1;
- ROC-AUC;
- confusion matrix.

## Segmentation

Track:

- IoU;
- Dice/F1;
- precision;
- recall.

## Credibility

Track:

- precision/recall;
- PR-AUC;
- calibration;
- false-positive rate.

## Coordination detection

Track:

- precision of flagged clusters;
- false alarm rate;
- detection rate on simulated coordinated campaigns.

Test scenarios should include:

```text
same image + many accounts
different crops + many accounts
same-time burst
spatially concentrated reports
unrelated images
genuine independent corroboration
```

These are controlled evaluation scenarios, not assumptions about real attackers.

---

# 32. Explainability

Authority-facing analysis should answer:

### Why is the report credible?

```text
✓ Strong landslide CV confidence
✓ GPS lies in relevant terrain
✓ Image not found as duplicate
✓ Timestamp consistent when available
✓ 3 independent nearby reports
✓ Environmental risk HIGH
```

### Why is it suspicious?

```text
⚠ Image highly similar to existing evidence
⚠ Large burst of reports in a short period
⚠ Weak environmental consistency
⚠ Same visual evidence across accounts
→ Cluster quarantined
```

Avoid displaying only:

```text
Fraud score = 91
```

The evidence behind the score matters.

---

# 33. Final Reference Architecture

```text
                         GARUD DRISHTI
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
 ENVIRONMENTAL INTELLIGENCE                  CITIZEN INTELLIGENCE
          │                                         │
 GSI / ISRO / DEM / Rainfall                 Photo + GPS + Time
 Soil Moisture / Satellite                           │
          │                                ┌─────────┴─────────┐
          ▼                                │                   │
 Model 1 — XGBoost                   Image Validation    Report Signals
 Base Susceptibility                       │                   │
          │                                ▼                   │
          ▼                           CV Pipeline              │
 Model 2 — XGBoost                    │                        │
 Dynamic Risk                         ├─ Classifier             │
          │                           ├─ Segmentation           │
          │                           └─ Impact                 │
          │                                │                   │
          │                                ▼                   ▼
          │                         Evidence Features    Fraud Features
          │                                │                   │
          │                                └─────────┬─────────┘
          │                                          ▼
          │                                  Credibility Engine
          │                                          │
          │                                  XGBoost / Rules
          │                                          │
          │                                          ▼
          │                              Coordinated Fraud Engine
          │                               Isolation Forest +
          │                              Spatial/Temporal Clustering
          │                                          │
          └──────────────────────┬───────────────────┘
                                 ▼
                         POSTGIS EXPOSURE
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
                Roads         Villages       Critical Assets
                  │              │              │
                  └──────────────┼──────────────┘
                                 ▼
                       RESPONSE PRIORITY ENGINE
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
          Environmental       Credibility     Observed Impact
               Risk               │                │
                └────────────────┼────────────────┘
                                 ▼
                       DANGER / PRIORITY SCORE
                                 │
                                 ▼
                         AUTHORITY REVIEW
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
                  APPROVE      REJECT       HOLD
                    │
                    ▼
              WARNING / RESPONSE
```

---

# 34. Core Innovation

The Citizen AI module can be described as:

> **“GARUD DRISHTI converts crowdsourced photographs into verified geospatial intelligence by combining computer vision, image authenticity analysis, coordinated-report detection, GPS/GIS consistency, environmental risk, and infrastructure exposure.”**

The broader system innovation is:

> **Predict the hazard → verify the evidence → identify the impact → prioritize the response.**

---

# 35. Implementation Rules for the Coding Agent

1. Do not invent trained-model accuracy.
2. Do not call generic pretrained weights a landslide detector unless fine-tuned for landslide classification.
3. Do not treat missing EXIF as fraud.
4. Do not treat visual similarity as proof of fraud.
5. Do not treat report count alone as credibility.
6. Do not allow a citizen report to directly activate a public emergency alert.
7. Keep environmental risk, credibility, observed impact, exposure and response priority separate.
8. Record model versions with every inference.
9. Keep expensive image processing asynchronous.
10. Prefer local/open-source inference for the SIH prototype.
11. Preserve human authority review as the operational gate.
12. Treat coordinated fraud as a cluster/event-level problem, not only an account-level problem.
13. Never expose internal fraud-detection thresholds unnecessarily.
14. Make the system auditable: every score should have supporting signals.
15. Build the simplest reliable MVP first; add advanced models only after the base pipeline works.
