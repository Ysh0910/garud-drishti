# AI-Based Early Warning and Landslide Risk Monitoring System for NER

> **Smart India Hackathon (SIH) Project Documentation**
>
> **Region:** North Eastern Region (NER) of India  
> **Primary objective:** Predict landslide risk early, visualize vulnerable areas, warn citizens and authorities, and support rapid response.

---

## 1. Project Overview

The proposed system is an **AI-powered geospatial disaster intelligence platform** for landslide-prone areas of India's North Eastern Region.

The system combines:

- Historical landslide inventories
- Terrain and geological information
- Historical and near-real-time rainfall
- Soil-moisture information
- Satellite observations
- AI/ML-based susceptibility and dynamic-risk prediction
- GIS-based risk visualization
- Citizen reports with geo-tagged photos/videos
- Authority dashboards
- Automated alerts
- Multilingual citizen communication
- A chatbot for explaining risk and providing system information
- Offline/low-network synchronization for field use

The core workflow is:

```text
SENSE → ANALYSE → PREDICT → VISUALISE → WARN → PRIORITISE → RESPOND
```

The system is not just a landslide-prediction model. It is an integrated **early-warning and decision-support platform**.

---

# 2. Problem Statement

The North Eastern Region is highly vulnerable to landslides because of:

- Intense and prolonged rainfall
- Fragile and complex geology
- Steep slopes
- Soil saturation
- Erosion
- Road cutting and hill cutting
- Deforestation and land-use changes
- Flash floods
- Seismic and geomorphological processes
- Infrastructure development in unstable terrain

Traditional monitoring can be reactive, manual, spatially limited, or dependent on reports after an event.

The proposed platform aims to move the workflow from:

```text
LANDSLIDE OCCURS
      ↓
PEOPLE REPORT IT
      ↓
AUTHORITIES RESPOND
```

to:

```text
ENVIRONMENTAL SIGNALS
      ↓
AI RISK ANALYSIS
      ↓
EARLY WARNING
      ↓
AUTHORITIES PRIORITISE
      ↓
CITIZENS TAKE PRECAUTIONS
      ↓
FIELD REPORTS IMPROVE SITUATIONAL AWARENESS
```

---

# 3. Main Goals

## 3.1 Primary goals

1. Identify areas intrinsically susceptible to landslides.
2. Continuously estimate current landslide risk.
3. Forecast risk over multiple future horizons.
4. Display risk spatially on an interactive GIS map.
5. Automatically generate alerts when risk thresholds are crossed.
6. Help authorities prioritize roads, villages and infrastructure.
7. Allow citizens and field officials to report cracks, slope movement, blocked roads and landslides.
8. Provide explanations for AI-generated risk scores.
9. Operate under low-network conditions as far as practical.
10. Provide an architecture that can scale from an SIH prototype to a government deployment.

---

# 4. High-Level Architecture

```text
                           DATA SOURCES
                               │
        ┌──────────────────────┼────────────────────────┐
        │                      │                        │
        ▼                      ▼                        ▼
  GSI / ISRO              IMD / GPM                SMAP
  Historical LS           Rainfall                 Soil Moisture
        │                      │                        │
        └──────────────────────┼────────────────────────┘
                               │
                       Satellite / Terrain
                               │
                               ▼
                    ┌────────────────────┐
                    │ DATA INGESTION     │
                    │ & PREPROCESSING    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ PostgreSQL         │
                    │ + PostGIS          │
                    └─────────┬──────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
     Static Feature Store             Dynamic Feature Store
               │                             │
               ▼                             ▼
       ┌───────────────┐             ┌────────────────┐
       │ XGBoost #1    │             │ XGBoost #2     │
       │ Susceptibility│────────────►│ Dynamic Risk   │
       └───────────────┘             └───────┬────────┘
                                             │
                                             ▼
                                    Risk Fusion / Rules
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
                     GIS Map          Authority Dashboard   Alert Engine
                         │                   │                   │
                         ▼                   │                   ├── SMS
                    Citizen App              │                   ├── Push
                                             │                   └── In-app
                                             ▼
                                      Emergency Priority
                                             │
                                             ▼
                                      Field Response
```

---

# 5. Two-Stage AI Architecture

The core ML system consists of **two XGBoost models**.

## Model 1 — Base Susceptibility Model

Purpose:

> Determine how inherently susceptible a location is to landslides based on static or slowly changing characteristics.

Example inputs:

- Elevation
- Slope
- Aspect
- Curvature
- Land cover
- Geology
- Geomorphology
- Hydrological condition
- Distance to drainage
- Historical landslide density
- Distance to historical landslides

Output:

```text
Base Susceptibility = 0–100
```

Example:

```text
Base Susceptibility = 84
```

Interpretation:

> This location has high intrinsic susceptibility, but this does not mean a landslide is currently occurring.

---

## Model 2 — Dynamic Risk Model

Purpose:

> Estimate current and near-future landslide risk by combining intrinsic susceptibility with changing environmental conditions.

Inputs include:

- Base susceptibility
- Recent rainfall
- Antecedent rainfall
- Soil moisture
- Other available dynamic indicators
- Forecast rainfall for future horizons
- Later: satellite-change features
- Later: validated field-report signals

Output:

```text
Current Risk = 0–100
```

and potentially:

```text
Risk within 6h
Risk within 24h
Risk within 48h
Risk within 72h
```

---

# 6. Why XGBoost?

The project uses XGBoost as the primary tabular ML algorithm.

Reasons:

- Strong performance on structured/tabular data
- Handles nonlinear relationships
- Handles interactions between environmental variables
- Works well with heterogeneous geospatial features
- Faster to train than many deep-learning alternatives
- Easier to explain with SHAP
- Suitable for SIH-scale implementation
- Can work effectively without enormous labelled datasets

Deep learning can still be added later for image analysis.

For example:

```text
XGBoost
   ↓
Environmental/geospatial risk

CNN / Vision Transformer
   ↓
Photo/satellite image interpretation
```

The image model is therefore complementary, not a replacement for the main risk model.

