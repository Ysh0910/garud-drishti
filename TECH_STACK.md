# NER Landslide Early Warning System — Technology Stack

## 1. Project Overview

A production-oriented AI and GIS platform for landslide susceptibility, dynamic risk prediction, early warning, citizen reporting, and authority response prioritisation across the North Eastern Region (NER) of India.

Core architecture:

```text
Citizen Mobile App ─────┐
                        ├── API Gateway / FastAPI ── PostgreSQL + PostGIS
Authority Web Dashboard ─┤             │
                        │             ├── Risk Engine
                        │             ├── Alert Engine
                        │             ├── Chatbot / AI Assistant
                        │             └── External Data Providers
                        │
                        └── Object Storage

External Data:
GSI / ISRO / IMD / GPM / SMAP / Sentinel / DEM / OSM
                         ↓
                  Data Ingestion Layer
                         ↓
                  Feature Engineering
                         ↓
              XGBoost Susceptibility Model
                         ↓
               XGBoost Dynamic Risk Model
                         ↓
                    GIS Risk Grid
                         ↓
             Dashboard / App / Alerts
```

---

# 2. Recommended Stack at a Glance

| Layer | Recommended technology | Purpose |
|---|---|---|
| Citizen mobile app | **Flutter + Dart** | Android/iOS citizen application |
| Authority dashboard | **React + TypeScript + Vite** | Operations dashboard |
| GIS web map | **MapLibre GL JS** | Interactive risk/heatmap map |
| Charts | **Apache ECharts** | Risk trends, rainfall and KPIs |
| Backend API | **Python + FastAPI** | REST APIs and AI integration |
| ML | **XGBoost** | Susceptibility + dynamic risk |
| ML preprocessing | **Pandas, NumPy, scikit-learn** | Cleaning, transformations, validation |
| Explainability | **SHAP** | Model explanations |
| Geospatial Python | **GeoPandas, Rasterio, Shapely, GDAL** | Raster/vector processing |
| Database | **PostgreSQL + PostGIS** | Spatial + application data |
| Cache/queue | **Redis** | Caching, jobs, rate limiting |
| Background jobs | **Celery + Redis** or equivalent | Data ingestion and risk updates |
| Satellite/data processing | **Python + GDAL/Rasterio** | Sentinel/DEM/raster processing |
| Object storage | **S3-compatible storage** | Images, videos, satellite files, model artifacts |
| Authentication | **OAuth2/OIDC + JWT** | Secure authentication and RBAC |
| Notifications | **FCM + SMS provider/government gateway** | Push and SMS alerts |
| Chatbot | **LLM + tool/function calling** | Natural-language risk assistant |
| API documentation | **OpenAPI/Swagger** | Developer integration |
| Containers | **Docker** | Reproducible deployment |
| Reverse proxy | **Nginx** | HTTPS, routing and static delivery |
| CI/CD | **GitHub Actions** | Automated testing/deployment |
| Monitoring | **Prometheus + Grafana + structured logs** | Observability |
| Testing | **Pytest + Vitest/React Testing Library + Flutter tests** | Automated testing |
| Version control | **Git + GitHub** | Collaboration |

---

# 3. Why This Stack Fits the Project

The project is not only an ML application. It has four major workloads:

1. **Mobile field/citizen interaction**
2. **Authority GIS operations**
3. **Geospatial AI and data engineering**
4. **Real-time/near-real-time risk and alert processing**

Python is therefore the central backend/ML language, while Flutter handles the cross-platform citizen application and React/TypeScript handles the authority dashboard.

The architecture deliberately separates:

```text
Frontend
Backend
ML
Data ingestion
GIS
Notifications
Infrastructure
```

This prevents the mobile app or dashboard from becoming tightly coupled to individual satellite/weather providers.

---

# 4. Citizen Mobile App

## Recommended

**Flutter + Dart**

Why:

- One codebase for Android and iOS
- Strong geolocation support
- Camera/media support
- Offline-first architecture is practical
- Good map integration
- Fast UI development
- Suitable for a student/SIH team with limited manpower

