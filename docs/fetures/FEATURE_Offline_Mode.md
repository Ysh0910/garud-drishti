# Feature: Offline / Low-Network Mode

> **Category:** Field Resilience  
> **Priority:** P1 — Build if core is stable  
> **Status:** Planned  

---

## Overview

Field officers in NER frequently operate in areas with poor or no network connectivity. The mobile app must support **offline-first capture** with queued synchronization when connectivity returns.

---

## Offline Workflow

```text
Capture report (photo + GPS + category + description)
    ↓
Store locally (SQLite / IndexedDB)
    ↓
Attach GPS coordinates and timestamp
    ↓
Queue for upload
    ↓
When network returns
    ↓
Synchronize with server
```

---

## User-Visible Status

Citizens and field officers see clear status indicators:

```text
📱 Saved offline
⏳ Waiting for network
☁️ Uploaded
✅ Verified
```

---

## Technical Requirements

| Requirement | Technology |
|---|---|
| Local storage | SQLite (mobile) or IndexedDB (PWA) |
| Upload queue | Background sync / retry queue |
| Retry mechanism | Exponential backoff with max retries |
| Conflict resolution | Server-wins with user notification |
| Timestamp preservation | Original observation time is preserved, not upload time |

---

## Graceful Degradation

When offline, the app should:
- Show **last known risk** for the user's area with a freshness indicator
- Allow full report creation and local storage
- Queue all reports for upload when connectivity resumes
- Never lose user-captured data

---

## References

- Section 46 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 12 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 11 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