---

# 7. What Exactly Does the System Predict?

The system should **not claim deterministic prediction** such as:

> "A landslide will definitely happen on September 11."

Instead, it produces a probability/risk forecast for defined windows.

Example:

```text
Current Risk       82   HIGH

Next 6 hours       78   HIGH
Next 24 hours      91   CRITICAL
Next 48 hours      94   CRITICAL
Next 72 hours      81   HIGH
```

This means:

> Based on current susceptibility, recent environmental conditions and available rainfall forecasts, the probability/risk of landslide occurrence is elevated in these forecast windows.

---

# 8. Prediction Horizons

Recommended horizons:

## 0–6 hours

Best for immediate/short-term warning.

Uses:

- Current rainfall
- Recent rainfall accumulation
- Current soil moisture
- Current susceptibility
- Current weather conditions

## 6–24 hours

Very useful operational warning window.

Can additionally use:

- Forecast rainfall
- Forecast precipitation intensity
- Expected wetness

## 24–48 hours

Useful for advance preparedness.

Uncertainty is greater because it depends more heavily on forecast weather.

## 48–72 hours

Useful as a planning/awareness forecast.

It should be labelled as a forecasted risk rather than a deterministic prediction.

---

# 9. Important Forecasting Limitation

The future risk forecast depends partly on the quality of future rainfall forecasts.

For example:

```text
Current conditions
      ↓
Known with relatively high confidence

Tomorrow's rainfall
      ↓
Forecast uncertainty

48-hour rainfall
      ↓
Higher uncertainty
```

Therefore the UI should communicate uncertainty honestly.

Suggested labels:

```text
CURRENT RISK
NEXT 6 HOURS
NEXT 24 HOURS
NEXT 48 HOURS
NEXT 72 HOURS
```

Do not claim exact landslide time unless the evidence genuinely supports it.

---

# 10. Final Training Dataset 1 — Susceptibility Dataset

File:

```text
data/final/susceptibility_dataset.csv
```

Suggested structure:

| Column | Description |
|---|---|
| sample_id | Unique sample identifier |
| latitude | Latitude |
| longitude | Longitude |
| state | NER state |
| district | District |
| elevation_m | Elevation |
| slope_deg | Slope in degrees |
| aspect_deg | Aspect |
| curvature | Terrain curvature |
| landcover | Land-cover class |
| geology | Geological class |
| geomorphology | Geomorphological class |
| hydrological_condition | Hydrological characteristic |
| distance_to_drainage_m | Distance to drainage |
| historical_ls_density | Historical landslide density |
| distance_to_historical_ls_m | Distance to known landslides |
| label | 1 = landslide, 0 = control |

Important:

**Do not put current rainfall into Dataset 1.**

Model 1 represents static/slow susceptibility.

---

# 11. Final Training Dataset 2 — Dynamic Risk Dataset

File:

```text
data/final/dynamic_risk_dataset.csv
```

Suggested structure:

| Column | Description |
|---|---|
| sample_id | Unique sample |
| latitude | Latitude |
| longitude | Longitude |
| timestamp | Observation/prediction timestamp |
| base_susceptibility | Model 1 output |
| rainfall_1h_mm | Rainfall in previous 1 hour |
| rainfall_3h_mm | Previous 3 hours |
| rainfall_6h_mm | Previous 6 hours |
| rainfall_12h_mm | Previous 12 hours |
| rainfall_24h_mm | Previous 24 hours |
| rainfall_72h_mm | Previous 72 hours |
| rainfall_7d_mm | Previous 7 days |
| soil_moisture | Soil moisture |
| forecast_rain_6h_mm | Forecast rainfall next 6 hours |
| forecast_rain_24h_mm | Forecast rainfall next 24 hours |
| forecast_rain_48h_mm | Forecast rainfall next 48 hours |
| landslide_within_6h | Target |
| landslide_within_24h | Target |
| landslide_within_48h | Target |
| landslide_within_72h | Target |

Historical forecast features should only be used if reliable archived forecasts are available.

If historical forecast archives are unavailable, train an initial model using observed antecedent rainfall and introduce forecast variables after obtaining an appropriate historical forecast dataset.

---

# 12. Historical Landslide Data

## Primary source — GSI

Use the Geological Survey of India's Bhusanket/National Landslide Forecasting Centre data as the primary ground-truth source where appropriate.

Official portal:

https://bhusanket.gsi.gov.in/

The inventory includes field-validated landslide records and a range of geological, geomorphological, hydrological and event-related attributes.

The raw source should never be modified.

Store:

```text
data/raw/gsi/
```

---

# 13. ISRO Landslide Atlas

Use the ISRO/NRSC Landslide Atlas as a secondary source for:

- Validation
- Enrichment
- Regional comparison
- Historical event coverage

Official atlas:

https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html

Do not blindly merge GSI and ISRO records.

Their mapping methodologies and inventories may differ.

Potential duplicate events should be reconciled using:

- Spatial distance
- Date
- Geometry overlap
- Location
- Event context

---

# 14. Negative Samples

A landslide inventory gives positive examples.

We also need non-landslide/control examples.

Do **not** simply generate random points across all of India.

Controls should be:

- Within the study region
- Environmentally comparable
- Spatially separated from known landslides where appropriate
- Carefully selected to avoid ambiguous locations

Important:

> Absence of a landslide record does not prove that no landslide occurred.

Inventory incompleteness is a major issue.

---

# 15. Data Leakage Prevention

Only information available **before or at prediction time** may be used as an input.

Do not use post-event variables such as:

- Final landslide size
- Final runout
- Damage caused
- Post-event mapped geometry
- Post-event road blockage
- Information recorded only after the event

These may accidentally tell the model that a landslide has already happened.

---

# 16. Data Sources

## GSI

Historical landslide inventory and geoscientific information.

## ISRO/NRSC

Satellite-derived landslide inventory and validation.

## IMD

Indian meteorological observations, rainfall information, forecasts and warnings.

Official API documentation:

https://api.imd.gov.in/public/api_reference.html