## Main screens

```text
Splash / onboarding
      ↓
Home
 ├── Current Risk
 ├── Nearby Risk Map
 ├── Forecast Risk
 ├── Alerts
 ├── Report Hazard
 ├── My Reports
 └── Chatbot
```

## Important packages/concepts

Use maintained Flutter packages for:

- location
- camera
- image picker
- secure local storage
- network connectivity
- background/offline synchronization
- maps
- push notifications

Do not lock the app to one map provider unless required.

---

# 5. Citizen App Features

### Risk map

Display:

```text
Current risk
6h risk
24h risk
48h risk
72h risk
```

### Hazard reporting

Citizen can submit:

```text
GPS location
Photo
Video
Category
Description
Severity
Timestamp
```

### Offline mode

Recommended flow:

```text
No network
   ↓
Save report locally
   ↓
Mark pending sync
   ↓
Network returns
   ↓
Upload automatically
```

### Push notifications

Use Firebase Cloud Messaging (FCM) for application notifications.

### SMS

Use an approved SMS provider/gateway for production. Development should use a mock SMS provider.

---

# 6. Authority Dashboard Web App

## Recommended

```text
React
TypeScript
Vite
MapLibre GL JS
Apache ECharts
```

Why React/TypeScript:

- Component-based architecture
- Strong ecosystem
- Type safety
- Excellent dashboard support
- Easy API integration
- Good GIS library compatibility

## Dashboard layout

```text
┌──────────────────────────────────────────┐
│ Header / State / District / User         │
├─────────────┬────────────────────────────┤
│             │                            │
│ KPI cards   │                            │
│             │       GIS MAP              │
│ Filters     │       HEATMAP              │
│             │                            │
├─────────────┼────────────────────────────┤
│ Alerts      │ Risk / rainfall charts     │
│ Incidents   │ Forecast / explanation      │
└─────────────┴────────────────────────────┘
```

---

# 7. Dashboard GIS

## Map engine

**MapLibre GL JS** is recommended for the web GIS layer.

Potential layers:

```text
Base map
Susceptibility heatmap
Current risk
6h risk
24h risk
48h risk
72h risk
Historical landslides
Citizen reports
Roads
Villages
Hospitals
Schools
Bridges
Rainfall
Soil moisture
Satellite change
```

## Heatmap architecture

```text
Spatial grid
    ↓
Model prediction
    ↓
PostGIS risk_cells
    ↓
Vector/raster tiles
    ↓
MapLibre
```

Do not send the entire NER as millions of GeoJSON polygons to the browser.

Use:

- vector tiles
- raster tiles
- spatial indexes
- zoom-dependent resolution
- bounding-box queries

---

# 8. GIS Data Stack

Use:

```text
PostGIS
GeoPandas
Shapely
Rasterio
GDAL
PROJ
```

Responsibilities:

| Tool | Responsibility |
|---|---|
| PostGIS | Spatial database and queries |
| GeoPandas | Tabular geospatial processing |
| Shapely | Geometry operations |
| Rasterio | Raster reading/writing |
| GDAL | Raster/vector conversion and processing |
| PROJ | Coordinate transformations |

---

# 9. Backend

## Recommended

**Python + FastAPI**

Why:

- Native Python ML integration
- Excellent async support
- Automatic OpenAPI documentation
- Pydantic validation
- Easy integration with GeoPandas/XGBoost
- Good performance for an API service

Backend modules:

```text
backend/
├── api/
├── auth/
├── users/
├── risk/
├── gis/
├── reports/
├── alerts/
├── chatbot/
├── providers/
├── jobs/
└── common/
```

---

# 10. API Design

Use versioned REST APIs:

```text
/api/v1/...
```

Core endpoints:

```http
GET  /api/v1/risk/{latitude}/{longitude}
GET  /api/v1/risk/grid
GET  /api/v1/risk/forecast/{zone_id}

POST /api/v1/reports
GET  /api/v1/reports
GET  /api/v1/reports/{report_id}

GET  /api/v1/alerts
POST /api/v1/alerts

GET  /api/v1/roads/risk
GET  /api/v1/villages/risk
GET  /api/v1/dashboard/summary
```

