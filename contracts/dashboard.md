# Dashboard Contract

Defines the data contract for Debarshi's authority web dashboard. The dashboard is a consumer of multiple API endpoints. This file specifies which endpoints to call for each panel and what each response field means.

Source: AGENTS.md §20; `docs/fetures/FEATURE_Authority_Dashboard.md`; HACKATHON_PLAN.md §10; `docs/NER_Landslide_Early_Warning_Project_Documentation.md` §29–34.

---

## 1. Dashboard Summary

The single endpoint that provides the KPI row at the top of the dashboard.

### Endpoint

```
GET /api/v1/dashboard/summary
```

No query parameters required. The server returns system-wide KPIs.

### `DashboardSummaryResponse`

```
{
  "kpi": {
    "critical_zones":       integer,    // count of risk cells where risk_state == "CRITICAL"
    "high_risk_zones":      integer,    // count of cells where risk_state == "HIGH"
    "active_alerts":        integer,    // count of alerts where state == "ACTIVE" or "ESCALATED"
    "new_reports":          integer,    // count of reports where status == "PENDING" or "REVIEW"
    "roads_at_risk":        integer,    // count of road segments where risk_score >= 61
    "villages_at_risk":     integer,    // count of villages where current_risk >= 61
    "unresolved_incidents": integer     // reports where status is not VERIFIED and not REJECTED
  },
  "data_freshness": {
    "risk_grid_updated_at":  ISO 8601 UTC string | null,
    "rainfall_updated_at":   ISO 8601 UTC string | null,
    "overall_quality":       DataQuality
  },
  "generated_at": ISO 8601 UTC string
}
```

### Field notes

- All integer KPIs are 0 when nothing is elevated; never null.
- `data_freshness.overall_quality` is `"GOOD"` if all primary sources are fresh, `"DEGRADED"` if one or more is stale, `"MISSING"` if critical data is unavailable.
- `generated_at` is the timestamp when the summary was computed, not the risk computation time.

---

## 2. Which endpoint to call for each dashboard panel

| Panel | Endpoint | Contract file |
|---|---|---|
| KPI row | `GET /api/v1/dashboard/summary` | This file |
| Risk heatmap (map tiles) | `GET /api/v1/risk/grid?bbox=...` | `risk.md` §2 |
| Zone detail (click on map) | `GET /api/v1/risk/{cell_id}` | `risk.md` §3 |
| SHAP explanation (zone panel) | `GET /api/v1/risk/{cell_id}/explain` | `risk.md` §4 |
| Forecast panel (zone) | Included in `GET /api/v1/risk/{cell_id}` `.forecasts` | `risk.md` §3 |
| Alert center | `GET /api/v1/alerts` | `alerts.md` §5 |
| Approve alert | `POST /api/v1/alerts/{id}/acknowledge` | `alerts.md` §5 |
| Resolve alert | `POST /api/v1/alerts/{id}/resolve` | `alerts.md` §5 |
| Report list / incident panel | `GET /api/v1/reports` | `reports.md` §3 |
| Verify / reject report | `POST /api/v1/reports/{id}/verify` | `reports.md` §4 |
| Nearby roads | `GET /api/v1/roads/risk?bbox=...` | `exposure.md` §3 |
| Village exposure | `GET /api/v1/villages/risk?bbox=...` | `exposure.md` §4 |
| Nearby assets (zone click) | `GET /api/v1/assets/nearby?latitude=...&longitude=...` | `exposure.md` §2 |
| Report GeoJSON (map overlay) | `GET /api/v1/reports?bbox=...` | `reports.md` §7 |

---

## 3. Zone Detail Panel — full data structure expected

When Debarshi clicks a zone on the map, the zone detail panel should display:

```
From GET /api/v1/risk/{cell_id}:

  Risk Score: current_risk / 100 — risk_level
  State:      risk_state
  Trend:      trend (↑ / ↓ / →)
  Confidence: confidence (if not null)
  Data Quality: data_quality

  Forecast:
    CURRENT:    current_risk  (risk_level)
    6 HOURS:    forecasts[horizon="6h"].risk_score  (validated flag)
    24 HOURS:   forecasts[horizon="24h"].risk_score (validated flag)
    48 HOURS:   forecasts[horizon="48h"].risk_score (validated flag)
    72 HOURS:   forecasts[horizon="72h"].risk_score (validated flag)

  Base Susceptibility: base_susceptibility

  Observations (from observation_meta):
    Rainfall 24h: observation_meta.rainfall_24h_mm mm
    Rainfall 72h: observation_meta.rainfall_72h_mm mm
    Soil Moisture: observation_meta.soil_moisture
    Source: observation_meta.source
    As of: observation_meta.observed_at

  Why is this high risk? (from explanation, if not null):
    top_factors[0..4].feature  +  direction  +  shap_value

From GET /api/v1/assets/nearby?latitude=...&longitude=...&radius_m=5000:
  Nearby roads, villages, hospitals, infrastructure
```

---

## 4. Authority Actions available from dashboard

| Action | Endpoint | When |
|---|---|---|
| Verify report | `POST /api/v1/reports/{id}/verify` body: `{"action":"VERIFY"}` | Report is in REVIEW |
| Reject report | `POST /api/v1/reports/{id}/verify` body: `{"action":"REJECT", "rejection_reason":"..."}` | Report is in REVIEW |
| Mark probable | `POST /api/v1/reports/{id}/verify` body: `{"action":"MARK_PROBABLE"}` | Report is in REVIEW |
| Approve alert | `POST /api/v1/alerts/{id}/acknowledge` | Alert is PENDING_APPROVAL |
| Resolve alert | `POST /api/v1/alerts/{id}/resolve` | Alert is ACTIVE or ESCALATED |
| Create manual alert | `POST /api/v1/alerts` | Any time (authority role) |

---

## 5. Map layer toggle list

The dashboard map supports the following toggleable layers. Each layer is sourced from a backend endpoint or a static asset.

| Layer | Source |
|---|---|
| Risk heatmap (current) | `GET /api/v1/risk/grid?bbox=&horizon=current` |
| Risk heatmap (6h / 24h / 48h / 72h) | Same endpoint with `horizon=` param |
| Citizen reports | `GET /api/v1/reports?bbox=` |
| Roads with risk | `GET /api/v1/roads/risk?bbox=` |
| Villages | `GET /api/v1/villages/risk?bbox=` |
| Active alerts | `GET /api/v1/alerts?state=ACTIVE` |
| Historical landslide inventory | Static PostGIS layer (no separate endpoint specified; GeoJSON from backend TBD by Yashwanth) |

Layers not listed (e.g., real-time satellite, rainfall rasters) are P1/P2 scope and are not part of this contract.

---

## 6. Polling / refresh expectations

The dashboard does not use WebSockets at hackathon scope. Debarshi should poll:

- Dashboard summary: every 60 seconds.
- Risk grid: refresh on viewport change (map pan/zoom) or every 120 seconds.
- Alerts: every 30 seconds.
- Reports: every 60 seconds.

These are recommendations. Yashwanth may impose rate limiting; the frontend must handle HTTP 429 gracefully.