Historical 0.25° gridded rainfall:

https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html

## NASA GPM IMERG

Near-real-time and historical satellite rainfall.

https://gpm.nasa.gov/data/directory

IMERG Early can provide low-latency precipitation information suitable for near-real-time applications.

## NASA SMAP

Soil moisture.

https://nsidc.org/data/smap/data

Use it as a regional wetness indicator rather than assuming it is exact ground-level moisture for a particular slope.

## SRTM / USGS

Elevation/DEM.

https://earthexplorer.usgs.gov/

Derive:

- Elevation
- Slope
- Aspect
- Curvature
- Roughness
- Relief

## Copernicus Sentinel

https://dataspace.copernicus.eu/

Sentinel-1:

- Radar
- Deformation/change detection
- Works through clouds

Sentinel-2:

- Optical imagery
- Land cover
- Vegetation
- Surface disturbance

## OpenStreetMap

https://www.openstreetmap.org/copyright

Use for:

- Roads
- Buildings
- Villages
- Infrastructure
- Other exposure information

OSM is primarily an exposure/context source, not a direct landslide predictor.

---

# 17. Live Data Architecture

Do not call every external API every time a citizen asks for risk.

Instead use scheduled ingestion.

```text
IMD ─────┐
GPM ─────┤
SMAP ────┤
Sentinel ┤
          ▼
   DATA INGESTION
          │
          ▼
   FEATURE PROCESSING
          │
          ▼
    POSTGRES + POSTGIS
          │
          ▼
      RISK ENGINE
```

Then:

```text
Citizen
   ↓
FastAPI
   ↓
PostGIS / Feature Store
   ↓
XGBoost
   ↓
Risk response
```

This is faster and more scalable.

---

# 18. Recommended Live Update Frequency

These are architectural targets, not guarantees from the external providers.

| Source | Typical role |
|---|---|
| IMD | Frequent weather/rainfall updates |
| GPM IMERG Early | Near-real-time rainfall |
| GPM IMERG Late | Improved near-real-time rainfall |
| SMAP | Periodic soil moisture |
| Sentinel-1 | Periodic/event-driven satellite processing |
| Sentinel-2 | Periodic optical monitoring |
| XGBoost | Recalculate whenever relevant features update |
| Dashboard | Near-real-time refresh |
| Alerts | Triggered immediately after rule evaluation |

---

# 19. Feature Engineering

Raw data should not simply be passed into XGBoost.

Create meaningful features.

## Rainfall

Examples:

```text
rainfall_1h
rainfall_3h
rainfall_6h
rainfall_12h
rainfall_24h
rainfall_72h
rainfall_7d
```

## Rainfall intensity

```text
rainfall_24h / 24
```

or more sophisticated rolling intensity metrics.

## Antecedent rainfall

The amount of rain accumulated before the prediction time.

Example:

```text
72-hour rainfall
7-day rainfall
```

This is important because slopes may remain saturated after rainfall stops.

## Terrain

From DEM:

```text
elevation
slope
aspect
curvature
roughness
local relief
```

## Historical exposure to landslides

```text
historical_ls_density
distance_to_historical_ls
```

## Hydrological proximity

```text
distance_to_drainage
```

---

# 20. SHAP Explainability

Use SHAP to explain XGBoost predictions.

Example:

```text
Risk = 91

Main contributors:

+ High 72h rainfall
+ High 24h rainfall
+ High base susceptibility
+ High soil moisture
+ Steep slope
```

The authority dashboard can show:

> **Why is this location high risk?**

This makes the system more transparent than a black-box score.

---

# 21. Risk Scoring

Recommended conceptual bands:

```text
0–20     VERY LOW
21–40    LOW
41–60    MODERATE
61–80    HIGH
81–100   CRITICAL
```

These thresholds are configurable.

They should ultimately be calibrated using:

- Validation data
- Missed-event cost
- False-alarm tolerance
- Expert/domain guidance

Do not choose thresholds solely because they look visually good.

---

# 22. Risk Fusion and Response Priority

Risk is not the same as impact.

Example:

```text
Location A
Risk = 95
No nearby infrastructure

Location B
Risk = 85
Major highway + village + hospital nearby
```

Location B may deserve higher response priority.

Therefore create an additional **impact/exposure layer**.

Conceptually:

```text
Hazard Risk
     +
Population
     +
Road importance
     +
Village proximity
     +
Hospital proximity
     +
Critical infrastructure
     ↓
RESPONSE PRIORITY
```

This can initially be transparent rules rather than another ML model.

---

# 23. GIS Heatmap — Core Dashboard Feature

The most important visualization should be an interactive risk map.

The map should display the NER with a continuous or categorized risk surface.

Conceptually:

```text
               NER MAP

          LOW
        ─────────
       /   🟢    \
      / 🟢 🟡 🟠  \
     |   🟡 🔴    |
     | 🟢 🟠 🔴   |
      \   🔴     /
       \________/

Green   = Low
Yellow  = Moderate
Orange  = High
Red     = Critical
```

The actual implementation should use GIS polygons/grid cells rather than emojis.

---

# 24. How to Implement the Landslide Heatmap

There are two recommended approaches.

## Approach A — Grid-cell risk map

Divide the study region into spatial cells.

Example:

```text
NER
 ↓
Grid
 ↓
For each cell:
    extract features
    calculate susceptibility
    calculate current risk
 ↓
Store risk
 ↓
Render as colored polygons
```

For each grid cell:

```text
cell_id
geometry
base_susceptibility
current_risk
risk_6h
risk_24h
risk_48h
risk_72h
updated_at
```

This is the recommended SIH implementation.

---

## Approach B — Raster risk surface

Create a raster where every pixel represents a risk value.

Example:

```text
Pixel 1 = 12
Pixel 2 = 18
Pixel 3 = 75
Pixel 4 = 91
...
```

Then render the raster as a map overlay.

This is useful when working directly with DEM and satellite rasters.

---

# 25. Recommended GIS Stack

Backend:

```text
PostgreSQL
+
PostGIS
```

Geospatial processing:

