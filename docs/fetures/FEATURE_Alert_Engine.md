# Feature: Alert Engine & Notification System

> **Category:** Warning & Communication  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

The Alert Engine continuously evaluates risk and triggers alerts when thresholds are crossed. It supports **multi-channel notification** (SMS, push, in-app) with human authority in the loop for high-severity actions. Alerts follow a stateful lifecycle with deduplication to prevent alert fatigue.

---

## Risk State Machine

NETRA uses a five-state risk model with both escalation and de-escalation:

```text
NORMAL → WATCH → ELEVATED → HIGH → CRITICAL
                                          ↕ (de-escalation)
```

---

## Alert Trigger Rules

### Rule 1 — Critical Alert

```text
IF risk >= 80
AND exposure >= threshold
THEN CRITICAL ALERT
```

### Rule 2 — Early Warning

```text
IF current_risk < 80
BUT risk_24h >= 80
THEN EARLY WARNING
```

### Rule 3 — Rapid Escalation

```text
IF risk increases rapidly (significant jump in short window)
THEN ESCALATE
```

All thresholds are **configurable** and must be validated with domain experts.

---

## Alert Levels & Actions

| Level | Action |
|---|---|
| VERY LOW / LOW | No notification |
| MODERATE | Dashboard awareness only |
| HIGH | Citizen app notification + authority notification |
| CRITICAL | Authority escalation + configured SMS/push/in-app warning |

> Actual emergency alerts should be governed by authorized disaster-management procedures.

---

## Alert Lifecycle

```text
ALERT_CREATED → ALERT_SENT → ALERT_ACTIVE → ALERT_UPDATED → ALERT_RESOLVED
```

Key alerts by **zone + event type** to prevent duplicates.

---

## Deduplication Logic

```text
Risk = 82     → SMS sent
Risk remains 84  → No duplicate SMS
Risk rises to 95 → Escalation message sent
Risk falls to 55 → Resolve/update message sent
```

---

## SMS Architecture

For SIH prototype, explore India's government **Mobile Seva SMS Gateway**:
https://services.mgov.gov.in/

```text
XGBoost → Alert Engine → Critical threshold → SMS Service → Citizen phone
```

**Important:**
- Do not assume unlimited free SMS
- Production systems must integrate with authorized government communication infrastructure

---

## Multilingual Alerts

NER contains multiple languages and communities. The alert system supports:

- English
- Hindi
- Relevant state/regional languages

```text
Risk event → Alert template → Language selection → SMS / App / Voice / Dashboard
```

> Critical warning messages should use **pre-approved templates** rather than unrestricted generative text.

---

## CAP Compatibility (Phase 2+)

Generate **Common Alerting Protocol (CAP)**-compatible JSON payloads through an adapter. Design toward the authorized government dissemination ecosystem.

> Do not claim direct SACHET production connectivity without onboarding/API access.

---

## Staged Escalation

```text
Monitoring → Human verification → High-priority escalation
```

Emergency messages use verified fixed templates, not unconstrained generative text.

---

## Human Authority in the Loop

```text
AI prediction + Sensor data + Satellite data + Citizen reports
    +
Human authority verification
    ↓
Operational warning
```

- AI **recommends** and prioritizes
- Authorized authorities **approve** high-severity actions
- No single report independently triggers a public emergency alert

---

## API Endpoints

```http
GET  /api/v1/alerts                     # List active alerts
POST /api/v1/alerts                     # Create alert (authority)
POST /api/v1/alerts/{id}/acknowledge    # Acknowledge alert
POST /api/v1/alerts/{id}/resolve        # Resolve alert
```

---

## Database Tables

```text
alerts              — Alert metadata, status, and severity
alert_recipients    — Who received which alert
alert_delivery_log  — Delivery status tracking
```

---

## References

- Sections 42–45, 67, 71 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Sections 8, 13 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 7 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
