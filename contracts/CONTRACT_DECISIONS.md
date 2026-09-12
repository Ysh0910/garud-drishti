# Contract Decisions

This file records every conflict, ambiguity, or gap found when reconciling existing project documentation, and the decision made for each. Decisions marked **PROVISIONAL** must be re-confirmed with all affected developers before the relevant contract stabilises.

---

## CD-001 — RiskLevel vs RiskState: two distinct enumerations

**Issue:** Two separate sets of risk labels exist in the repository. `AGENTS.md §17` and `configs/dynamic_risk.yaml` define a scoring band system: `VERY_LOW / LOW / MODERATE / HIGH / CRITICAL`. `HACKATHON_PLAN.md §7` defines a state-machine system: `NORMAL / WATCH / ELEVATED / HIGH / CRITICAL`. These are not the same thing but share two values (`HIGH` and `CRITICAL`), which creates collision risk if collapsed into one enum.

**Existing definitions:**

- `AGENTS.md §17` and `dynamic_risk.yaml`:
  ```
  0–20   VERY_LOW
  21–40  LOW
  41–60  MODERATE
  61–80  HIGH
  81–100 CRITICAL
  ```
- `HACKATHON_PLAN.md §7`:
  ```
  NORMAL → WATCH → ELEVATED → HIGH → CRITICAL
  ```

**Chosen contract:** Define them as two separate enumerations with distinct names:
- `RiskLevel` — the score-band label (VERY_LOW through CRITICAL). Used wherever a 0–100 score is accompanied by a label.
- `RiskState` — the operational state of the zone's state machine (NORMAL through CRITICAL). Used in zone features and alert trigger rules.

**Reason:** Collapsing them would lose information. `RiskLevel: MODERATE` and `RiskState: WATCH` are meaningful and different. Keeping them separate allows both to appear simultaneously in a zone response.

**Affected developers:** All four. Debarshi must render them as separate fields. Tejasvi's model outputs `RiskLevel` (score band). The state machine (yielding `RiskState`) is Yashwanth's backend responsibility.

**Status:** Confirmed — not provisional.

---

## CD-002 — ReportCategory canonical list

**Issue:** Three project documents define different category lists with different terminology:

- `AGENTS.md §23`: `LANDSLIDE, CRACK, ROCKFALL, ROAD_BLOCKAGE, SOIL_MOVEMENT, EROSION, FLOODING, OTHER`
- `HACKATHON_PLAN.md §8`: `crack, soil movement, debris/rockfall, road deformation, seepage, other`
- `FEATURE_Citizen_Reporting.md`: `Landslide, Crack, Road blockage, Rockfall, Soil movement, Flooding, Drainage blockage, Seepage, Infrastructure damage, Road deformation`

The lists disagree on: whether `SEEPAGE` exists, whether `EROSION` is separate from `SOIL_MOVEMENT`, whether `ROAD_DEFORMATION` is separate from `ROAD_BLOCKAGE`, and whether `DRAINAGE_BLOCKAGE` and `INFRASTRUCTURE_DAMAGE` are in scope.

**Chosen contract (hackathon scope):**

```
CRACK, ROCKFALL, ROAD_BLOCKAGE, SOIL_MOVEMENT, SEEPAGE, FLOODING, LANDSLIDE, OTHER
```

**Reasoning:**
- `CRACK, ROCKFALL, ROAD_BLOCKAGE, SOIL_MOVEMENT, FLOODING, LANDSLIDE, OTHER` are present in at least two of the three sources.
- `SEEPAGE` is added from HACKATHON_PLAN.md as a field-relevant category.
- `EROSION` is omitted: it overlaps significantly with `SOIL_MOVEMENT` at hackathon scope.
- `DRAINAGE_BLOCKAGE` and `INFRASTRUCTURE_DAMAGE` are omitted at P0 to keep the mobile form simple (FEATURE_Citizen_Reporting.md marks these as extended categories).
- `ROAD_DEFORMATION` is collapsed into `ROAD_BLOCKAGE` at hackathon scope; they share the same operational response.

**PROVISIONAL:** If Taarun or the team decides `ROAD_DEFORMATION` needs to be separate, the category list can be extended. Extension is non-breaking (add a new value; old values remain). Removal would be breaking.