```text
GeoPandas
Rasterio
GDAL
```

Frontend:

```text
React
+
MapLibre GL JS / Leaflet
```

Map layers:

```text
Base map
    +
Susceptibility
    +
Current risk
    +
6h risk
    +
24h risk
    +
48h risk
    +
72h risk
    +
Landslide inventory
    +
Roads
    +
Villages
    +
Reports
```

---

# 26. Dashboard Heatmap Interactions

The authority should be able to switch between:

### Current Risk

```text
CURRENT
```

### 6-hour forecast

```text
NEXT 6 HOURS
```

### 24-hour forecast

```text
NEXT 24 HOURS
```

### 48-hour forecast

```text
NEXT 48 HOURS
```

### 72-hour forecast

```text
NEXT 72 HOURS
```

The user can visually see risk moving/updating over time.

---

# 27. Additional Map Layers

Authorities should be able to toggle:

- Landslide inventory
- Roads
- Highways
- Villages
- Population
- Hospitals
- Schools
- Bridges
- Critical infrastructure
- Rivers
- Drainage
- Administrative boundaries
- Rainfall
- Soil moisture
- Satellite-change alerts
- Citizen reports
- Road blockages

---

# 28. Authority Dashboard

The authority dashboard should be different from the citizen app.

It should focus on:

> **Where is the risk, why is it high, who/what is exposed, and what should we prioritize?**

---

# 29. Authority Dashboard — Main Screen

Suggested layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ NER LANDSLIDE EARLY WARNING & RESPONSE DASHBOARD             │
├───────────────┬───────────────────────────────┬─────────────┤
│               │                               │             │
│ KPI CARDS     │        LIVE RISK MAP         │ ALERTS      │
│               │                               │             │
│ Critical: 12  │      GIS HEATMAP             │ Critical  5 │
│ High: 37      │      🔴 🟠 🟡 🟢              │ High     18 │
│ Reports: 24   │                               │ Reports  24 │
│ Roads: 8      │                               │             │
│               │                               │             │
├───────────────┴───────────────────────────────┴─────────────┤
│ RISK FORECAST | AFFECTED ROADS | CITIZEN REPORTS | TRENDS   │
└─────────────────────────────────────────────────────────────┘
```

---

# 30. Dashboard KPI Cards

Show:

- Critical zones
- High-risk zones
- Moderate zones
- Active warnings
- New citizen reports
- Blocked roads
- Potentially affected villages
- Critical infrastructure at risk
- Rainfall intensity
- Number of unresolved incidents

Example:

```text
CRITICAL ZONES       12
HIGH-RISK ZONES      37
ACTIVE ALERTS        8
FIELD REPORTS        24
ROADS AT RISK        11
VILLAGES AT RISK     7
```

---

# 31. Risk Forecast Panel

Display:

```text
ZONE: AIZAWL

CURRENT       76  HIGH
6 HOURS       81  CRITICAL
24 HOURS      93  CRITICAL
48 HOURS      88  CRITICAL
72 HOURS      71  HIGH
```

Also show trend:

```text
Risk
100 |                    ●
 80 |          ●───────●
 60 |     ●────
 40 |
    +------------------------
       Now  6h  24h  48h 72h
```

---

# 32. "Why Is This Area at Risk?" Panel

When an authority clicks a location:

```text
Risk Score: 91 — CRITICAL

Primary factors:

1. Very high 72-hour rainfall
2. High base susceptibility
3. High soil moisture
4. Steep slope
5. Historical landslide concentration
```

SHAP can supply the model-level explanation.

---

# 33. Road Risk Module

This is important for NER because landslides frequently disrupt connectivity.

For each road segment:

```text
Road ID
Risk score
Current status
Expected risk
Nearest landslides
Rainfall
Alternative route
```

Example:

```text
NH / STATE ROAD

Risk: CRITICAL
Status: Vulnerable
Nearby reports: 3
Forecast: Increasing
```

The authority can prioritize inspection or closure.

---

# 34. Village/Population Exposure

For each vulnerable village:

```text
Village
Population
Current risk
24h risk
Nearest high-risk slope
Road connectivity
Nearest safe route
```

Example:

```text
Village X
Risk: CRITICAL
Population: XXXX
Road access: HIGH RISK
Nearest safe route: ...
```

Population data should come from an appropriate authoritative source for production deployment.

---

# 35. Citizen Reports Module

Citizens can submit:

- Landslide
- Crack
- Road blockage
- Rockfall
- Soil movement
- Flooding
- Drainage blockage
- Infrastructure damage

Each report should contain:

```text
report_id
user_id / anonymous identifier
latitude
longitude
timestamp
category
description
photo
video
severity
status
```

---

# 36. Citizen Report Verification

Citizen reports should **not automatically become ground truth**.

Use a verification workflow:

```text
Citizen report
      ↓
AI pre-screening
      ↓
Duplicate/spam check
      ↓
Location validation
      ↓
Authority review
      ↓
Verified / Rejected / Pending
```

A validated report can contribute to situational awareness and, later, a controlled feature in the risk engine.

---

# 37. Citizen App

Main features:

## Home

```text
Current location
Current risk
Warning level
Safety guidance
```

## Risk Map

Citizen sees nearby:

- Risk zones
- Roads
- Alerts
- Reported incidents

## Report Incident

```text
Take photo
    ↓
GPS captured
    ↓
Select incident type
    ↓
Submit
```

## Alerts

Display:

- Current warning
- Forecast warning
- Safety instruction
- Nearby affected roads

## History

Citizen can see their submitted reports.

---

# 38. Chatbot

The chatbot should be an **information and explanation interface**, not the actual landslide prediction engine.

Architecture:

```text
Citizen
   ↓
Chatbot
   ↓
Backend APIs
   ├── Risk API
   ├── Alert API
   ├── Road API
   ├── Report API
   └── Safety guidance
```

Example question:

> "What is the landslide risk near me?"

Chatbot:

```text
I found a HIGH risk level near your current location.

Current risk: 78/100
24-hour forecast: 86/100

