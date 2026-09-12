# Reports Contract

Citizen hazard reporting is the observational evidence layer of NETRA. This contract defines the boundary between Taarun's mobile app (producer) and Yashwanth's backend (owner), with the authority dashboard (Debarshi, consumer) reading the results.

**Scientific rule — enforced by contract:**

> A citizen report is evidence, not ground truth. A citizen report must never independently trigger a public emergency alert. An authority remains in the decision loop for all severe warnings.

---

## 1. CreateReport Request

Used by the citizen mobile app to submit a new hazard observation.

### Endpoint

```
POST /api/v1/reports
Content-Type: multipart/form-data
```

The request is multipart to support optional media upload alongside the JSON fields.

### Fields

| Field | Type | Required | Source / Notes |
|---|---|---|---|
| `client_report_id` | string (UUID) | Required | Client-generated idempotency ID. The server must deduplicate on this field within a rolling time window. Prevents double-submit on retry. |
| `category` | ReportCategory | Required | See `enums.md`. |
| `description` | string | Optional | Free text, max 1000 characters. |
| `latitude` | float | Required | WGS84 decimal degrees. |
| `longitude` | float | Required | WGS84 decimal degrees. |
| `location_accuracy_m` | float | Optional | GPS accuracy in metres, if available from the device. |
| `captured_at` | string | Required | ISO 8601 UTC timestamp of when the observation was made. Must be the observation time, not the upload time. |
| `severity` | string | Optional | User-assessed severity: `"LOW"` \| `"MEDIUM"` \| `"HIGH"`. This is a subjective field and must not be equated with `RiskLevel`. |
| `photo` | file | Optional | Single image file. See upload constraints below. |

### Media upload constraints (enforced by backend)

- Maximum file size: **10 MB** per photo.
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Extension validation: `.jpg`, `.jpeg`, `.png`, `.webp`.
- Server must generate its own storage filename. The client-supplied filename must never be used directly.
- Large media is stored in object storage, not in PostgreSQL.

### Offline support

Taarun's offline queue must preserve the original `captured_at` and `client_report_id` fields so that when the report uploads after connectivity is restored, the server receives the correct observation timestamp and can deduplicate.

---

## 2. Report Response

Returned on successful `POST /api/v1/reports`, and by `GET /api/v1/reports/{report_id}`.

### `ReportResponse`

```
{
  "report_id":         string        // server-assigned UUID
  "client_report_id":  string        // echoed back for client-side correlation
  "status":            ReportStatus  // initial state is "PENDING"
  "category":          ReportCategory
  "description":       string | null
  "latitude":          float
  "longitude":         float
  "location_accuracy_m": float | null
  "captured_at":       ISO 8601 UTC string
  "submitted_at":      ISO 8601 UTC string  // server ingestion time
  "severity":          string | null  // user-assessed: "LOW" | "MEDIUM" | "HIGH"
  "media_url":         string | null  // URL to object storage, null if no photo
  "evidence_score":    float | null   // 0.0–1.0, populated after AI pre-screen or authority review; null initially
  "nearest_cell_id":   string | null  // PostGIS nearest risk cell; null if grid not loaded
  "verified_by":       string | null  // authority user ID if status is VERIFIED or REJECTED
  "verified_at":       ISO 8601 UTC string | null
  "rejection_reason":  string | null  // populated if status is REJECTED
}
```

### Notes on `evidence_score`

This field is **not** the same as `risk_score`. It represents how much evidential weight this report carries, as assessed by AI pre-screen or authority. It starts as `null`. It is consumed by the backend when computing zone evidence strength. The UI may display it as a trust indicator but must not conflate it with hazard risk.

---

## 3. List Reports

```
GET /api/v1/reports
```

Query parameters (all optional):
- `status` — filter by `ReportStatus`
- `category` — filter by `ReportCategory`
- `bbox` — `west,south,east,north` WGS84
- `since` — ISO 8601 UTC — return reports `submitted_at` after this time
- `limit` — integer, default 50, max 200
- `offset` — integer, default 0

Response:

```
{
  "reports": ReportResponse[],
  "total":   integer,
  "limit":   integer,
  "offset":  integer
}
```

---

## 4. Verify a Report

Authority-only action.

```
POST /api/v1/reports/{report_id}/verify
Content-Type: application/json
```

Request body:

```
{
  "action":           "VERIFY" | "REJECT" | "MARK_PROBABLE",
  "rejection_reason": string | null  // required only when action is "REJECT"
}
```

Response: updated `ReportResponse`.

---

## 5. Report Clusters / Hotspots (P1 scope)

```
GET /api/v1/hotspots
```

Returns spatial clusters of reports. P1 — only implement if core is stable.

Response structure is not fully specified at hackathon scope. It must at minimum return:

```
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lon, lat] },
      "properties": {
        "cluster_id":    string,
        "report_count":  integer,
        "categories":    ReportCategory[],
        "latest_at":     ISO 8601 UTC string
      }
    }
  ]
}
```

---

## 6. Report Lifecycle

```
PENDING
   │
   ├─ (AI pre-screen / queue processing)
   │
   ▼
REVIEW
   │
   ├─── authority action: VERIFY ─────► VERIFIED (terminal)
   │
   ├─── authority action: MARK_PROBABLE ► PROBABLE
   │                                        │
   │                                        └─ (further review) → VERIFIED | REJECTED
   │
   └─── authority action: REJECT ─────► REJECTED (terminal)
```

**PENDING** is the initial state on receipt.
**REVIEW** is entered after initial AI pre-screen completes or when queued for human review.
**PROBABLE** is a non-terminal intermediate state. The UI should display it as "Under Review — Evidence Probable".
**VERIFIED** and **REJECTED** are terminal states.

A report in **VERIFIED** state contributes to situational awareness. It does not independently trigger an alert.

---

## 7. GeoJSON representation for map display

Reports are displayed on the authority map as points. The backend should be able to return a lightweight GeoJSON for map rendering:

```
GET /api/v1/reports?format=geojson&bbox=...
```

Each feature:

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [longitude, latitude] },
  "properties": {
    "report_id":    "string",
    "category":     "ReportCategory",
    "status":       "ReportStatus",
    "captured_at":  "ISO 8601 UTC"
  }
}
```

> `format=geojson` is an optional query parameter. If not supported, Debarshi constructs the GeoJSON client-side from the list response. Either approach is acceptable — Yashwanth decides during implementation.
