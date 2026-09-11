# Feature: Citizen Reporting System

> **Category:** Observational Evidence / Community Intelligence  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

Citizens and field officers can report ground-level hazard observations — cracks, slope movement, road blockages, rockfalls — via a mobile app. Reports serve as **supporting evidence** in the risk engine, never independently triggering public alerts.

---

## Report Categories

| Category | Description |
|---|---|
| Landslide | Active or recent landslide observed |
| Crack | New or expanding cracks in terrain/structures |
| Road blockage | Road obstructed by debris or displacement |
| Rockfall | Falling rocks or debris |
| Soil movement | Visible soil displacement or creep |
| Flooding | Water accumulation or flash flooding |
| Drainage blockage | Blocked drainage channels |
| Seepage | Water seepage through slopes |
| Infrastructure damage | Damage to bridges, buildings, etc. |
| Road deformation | Road surface displacement |

---

## Report Data Structure

```text
report_id              — Unique identifier
user_id                — Anonymous identifier or authenticated user
latitude               — GPS coordinates
longitude              — GPS coordinates
timestamp              — When the observation was made
category               — Incident type
description            — Free-text description
photo                  — Geo-tagged photograph
video                  — Optional video evidence
severity               — User-assessed severity
status                 — Lifecycle status
```

---

## Citizen Submission Flow

```text
Take photo / select media
    ↓
GPS automatically captured (or PIN on map)
    ↓
Select incident type / category
    ↓
Add optional description
    ↓
Submit
```

Target: **under one minute** from observation to submission.

---

## Report Verification Workflow

Reports do **not** automatically become ground truth. They pass through a verification pipeline:

```text
Citizen report
    ↓
AI pre-screening (optional vision model)
    ↓
Duplicate / spam check
    ↓
Location validation
    ↓
Authority review
    ↓
PENDING → REVIEW → PROBABLE / VERIFIED / REJECTED
```

### Key Rules

- A report **never independently triggers** a public emergency alert
- Verified reports contribute to situational awareness
- Validated outcomes become ground truth for future model improvement
- Rejected reports are preserved for authorized review and audit

---

## Evidence Trust Weighting

Evidence can be weighted by source reliability:

| Source | Trust Level |
|---|---|
| Field officer report | High |
| Verified sensor data | High |
| Validated precursor signal | High |
| Previously verified citizen | Medium |
| New citizen reporter | Lower |

Repeated false reports from a source reduce its trust weight over time.

---

## Vision Model (Phase 2+)

If a validated vision model is available, citizen photos can be classified:

```text
Citizen photo → Image classifier → Evidence score → Human verification → Risk layer
```

Potential classes: `crack`, `soil erosion`, `rockfall`, `landslide`, `blocked road`, `flooding`, `normal`.

**Low confidence → "Needs Review"** (not automatic rejection).

If no validated model exists, the image is stored as evidence for authority review.

---

## Report Clustering & Hotspots (P1)

Multiple reports in spatial/temporal proximity can be clustered to identify emerging hotspots. Prefer spatial/temporal corroboration over a fixed "N reports required" rule.

---

## API Endpoints

```http
POST /api/v1/reports                    # Submit a new report
GET  /api/v1/reports                    # List reports
GET  /api/v1/reports/{report_id}        # Get specific report
POST /api/v1/reports/{id}/verify        # Authority verification
GET  /api/v1/hotspots                   # Report clusters
```

---

## Database Tables

```text
citizen_reports      — Report metadata and status
report_media         — Photos/videos (URLs to object storage)
```

Large media files are stored in S3-compatible object storage, not directly in PostgreSQL.

---

## References

- Sections 35–36, 66–67 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 9 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 8 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
