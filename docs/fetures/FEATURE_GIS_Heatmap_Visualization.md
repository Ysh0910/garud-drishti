# Feature: GIS Heatmap & Risk Visualization

> **Category:** Core Dashboard Visualization  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

The most important visualization in NETRA is an **interactive GIS risk heatmap** that displays the North Eastern Region with a continuous or categorized risk surface. Authorities can visually track risk evolution across multiple forecast horizons.

---

## Heatmap Implementation

### Approach A — Grid-Cell Risk Map (Recommended for SIH)

Divide the study region into spatial cells (recommended: 1 km grid).

For each grid cell, store and render:

```text
cell_id
geometry (POLYGON)
base_susceptibility
current_risk
risk_6h
risk_24h
risk_48h
risk_72h
updated_at
```

Render as colored polygons on the map.

### Approach B — Raster Risk Surface

Create a raster where every pixel represents a risk value. Render as a map overlay. Useful when working directly with DEM and satellite rasters.

---

## Color Scheme

```text
🟢 Green    = Low Risk (0–40)
🟡 Yellow   = Moderate Risk (41–60)
🟠 Orange   = High Risk (61–80)
🔴 Red      = Critical Risk (81–100)
```

---

## Map Interactions

### Forecast Switching

Authorities can switch the heatmap between time horizons:

- **CURRENT** — Real-time risk
- **NEXT 6 HOURS** — Short-term forecast
- **NEXT 24 HOURS** — Operational forecast
- **NEXT 48 HOURS** — Advance preparedness
- **NEXT 72 HOURS** — Planning forecast

### Toggleable Layers

| Layer | Description |
|---|---|
| Landslide inventory | Historical events from GSI/ISRO |
| Roads / Highways | Road network risk overlay |
| Villages | Settlement locations |
| Population | Demographic density |
| Hospitals / Schools | Critical social infrastructure |
| Bridges | Vulnerable connectivity points |
| Critical infrastructure | Power, communications, etc. |
| Rivers / Drainage | Hydrological network |
| Administrative boundaries | District/state boundaries |
| Rainfall | Current precipitation overlay |
| Soil moisture | Wetness indicators |
| Satellite-change alerts | Sentinel-derived change detection |
| Citizen reports | User-submitted hazard observations |
| Road blockages | Reported/predicted disruptions |

---

## Zone Inspection Panel

When an authority clicks a location on the map:

```text
Risk Score: 91 — CRITICAL

Primary factors:
1. Very high 72-hour rainfall
2. High base susceptibility
3. High soil moisture
4. Steep slope
5. Historical landslide concentration

Confidence: 0.87
Data Quality: Good
Trend: ↑ Increasing
```

This is powered by SHAP explanations from the XGBoost model.

---

## Technology Stack

### Backend
- **PostgreSQL + PostGIS** — Spatial data storage and queries
- **GeoPandas, Rasterio, GDAL** — Geospatial processing

### Frontend
- **React + TypeScript** — UI framework
- **MapLibre GL JS / Leaflet** — Map rendering
- **Recharts / ECharts** — Charts and trend visualization

### Map Layer Architecture

```text
Base map
    +
Susceptibility layer
    +
Current risk layer
    +
Forecast risk layers (6h / 24h / 48h / 72h)
    +
Landslide inventory
    +
Roads / Villages / Reports
```

---

## API Endpoints

```http
GET /api/v1/risk/grid?bbox=...        # Risk grid for heatmap rendering
GET /api/v1/risk/{lat}/{lon}           # Point risk query
GET /api/v1/risk/forecast/{zone_id}    # Forecast for a specific zone
```

---

## Spatial Database Design

PostGIS geometry types used:

| Entity | Geometry |
|---|---|
| `landslide_inventory` | POINT / POLYGON |
| `roads` | LINESTRING |
| `villages` | POINT / POLYGON |
| `risk_cells` | POLYGON |
| `citizen_reports` | POINT |

Example spatial query:

> Find all villages within 5 km of critical-risk cells.

---

## References

- Sections 23–27 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 11 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 10 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
