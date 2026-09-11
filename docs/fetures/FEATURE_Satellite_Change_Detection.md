# Feature: Satellite Change Detection (Sentinel)

> **Category:** Advanced Earth Observation  
> **Priority:** P2 — Never block the demo  
> **Status:** Planned (Phase 2+)  

---

## Overview

Sentinel-1 SAR and Sentinel-2 optical imagery provide **complementary observation layers** for deformation detection, land-cover change, and surface disturbance. Remote sensing is an extensible observation layer, not a mandatory dependency for every prediction.

---

## Sentinel-1 (SAR Radar)

### Capabilities
- Radar-based deformation/change detection
- Works through clouds (critical for NER monsoon conditions)
- InSAR for slope movement monitoring

### Pipeline

```text
Sentinel-1 data
    ↓
Preprocessing
    ↓
Temporal comparison
    ↓
Deformation / change metric
    ↓
satellite_change_score
    ↓
Risk engine (as evidence input)
```

### SAR Precursor Engine

A mature SAR/InSAR precursor engine answers:

> **Is this slope already behaving abnormally?**

This is distinct from the dynamic risk model:

> **Are current environmental conditions becoming dangerous?**

Treat precursor signals as **observations/evidence** rather than silently mixing them into the predictive target.

---

## Sentinel-2 (Optical)

### Capabilities
- Optical multispectral observations
- Vegetation indicators (NDVI, etc.)
- Land-cover context and classification
- Spectral change detection
- Surface disturbance identification

### Limitations
- Cloud coverage is a significant issue during monsoon
- Represent cloud coverage in data quality metrics

---

## Citizen Image Analysis (Vision Model)

Citizen-submitted photos can be analyzed using a vision classifier:

### Potential Classes

```text
crack, soil erosion, rockfall, landslide, blocked road, flooding, normal
```

### Pipeline

```text
Citizen photo → Image classifier → Evidence score → Human verification → Risk/situational layer
```

### Key Rules
- Vision results should **not** automatically override XGBoost predictions
- Low confidence → "Needs Review" (not automatic rejection)
- Custom segmentation/richer models should wait until an adequately labeled dataset exists
- If no validated model exists, store the image for authority review

---

## Integration Strategy

Remote sensing is **complementary**, not a replacement:

```text
XGBoost → Environmental/geospatial risk (primary)
CNN / Vision Transformer → Photo/satellite image interpretation (complementary)
```

EO augments rather than replaces GIS/DEM terrain modelling.

---

## Data Sources

| Source | URL |
|---|---|
| Copernicus Data Space | https://dataspace.copernicus.eu/ |

---

## References

- Sections 65–66 of [NER_Landslide_Early_Warning_Project_Documentation.md](file:///e:/teju/garud-drishti/garud-drishti/NER_Landslide_Early_Warning_Project_Documentation.md)
- Section 5 of [PRODUCTION_BLUEPRINT_V2.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/PRODUCTION_BLUEPRINT_V2.md)
- [HACKATHON_PLAN.md](file:///e:/teju/garud-drishti/garud-drishti/NETRA_Master_Plans/HACKATHON_PLAN.md) — listed as P2
