# Canonical Enumerations

These are the authoritative string values for every shared enumeration in NETRA. All API responses, ML outputs, and frontend rendering must use exactly these strings. Do not use alternative capitalisation, abbreviations, or synonyms.

Source reconciliation is documented in `CONTRACT_DECISIONS.md`.

---

## RiskLevel

Represents the hazard band derived from a 0–100 risk score. Used in API responses wherever a score is accompanied by a human-readable band label.

**Ordering:** ascending severity (VERY_LOW < LOW < MODERATE < HIGH < CRITICAL)

| Value | Score range | Meaning |
|---|---|---|
| `"VERY_LOW"` | 0–20 | Negligible estimated hazard |
| `"LOW"` | 21–40 | Low estimated hazard |
| `"MODERATE"` | 41–60 | Moderate estimated hazard |
| `"HIGH"` | 61–80 | Elevated estimated hazard; authority awareness required |
| `"CRITICAL"` | 81–100 | Severe estimated hazard; action consideration required |

**Source:** `configs/dynamic_risk.yaml` risk_bands, AGENTS.md §17, `docs/fetures/FEATURE_AI_Risk_Prediction.md`.

**Used in:** `RiskPointResponse`, `RiskZoneFeature`, every field ending in `_level`, alert severity.

> These thresholds are configurable in `configs/dynamic_risk.yaml`. The contract specifies the labels; exact numeric boundaries may be updated via that config file with all-team agreement.

---

## RiskState

Represents the **operational state** of a zone in the risk state machine. This is distinct from `RiskLevel` — see `CONTRACT_DECISIONS.md` decision CD-001.

**Ordering:** ascending severity (NORMAL < WATCH < ELEVATED < HIGH < CRITICAL)

| Value | Meaning |
|---|---|
| `"NORMAL"` | No elevated concern |
| `"WATCH"` | Conditions deteriorating; monitoring required |
| `"ELEVATED"` | Conditions significantly elevated; preparedness action |
| `"HIGH"` | High risk state; authority notification triggered |
| `"CRITICAL"` | Critical state; maximum response priority |

**De-escalation:** states can decrease as well as increase (e.g., CRITICAL → HIGH → ELEVATED).

**Source:** `NETRA_Master_Plans/HACKATHON_PLAN.md` §7.

**Used in:** `RiskZoneFeature.risk_state`, alert trigger evaluation, dashboard state machine display.

---

## Trend

Represents the direction of risk change over recent observations.

**No ordering** (directional, not severity-ranked).

| Value | Meaning |
|---|---|
| `"INCREASING"` | Risk score moving upward over recent window |
| `"DECREASING"` | Risk score moving downward over recent window |
| `"STABLE"` | Risk score not changing materially |

**Source:** HACKATHON_PLAN.md §10 ("trend"), FEATURE_Authority_Dashboard.md zone panel description.

**Used in:** `RiskZoneFeature.trend`, zone detail panel.

---

## DataQuality

Represents the freshness and completeness of the data used for a prediction or observation.

| Value | Meaning |
|---|---|
| `"GOOD"` | All primary sources available, within expected freshness window |
| `"DEGRADED"` | One or more sources stale or unavailable; fallback used |
| `"STALE"` | Primary source not updated within acceptable window |
| `"MISSING"` | Required data not available; prediction may be unreliable |

**Source:** AGENTS.md §11 (missing data), §35 (API failure handling), §36 (data freshness).

**Used in:** `RiskZoneFeature.data_quality`, `RiskPointResponse.data_quality`, `ObservationMeta`.

---

## ReportCategory

The canonical incident categories that a citizen or field officer can report.

| Value | Description |
|---|---|
| `"CRACK"` | New or expanding crack in terrain or structure |
| `"ROCKFALL"` | Falling rocks or debris |
| `"ROAD_BLOCKAGE"` | Road obstructed by debris or displacement |
| `"SOIL_MOVEMENT"` | Visible soil displacement or creep |
| `"SEEPAGE"` | Water seepage through a slope |
| `"FLOODING"` | Water accumulation or flash flood |
| `"LANDSLIDE"` | Active or recent landslide observed |
| `"OTHER"` | Observed hazard not matching above categories |

