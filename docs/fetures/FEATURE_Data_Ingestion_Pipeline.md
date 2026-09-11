# Feature: Data Ingestion & Live Data Pipeline

> **Category:** Data Infrastructure  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

NETRA uses **scheduled data ingestion** from multiple external sources rather than calling APIs on every user request. Data flows through a standardized pipeline into PostgreSQL + PostGIS, where it feeds the feature store and risk engine.

---

## Architecture

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

### Per-Request Flow

```text
Citizen / Authority → FastAPI → PostGIS / Feature Store → XGBoost → Risk response
```

This is faster and more scalable than calling external APIs per request.

---

## Data Sources

| Source | Data Type | URL |
|---|---|---|
| GSI Bhusanket | Historical landslide inventory | https://bhusanket.gsi.gov.in/ |
| ISRO/NRSC | Satellite-derived landslide validation | https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html |
| IMD | Rainfall observations & forecasts | https://api.imd.gov.in/public/api_reference.html |
| IMD Historical | 0.25° gridded rainfall | https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html |
| NASA GPM IMERG | Near-real-time satellite rainfall | https://gpm.nasa.gov/data/directory |
| NASA SMAP | Soil moisture | https://nsidc.org/data/smap/data |
| SRTM / USGS | Elevation / DEM | https://earthexplorer.usgs.gov/ |
| Copernicus Sentinel-1 | SAR radar / deformation detection | https://dataspace.copernicus.eu/ |
| Copernicus Sentinel-2 | Optical imagery / land cover | https://dataspace.copernicus.eu/ |
| OpenStreetMap | Roads, buildings, villages | https://www.openstreetmap.org/copyright |

---

## Update Frequency Targets

| Source | Role |
|---|---|
| IMD | Frequent weather/rainfall updates |
| GPM IMERG Early | Near-real-time rainfall |
| GPM IMERG Late | Improved near-real-time rainfall |
| SMAP | Periodic soil moisture |
| Sentinel-1 | Periodic/event-driven SAR processing |
| Sentinel-2 | Periodic optical monitoring |
| XGBoost | Recalculate when relevant features update |
| Dashboard | Near-real-time refresh |
| Alerts | Triggered immediately after rule evaluation |

---

## Feature Engineering

### Rainfall Features

```text
rainfall_1h, rainfall_3h, rainfall_6h, rainfall_12h
rainfall_24h, rainfall_72h, rainfall_7d
rainfall_intensity = rainfall_24h / 24
```

### Antecedent Rainfall

```text
72-hour rainfall, 7-day rainfall
```

Important: slopes may remain saturated after rainfall stops.

### Terrain Features (from DEM)

```text
elevation, slope, aspect, curvature, roughness, local relief
```

### Historical Exposure

```text
historical_ls_density, distance_to_historical_ls
```

### Hydrological

```text
distance_to_drainage
```

---

## Data Quality & Provenance

### Immutable Raw Data

Raw source data is **append-only/immutable**. Derived data can be recomputed.

Retain for each record:
- Source ID
- Observation time
- Ingestion time
- CRS (coordinate reference system)
- Quality status
- Feature version
- Model version (where applicable)

### Data Trust Gate

```text
DATA SOURCES → Data Trust Gate → Feature Layer
                     ↓
              freshness / completeness / provenance / reliability
              spatial + temporal validation
```

---

## Failure Handling

External services can fail. The system must handle this gracefully:

### IMD Unavailable

```text
Use latest valid observation → Mark data stale → Reduce confidence / flag degraded mode
```

### GPM Unavailable

```text
Use IMD rainfall → Continue prediction → Log missing source
```

### Critical Rules

- **Never silently treat missing data as zero rainfall**
- **Never silently zero-fill missing values**
- Retain last valid observations and expose freshness/data-quality state

---

## Data Storage Architecture

```text
data/
├── raw/           # Immutable source data
│   ├── gsi/       # GSI landslide inventory
│   ├── isro/      # ISRO satellite data
│   ├── imd/       # IMD weather/rainfall
│   ├── gpm/       # NASA GPM IMERG
│   ├── smap/      # NASA SMAP soil moisture
│   └── srtm/      # USGS DEM
├── processed/     # Cleaned/transformed data
└── final/         # Training-ready datasets
```

---

## Historical Data Sources — Special Rules

### GSI vs ISRO Reconciliation

Do not blindly merge GSI and ISRO records. Reconcile potential duplicates using:
- Spatial distance
- Date
- Geometry overlap
- Location
- Event context

### Negative Samples

Controls must be:
- Within the study region
- Environmentally comparable
- Spatially separated from known landslides

> Absence of a landslide record does not prove that no landslide occurred.

---

## Data Leakage Prevention

Only information available **before or at prediction time** may be used.

**Never use:**
- Final landslide size
- Final runout
- Damage caused
- Post-event mapped geometry
- Post-event road blockage

---

## References

- Sections 12–18, 59 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Sections 4–5 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 4 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