Main factors:
- Heavy recent rainfall
- Steep terrain
- High susceptibility

Please follow local authority advisories.
```

---

# 39. Chatbot Safety Rule

The chatbot should never invent risk values.

Bad:

> "There will definitely be a landslide tonight."

Good:

> "The system currently estimates high landslide risk for this area. The 24-hour forecast is elevated."

The chatbot should retrieve the actual result from the risk API.

---

# 40. Authorized Authority Dashboard

The authority dashboard should require authentication.

Suggested roles:

```text
SUPER_ADMIN
DISTRICT_ADMIN
DISASTER_MANAGEMENT_OFFICER
FIELD_OFFICER
ANALYST
VIEW_ONLY
```

Permissions should differ.

Example:

| Role | View | Reports | Alerts | Users | Models |
|---|---|---|---|---|---|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| District Admin | ✓ | ✓ | ✓ | Limited | ✗ |
| Field Officer | ✓ | ✓ | Limited | ✗ | ✗ |
| Analyst | ✓ | ✓ | ✗ | ✗ | ✓ |
| View Only | ✓ | ✗ | ✗ | ✗ | ✗ |

---

# 41. Authentication

Recommended:

```text
Frontend
   ↓
JWT / OAuth2
   ↓
FastAPI
   ↓
Role-based authorization
```

Passwords should never be stored as plaintext.

Use secure password hashing such as Argon2/bcrypt where appropriate.

---

# 42. Alert Engine

The alert engine continuously evaluates risk.

Example rules:

```text
IF risk >= 80
AND exposure >= threshold
THEN CRITICAL ALERT
```

Another:

```text
IF current_risk < 80
BUT risk_24h >= 80
THEN EARLY WARNING
```

Another:

```text
IF risk increases rapidly
THEN ESCALATE
```

The exact thresholds must be configurable and validated.

---

# 43. Alert Levels

Example:

```text
VERY LOW
    ↓
LOW
    ↓
MODERATE
    ↓
HIGH
    ↓
CRITICAL
```

Possible actions:

### LOW

No notification.

### MODERATE

Dashboard awareness.

### HIGH

Citizen/app notification + authority notification.

### CRITICAL

Authority escalation + configured SMS/push/in-app warning.

Actual emergency alerts should be governed by authorized disaster-management procedures.

---

# 44. SMS Architecture

For an SIH prototype, explore India's government Mobile Seva SMS Gateway:

https://services.mgov.gov.in/

Architecture:

```text
XGBoost
   ↓
Alert Engine
   ↓
Critical threshold
   ↓
SMS Service
   ↓
Citizen phone
```

Do not assume unlimited free SMS.

A production disaster-alert system should integrate with the authorized government communication infrastructure.

---

# 45. Multilingual Alerts

NER contains multiple languages and communities.

The alert system should support:

- English
- Hindi
- Relevant state/regional languages

Architecture:

```text
Risk event
    ↓
Alert template
    ↓
Language selection
    ↓
SMS / App / Voice / Dashboard
```

Critical warning messages should use **pre-approved templates** rather than unrestricted generative text.

---

# 46. Offline / Low-Network Mode

Field officers may operate in areas with poor connectivity.

The mobile app should:

```text
Capture report
    ↓
Store locally
    ↓
Attach GPS
    ↓
Queue upload
    ↓
When network returns
    ↓
Synchronize
```

Use:

- Local SQLite/IndexedDB
- Upload queue
- Retry mechanism
- Conflict resolution
- Timestamp preservation

The user should clearly see:

```text
Saved offline
Waiting for network
Uploaded
Verified
```

---

# 47. Backend Technology

Recommended:

```text
Python
FastAPI
Pandas
NumPy
GeoPandas
Rasterio
GDAL
Scikit-learn
XGBoost
SHAP
PostgreSQL
PostGIS
```

---

# 48. Frontend Technology

Suggested:

```text
React
TypeScript
Tailwind CSS
MapLibre GL JS / Leaflet
Recharts / ECharts
```

Two frontend experiences can share components:

```text
frontend/
├── citizen/
└── authority/
```

Or a unified application can switch experience based on role.

---

# 49. API Design

Suggested backend APIs:

## Risk

```http
GET /api/v1/risk/{latitude}/{longitude}
```

Example:

```json
{
  "base_susceptibility": 82,
  "current_risk": 91,
  "risk_level": "CRITICAL",
  "risk_6h": 88,
  "risk_24h": 94,
  "risk_48h": 91,
  "risk_72h": 79,
  "updated_at": "..."
}
```

## Risk grid

```http
GET /api/v1/risk/grid?bbox=...
```

Used for heatmap rendering.

## Forecast

```http
GET /api/v1/risk/forecast/{zone_id}
```

## Reports

```http
POST /api/v1/reports
GET /api/v1/reports
GET /api/v1/reports/{report_id}
```

## Alerts

```http
GET /api/v1/alerts
POST /api/v1/alerts
```

## Roads

```http
GET /api/v1/roads/risk
```

## Villages

```http
GET /api/v1/villages/risk
```

## Dashboard

```http
GET /api/v1/dashboard/summary
```

---

# 50. Risk API Internal Flow

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
Dynamic XGBoost
          ↓
Calculate forecast horizons
          ↓
SHAP explanation
          ↓
Risk response
```

---

# 51. Database Design

PostgreSQL + PostGIS tables:

```text
users
roles
permissions

landslide_inventory
terrain_features
risk_cells
dynamic_observations

roads
villages
infrastructure

citizen_reports
report_media

alerts
alert_recipients
alert_delivery_log

weather_observations
rainfall_observations
soil_moisture_observations
satellite_observations

model_versions
prediction_logs
```

---

# 52. Spatial Database

PostGIS should store geometries such as:

```text
POINT
LINESTRING
POLYGON
MULTIPOLYGON
RASTER metadata / external raster references
```

Examples:

```text
landslide_inventory → POINT/POLYGON
roads              → LINESTRING
villages            → POINT/POLYGON
risk_cells          → POLYGON
citizen_reports     → POINT
```

