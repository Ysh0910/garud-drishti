# Feature: Authority Dashboard

> **Category:** Command Center / Decision Support  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

The Authority Dashboard is the **command center** for disaster management officials. It answers: *Where is the risk, why is it high, who/what is exposed, and what should we prioritize?*

It is separate from the Citizen App and focuses on operational decision-making.

---

## Main Screen Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ NER LANDSLIDE EARLY WARNING & RESPONSE DASHBOARD            │
├───────────────┬───────────────────────────────┬─────────────┤
│               │                               │             │
│ KPI CARDS     │        LIVE RISK MAP          │ ALERTS      │
│               │                               │             │
│ Critical: 12  │      GIS HEATMAP              │ Critical  5 │
│ High: 37      │      🔴 🟠 🟡 🟢             │ High     18 │
│ Reports: 24   │                               │ Reports  24 │
│ Roads: 8      │                               │             │
│               │                               │             │
├───────────────┴───────────────────────────────┴─────────────┤
│ RISK FORECAST | AFFECTED ROADS | CITIZEN REPORTS | TRENDS   │
└─────────────────────────────────────────────────────────────┘
```

---

## KPI Cards

| Card | Description |
|---|---|
| Critical Zones | Number of zones at critical risk |
| High-Risk Zones | Number of zones at high risk |
| Active Alerts | Currently active warnings |
| Field Reports | New citizen/field reports |
| Roads at Risk | Road segments with elevated risk |
| Villages at Risk | Settlements in danger zones |
| Unresolved Incidents | Pending authority action |

---

## Risk Forecast Panel

For a selected zone, display current and forecast risk:

```text
ZONE: AIZAWL

CURRENT       76  HIGH
6 HOURS       81  CRITICAL
24 HOURS      93  CRITICAL
48 HOURS      88  CRITICAL
72 HOURS      71  HIGH
```

With trend visualization:

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

## "Why Is This Area at Risk?" Panel

SHAP-powered explanation when clicking a location:

```text
Risk Score: 91 — CRITICAL

Primary factors:
1. Very high 72-hour rainfall
2. High base susceptibility
3. High soil moisture
4. Steep slope
5. Historical landslide concentration
```

---

## Authority Actions

- **Verify report** — Confirm citizen/field observations
- **Acknowledge** — Mark zone as reviewed
- **Escalate** — Raise priority level
- **Resolve** — Mark incident as resolved
- **Generate alert** — Trigger notification workflow (with human approval)

---

## Role-Based Access Control (RBAC)

| Role | View | Reports | Alerts | Users | Models |
|---|---|---|---|---|---|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| District Admin | ✓ | ✓ | ✓ | Limited | ✗ |
| Disaster Mgmt Officer | ✓ | ✓ | ✓ | ✗ | ✗ |
| Field Officer | ✓ | ✓ | Limited | ✗ | ✗ |
| Analyst | ✓ | ✓ | ✗ | ✗ | ✓ |
| View Only | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Authentication

```text
Frontend → JWT / OAuth2 → FastAPI → Role-based authorization
```

- Passwords stored with secure hashing (Argon2 / bcrypt)
- Never stored as plaintext

---

## Decision Support View

```text
WHERE?     → Critical cells on the map
WHY?       → Rainfall + susceptibility + soil moisture (SHAP)
EXPOSED?   → Roads + villages + infrastructure
CHANGING?  → Risk trend direction
REPORTED?  → Citizen/field reports in the area
PRIORITY?  → Response priority ranking
```

---

## Dashboard Questions It Must Answer

1. **Where?** — Risk heatmap + events + reports + assets
2. **Why?** — Risk, confidence, evidence, data quality, trend, rainfall/soil context and model factors
3. **What first?** — Critical zones, reports awaiting verification, active alerts, exposed assets, connectivity impact

---

## API Endpoint

```http
GET /api/v1/dashboard/summary
```

---

## References

- Sections 28–32, 40, 62 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 11 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 10 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
