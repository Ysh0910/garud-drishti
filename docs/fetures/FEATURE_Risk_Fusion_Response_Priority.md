# Feature: Risk Fusion & Response Priority

> **Category:** Decision Support / Impact Assessment  
> **Priority:** P0 — Must Work  
> **Status:** Planned  

---

## Overview

Risk alone does not determine where to act first. NETRA combines **hazard risk** with **exposure** and **infrastructure criticality** to produce a **Response Priority Score** that helps authorities allocate limited resources to the most impactful locations.

---

## The Distinction: Risk vs Impact

```text
Location A
Risk = 95
No nearby infrastructure

Location B
Risk = 85
Major highway + village + hospital nearby
```

**Location B may deserve higher response priority** despite having a lower risk score.

---

## Response Priority Formula

```text
Priority =
  0.50 × hazard_risk
  +
  0.25 × exposure
  +
  0.15 × infrastructure_criticality
  +
  0.10 × connectivity_factor
```

> Exact weights must be configurable and validated with domain experts.

### Factors Considered

| Factor | Description |
|---|---|
| Hazard risk | Model-predicted risk score |
| Population exposed | Nearby population density |
| Road importance | NH, state road, or local road |
| Hospital proximity | Distance to nearest hospital |
| Critical infrastructure | Power, communications, bridges |
| Evacuation constraints | Route availability and accessibility |

---

## Road Risk Module

Landslides frequently disrupt connectivity in NER. For each road segment:

```text
Road ID
Risk score
Current status (open / vulnerable / blocked)
Expected risk trend
Nearest landslides
Rainfall intensity
Alternative route availability
```

Example display:

```text
NH / STATE ROAD
Risk: CRITICAL
Status: Vulnerable
Nearby reports: 3
Forecast: Increasing
```

Authorities can prioritize inspection or closure.

---

## Village / Population Exposure

For each vulnerable village:

```text
Village name
Population
Current risk
24h risk
Nearest high-risk slope
Road connectivity status
Nearest safe route
```

Population data should come from an appropriate authoritative source.

---

## Exposure Engine

The exposure engine identifies what is at risk:

| Asset Type | Data Source |
|---|---|
| Roads | OpenStreetMap / government data |
| Villages | Census / government data |
| Population | Census data |
| Hospitals | Government health directory |
| Schools | Government education data |
| Power infrastructure | Utility data |
| Communications | Telecom data |
| Bridges | Road authority data |
| Route connectivity | Road network analysis |

---

## Six Operational Layers

NETRA produces six operational layers that feed into response priority:

```text
1. Susceptibility        — Where can landslides naturally occur?
2. Dynamic hazard risk   — Are conditions currently dangerous?
3. Evidence strength     — What corroborating observations exist?
4. Model confidence      — How reliable is the prediction?
5. Exposure / impact     — Who/what is in danger?
6. Response priority     — Where should authorities act first?
```

These are kept **separate** — not collapsed into one arbitrary score.

---

## API Endpoints

```http
GET /api/v1/roads/risk              # Road segments with risk scores
GET /api/v1/villages/risk           # Villages with risk and exposure data
GET /api/v1/assets/nearby           # Critical assets near a location
```

---

## References

- Sections 22, 33–34, 62–63 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 10 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- Section 9 of [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md)