This makes spatial queries possible.

Example:

> Find all villages within 5 km of critical-risk cells.

---

# 53. Data Pipeline

Recommended repository structure:

```text
project/
│
├── frontend/
│   ├── citizen/
│   └── authority/
│
├── backend/
│   ├── api/
│   ├── auth/
│   ├── risk/
│   ├── alerts/
│   ├── reports/
│   ├── chatbot/
│   └── gis/
│
├── ml/
│   ├── preprocessing/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── explainability/
│
├── data/
│   ├── raw/
│   │   ├── gsi/
│   │   ├── isro/
│   │   ├── imd/
│   │   ├── gpm/
│   │   ├── smap/
│   │   └── srtm/
│   │
│   ├── processed/
│   └── final/
│
├── models/
│   ├── susceptibility_xgb.pkl
│   └── dynamic_risk_xgb.pkl
│
├── scripts/
├── notebooks/
├── tests/
├── docker/
└── README.md
```

---

# 54. ML Training Pipeline

```text
Raw GSI
   ↓
Clean coordinates
   ↓
Filter NER
   ↓
Generate controls
   ↓
Join terrain
   ↓
Join geology
   ↓
Join hydrology
   ↓
Join historical density
   ↓
Dataset 1
   ↓
Train XGBoost #1
   ↓
Save model
```

Then:

```text
Historical events
   ↓
Attach rainfall
   ↓
Attach soil moisture
   ↓
Attach susceptibility
   ↓
Create prediction windows
   ↓
Dataset 2
   ↓
Train XGBoost #2
   ↓
Evaluate
   ↓
Save model
```

---

# 55. Spatial Validation

A normal random train/test split is dangerous for geospatial landslide data.

Why?

Nearby points can be extremely similar.

Example:

```text
Train:
Location A

Test:
Location B
```

If A and B are only a few hundred metres apart, the model may effectively see the same terrain in both datasets.

This creates spatial leakage.

Prefer:

- Geographic holdout
- District holdout
- State holdout where data permit
- Event-period holdout
- Spatial block cross-validation

---

# 56. Evaluation Metrics

Use:

- ROC-AUC
- PR-AUC
- Precision
- Recall
- F1
- Confusion matrix
- Brier score
- Calibration
- False alarm rate
- Missed-event rate

For an early-warning system:

> **Recall and missed-event rate are especially important.**

But very high recall can produce excessive false alarms, so the operational threshold must balance both.

---

# 57. Model Versioning

Every production prediction should know which model produced it.

Example:

```text
model_version:
xgb_dynamic_v1.2

trained_at:
2026-...

features:
...

validation:
...

threshold:
...
```

Store model metadata.

---

# 58. Model Monitoring

Monitor:

- Prediction distribution
- Missing features
- Data drift
- Rainfall distribution changes
- Sensor/API failures
- False alarms
- Missed events
- Model performance after new verified events

The model should be retrained periodically as more data become available.

---

# 59. API Failure Handling

External services can fail.

Therefore:

```text
IMD unavailable
      ↓
Use latest valid observation
      ↓
Mark data stale
      ↓
Reduce confidence / flag degraded mode
```

Similarly:

```text
GPM unavailable
      ↓
Use IMD rainfall
      ↓
Continue prediction
      ↓
Log missing source
```

Never silently treat missing data as zero rainfall.

---

# 60. Confidence vs Risk

Do not confuse:

```text
Risk = 90
```

with:

```text
Confidence = 90%
```

They represent different concepts.

Example:

```text
Risk: 91/100
Confidence: 0.87
```

Risk is the estimated hazard level.

Confidence is a measure of how reliable the prediction/data/model situation is.

Confidence estimation should be implemented carefully rather than simply inventing a number.

---

# 61. Citizen Safety Interface

A citizen should not need to understand XGBoost.

Show:

```text
YOUR AREA

🟠 HIGH RISK

Current: 74
Next 24h: 86

Why?
• Heavy rainfall
• Steep terrain
• High soil wetness

Stay away from unstable slopes.
Follow official advisories.
```

Keep emergency instructions concise.

---

# 62. Authority Decision Support

Authorities should see:

```text
WHERE?
→ Critical cells

WHY?
→ Rainfall + susceptibility + soil moisture

WHAT IS EXPOSED?
→ Roads + villages + infrastructure

WHAT IS CHANGING?
→ Risk trend

WHAT WAS REPORTED?
→ Citizen/field reports

WHAT SHOULD BE PRIORITIZED?
→ Response priority
```

---

# 63. Response Priority Score

A transparent score can combine:

```text
Hazard risk
×
Exposure
×
Criticality
```

Possible factors:

```text
Risk score
Population exposed
Road importance
Hospital proximity
Critical infrastructure
Evacuation constraints
```

Example conceptual formula:

```text
Priority =
0.50 × hazard_risk
+
0.25 × exposure
+
0.15 × infrastructure_criticality
+
0.10 × connectivity_factor
```

The exact weights must be configurable and validated with domain experts.

---

# 64. Example End-to-End Scenario

Suppose a district receives heavy rainfall.

### Step 1 — Data ingestion

IMD and GPM provide rainfall information.

### Step 2 — Dynamic update

The system calculates:

```text
24h rainfall = high
72h rainfall = very high
soil moisture = high
```

### Step 3 — Susceptibility

The location already has:

```text
base susceptibility = 84
```

### Step 4 — Dynamic model

XGBoost produces:

```text
current risk = 79
24h risk = 92
48h risk = 89
```

### Step 5 — Alert engine

The system sees:

```text
Current = HIGH
24h = CRITICAL
```

### Step 6 — Exposure

A major road and village are nearby.

### Step 7 — Priority

The zone becomes:

```text
RESPONSE PRIORITY = VERY HIGH
```

### Step 8 — Authority

Dashboard highlights the zone.

### Step 9 — Citizen

Nearby users receive an early warning.

### Step 10 — Field report

A field officer reports a new crack.

### Step 11 — Verification

Authority verifies the report.

