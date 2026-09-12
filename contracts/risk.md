# Risk Contract

This is the most critical contract in the repository. It defines how risk information is represented everywhere it crosses a boundary: ML → backend, backend → web UI, backend → mobile app.

Read `CONTRACT_DECISIONS.md` before implementing anything here. Decisions CD-001, CD-004, CD-005, and CD-006 all affect this contract.

---

## Semantic distinctions — do not conflate these

The following concepts are **separate fields** and must never be collapsed into a single number.

| Concept | What it is | Type |
|---|---|---|
| `risk_score` | Hazard probability estimate from XGBoost, 0–100 | `integer` |
| `risk_level` | Band label derived from score | `RiskLevel` enum |
| `risk_state` | Operational state of the zone in the state machine | `RiskState` enum |
| `confidence` | Reliability of the prediction, 0.0–1.0 | `float` |
| `data_quality` | Freshness/completeness of inputs | `DataQuality` enum |
| `base_susceptibility` | Static terrain/geology score, 0–100 | `integer` |
| `response_priority` | Combined hazard + exposure urgency | `ResponsePriority` enum |
| `trend` | Direction of recent risk change | `Trend` enum |

**None of these may be merged into one number.** The UI and mobile app must display them as separate concepts.

---

## 1. Point Risk Response

### Endpoint

```
GET /api/v1/risk/{latitude}/{longitude}
```

Path parameters: `latitude` (float, WGS84), `longitude` (float, WGS84).

### Current stub (as implemented)

The existing implementation in `backend/app/api/v1/router.py` returns:

```json
{
  "latitude": 27.33,
  "longitude": 88.61,
  "base_susceptibility": 45.0,
  "current_risk": 78,
  "risk_level": "HIGH",
  "risk_6h": 82,
  "risk_24h": 88,
  "risk_48h": 75,
  "risk_72h": 60
}
```

This is a **stub with hardcoded values**. It is not canonical yet. The canonical shape is defined below.

### Canonical `RiskPointResponse`

```
{
  "latitude":              float      // WGS84 decimal degrees
  "longitude":             float      // WGS84 decimal degrees
  "cell_id":               string     // nullable — the PostGIS grid cell this point maps to, if available
  "base_susceptibility":   integer    // 0–100, Model 1 output
  "current_risk":          integer    // 0–100, Model 2 output for current conditions
  "risk_level":            RiskLevel  // derived from current_risk score
  "risk_state":            RiskState  // operational state of the nearest/containing zone
  "trend":                 Trend      // direction of change over recent window
  "confidence":            float      // 0.0–1.0, nullable — omit if not yet computed
  "data_quality":          DataQuality
  "forecasts":             ForecastEntry[]  // see below; may be empty array
  "updated_at":            string     // ISO 8601 UTC timestamp of last risk computation
  "model_version":         string     // e.g. "dynamic_xgb_v1"
}
```

#### `ForecastEntry`

```
{
  "horizon":     string     // one of: "6h" | "24h" | "48h" | "72h"
  "risk_score":  integer    // 0–100
  "risk_level":  RiskLevel
  "validated":   boolean    // true only if this horizon has a defensible trained model
}
```

### Notes

- `cell_id` is nullable. Point queries may not map to a grid cell if the PostGIS grid has not been loaded yet.
- `confidence` is nullable at hackathon scope. It must be included when the model supports calibration. It must not be fabricated.
- `forecasts` may be an empty array if no forecast model is available. The UI must gracefully handle an empty array.
- The existing stub lacks `risk_state`, `trend`, `confidence`, `data_quality`, `forecasts`, `updated_at`, and `model_version`. Yashwanth must add these when implementing the real endpoint.

---

## 2. Risk Zone / Grid Feature

Used by the authority dashboard GIS heatmap. Returned as a GeoJSON `FeatureCollection` by the grid endpoint.

### Endpoint

```
GET /api/v1/risk/grid?bbox={west},{south},{east},{north}
```

Query parameter: `bbox` — bounding box in WGS84 decimal degrees, comma-separated: `west,south,east,north`.

Optional query parameters (all nullable):
- `horizon` — one of `current | 6h | 24h | 48h | 72h`. Defaults to `current`.
- `min_risk` — integer 0–100. Filter to cells with risk_score >= this value.

### Response: GeoJSON `FeatureCollection`

```json
{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" }
  },
  "features": [ /* RiskZoneFeature[] */ ],
  "meta": {
    "horizon": "current",
    "generated_at": "ISO 8601 UTC",
    "total_cells": 0,
    "model_version": "string"
  }
}
```