FastAPI should be the only public interface used by frontend applications for project data.

---

# 11. Database

## PostgreSQL + PostGIS

This is the primary database.

Use PostgreSQL for:

- users
- roles
- reports
- alerts
- observations
- model metadata

Use PostGIS for:

- points
- lines
- polygons
- spatial joins
- distance queries
- risk grids
- road/village proximity

Recommended spatial indexes:

```sql
CREATE INDEX ... USING GIST (geom);
```

Do not run large spatial queries without appropriate indexes.

---

# 12. Redis

Use Redis for:

- caching current risk responses
- session/temporary state where appropriate
- rate limiting
- background job broker
- short-lived alert state

Do not use Redis as the authoritative database.

---

# 13. Background Processing

Recommended:

**Celery + Redis**

Use workers for:

```text
IMD ingestion
GPM ingestion
SMAP ingestion
Sentinel processing
feature updates
risk-grid generation
alert evaluation
notification sending
image processing
```

The web API should not block while a large satellite processing job is running.

---

# 14. AI / ML Stack

## Core model

**XGBoost**

Use two models:

```text
Model 1 → Base susceptibility
Model 2 → Dynamic risk
```

### Model 1

Features:

```text
elevation
slope
aspect
curvature
landcover
geology
geomorphology
hydrological condition
distance to drainage
historical landslide density
distance to historical landslide
```

### Model 2

Features:

```text
base susceptibility
rainfall 1h
rainfall 3h
rainfall 6h
rainfall 12h
rainfall 24h
rainfall 72h
rainfall 7d
soil moisture
forecast rainfall where valid
```

---

# 15. ML Libraries

```text
Python
Pandas
NumPy
scikit-learn
XGBoost
SHAP
```

Use scikit-learn for:

- preprocessing
- train/test splitting
- metrics
- calibration
- pipelines

Use SHAP for explainability.

---

# 16. Satellite and Remote Sensing Stack

Sources:

```text
Sentinel-2
Sentinel-1
SRTM
GPM IMERG
SMAP
```

Processing:

```text
Rasterio
GDAL
GeoPandas
NumPy
Shapely
```

Potential Sentinel-2 features:

```text
NDVI
land-cover class
vegetation change
surface disturbance
```

Potential Sentinel-1 features:

```text
SAR backscatter change
deformation indicators
```

Do not implement sophisticated InSAR processing unless it can be validated properly.

---

# 17. Weather/Data Provider Layer

Create provider interfaces:

```text
providers/
├── imd.py
├── gpm.py
├── smap.py
├── sentinel.py
└── mock.py
```

Conceptual interface:

```python
class RainfallProvider:
    def get_rainfall(...): ...
```

The risk engine should depend on the interface, not directly on IMD/GPM implementation details.

This allows providers to be replaced without rewriting the model/API.

---

# 18. Data Pipeline

```text
External source
      ↓
Ingestion
      ↓
Raw storage
      ↓
Validation
      ↓
Processing
      ↓
Feature engineering
      ↓
Feature store / PostGIS
      ↓
Model inference
      ↓
Risk grid
```

Raw files must remain immutable.

---

# 19. Data Storage

Recommended:

```text
PostgreSQL/PostGIS → structured and spatial operational data
S3-compatible object storage → large files
Git → source code/configuration
```

Object storage should contain:

```text
citizen media
satellite products
DEM files
model artifacts
large exports
```

Do not put large raw satellite files inside PostgreSQL.

---

# 20. Authentication and Authorization

Use:

```text
OAuth2 / OpenID Connect where available
JWT access tokens
RBAC
```

Roles:

```text
SUPER_ADMIN
DISTRICT_ADMIN
DISASTER_MANAGEMENT_OFFICER
FIELD_OFFICER
ANALYST
VIEW_ONLY
CITIZEN
```

Permissions should be enforced on the backend, not only hidden in the frontend.

---

# 21. Security

