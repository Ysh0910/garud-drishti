# Feature: Citizen App

> **Category:** Public-Facing Mobile Application  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

The Citizen App is a mobile application (React Native + Expo or responsive PWA) that provides location-aware landslide risk information, safety guidance, and hazard reporting capabilities. Citizens should not need to understand XGBoost — the interface must be simple, clear, and actionable.

---

## Main Screens

### Home — Risk at Your Location

```text
YOUR AREA

🟠 HIGH RISK

Current: 74
Next 24h: 86

Why?
• Heavy rainfall
• Steep terrain
• High soil wetness

Stay away from unstable slopes.
Follow official advisories.
```

### Risk Map

Citizens see nearby:
- Risk zones (color-coded)
- Roads and their risk status
- Active alerts
- Reported incidents from other citizens

### Report Incident

```text
Take photo / select media
    ↓
GPS automatically captured
    ↓
Select incident type (crack, rockfall, road blockage, etc.)
    ↓
Add optional description
    ↓
Submit
```

### Alerts

Display:
- Current warning level
- Forecast warning
- Safety instructions
- Nearby affected roads

### History

Citizens can see their previously submitted reports and their verification status:

```text
Saved offline → Waiting for network → Uploaded → Verified
```

---

## User Flow

```text
Open App
    ↓
Allow location
    ↓
See current risk for your area
    ↓
See 24h forecast
    ↓
Receive warning if necessary
    ↓
Report observed hazard
```

---

## Key Design Principles

- **Simplicity:** Under-one-minute interaction for reporting
- **Clarity:** Risk displayed as simple color + number + plain-language explanation
- **Actionable:** Clear safety instructions tied to risk level
- **No jargon:** No ML terminology visible to citizens
- **Offline-capable:** Works in low-connectivity areas

---

## Technology Options

| Option | Use When |
|---|---|
| React Native + Expo | Team already has mobile momentum |
| Responsive PWA | If mobile deployment would slow the team down |

> A responsive PWA is acceptable if React Native slows the team down. Do not let mobile deployment block the product.

---

## References

- Section 37, 61, 78 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 12 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 11 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
