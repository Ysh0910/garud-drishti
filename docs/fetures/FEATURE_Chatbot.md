# Feature: Chatbot

> **Category:** Information & Communication Interface  
> **Priority:** P2 — Advanced Feature  
> **Status:** Planned  

---

## Overview

The chatbot is an **information and explanation interface** — it retrieves risk data from backend APIs and presents it conversationally. It is **not** the landslide prediction engine itself and must never invent risk values.

---

## Architecture

```text
Citizen
    ↓
Chatbot
    ↓
Backend APIs
    ├── Risk API
    ├── Alert API
    ├── Road API
    ├── Report API
    └── Safety guidance
```

---

## Example Interactions

### Risk Query

**User:** "What is the landslide risk near me?"

**Chatbot:**
```text
I found a HIGH risk level near your current location.

Current risk: 78/100
24-hour forecast: 86/100

Main factors:
- Heavy recent rainfall
- Steep terrain
- High susceptibility

Please follow local authority advisories.
```

### Safety Query

**User:** "What should I do if I see cracks on a slope?"

**Chatbot:**
```text
If you see cracks on a slope:
1. Move away from the slope immediately
2. Report it through the app (Photo + GPS + category)
3. Warn nearby residents
4. Contact local authorities
5. Do not re-enter the area until cleared
```

---

## Safety Rules

### Must Do
- Retrieve actual results from the Risk API
- Use phrases like "the system estimates" or "the current risk level is"
- Always recommend following official advisories

### Must NOT Do
- Invent or hallucinate risk values
- Claim deterministic predictions ("There will definitely be a landslide tonight")
- Replace the risk engine's judgment with generative text

### Good vs Bad Responses

❌ **Bad:** "There will definitely be a landslide tonight."

✅ **Good:** "The system currently estimates high landslide risk for this area. The 24-hour forecast is elevated."

---

## Multilingual Support

The chatbot should support:
- English
- Hindi
- Relevant NER state/regional languages

---

## References

- Sections 38–39 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md) — listed as P2 (never block the demo)