Minimum:

```text
HTTPS
secure password hashing
JWT/OIDC
RBAC
rate limiting
input validation
secure uploads
secret management
audit logging
backups
```

Secrets belong in:

```text
environment variables
secret manager
```

Never commit:

```text
API keys
DB passwords
JWT secrets
SMS credentials
cloud credentials
```

---

# 22. Chatbot / AI Assistant

The chatbot should be a **tool-using assistant**, not a second prediction model.

Architecture:

```text
User
 ↓
LLM
 ↓
Tool selection
 ├── Risk API
 ├── Forecast API
 ├── Alert API
 ├── Road API
 ├── Report API
 └── Safety knowledge
 ↓
Grounded response
```

The chatbot must retrieve actual backend values.

It must not invent:

```text
risk
rainfall
alerts
sensor readings
government orders
evacuation instructions
```

For critical warnings, prefer approved templates over unrestricted generation.

---

# 23. Notifications

## Push

Use:

```text
Firebase Cloud Messaging
```

## SMS

Use an authorized SMS gateway/provider suitable for the deployment context.

Development:

```text
SMS_MODE=mock
```

Production SMS must not be accidentally reachable from development.

---

# 24. Offline Sync

Citizen app:

```text
SQLite/local database
        ↓
Offline report queue
        ↓
Connectivity detected
        ↓
Upload API
        ↓
Server confirmation
        ↓
Mark synced
```

Use local storage for temporary offline state, not as the authoritative server database.

---

# 25. File and Media Storage

Recommended:

```text
S3-compatible object storage
```

Store metadata in PostgreSQL:

```text
report_id
object_key
content_type
size
uploaded_at
checksum
```

Validate:

- MIME type
- file size
- extension
- upload authorization

---

# 26. Observability

Recommended:

```text
Prometheus
Grafana
structured JSON logs
```

Monitor:

```text
API latency
model inference latency
ingestion failures
data freshness
stale provider rate
alert delivery success
worker failures
CPU/memory
```

---

# 27. Testing Stack

Backend:

```text
pytest
httpx
```

Frontend:

```text
Vitest
React Testing Library
```

Mobile:

```text
Flutter unit/widget/integration tests
```

Data/ML:

```text
pytest
scikit-learn metrics
schema/data-quality tests
```

Critical tests:

```text
rainfall aggregation
future target generation
spatial joins
risk calculation
alert thresholds
RBAC
API validation
offline synchronization
```

---

# 28. CI/CD

Use:

```text
GitHub
GitHub Actions
Docker
```

Pipeline:

```text
Pull Request
 ↓
Lint
 ↓
Unit tests
 ↓
Type checks
 ↓
Build
 ↓
Integration tests
 ↓
Deploy staging
 ↓
Approval
 ↓
Production
```

ML models should be versioned separately from application releases where practical.

---

# 29. Containerization

Use Docker for:

```text
FastAPI
worker
PostgreSQL/PostGIS
Redis
frontend build
```

Development orchestration:

```text
Docker Compose
```

Production orchestration can begin with managed container services and move to Kubernetes only if scale requires it.

**Do not introduce Kubernetes for the SIH MVP unless the team genuinely needs it.**

---

# 30. Deployment Strategy

Recommended SIH architecture:

```text
Cloud VM / Container platform
        ↓
Nginx
        ↓
FastAPI
 ├── Redis
 ├── PostgreSQL/PostGIS
 └── Worker

Object storage
        ↑
Citizen media / satellite files

React dashboard → FastAPI
Flutter app → FastAPI
```

For a prototype, a small number of services is preferable to excessive microservices.

---

# 31. Microservices Decision

Do not split everything into microservices initially.

Start with:

```text
Frontend
Backend API
Worker
Database
Redis
Object storage
```

Only separate services when there is a clear scaling or ownership reason.

Possible future separation:

```text
risk-service
satellite-service
notification-service
chatbot-service
```

---

# 32. Maps and Base Maps

Use a map rendering provider or self-hosted tiles appropriate to the deployment.

