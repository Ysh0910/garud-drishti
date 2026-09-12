# Taarun — Citizen Mobile App `tasks.md`

## Role

You own the **citizen/field mobile application**.

The app's primary purpose for the hackathon is:

```text
Citizen/field worker
→ capture hazard evidence
→ attach GPS
→ optionally attach photo
→ submit report
→ receive/report status
```

The current repository defines React Native + TypeScript for the mobile app. fileciteturn7file0L123-L145

You are not responsible for the authority web dashboard, ML pipeline, or FastAPI implementation.

---

# Phase 1 — Inspect and scaffold

## Task 1.1 — Inspect repository contracts

Read:

```text
AGENTS.md
TECH_STACK.md
README.md
apps/citizen-mobile/
docs/fetures/FEATURE_Citizen_App.md
docs/fetures/FEATURE_Citizen_Reporting.md
```

Do not invent API fields that conflict with existing specifications.

---

## Task 1.2 — Create the React Native app foundation

Build the application under:

```text
apps/citizen-mobile/
```

Use the existing declared TypeScript/React Native stack.

Create a clean structure for:

```text
screens/
components/
services/
types/
navigation/
storage/
utils/
```

Keep networking and UI logic separated.

### Acceptance criteria

- App starts on a clean environment.
- TypeScript builds without avoidable errors.
- Navigation is functional.
- No hardcoded production URLs inside components.

---

# Phase 2 — Core reporting flow

## Task 2.1 — Build the home screen

Create a simple field-friendly home screen with:

- report hazard action
- recent reports/status
- basic safety/status area
- connection state

Do not overload the first screen.

The demo should make the reporting action obvious.

---

## Task 2.2 — Implement location capture

Create a location service that requests permission and obtains:

```text
latitude
longitude
accuracy
timestamp
```

Show the captured position before submission.

Handle:

- permission denied
- GPS unavailable
- stale location
- poor accuracy

Do not silently submit `0,0` or fake coordinates.

---

## Task 2.3 — Build hazard report form

Support at minimum:

```text
category
description
latitude
longitude
photo
timestamp
```

Suggested categories:

```text
Crack
Rockfall
Road Blockage
Slope Failure
Water Seepage
Other
```

Keep the category list aligned with the feature specification if it defines a different canonical set.

---

## Task 2.4 — Add photo capture/selection

Allow the user to attach a photo.

Store enough metadata to distinguish:

```text
photo URI
capture timestamp if available
```

Do not claim the photo itself proves a landslide.

The photo is evidence for authority review.

---

# Phase 3 — API contract integration

## Task 3.1 — Create a typed API service

Create:

```text
apps/citizen-mobile/services/api.ts
apps/citizen-mobile/types/
```

Use typed request/response objects.

The submission request should conceptually contain:

```json
{
  "category": "CRACK",
  "description": "Visible widening crack near road edge",
  "latitude": 26.1445,
  "longitude": 91.7362,
  "accuracy_m": 8.4,
  "captured_at": "...",
  "photo": "..."
}
```

The exact field names must match the final backend contract published by Yashwanth.

Do not duplicate backend business logic in the mobile app.

---

## Task 3.2 — Build mock transport

Before the real backend is ready, implement a mock API adapter.

The UI should depend on an interface such as:

```text
ReportService
```

so the implementation can switch:

```text
MockReportService
RealReportService
```

without rewriting screens.

This allows you to work in parallel with Yashwanth.

---

# Phase 4 — Offline/low-network behavior

## Task 4.1 — Build local pending-report queue

Implement a lightweight local queue for unsent reports.

Each pending item should have:

```text
local_id
payload
photo reference
created_at
status
retry_count
```

Possible states:

```text
PENDING
UPLOADING
FAILED
SYNCED
```

Do not build a complicated distributed sync engine.

---

## Task 4.2 — Retry synchronization

When connectivity becomes available:

```text
PENDING
→ upload
→ success → SYNCED
→ failure → FAILED/PENDING
```

Avoid duplicate submission where possible.

Use an idempotency/client-generated identifier if the backend contract supports it.

---

# Phase 5 — Report history/status

## Task 5.1 — Build My Reports

Display submitted reports with:

```text
category
time
location
status
```

Possible backend status:

```text
SUBMITTED
UNDER_REVIEW
VERIFIED
REJECTED
ACTIONED
```

Use whatever canonical states Yashwanth exposes.

---

# Phase 6 — Safety and UX polish

## Task 6.1 — Handle field conditions

The app should remain usable when:

- network is slow
- GPS takes time
- photo upload fails
- API returns an error
- permission is denied

Use explicit states rather than infinite loading.

---

## Task 6.2 — Add report confirmation

After successful submission show:

- report ID
- submission time
- captured location
- current status

Make clear that submission is **evidence/reporting**, not an automatic emergency alert.

---

# Final acceptance test

Demonstrate:

```text
Open app
→ allow GPS
→ create hazard report
→ capture photo
→ submit
→ receive report ID
→ view report in My Reports
```

Then demonstrate:

```text
disable network
→ create report
→ report becomes PENDING
→ restore network
→ report syncs
```

If backend is not yet merged, perform the same flow against the mock service.

## Do not do

Do not block the app on:

- chatbot
- advanced AI image classification
- real-time push infrastructure
- complex maps
- multilingual NLP
- sophisticated authentication

These can be added only after reporting works.
