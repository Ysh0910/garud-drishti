# Debarshi — Authority Web UI `tasks.md`

## Role

You own the **complete authority web interface**.

The goal is to make GARUD DRISHTI immediately understandable to a disaster-management authority/judge:

```text
Where is the risk?
Why is it risky?
What is exposed?
What evidence exists?
What should the authority look at first?
```

The repository specifies React + TypeScript + Vite + Tailwind and MapLibre GL JS for the authority dashboard. fileciteturn7file0L123-L145

You own everything visual in:

```text
apps/authority-web/
```

Do not implement backend business logic inside the frontend.

---

# Phase 1 — Scaffold

## Task 1.1 — Inspect specifications

Read:

```text
AGENTS.md
TECH_STACK.md
README.md
apps/authority-web/
docs/fetures/FEATURE_GIS_Heatmap_Visualization.md
docs/fetures/FEATURE_Authority_Dashboard.md
docs/fetures/FEATURE_Risk_Fusion_Response_Priority.md
docs/fetures/FEATURE_Alert_Engine.md
```

Follow existing terminology.

---

## Task 1.2 — Build application shell

Create:

```text
src/
├── components/
├── pages/
├── layouts/
├── services/
├── types/
├── hooks/
├── map/
└── mocks/
```

Create a professional command-center layout.

Primary areas:

```text
Top status/header
Left/central map
Right contextual panel
Bottom/secondary information panels
```

Do not make every feature a separate page.

---

# Phase 2 — Risk map

## Task 2.1 — Integrate MapLibre

Build the main map using MapLibre GL JS.

The map must support:

- NER study area
- risk grid/heatmap
- pan/zoom
- click/select
- selected zone state

Use mock GeoJSON initially if the backend risk layer is not ready.

---

## Task 2.2 — Create risk visualization

Represent:

```text
NORMAL
WATCH
ELEVATED
HIGH
CRITICAL
```

with a visually clear scale.

Do not visually imply false precision.

The UI should show the risk band and score separately where appropriate.

---

## Task 2.3 — Zone detail panel

When a user clicks a risk zone, show:

```text
Zone ID
Risk state
Risk score
Confidence
Trend
Last updated
Top contributing factors
Exposure summary
Recent citizen evidence
```

If a field is unavailable, display an explicit unavailable state rather than inventing it.

---

# Phase 3 — Authority dashboard KPIs

## Task 3.1 — Build top-level KPI cards

Show useful operational metrics such as:

```text
High/Critical zones
Reports requiring review
People/assets exposed
Active alerts
Data freshness
```

The values must eventually come from the backend.

Use mock values only during development.

---

## Task 3.2 — Risk trend/forecast panel

Create a compact panel showing the available forecast horizons.

The project README describes current, 6h, 24h, 48h and 72h horizons. fileciteturn7file0L21-L31

However, the UI must not display unsupported horizons as validated predictions.

If only one or two horizons are available, show only those.

---

# Phase 4 — Citizen evidence

## Task 4.1 — Build report list

Create a report review panel/table with:

```text
Report ID
category
time
location
status
risk context
```

Allow selecting a report.

---

## Task 4.2 — Build report detail

Show:

```text
photo
description
GPS
timestamp
citizen category
nearby risk
evidence strength
review status
```

Add actions:

```text
Verify
Reject
Mark for follow-up
```

The exact actions should match Yashwanth's backend contract.

---

# Phase 5 — Exposure and response priority

## Task 5.1 — Exposure panel

Visualize exposed assets such as:

```text
roads
villages
population
hospitals
```

only where backend data actually exists.

Do not invent population counts.

---

## Task 5.2 — Response priority

Show a ranked list such as:

```text
Priority 1
Priority 2
Priority 3
```

with explanatory context:

```text
Hazard
Exposure
Evidence
Priority
```

Do not reduce everything to one unexplained score.

---

# Phase 6 — Alert center

## Task 6.1 — Alert list

Create an alert center displaying:

```text
alert state
zone
severity
created time
reason
approval status
```

The repository describes Watch/Elevated/High/Critical alert states. fileciteturn7file0L29-L33

---

## Task 6.2 — Human approval UI

For severe alerts, provide a clear authority action:

```text
Review
→ inspect evidence/risk
→ approve simulated alert
```

Do not imply that a citizen report automatically triggers a critical warning.

---

# Phase 7 — API service layer

## Task 7.1 — Create typed frontend API client

Create:

```text
src/services/api.ts
src/types/api.ts
```

Keep components independent of raw `fetch()` calls.

Create functions conceptually like:

```text
getRiskZones()
getRiskZone(id)
getReports()
getReport(id)
reviewReport(id, decision)
getAlerts()
getExposure(zoneId)
```

Exact routes and response shapes must follow Yashwanth's published backend contract.

---

## Task 7.2 — Mock API adapter

Before the backend is ready, create:

```text
src/mocks/
```

with deterministic data.

The UI should switch from:

```text
MockApi
```

to:

```text
RealApi
```

without changing component code.

---

# Phase 8 — Data freshness and degraded states

## Task 8.1 — Show data quality

Where backend metadata is available, surface:

```text
Last updated
Source
Fresh/stale
Missing
```

Do not hide stale data.

---

## Task 8.2 — Graceful degradation

The dashboard must remain usable if:

- risk data is unavailable
- reports are unavailable
- exposure is unavailable
- alert service is unavailable

Do not crash the whole application because one panel failed.

---

# Phase 9 — Demo polish

## Task 9.1 — Build the primary judge journey

The first 30 seconds should communicate:

```text
NER map
→ high-risk zone
→ click zone
→ why risky
→ what is exposed
→ citizen evidence
→ response priority
→ alert action
```

Prioritize visual hierarchy over adding many small features.

---

## Task 9.2 — Remove prototype rough edges

Before demo freeze:

- remove unnecessary placeholder text
- eliminate console errors
- handle loading states
- handle empty states
- handle API errors
- make map interactions smooth
- verify responsive desktop layout
- ensure typography and spacing are consistent

## Final acceptance test

A clean run should support:

```text
Open dashboard
→ see NER risk map
→ select high-risk zone
→ inspect factors/confidence/trend
→ inspect exposure
→ inspect citizen evidence
→ review evidence
→ inspect alert
→ approve simulated alert
```

If the backend is incomplete, the same journey must work with the deterministic mock adapter.

## Do not do

Do not spend core hackathon time on:

- chatbot UI
- complex 3D terrain
- advanced animation everywhere
- live satellite processing UI
- unnecessary admin CRUD
- frontend-side ML
- huge multi-page enterprise navigation
