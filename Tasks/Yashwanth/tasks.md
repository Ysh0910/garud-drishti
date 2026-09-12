# Yashwanth — API Gateway + Backend + Integration `tasks.md`

## Role

You own the **backend integration spine** of GARUD DRISHTI.

Your responsibility is to connect:

```text
Data / ML
   ↓
PostGIS
   ↓
FastAPI
   ↓
Authority Web
   ↓
Citizen Mobile
   ↓
Evidence / Alerts / Response Priority
```

You are the integration owner.

Do not absorb Tejasvi's ML implementation, Debarshi's UI work, or Taarun's mobile implementation.

---

# Phase 1 — Inspect current backend

## Task 1.1 — Establish backend baseline

Inspect:

```text
backend/main.py
backend/requirements.txt
backend/app/
infrastructure/docker/
configs/
AGENTS.md
TECH_STACK.md
```

The current repository already has a FastAPI skeleton, CORS, provider adapter pattern, Docker/PostGIS infrastructure, and a stub risk endpoint. Preserve working infrastructure while replacing stubs incrementally.

Do not rewrite the backend from scratch.

---

# Phase 2 — Database foundation

## Task 2.1 — Create SQLAlchemy database configuration

Implement the database layer under the existing backend structure.

Support:

```text
PostgreSQL
PostGIS
```

Create a clean database session/dependency pattern.

Do not put SQL directly inside route handlers.

---

## Task 2.2 — Create core database models

Prioritize these entities:

```text
RiskZone / RiskGrid
CitizenReport
Evidence
Exposure
Alert
```

Add timestamps and identifiers.

For spatial entities use appropriate PostGIS geometry types and SRIDs.

Do not over-engineer the schema.

---

## Task 2.3 — Add migrations

Use the project's preferred migration mechanism, such as Alembic if already configured/appropriate.

Create reproducible schema initialization.

Acceptance:

```text
fresh database
→ migration
→ required tables
→ spatial indexes
```

---

# Phase 3 — API contracts first

## Task 3.1 — Define Pydantic schemas

Create stable request/response schemas for:

### Risk

```text
RiskZone
RiskPoint
RiskForecast
```

### Reports

```text
CreateReport
Report
ReportReview
```

### Exposure

```text
ExposureSummary
```

### Alerts

```text
Alert
AlertApproval
```

Do not leak raw ORM objects directly to clients.

---

## Task 3.2 — Publish canonical response semantics

Risk responses must keep these concepts separate:

```text
hazard/risk score
confidence
evidence strength
data quality
exposure
response priority
trend
risk state
```

Do not collapse them into a single field.

---

# Phase 4 — Risk API

## Task 4.1 — Replace the hardcoded risk endpoint

The current risk endpoint is a stub.

Replace it with a real implementation backed by:

```text
PostGIS risk grid
+
Tejasvi's inference/model output
```

Provide endpoints conceptually equivalent to:

```http
GET /api/v1/risk/zones
GET /api/v1/risk/zones/{zone_id}
GET /api/v1/risk/point?lat={lat}&lon={lon}
```

Support map-friendly spatial queries.

---

## Task 4.2 — Implement risk filtering

Support useful filters:

```text
risk state
bbox/viewport
minimum risk
updated time
```

Do not load the entire dataset for every map interaction if a spatial query can solve it.

---

# Phase 5 — ML integration

## Task 5.1 — Define the ML adapter boundary

Do not import random training code directly into FastAPI routes.

Create a backend risk adapter/service that conceptually does:

```text
request
→ validate
→ retrieve features
→ invoke model/inference
→ normalize output
→ persist/cache if appropriate
→ return API schema
```

The exact model interface must follow Tejasvi's `ML_HANDOFF.md`.

---

## Task 5.2 — Integrate Tejasvi's prediction grid

Once Tejasvi provides the prediction dataset:

Load/query:

```text
grid_id
geometry
risk_score
risk_state
confidence
trend
model_version
timestamp
```

Ensure the backend can serve it spatially.

---

# Phase 6 — Citizen reporting API

## Task 6.1 — Create report submission endpoint

Implement:

```http
POST /api/v1/reports
```

Accept:

```text
category
description
latitude
longitude
accuracy
captured_at
photo/evidence reference
client_id/idempotency key where supported
```

Validate:

- coordinates
- timestamps
- category
- payload size
- duplicate/idempotent submissions

Do not treat a citizen report as a direct critical alert.

---

## Task 6.2 — Create report query endpoints

Implement:

```http
GET /api/v1/reports
GET /api/v1/reports/{report_id}
```

Support authority-oriented filtering by:

```text
status
time
bbox
category
```

---

## Task 6.3 — Implement report review

Implement a human review operation such as:

```http
POST /api/v1/reports/{report_id}/review
```

Support a controlled status transition.

Keep an audit trail:

```text
who
what
when
```

If full authentication is not ready, use a clearly marked demo authority identity rather than pretending the system is secured.

---

# Phase 7 — Evidence and risk fusion

## Task 7.1 — Calculate evidence context

When a report arrives, associate it with nearby risk information where available:

```text
report location
→ nearest risk zone
→ hazard risk
→ confidence
→ nearby reports
```

This creates contextual evidence.

---

## Task 7.2 — Implement report clustering