**Affected developers:** Taarun (mobile form categories), Yashwanth (validation), Debarshi (filter UI).

---

## CD-003 — AlertState: ALERT_SENT as a separate state vs delivery detail

**Issue:** `AGENTS.md §28` defines five alert states: `ALERT_CREATED, ALERT_SENT, ALERT_ACTIVE, ALERT_ESCALATED, ALERT_RESOLVED`. The distinction between `ALERT_SENT` and `ALERT_ACTIVE` is ambiguous — sent implies active unless there is a meaningful intermediate state.

**Chosen contract:** `ALERT_SENT` is not modelled as a top-level `AlertState`. Instead, delivery status is captured in `NotificationSummary.delivery_status` (`PENDING / SENT / FAILED / SIMULATED`). The top-level `AlertState` uses: `CREATED, PENDING_APPROVAL, ACTIVE, ESCALATED, RESOLVED`.

`PENDING_APPROVAL` is added because the architecture explicitly requires authority approval before notification. This is not in AGENTS.md §28 verbatim but is mandated by HACKATHON_PLAN.md §17 and the scientific rules in AGENTS.md §27.

**Reason:** Separating notification delivery from lifecycle state is cleaner and prevents UI confusion (a sent notification that wasn't approved would be wrong).

**Affected developers:** Yashwanth (alert engine), Debarshi (alert center state display).

**Status:** Confirmed — not provisional.

---

## CD-004 — Confidence field: present or absent at hackathon scope

**Issue:** `FEATURE_AI_Risk_Prediction.md` introduces a `confidence` field (0.0–1.0) separate from `risk_score`. No model calibration code exists. HACKATHON_PLAN.md §6 says "Calibrate only if the data supports it."

**Chosen contract:** `confidence` is included in the API response but is **nullable**. When the model has not been calibrated, the backend returns `null`. The UI must display "Confidence: N/A" when null. The field must not be fabricated.

**Reason:** Including the field now prevents a breaking schema change later when calibration is added.

**Affected developers:** Tejasvi (must not fabricate it; set null if not computed), Yashwanth (pass through from ML), Debarshi (handle null gracefully).

**Status:** Confirmed — not provisional.

---

## CD-005 — Forecast horizons: architecture vs hackathon scope

**Issue:** `AGENTS.md §4`, `configs/dynamic_risk.yaml`, and all feature docs define five horizons: `current, 6h, 24h, 48h, 72h`. `HACKATHON_PLAN.md §5` explicitly says: "Freeze the ML target: next 24 hours. Do not build multiple horizons simultaneously."

**Chosen contract:** All five horizons are present in the API response structure. Each `ForecastEntry` carries a `validated` boolean. At hackathon scope:
- `current` → `validated: true` (once the model is trained)
- `24h` → `validated: true` (if dynamic model is defensible)
- `6h`, `48h`, `72h` → `validated: false` (architecture supported, not trained)

The UI must visually distinguish `validated: false` forecasts.

**Reason:** Including all horizons in the schema now avoids a breaking change when additional models are trained. The `validated` field ensures honest representation.

**Affected developers:** Tejasvi (only produce validated outputs for trained horizons), Yashwanth (populate `validated` correctly), Debarshi (render non-validated forecasts with visual caveat).

**Status:** Confirmed — not provisional.

---

## CD-006 — Response priority: belongs in risk contract or exposure contract?

**Issue:** `FEATURE_Risk_Fusion_Response_Priority.md` defines `ResponsePriority` as a combination of hazard risk and exposure. It could logically belong in either the risk contract (since it's computed alongside risk) or the exposure contract (since it depends on exposure data).

**Chosen contract:** `ResponsePriority` is a field on `RiskZoneFeature` (in `risk.md`) because it is a zone-level property that the map needs to colour/prioritise zones. The exposure contract (`exposure.md`) defines the inputs (roads, villages, assets) and references `ResponsePriority` by name. The formula is documented in `FEATURE_Risk_Fusion_Response_Priority.md`.

**Reason:** The map is Debarshi's primary consumer. The zone feature must carry the priority so the map can render it without a second API call.

**Affected developers:** Yashwanth (compute and attach to zone), Debarshi (render on map).

**Status:** Confirmed — not provisional.

---

## CD-007 — risk_score vs current_risk: field name consistency

**Issue:** The existing stub in `backend/app/api/v1/router.py` returns `"current_risk"`. `AGENTS.md §32` also uses `"current_risk"`. `FEATURE_GIS_Heatmap_Visualization.md` uses `"current_risk"` in the cell model. However, in GeoJSON feature properties it is more natural to call it `"risk_score"` since the horizon context (current vs 6h) is not implied.

**Chosen contract:**
- In `RiskPointResponse` and `RiskZoneDetailResponse`: use `current_risk` (matches existing stub and AGENTS.md).
- In `RiskZoneFeature.properties` (GeoJSON cell): use `risk_score` because the horizon is controlled by the `horizon` query parameter on the grid endpoint, so the field is always "the score for the requested horizon."
- In `ForecastEntry`: use `risk_score`.

**Reason:** A grid cell's property bag represents one horizon at a time (determined by the query). Naming it `current_risk` inside a `?horizon=24h` response would be misleading.

**Affected developers:** Debarshi (reads both field names in different contexts), Yashwanth (must use correct name in each response).

**Status:** Confirmed — not provisional.

---

## CD-008 — ReportCategory: AGENTS.md uses EROSION, hackathon plan uses SEEPAGE

**Documented in CD-002.** Separate entry for traceability.

**Issue:** `AGENTS.md §23` includes `EROSION` but not `SEEPAGE`. HACKATHON_PLAN.md §8 includes `seepage` but not erosion.

**Decision:** `SEEPAGE` is included in the canonical list. `EROSION` is not. Field officers reporting erosion should use `SOIL_MOVEMENT` at hackathon scope.

**PROVISIONAL:** Can be reversed in a non-breaking way by adding `EROSION` as an additional enum value later.

---

## CD-009 — `severity` in reports: not the same as RiskLevel

**Issue:** `AGENTS.md §23` and `FEATURE_Citizen_Reporting.md` both include a `severity` field on a report. This could be confused with `RiskLevel`.

**Chosen contract:** The report `severity` field is a citizen-assessed value with values `"LOW" | "MEDIUM" | "HIGH"`. It is explicitly not a `RiskLevel`. The API response must not map or rename it to `risk_level`. The UI should label it "Reported Severity" to distinguish from model-computed risk.

**Affected developers:** Taarun (mobile form field label), Debarshi (dashboard display label), Yashwanth (not to propagate to risk engine directly).

**Status:** Confirmed — not provisional.

---

## CD-010 — `updated_at` field name consistency

**Issue:** AGENTS.md §19 GIS cell fields use `updated_at`. The existing stub in `router.py` does not include a timestamp field.

**Chosen contract:** Use `updated_at` consistently for "when was this record last computed/updated." Use `generated_at` for "when was this API response generated" (dashboard summary). Use `captured_at` for citizen-reported observation time. Use `submitted_at` for server ingestion time on reports.

**Affected developers:** All. Prevents silent timestamp confusion.

**Status:** Confirmed — not provisional.

---

## Intentionally unresolved

The following items remain unspecified because the project documentation does not provide sufficient detail to define them safely. They are noted here so team members know not to make assumptions.

| Item | Reason unspecified |
|---|---|
| Categorical feature encoding for `geology`, `landcover`, `geomorphology`, `hydrological_condition` | Encoding depends on the actual GSI/ISRO dataset schema, which has not been obtained yet. Tejasvi must document encoding in `configs/feature_schema.yaml` when the data arrives. |
| `road_class` allowed values | Depends on the OSM or government road data schema. Yashwanth populates from data. |
| Exact spatial matching radius for Dataset 2 labels | AGENTS.md §7 says "Spatial matching rules must be documented" but does not define them. Tejasvi must define and document in `ml/` or `configs/`. |
| Alert notification template content | Depends on language selection and approved templates. Not yet defined. |
| Population data source and recency | AGENTS.md §22 says "Use authoritative population/exposure sources in production." Source not yet chosen. |
| Historical landslide GeoJSON endpoint | No endpoint is defined for serving the inventory as a map layer. Yashwanth should define when building the GIS layer. |
| WebSocket / SSE for real-time updates | Not defined in existing docs for hackathon scope. Dashboard polling is the fallback. |