### Step 12 — Risk update

The verified report becomes additional situational evidence.

---

# 65. Satellite Change Detection — Advanced Feature

Sentinel-1 SAR can eventually be used for deformation/change detection.

Pipeline:

```text
Sentinel-1
    ↓
Preprocessing
    ↓
Temporal comparison
    ↓
Deformation/change metric
    ↓
satellite_change_score
    ↓
Risk engine
```

This is more complex than the rainfall pipeline and should be Phase 2/3.

Do not make it a dependency for the initial SIH prototype.

---

# 66. Citizen Image Analysis — Advanced Feature

Citizen photos can eventually be analyzed using a vision model.

Potential classes:

```text
crack
soil erosion
rockfall
landslide
blocked road
flooding
normal
```

Pipeline:

```text
Citizen photo
      ↓
Image classifier
      ↓
Evidence score
      ↓
Human verification
      ↓
Risk/situational layer
```

Again, this should not automatically override the main XGBoost prediction.

---

# 67. Why Human-in-the-Loop Matters

Disaster systems should not be fully automated without safeguards.

Recommended:

```text
AI prediction
     +
Sensor data
     +
Satellite data
     +
Citizen reports
     +
Human authority verification
     ↓
Operational warning
```

AI assists decision-making.

Authorized authorities remain responsible for official emergency declarations.

---

# 68. Cloud Deployment

A possible production architecture:

```text
                         INTERNET
                             │
                  ┌──────────▼──────────┐
                  │ Load Balancer / API │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │ FastAPI Backend     │
                  └──────────┬──────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
      PostgreSQL          Redis            Object Storage
       + PostGIS                            images/raster
           │
           ▼
      Risk Engine
           │
           ▼
       XGBoost
```

Cloud services can be implemented using AWS/Azure/GCP or government-approved infrastructure depending on deployment requirements.

---

# 69. Object Storage

Do not store large citizen videos directly inside PostgreSQL.

Use object storage:

```text
PostgreSQL
    ↓
report metadata

Object Storage
    ↓
photo/video
```

Database stores:

```text
media_url
media_type
uploaded_at
```

---

# 70. Caching

Use Redis for:

- Latest risk values
- Frequently requested map tiles/data
- API responses
- Alert deduplication
- Session/token-related transient data

Example:

```text
GET /risk/27.33/88.61

Redis hit
    ↓
Return quickly
```

---

# 71. Alert Deduplication

Do not send the same SMS repeatedly.

Use an alert state:

```text
ALERT_CREATED
      ↓
ALERT_SENT
      ↓
ALERT_ACTIVE
      ↓
ALERT_UPDATED
      ↓
ALERT_RESOLVED
```

Example:

```text
Risk = 82
SMS sent

Risk remains 84
→ no duplicate SMS

Risk rises to 95
→ escalation message

Risk falls to 55
→ resolve/update
```

---

# 72. Audit Logs

Every important authority action should be logged.

Examples:

```text
User
Action
Timestamp
Location
Old value
New value
Reason
```

Especially:

- Alert creation
- Alert cancellation
- Report verification
- Risk override
- User-role changes

---

# 73. Security Requirements

Minimum:

- HTTPS
- JWT/OAuth2
- Secure password hashing
- RBAC
- Input validation
- Rate limiting
- File type validation
- Malware scanning for uploads
- Secure object storage
- Audit logging
- Database backups
- Secrets stored outside source code

Never commit:

```text
API keys
database passwords
JWT secrets
cloud credentials
SMS credentials
```

to GitHub.

---

# 74. Suggested Team Division

## Team Member 1 — ML

Responsible for:

- Dataset creation
- Feature engineering
- XGBoost
- Validation
- SHAP
- Model serialization

## Team Member 2 — Data/GIS

Responsible for:

- GSI/ISRO data
- DEM
- Raster processing
- PostGIS
- Risk grid
- Heatmap

## Team Member 3 — Backend

Responsible for:

- FastAPI
- Database
- Authentication
- Risk API
- Alert engine
- Data ingestion

## Team Member 4 — Frontend

Responsible for:

- Citizen app
- Authority dashboard
- GIS UI
- Charts
- Alerts

## Team Member 5 — Integration/Cloud

Responsible for:

- API integrations
- Deployment
- Storage
- Monitoring
- SMS
- CI/CD

One person can cover multiple areas if the team is smaller.

---

# 75. SIH MVP — What We Must Actually Build

Do not attempt the entire production system before the competition.

### MVP must include:

```text
✓ Historical landslide dataset
✓ Terrain features
✓ XGBoost susceptibility
✓ Dynamic rainfall features
✓ XGBoost dynamic risk
✓ GIS heatmap
✓ Current + 24h risk
✓ Authority dashboard
✓ Citizen reporting
✓ Authentication
✓ Alert engine
✓ Demonstration SMS/in-app notification
```

---

# 76. Features We Can Demonstrate as Advanced

```text
✓ 6h/24h/48h/72h forecasting
✓ GPM rainfall
✓ SMAP soil moisture
✓ Sentinel-1 change detection
✓ Citizen image classification
✓ Multilingual chatbot
✓ Offline synchronization
✓ Automated road prioritization
✓ Population exposure
✓ Advanced SMS integration
```

---

# 77. Suggested Development Order

## Phase 1 — Data

1. Download GSI inventory.
2. Inspect actual schema.
3. Filter NER.
4. Clean coordinates.
5. Create controls.
6. Download/prepare DEM.
7. Generate terrain features.
8. Build Dataset 1.

## Phase 2 — Model 1

1. Preprocess.
2. Spatial split.
3. Train XGBoost.
4. Evaluate.
5. Explain with SHAP.
6. Save model.

## Phase 3 — Dynamic Dataset

1. Attach historical rainfall.
2. Calculate rolling rainfall.
3. Attach soil moisture where available.
4. Generate temporal labels.
5. Build Dataset 2.

## Phase 4 — Model 2

1. Train XGBoost.
2. Validate.
3. Calibrate.
4. Evaluate early-warning metrics.
5. Save model.