**Source reconciliation:** AGENTS.md §23 lists `LANDSLIDE, CRACK, ROCKFALL, ROAD_BLOCKAGE, SOIL_MOVEMENT, EROSION, FLOODING, OTHER`. HACKATHON_PLAN.md §8 lists `crack, soil movement, debris/rockfall, road deformation, seepage, other`. FEATURE_Citizen_Reporting.md lists `Landslide, Crack, Road blockage, Rockfall, Soil movement, Flooding, Drainage blockage, Seepage, Infrastructure damage, Road deformation`.

**Decision:** See `CONTRACT_DECISIONS.md` CD-002 for full reconciliation. The canonical list above represents the minimal intersection defensible by all three sources, with `SEEPAGE` added from HACKATHON_PLAN.md. `EROSION`, `DRAINAGE_BLOCKAGE`, `INFRASTRUCTURE_DAMAGE`, and `ROAD_DEFORMATION` are omitted at hackathon scope (P0) to keep the category list manageable for Taarun's mobile form.

**No ordering.**

**Used in:** `ReportCreateRequest.category`, `ReportResponse.category`, dashboard filter.

---

## ReportStatus

The lifecycle state of a citizen report.

**Ordering:** PENDING → REVIEW → (VERIFIED | REJECTED) as a terminal fork. PROBABLE is a non-terminal intermediate.

| Value | Meaning |
|---|---|
| `"PENDING"` | Report received; awaiting AI pre-screen or queue |
| `"REVIEW"` | Under authority or analyst review |
| `"PROBABLE"` | Evidence suggests likely; not yet fully verified |
| `"VERIFIED"` | Confirmed by authority; contributes to situational awareness |
| `"REJECTED"` | Determined to be invalid, spam, or duplicate |

**Source:** HACKATHON_PLAN.md §8 `PENDING → REVIEW → PROBABLE / VERIFIED / REJECTED`. Consistent with FEATURE_Citizen_Reporting.md verification workflow.

**Terminal states:** `VERIFIED`, `REJECTED`.

**Used in:** `ReportResponse.status`, dashboard incident panel, Taarun's report history screen.

---

## AlertState

The lifecycle state of an alert. See `alerts.md` for the full lifecycle description.

| Value | Meaning |
|---|---|
| `"CREATED"` | Alert candidate generated by risk engine or authority |
| `"PENDING_APPROVAL"` | Awaiting authority review before notification |
| `"ACTIVE"` | Approved and notification sent or in progress |
| `"ESCALATED"` | Risk has increased; alert upgraded |
| `"RESOLVED"` | Risk returned to acceptable level; alert closed |

**Source:** AGENTS.md §28 `ALERT_CREATED, ALERT_SENT, ALERT_ACTIVE, ALERT_ESCALATED, ALERT_RESOLVED`. The "SENT" sub-state is modelled as a delivery detail inside the `ACTIVE` state rather than a top-level state — see `CONTRACT_DECISIONS.md` CD-003.

**No ordering** (lifecycle progression, not severity).

**Used in:** `AlertResponse.state`, dashboard alert center.

---

## ResponsePriority

The response prioritisation level for a zone, combining hazard risk with exposure. This is distinct from `RiskLevel` and `RiskState`.

**Ordering:** ascending urgency (LOW < MEDIUM < HIGH < IMMEDIATE)

| Value | Meaning |
|---|---|
| `"LOW"` | Hazard or exposure is not urgent |
| `"MEDIUM"` | Moderate combined hazard + exposure |
| `"HIGH"` | Significant combined hazard + exposure; inspection recommended |
| `"IMMEDIATE"` | Critical combined hazard + exposure; highest response priority |

**Source:** FEATURE_Risk_Fusion_Response_Priority.md, AGENTS.md §18.

**Used in:** `RiskZoneFeature.response_priority`, exposure summary.

> The exact formula combining hazard risk and exposure into `ResponsePriority` is defined in `FEATURE_Risk_Fusion_Response_Priority.md` and is Yashwanth's responsibility to implement. The enum values here represent the output labels only.