Do not overload public OpenStreetMap tile servers.

OSM is primarily an exposure/geographic data source for:

```text
roads
settlements
POIs
```

It is not itself a landslide hazard predictor.

---

# 33. Risk Grid Data Model

Example PostGIS table:

```text
risk_cells
----------
cell_id
geom
base_susceptibility
current_risk
risk_6h
risk_24h
risk_48h
risk_72h
updated_at
model_version
data_quality
```

Spatial index:

```text
GIST(geom)
```

---

# 34. Alert Data Model

```text
alerts
------
alert_id
severity
area_geometry
created_at
updated_at
risk_score
forecast_horizon
status
model_version
```

Delivery:

```text
alert_recipients
alert_delivery_log
```

This provides an audit trail.

---

# 35. Model Registry

Recommended structure:

```text
models/
├── susceptibility/
│   ├── v1/
│   └── v2/
└── dynamic/
    ├── v1/
    └── v2/
```

Each model records:

```text
model version
dataset version
feature schema version
training timestamp
code commit
validation metrics
thresholds
```

---

# 36. Recommended Repository

```text
project/
│
├── apps/
│   ├── citizen-mobile/
│   └── authority-web/
│
├── backend/
│   ├── api/
│   ├── auth/
│   ├── risk/
│   ├── gis/
│   ├── reports/
│   ├── alerts/
│   ├── chatbot/
│   ├── providers/
│   └── jobs/
│
├── ml/
│   ├── preprocessing/
│   ├── feature_engineering/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── explainability/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── final/
│
├── models/
├── configs/
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── ci/
│
├── tests/
├── docs/
└── AGENTS.md
```

---

# 37. Suggested Frontend Libraries

## React dashboard

Recommended:

```text
React
TypeScript
Vite
React Router
TanStack Query
Zustand or Redux Toolkit
MapLibre GL JS
Apache ECharts
Tailwind CSS or another consistent UI system
```

Use TanStack Query for server-state caching rather than putting every API response into global state.

Use Zustand for lightweight local UI state if needed.

---

# 38. Suggested Flutter Architecture

```text
lib/
├── core/
├── features/
│   ├── home/
│   ├── risk_map/
│   ├── reports/
│   ├── alerts/
│   ├── chatbot/
│   └── profile/
├── data/
├── domain/
└── presentation/
```

Prefer feature-based organization over one giant `screens/` folder.

---

# 39. Recommended State Management

Flutter:

```text
Riverpod
```

React:

```text
TanStack Query + Zustand
```

The exact state library can be changed if the team already has strong expertise elsewhere.

---

# 40. API Contracts

Maintain OpenAPI schemas for frontend/backend communication.

Important DTOs:

```text
RiskResponse
ForecastResponse
RiskGridFeature
CitizenReport
Alert
User
DashboardSummary
```

Do not make frontend developers infer API structures from backend implementation.

---

# 41. Error Handling

Standardize API errors:

```json
{
  "error": {
    "code": "RISK_DATA_STALE",
    "message": "Current rainfall data are temporarily unavailable.",
    "request_id": "..."
  }
}
```

Never expose stack traces to users.

---

# 42. Data Freshness in UI

Always show when risk was updated:

```text
Updated 8 minutes ago
```

If stale:

```text
Data degraded — latest rainfall source unavailable
```

Do not label stale predictions as live.

---

# 43. AI Explainability UI

Dashboard should display:

```text
Risk: CRITICAL

Primary contributors:
• High antecedent rainfall
• High base susceptibility
• High soil moisture
• Steep terrain

Data quality: GOOD
Model: dynamic_xgb_v1
Updated: 10:42 AM
```

Keep explanations concise for operators.

---

# 44. Performance Targets for MVP

These are engineering goals, not guaranteed benchmarks.

Target:

```text
Normal API response: < 500 ms where cached
Single-point model inference: < 100 ms target
Dashboard map initial load: < 3 s target on reasonable connection
Mobile report submission: asynchronous
```

Large raster processing should always run asynchronously.

---

# 45. Offline/Low-Network Design

