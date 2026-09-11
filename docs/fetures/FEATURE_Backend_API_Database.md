# Feature: Backend API & Database Architecture

> **Category:** Infrastructure / Platform  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

NETRA's backend is built on **FastAPI** (Python) for ML/geospatial services with a **Node.js/Express gateway** for auth, validation, and routing. PostgreSQL + PostGIS provides the spatial database, with S3-compatible object storage for media files.

---

## Service Architecture

```text
React / PWA (Frontend)
    ↓
Node/Express Gateway (auth, validation, rate limiting, request IDs, routing)
    ↓
FastAPI Services (Python)
    ├── risk-service
    ├── report-service
    ├── gis-service
    └── ml-service
    ↓
PostgreSQL + PostGIS + Object Storage
```

---

## API Endpoints

### Risk

```http
GET  /api/v1/risk/{latitude}/{longitude}     # Point risk query
GET  /api/v1/risk/grid?bbox=...              # Grid for heatmap
GET  /api/v1/risk/forecast/{zone_id}         # Zone forecast
GET  /api/v1/risk/{cell_id}                  # Cell risk
GET  /api/v1/risk/{cell_id}/explain          # SHAP explanation
```

### Reports

```http
POST /api/v1/reports                         # Submit report
GET  /api/v1/reports                         # List reports
GET  /api/v1/reports/{report_id}             # Get report
POST /api/v1/reports/{id}/verify             # Verify report
```

### Alerts

```http
GET  /api/v1/alerts                          # List alerts
POST /api/v1/alerts                          # Create alert
POST /api/v1/alerts/{id}/acknowledge         # Acknowledge
POST /api/v1/alerts/{id}/resolve             # Resolve
```

### Infrastructure

```http
GET  /api/v1/roads/risk                      # Road risk data
GET  /api/v1/villages/risk                   # Village risk data
GET  /api/v1/assets/nearby                   # Nearby critical assets
GET  /api/v1/hotspots                        # Report clusters
GET  /api/v1/dashboard/summary              # Dashboard KPIs
```

---

## Risk API Internal Flow

```text
GET /risk?lat=X&lon=Y
    ↓
Validate coordinates
    ↓
Find spatial cell
    ↓
Load static features
    ↓
Load latest dynamic features
    ↓
Calculate / retrieve base susceptibility
    ↓
Build feature vector
    ↓
Dynamic XGBoost inference
    ↓
Calculate forecast horizons
    ↓
SHAP explanation
    ↓
Risk response
```

---

## Database Schema

### PostgreSQL + PostGIS Tables

```text
# Auth & Access
users, roles, permissions

# Geospatial Core
landslide_inventory, terrain_features, risk_cells

# Observations
dynamic_observations, weather_observations
rainfall_observations, soil_moisture_observations
satellite_observations

# Infrastructure
roads, villages, infrastructure

# Reports
citizen_reports, report_media

# Alerts
alerts, alert_recipients, alert_delivery_log

# ML Tracking
model_versions, prediction_logs, feature_versions
data_quality_records

# Audit
audit_logs, risk_states
```

---

## Caching (Redis)

Use Redis for:
- Latest risk values
- Frequently requested map tiles/data
- API response caching
- Alert deduplication
- Session/token-related transient data

```text
GET /risk/27.33/88.61 → Redis hit → Return quickly
```

---

## Object Storage

Large media files (citizen photos/videos) go to S3-compatible object storage:

```text
PostgreSQL → report metadata (media_url, media_type, uploaded_at)
Object Storage → actual photo/video files
```

Never store large blobs directly in PostgreSQL.

---

## Technology Stack

### Backend
```text
Python, FastAPI, Pandas, NumPy, GeoPandas, Rasterio, GDAL
Scikit-learn, XGBoost, SHAP
PostgreSQL, PostGIS
```

### Frontend
```text
React, TypeScript, Tailwind CSS
MapLibre GL JS / Leaflet
Recharts / ECharts
```

### Gateway
```text
Node.js, Express, TypeScript
```

### Mobile
```text
React Native + Expo (or PWA)
```

---

## Security Requirements

- HTTPS everywhere
- JWT / OAuth2 authentication
- Secure password hashing (Argon2 / bcrypt)
- RBAC (role-based access control)
- Input validation on all endpoints
- Rate limiting
- File type validation for uploads
- Malware scanning for uploads
- Secure object storage configuration
- Audit logging for all authority actions
- Database backups
- Secrets stored outside source code (never commit API keys, DB passwords, JWT secrets)

---

## Audit Logging

Every important authority action is logged:

```text
User, Action, Timestamp, Location, Old value, New value, Reason
```

Especially: alert creation, alert cancellation, report verification, risk override, user-role changes.

---

## Cloud Deployment Architecture

```text
                     INTERNET
                         │
              ┌──────────▼──────────┐
              │ Load Balancer / API  │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ FastAPI Backend      │
              └──────────┬──────────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
  PostgreSQL          Redis            Object Storage
   + PostGIS                           images/raster
```

---

## Repository Structure

```text
netra/
├── apps/authority-dashboard/
├── apps/citizen-app/
├── services/gateway/
├── services/risk-service/
├── services/report-service/
├── services/gis-service/
├── ml/data/
├── ml/training/
├── ml/evaluation/
├── ml/inference/
├── ml/models/
├── data-pipeline/raw/
├── data-pipeline/processed/
├── db/migrations/
├── contracts/openapi.yaml
├── infra/docker-compose.yml
└── docs/
```

---

## References

- Sections 47–53, 68–73 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 14 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 12 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