If time permits, group nearby reports within a configurable spatial/time window.

The purpose is:

```text
5 reports describing the same road crack
→ one stronger evidence cluster
```

Do not interpret clustering as proof of a landslide.

---

# Phase 8 — Exposure engine

## Task 8.1 — Add exposure data model

Support the asset classes that actually exist in the dataset:

```text
roads
villages
population
hospitals
```

Do not invent missing asset data.

---

## Task 8.2 — Spatial exposure query

For a risk zone:

```text
risk zone
→ intersect/nearby assets
→ exposure summary
```

Return:

```text
asset counts
asset categories
population/exposure values where available
```

---

# Phase 9 — Response priority

## Task 9.1 — Implement transparent priority calculation

Do not create a black-box "priority" number with no explanation.

Conceptually combine:

```text
hazard risk
+
exposure
+
evidence strength
+
confidence/data quality
```

into an operational priority.

Return both:

```text
response_priority
priority_reasons
```

For example:

```json
{
  "response_priority": "P1",
  "priority_reasons": [
    "HIGH hazard",
    "critical road exposed",
    "multiple corroborating reports"
  ]
}
```

The exact weighting must be configurable and documented.

---

# Phase 10 — Stateful alert engine

## Task 10.1 — Define alert states

Implement a stateful alert model around:

```text
WATCH
ELEVATED
HIGH
CRITICAL
```

Include:

```text
created_at
updated_at
zone
reason
approval_status
```

---

## Task 10.2 — Add threshold evaluation

Generate candidate alerts from risk state/threshold changes.

Important:

```text
risk model
→ candidate alert
→ authority review
→ approved simulated warning
```

Do not make a single citizen report automatically generate a critical public alert.

---

## Task 10.3 — Add deduplication/de-escalation

Avoid repeatedly creating identical alerts.

Support sensible state transitions:

```text
WATCH → ELEVATED → HIGH → CRITICAL
```

and de-escalation when conditions fall.

Avoid alert flapping around thresholds.

---

## Task 10.4 — Simulated notification

For the hackathon, implement a simulated delivery mechanism.

Example:

```text
Alert approved
→ notification record created
→ console/demo delivery
```

Do not spend time integrating real SMS/FCM unless the core flow is already stable.

The README describes SMS/Push as part of the alert architecture, but the hackathon should demonstrate the workflow without making a third-party provider a critical dependency. fileciteturn7file0L29-L35

---

# Phase 11 — Authority dashboard integration

## Task 11.1 — Give Debarshi a stable API

Provide documented endpoints for:

```text
risk zones
risk zone detail
reports
report detail
report review
exposure
alerts
alert approval
```

Publish example JSON responses.

Do not change response shapes casually after Debarshi starts integration.

---

# Phase 12 — Mobile integration

## Task 12.1 — Give Taarun a stable report API

Document:

```text
POST report
GET my reports
GET report
```

Include error responses.

Support a client-generated identifier/idempotency strategy if practical.

---

# Phase 13 — Authentication

## Task 13.1 — Add minimal auth only after core flow works

The repository architecture includes OAuth2/JWT/RBAC, but this must not block the primary demo.

First get:

```text
risk
reports
review
exposure
alerts
```

working end-to-end.

Then add the minimum viable authority/citizen separation if time permits.

Do not spend half the hackathon building an elaborate identity system.

---

# Phase 14 — Data ingestion orchestration

## Task 14.1 — Integrate provider adapters

The repository has provider adapters for:

```text
Mock
IMD
GPM
SMAP
Sentinel
```

Do not claim live provider ingestion merely because an adapter class exists.

For the hackathon:

```text
real/defensible data
→ ingestion script
→ processed data
→ database
```

is enough.

Live scheduled jobs can be added after the core vertical slice.

---

# Phase 15 — API reliability

## Task 15.1 — Error handling

Every important endpoint must handle:

```text
invalid coordinates
not found
database failure
model unavailable
stale data
invalid report
duplicate submission
```

Return useful HTTP status codes and structured errors.

---

## Task 15.2 — Health/readiness

Maintain:

```http
GET /health
```

and add readiness information if useful:

```text
database
model
data freshness
```

Do not expose secrets.

---

# Phase 16 — Integration tests

## Task 16.1 — Test the critical vertical slice

At minimum test:

```text
risk query
report creation
report retrieval
report review
exposure query
alert creation
alert approval
```

---

# Final end-to-end acceptance test

The system must demonstrate:

```text
Tejasvi model/risk grid
        ↓
PostGIS
        ↓
FastAPI
        ↓
Debarshi authority map
        ↓
high-risk zone selected
        ↓
exposure displayed
        ↓
Taarun citizen report submitted
        ↓
report appears in authority UI
        ↓
authority reviews evidence
        ↓
response priority updates
        ↓
candidate alert
        ↓
human approval
        ↓
simulated notification
```

This is the primary integration goal.

## Do not do

Do not block the demo on:

- full OAuth/RBAC
- Celery
- Redis
- Kafka
- Kubernetes
- real SMS provider
- real FCM
- live satellite pipelines
- chatbot
- complex microservices
- over-engineered API gateway infrastructure

FastAPI itself is the initial gateway/service boundary unless the repository already requires a separate gateway process.