The citizen app should be resilient to weak connectivity.

Store locally:

```text
queued reports
small compressed thumbnails
last known alerts
last known map state
basic emergency information
```

Do not cache enormous raster datasets on the phone.

---

# 46. Team Ownership

## ML/Data

```text
GSI/ISRO/IMD datasets
feature engineering
XGBoost
validation
SHAP
```

## GIS

```text
DEM
raster processing
PostGIS
heatmap
vector tiles
```

## Backend

```text
FastAPI
PostgreSQL
Redis
RBAC
risk APIs
alerts
```

## Mobile

```text
Flutter
location
camera
offline sync
push notifications
```

## Web

```text
React
MapLibre
charts
authority dashboard
```

## Cloud/DevOps

```text
Docker
CI/CD
object storage
monitoring
deployment
```

---

# 47. Recommended MVP vs Advanced Stack

## MVP

```text
Flutter
React + TypeScript
FastAPI
PostgreSQL + PostGIS
Redis
XGBoost
Pandas / NumPy / scikit-learn
GeoPandas / Rasterio / GDAL
MapLibre
ECharts
FCM
Docker
GitHub Actions
```

## Advanced

```text
Sentinel-1 deformation processing
Sentinel-2 automated change detection
LLM tool-calling chatbot
vector tile infrastructure
advanced observability
model drift detection
automated retraining pipeline
```

---

# 48. What NOT to Use Initially

Avoid unnecessary complexity:

```text
Kubernetes
Kafka
Spark
large microservice mesh
multiple ML frameworks
custom deep-learning model for everything
```

The project does not need these technologies to demonstrate a strong SIH solution.

Introduce them only when scale or a specific requirement justifies them.

---

# 49. Final Recommended Stack

```text
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
├───────────────────────┬─────────────────────────────┤
│ Citizen Mobile        │ Authority Web               │
│ Flutter + Dart        │ React + TypeScript + Vite  │
│ Offline + FCM         │ MapLibre + ECharts         │
└──────────────┬────────┴──────────────┬──────────────┘
               │                       │
               └───────────┬───────────┘
                           ↓
                    FastAPI Backend
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   Risk Engine         Alert Engine       Chatbot
        │                  │                  │
        ↓                  ↓                  ↓
    XGBoost            FCM/SMS          LLM + Tools
        │
        ↓
 PostgreSQL + PostGIS ←→ Redis
        │
        ↓
   GIS Risk Grid
        │
        ↓
  MapLibre Heatmap

External data:
GSI | ISRO | IMD | GPM | SMAP | Sentinel | SRTM | OSM
        ↓
Python ingestion + geospatial processing
        ↓
Feature Store / PostGIS
```

---

# 50. Final Recommendation

For the team's current project, the best balance is:

**Mobile:** Flutter

**Authority Web:** React + TypeScript + Vite

**GIS:** MapLibre GL JS + PostGIS

**Backend:** Python FastAPI

**ML:** XGBoost + scikit-learn + SHAP

**Geospatial:** GeoPandas + Rasterio + GDAL + Shapely

**Database:** PostgreSQL + PostGIS

**Cache/Jobs:** Redis + Celery

**Storage:** S3-compatible object storage

**Notifications:** Firebase Cloud Messaging + approved SMS gateway

**Chatbot:** LLM with backend tool/function calling

**Auth:** OAuth2/OIDC + JWT + RBAC

**DevOps:** Docker + GitHub Actions + Nginx

**Monitoring:** Prometheus + Grafana + structured logs

This stack is intentionally strong enough for a serious prototype while remaining practical for a student team. The architecture should start as a modular monolith plus background workers, not an unnecessarily complex microservice system.

---

# 51. Technology Decision Principle

When selecting a new technology, ask:

```text
Does it solve a real project requirement?
Does it reduce complexity?
Can the team maintain it?
Does it integrate with our Python/GIS/ML stack?
Can we test it locally?
Can we replace it later without rewriting the system?
```

If the answer is no, do not add it merely because it is popular.

---

## End of TECH_STACK.md
