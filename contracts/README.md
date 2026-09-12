# NETRA — Shared Integration Contracts

## Why this directory exists

NETRA is built by four developers working in parallel on separate branches. Without a shared, machine-readable contract layer, each developer would make independent assumptions about field names, enum values, API shapes, and data semantics. Those assumptions would collide at merge time.

This `contracts/` directory is the **single source of truth for every interface boundary** between the four workstreams. It is not implementation code. It is the agreement that makes parallel development safe.

Every API response shape, every enum value, every ML output field, and every shared data structure is defined here first. Implementation may live anywhere in the repository — but the external shape of what crosses a boundary must match what is written here.

---

## What this directory contains

| File | Purpose |
|---|---|
| `README.md` | This file. Ownership, rules, and process. |
| `CONTRACT_DECISIONS.md` | Every conflict found in existing docs and how it was resolved. |
| `enums.md` | Canonical string values for all shared enumerations. |
| `risk.md` | The risk representation — point, zone/grid, forecast, semantics, geometry. |
| `reports.md` | The citizen report request, response, and lifecycle. |
| `exposure.md` | Roads, villages, assets and the exposure summary. |
| `alerts.md` | The alert object, lifecycle, trigger rules, and delivery contract. |
| `dashboard.md` | The authority dashboard summary API and which endpoints the UI consumes. |
| `ml.md` | The ML ↔ backend interface: model inputs, outputs, inference contract, metadata. |
| `examples/` | Valid JSON examples for every major object. |

---

## Developer ownership

| Contract | Tejasvi (ML + Data) | Yashwanth (Backend + API) | Debarshi (Authority Web UI) | Taarun (Citizen Mobile) |
|---|---|---|---|---|
| `risk.md` | **Produces** ML semantics and score fields | **Exposes** via API | **Consumes** for map + zone panel | Optional read-only use |
| `reports.md` | Optional evidence context | **Owns** API | **Consumes / review panel** | **Produces** (submit flow) |
| `exposure.md` | Optional model context | **Owns** API | **Consumes** for asset/road panels | Not required |
| `alerts.md` | Risk input / context | **Owns** lifecycle + API | **Consumes** / approve UI | Optional notification / status |
| `dashboard.md` | No | **Provides** all data | **Consumes** | No |
| `ml.md` | **Owns** entirely | **Integrates** inference output | Consumes SHAP explanations | No |

**Taarun does not own or implement any backend service.**

---

## Files each developer should read

### Tejasvi (Data ingestion + ML)
- `ml.md` — your primary contract
- `risk.md` — the output your model must map to
- `enums.md` — `RiskLevel`, `Trend`, `DataQuality`
- `CONTRACT_DECISIONS.md` — decisions that affect feature names and horizon scope

### Yashwanth (Backend + API + Integration)
- All files — you implement against every contract
- `risk.md` — the API response shape
- `reports.md` — the report API
- `alerts.md` — the alert lifecycle
- `exposure.md` — roads/villages/assets endpoints
- `dashboard.md` — the summary endpoint
- `ml.md` — how to invoke Tejasvi's inference layer
- `CONTRACT_DECISIONS.md` — all naming and field decisions

### Debarshi (Authority Web UI)
- `risk.md` — risk zone GeoJSON, forecast panel, point risk
- `reports.md` — report list and verification display
- `alerts.md` — alert center
- `exposure.md` — roads, villages, assets panels
- `dashboard.md` — KPI row, which endpoints to call
- `enums.md` — all display values
- `examples/` — use these as mock data while the backend is not yet ready

### Taarun (Citizen Mobile)
- `reports.md` — the entire reporting flow (your primary contract)
- `risk.md` — point risk display (local risk card)
- `enums.md` — `ReportCategory`, `ReportStatus`, `RiskLevel`, `RiskState`
- `examples/risk-point.json`, `examples/report-create.json`, `examples/report-response.json`

---

## How to use the examples

The `examples/` directory contains valid JSON objects for every major API type. Debarshi and Taarun can use these as mock API responses while the backend is being built. Every example is explicitly labelled as synthetic demo data.

---

## Rules for changing a contract

1. **Non-breaking additions** (adding a nullable/optional field): update the contract file and notify all affected developers in the PR description.
2. **Breaking changes** (renaming a field, changing a type, removing a field, changing an enum value): require explicit agreement from all four developers before merging into `main`.
3. **Never change a contract file silently** inside an implementation PR. Contract changes must be in a dedicated commit with a clear message.
4. Any conflict between a contract file and an implementation must be resolved by updating the implementation — not by silently drifting the contract.

---

## Stability guarantee

Internal implementation details (database column names, Python variable names, React component state, ML intermediate variables) may change freely. What must remain stable is the shape of data that crosses a boundary: API request bodies, API response bodies, and the ML inference output that the backend reads.
