# Feature: SHAP Explainability

> **Category:** AI Transparency / Trust  
> **Priority:** P1 — Build if core is stable  
> **Status:** Planned  

---

## Overview

NETRA uses **SHAP (SHapley Additive exPlanations)** to explain every XGBoost risk prediction. Instead of presenting a black-box score, the system tells authorities *why* a location is at risk — making the AI transparent, auditable, and trustworthy.

---

## How It Works

SHAP decomposes each prediction into individual feature contributions:

```text
Risk = 91

Main contributors:

+ High 72h rainfall         → +18
+ High 24h rainfall         → +14
+ High base susceptibility  → +12
+ High soil moisture        → +11
+ Steep slope               → +9
- Low vegetation cover      → +5
- Distance to drainage      → +3
```

---

## Authority Dashboard Display

When an authority clicks any location on the risk map:

```text
Risk Score: 91 — CRITICAL

Why is this location high risk?

1. Very high 72-hour rainfall
2. High base susceptibility
3. High soil moisture
4. Steep slope
5. Historical landslide concentration
```

This makes the system more transparent than a black-box score.

---

## Citizen-Facing Explanation

For citizens, explanations are simplified:

```text
Why is your area at risk?

• Heavy rainfall in the last 3 days
• Steep terrain
• Wet soil conditions

Please follow official advisories.
```

---

## Chatbot Integration

The chatbot can retrieve SHAP explanations from the risk API:

```text
User: "What is the landslide risk near me?"

Chatbot:
"I found a HIGH risk level near your current location.

Current risk: 78/100
24-hour forecast: 86/100

Main factors:
- Heavy recent rainfall
- Steep terrain
- High susceptibility

Please follow local authority advisories."
```

---

## Implementation

### Library

```python
import shap

explainer = shap.TreeExplainer(xgb_model)
shap_values = explainer.shap_values(feature_vector)
```

### API Endpoint

```http
GET /api/v1/risk/{cell_id}/explain
```

Returns top contributing features with their SHAP values for the requested cell.

---

## References

- Section 20, 32 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 6 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 6 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
