# Exposure Contract

Exposure represents what is at risk — roads, villages, population, and critical assets. It is **separate from hazard risk**. A high-exposure, moderate-risk zone may deserve more response attention than a low-exposure, high-risk zone.

Source: AGENTS.md §18, §21, §22; `FEATURE_Risk_Fusion_Response_Priority.md`; `docs/NER_Landslide_Early_Warning_Project_Documentation.md` §22, §33, §34.

---

## Conceptual separation

```
hazard_risk  (from ML model)
     +
exposure     (from this contract)
     ↓
response_priority  (ResponsePriority enum — see enums.md)
```

Exposure data is largely static or slowly-changing (road network, village locations, population estimates). It is loaded from OpenStreetMap or government sources, not recomputed per request.

---

## 1. Asset Types

| AssetType value | Description | Geometry |
|---|---|---|
| `"ROAD"` | Road segment | LineString |
| `"VILLAGE"` | Settlement / village centroid or polygon | Point or Polygon |
| `"HOSPITAL"` | Hospital or healthcare facility | Point |
| `"SCHOOL"` | School | Point |
| `"BRIDGE"` | Bridge | Point or LineString |
| `"POWER_INFRASTRUCTURE"` | Power line, substation | Point or LineString |
| `"CRITICAL_INFRASTRUCTURE"` | Other critical infrastructure | Point |

**Source:** AGENTS.md §18, FEATURE_Risk_Fusion_Response_Priority.md exposure engine table.

---

## 2. Nearby Assets

Returns assets within a specified radius of a location or risk cell.

### Endpoint

```
GET /api/v1/assets/nearby
```

Query parameters:
- `latitude` — float, required
- `longitude` — float, required
- `radius_m` — float, optional, default 5000 (5 km)
- `asset_type` — AssetType filter, optional

### `NearbyAssetsResponse`

```
{
  "query_latitude":  float,
  "query_longitude": float,
  "radius_m":        float,
  "assets":          AssetSummary[]
}
```

### `AssetSummary`

```
{
  "asset_id":    string,
  "asset_type":  AssetType,
  "name":        string | null,
  "distance_m":  float,          // distance from query point
  "geometry":    GeoJSON geometry (WGS84),
  "risk_score":  integer | null, // current risk of the zone this asset intersects/overlaps
  "risk_level":  RiskLevel | null
}
```

---

## 3. Road Risk

Returns road segments with their current risk context.

### Endpoint

```
GET /api/v1/roads/risk
```

Query parameters:
- `bbox` — `west,south,east,north` WGS84, optional
- `min_risk` — integer, optional — filter to roads where `risk_score >= min_risk`

### `RoadRiskResponse`

```
{
  "type": "FeatureCollection",
  "features": [ /* RoadRiskFeature[] */ ]
}
```

### `RoadRiskFeature` (GeoJSON Feature)

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [ /* WGS84 coordinates */ ]
  },
  "properties": {
    "road_id":           "string",
    "name":              "string | null",
    "road_class":        "string | null",  // e.g. "NH", "SH", "LOCAL"
    "risk_score":        "integer | null",
    "risk_level":        "RiskLevel | null",
    "risk_trend":        "Trend | null",
    "nearby_reports":    "integer",         // count of VERIFIED or PROBABLE reports within buffer
    "updated_at":        "ISO 8601 UTC"
  }
}
```

**Source:** AGENTS.md §21, FEATURE_Risk_Fusion_Response_Priority.md road risk module.

> `road_class` is informational. The values (NH, SH, LOCAL) are not enumerated in the project documentation as a fixed list. Yashwanth populates from the underlying data source (OSM or government). The frontend renders it as a label.

---

## 4. Village Risk

Returns villages with risk and exposure summary.

### Endpoint

```
GET /api/v1/villages/risk
```

Query parameters:
- `bbox` — `west,south,east,north` WGS84, optional
- `min_risk` — integer, optional

### `VillageRiskResponse`

```
{
  "villages": VillageRiskItem[]
}
```

### `VillageRiskItem`

```
{
  "village_id":            string,
  "name":                  string,
  "latitude":              float,
  "longitude":             float,
  "population":            integer | null,  // null if authoritative source not available
  "current_risk":          integer | null,
  "risk_level":            RiskLevel | null,
  "risk_24h":              integer | null,
  "nearest_cell_id":       string | null,
  "road_access_risk":      RiskLevel | null,  // risk of the primary access road
  "updated_at":            ISO 8601 UTC string
}
```

**Source:** AGENTS.md §22, FEATURE_Risk_Fusion_Response_Priority.md village/population exposure.

> `population` is `null` unless an authoritative population source has been loaded. The UI must handle `null` gracefully (display "Population: N/A"). Do not fabricate population numbers.

---

## 5. Exposure Summary (for dashboard KPI row)

The `GET /api/v1/dashboard/summary` endpoint includes exposure KPIs inline. See `dashboard.md` for the full dashboard summary contract.

The exposure contribution to the summary is:

```
{
  "roads_at_risk":      integer,   // count of road segments where risk_score >= 61 (HIGH threshold)
  "villages_at_risk":   integer,   // count of villages where current_risk >= 61
  "critical_assets":    integer    // count of non-road assets where risk_score >= 81 (CRITICAL threshold)
}
```