### `RiskZoneFeature` (GeoJSON Feature)

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [ /* exterior ring, WGS84, closed */ ]
  },
  "properties": {
    "cell_id":             "string",
    "base_susceptibility": "integer 0–100",
    "risk_score":          "integer 0–100",
    "risk_level":          "RiskLevel",
    "risk_state":          "RiskState",
    "response_priority":   "ResponsePriority",
    "trend":               "Trend",
    "confidence":          "float 0.0–1.0 | null",
    "data_quality":        "DataQuality",
    "updated_at":          "ISO 8601 UTC",
    "model_version":       "string"
  }
}
```

### CRS

All geometry in this API uses **WGS84 / EPSG:4326** (longitude, latitude order, as per GeoJSON RFC 7946). Distances and area computations must use an appropriate projected CRS internally (PostGIS handles this); they must never be calculated from degree differences.

---

## 3. Zone Detail

Returns full zone data for a selected cell, including forecasts and SHAP explanation.

### Endpoint

```
GET /api/v1/risk/{cell_id}
```

### `RiskZoneDetailResponse`

```
{
  "cell_id":              string
  "geometry":             GeoJSON Polygon (WGS84)
  "base_susceptibility":  integer 0–100
  "current_risk":         integer 0–100
  "risk_level":           RiskLevel
  "risk_state":           RiskState
  "response_priority":    ResponsePriority
  "trend":                Trend
  "confidence":           float | null
  "data_quality":         DataQuality
  "updated_at":           ISO 8601 UTC string
  "model_version":        string
  "forecasts":            ForecastEntry[]
  "explanation":          ExplanationSummary | null
  "observation_meta":     ObservationMeta
}
```

#### `ExplanationSummary` (SHAP — P1 scope)

```
{
  "top_factors": [
    {
      "feature":     string,   // canonical feature name from feature_schema.yaml
      "direction":   "POSITIVE" | "NEGATIVE",
      "shap_value":  float
    }
  ],
  "explanation_version": string
}
```

Only populated when SHAP is available. The UI must handle `null` gracefully (show "Explanation not available").

#### `ObservationMeta`

```
{
  "rainfall_24h_mm":   float | null,
  "rainfall_72h_mm":   float | null,
  "soil_moisture":     float | null,
  "source":            string | null,   // e.g. "IMD", "NASA_GPM"
  "observed_at":       ISO 8601 UTC string | null,
  "stale":             boolean
}
```

---

## 4. Zone Explanation

SHAP explanation for a specific cell (P1 scope).

### Endpoint

```
GET /api/v1/risk/{cell_id}/explain
```

### Response

```
{
  "cell_id":       string
  "risk_score":    integer
  "risk_level":    RiskLevel
  "explanation":   ExplanationSummary
  "model_version": string
  "explained_at":  ISO 8601 UTC string
}
```

---

## 5. Forecast Horizons

### Architecture-supported horizons

The following horizons are defined in `configs/dynamic_risk.yaml` and the project architecture:

```
current | 6h | 24h | 48h | 72h
```

### Actually validated horizons at hackathon scope

Per `NETRA_Master_Plans/HACKATHON_PLAN.md` §5:

> **Freeze the ML Target: next 24 hours. Do not build multiple horizons simultaneously.**

The `validated` field in `ForecastEntry` must reflect this:

| Horizon | `validated` value |
|---|---|
| `current` | `true` (once model is trained) |
| `24h` | `true` (if dynamic model is defensible) |
| `6h` | `false` — architecture supported, not yet validated |
| `48h` | `false` — architecture supported, not yet validated |
| `72h` | `false` — architecture supported, not yet validated |

The UI must display `validated: false` forecasts with a clear visual indicator (e.g., "Indicative only — model not yet validated for this horizon").

**The backend must never return a `validated: true` forecast for a horizon that does not have a trained and evaluated model artifact.**

---

## 6. Point Risk for Mobile (Citizen App)

Taarun's mobile app uses the same `GET /api/v1/risk/{latitude}/{longitude}` endpoint. The mobile app requires only a subset of fields for the local risk card:

```
current_risk
risk_level
risk_state
forecasts (24h only, if available)
updated_at
data_quality
```

The full response is returned; the mobile app reads only these fields. No separate mobile endpoint is required.

---

## 7. Field name registry

To prevent drift between files, all risk-related field names used across contracts are listed here.

| Field | Type | Used in |
|---|---|---|
| `cell_id` | string | zone, detail, explanation |
| `base_susceptibility` | integer 0–100 | point, zone, detail, ml.md |
| `current_risk` | integer 0–100 | point, zone, detail |
| `risk_score` | integer 0–100 | zone feature properties, forecast |
| `risk_level` | RiskLevel | point, zone, detail, forecast |
| `risk_state` | RiskState | point, zone, detail |
| `response_priority` | ResponsePriority | zone, detail, exposure |
| `trend` | Trend | point, zone, detail |
| `confidence` | float 0–1 nullable | point, zone, detail |
| `data_quality` | DataQuality | point, zone, detail |
| `updated_at` | ISO 8601 UTC | point, zone, detail |
| `model_version` | string | point, zone, detail, explanation |
| `forecasts` | ForecastEntry[] | point, detail |
| `horizon` | string enum | forecast entry, grid query |
| `validated` | boolean | forecast entry |