## Phase 5 — Backend

1. PostgreSQL/PostGIS.
2. FastAPI.
3. Model loading.
4. Risk endpoints.
5. GIS endpoints.
6. Authentication.

## Phase 6 — Dashboard

1. Map.
2. Heatmap.
3. KPI cards.
4. Forecast charts.
5. Road/village exposure.
6. Reports.
7. Alerts.

## Phase 7 — Citizen App

1. Location.
2. Risk.
3. Map.
4. Alerts.
5. Reports.
6. Offline queue.

## Phase 8 — Advanced integrations

1. IMD live data.
2. GPM.
3. SMAP.
4. Sentinel.
5. SMS.
6. Chatbot.

---

# 78. Recommended Final User Experience

## Citizen

```text
Open App
   ↓
Allow location
   ↓
See current risk
   ↓
See 24h forecast
   ↓
Receive warning if necessary
   ↓
Report observed hazard
```

## Authority

```text
Login
   ↓
Open dashboard
   ↓
See NER heatmap
   ↓
Filter Critical zones
   ↓
Inspect risk factors
   ↓
See affected roads/villages
   ↓
Review citizen reports
   ↓
Prioritize response
   ↓
Issue/approve warning
```

---

# 79. Final Architecture in One Diagram

```text
                         ┌────────────────────────┐
                         │      GSI / ISRO        │
                         │ Historical Landslides  │
                         └───────────┬────────────┘
                                     │
                         ┌───────────▼────────────┐
                         │     Terrain / DEM      │
                         │ Slope/Elevation/etc.   │
                         └───────────┬────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ XGBoost Model #1 │
                            │ Susceptibility   │
                            └────────┬─────────┘
                                     │
                              Base Susceptibility
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
       IMD                         GPM                         SMAP
     Rainfall                    Rainfall                   Soil Moisture
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                            Feature Engineering
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ XGBoost Model #2 │
                            │ Dynamic Risk     │
                            └────────┬─────────┘
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
                     6h            24h           48/72h
                       │             │             │
                       └─────────────┼─────────────┘
                                     ▼
                              RISK ENGINE
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
                 GIS Map        Alert Engine      Exposure
                    │                │                │
                    │          ┌─────┼─────┐          │
                    │          ▼     ▼     ▼          │
                    │         App   SMS   Push        │
                    │                                │
                    └────────────────┬───────────────┘
                                     ▼
                            AUTHORITY DASHBOARD
                                     │
                         ┌───────────┼────────────┐
                         ▼           ▼            ▼
                       Roads      Villages    Infrastructure
                         │           │            │
                         └───────────┼────────────┘
                                     ▼
                              RESPONSE PRIORITY
                                     │
                                     ▼
                              FIELD RESPONSE

Citizen Reports ──► Verification ──► Situational Evidence
Citizen Chatbot ──► Risk/Alert APIs ──► Explanation
```

---

# 80. Important Project Positioning

The project should be presented as:

> **An AI-powered geospatial early-warning and decision-support platform for landslide risk in the North Eastern Region of India.**

Not merely:

> "A landslide prediction app."

The distinction matters.

The system combines:

```text
AI
+
GIS
+
Remote Sensing
+
Weather
+
Historical Geoscience
+
Citizen Intelligence
+
Early Warning
+
Emergency Response
```

---

# 81. Key Technical Innovation

The strongest technical story is the combination of:

### Layer 1 — Static susceptibility

```text
Where can landslides naturally occur?
```

### Layer 2 — Dynamic trigger risk

```text
Where are current environmental conditions becoming dangerous?
```

### Layer 3 — Forecast risk

```text
Where may conditions become dangerous in the next 6–72 hours?
```

### Layer 4 — Exposure

```text
Who/what is in danger?
```

### Layer 5 — Response priority

```text
Where should authorities act first?
```

### Layer 6 — Human intelligence

```text
What are citizens and field officers observing right now?
```

---

# 82. Final Principle

The AI should not replace disaster-management authorities.

The system should provide:

```text
EARLY SIGNAL
+
PREDICTIVE RISK
+
SPATIAL CONTEXT
+
EXPLANATION
+
EXPOSURE
+
FIELD EVIDENCE
```

so that authorized personnel can make faster and better decisions.

The ultimate objective is:

> **Detect risk earlier, communicate it clearly, identify what is exposed, and help authorities respond before a landslide becomes a disaster.**

---

# 83. Official Data/Service References

- GSI Bhusanket: https://bhusanket.gsi.gov.in/
- GSI Landslide Reporting: https://bhusanket.gsi.gov.in/LandslideReport.html
- ISRO Landslide Atlas: https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html
- ISRO Landslide Atlas PDF: https://www.isro.gov.in/media_isro/pdf/LandslideAtlas_new_2023.pdf
- Bhuvan Landslide Inventory: https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/landslide/landslide.php?uname=empty
- IMD API documentation: https://api.imd.gov.in/public/api_reference.html
- IMD historical rainfall: https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html
- NASA GPM: https://gpm.nasa.gov/data/directory
- NASA SMAP: https://nsidc.org/data/smap/data
- USGS EarthExplorer: https://earthexplorer.usgs.gov/
- Copernicus Data Space: https://dataspace.copernicus.eu/
- OpenStreetMap: https://www.openstreetmap.org/copyright
- Mobile Seva: https://services.mgov.gov.in/

---

# 84. First Implementation Task

The team should **not start by coding the dashboard**.

The first implementation task is:

```text
1. Obtain GSI landslide inventory
2. Inspect its real schema
3. Build raw → processed pipeline
4. Create Dataset 1
5. Train Model 1
6. Validate Model 1
7. Only then build Dataset 2
```

Once Model 1 is working, the next milestone is:

```text
Historical rainfall
      +
Base susceptibility
      +
Historical landslide events
      ↓
Dynamic Dataset
      ↓
XGBoost Model #2
```

After the two models work independently, integrate them with PostGIS and FastAPI.

This keeps the project modular and allows every team member to work in parallel without creating an unmanageable codebase.
