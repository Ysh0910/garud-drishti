"""
Step 10: LULC (Land Use / Land Cover) acquisition for NER.
Documents Bhuvan LULC availability and prepares Sentinel-2 derived LULC pathway.
"""
import json
import requests
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
LULC_DIR = RAW_DIR / "lulc"
BHUVAN_LULC_DIR = LULC_DIR / "bhuvan"
S2_LULC_DIR = LULC_DIR / "sentinel2_derived"
LULC_DIR.mkdir(parents=True, exist_ok=True)
BHUVAN_LULC_DIR.mkdir(parents=True, exist_ok=True)
S2_LULC_DIR.mkdir(parents=True, exist_ok=True)

NER_BBOX = "88.0,20.0,98.0,30.5"
NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura"
]

# ESRI Living Atlas / Esri 2020 10m Land Use Land Cover (public, global, 10m)
ESRI_LULC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"

# Dynamic World (Google/World Resources Institute) - 10m global LULC
# Available via Google Earth Engine API


def check_esri_lulc():
    """Check if ESRI 2020 LULC is accessible via Planetary Computer."""
    try:
        url = f"{ESRI_LULC_STAC}/collections/io-lulc-annual-v02"
        resp = requests.get(url, timeout=20)
        if resp.status_code == 200:
            return resp.json(), None
        return None, f"HTTP {resp.status_code}"
    except Exception as e:
        return None, str(e)


def document_bhuvan_lulc():
    """Document the Bhuvan LULC acquisition process."""
    return {
        "dataset": "Bhuvan LULC 1:50K",
        "provider": "NRSC / ISRO",
        "portal": "https://bhuvan.nrsc.gov.in/",
        "lulc_update": "https://bhuvan.nrsc.gov.in/updates/bhuvan_apr2026.html",
        "available_years": ["2015-16", "2011-12", "2005-06"],
        "format": "Shapefile (requires approval/request)",
        "acquisition_method": "Request via Bhuvan portal with AOI/bounding box",
        "status": "REQUIRES_MANUAL_REQUEST",
        "notes": [
            "Bhuvan LULC 1:50K requires a formal request through the Bhuvan portal",
            "Available for selected districts, AOI, or bounding box",
            "Registration and approval required",
            "Contact: bhuvan@nrsc.gov.in or use portal request form",
            "Most recent: 2015-16 (56 class LULC classification)",
            "For NER, request states: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura"
        ],
        "how_to_request": [
            "1. Register at https://bhuvan.nrsc.gov.in/",
            "2. Navigate to LULC data request section",
            "3. Select AOI (NER bounding box: 88°E-98°E, 20°N-30.5°N)",
            "4. Select 2015-16 dataset for most recent official LULC",
            "5. Submit request and await approval"
        ]
    }


def document_alternative_lulc():
    """Document alternative/fallback LULC sources."""
    return {
        "alternatives": [
            {
                "name": "ESRI 2020 Land Cover (10m)",
                "provider": "Esri",
                "url": "https://www.arcgis.com/home/item.html?id=d3da5dd386d140cf93fc9ecbf8da5e31",
                "resolution": "10m",
                "year": "2020",
                "classes": 9,
                "license": "Creative Commons Attribution 4.0",
                "access": "Free via ArcGIS Online or Planetary Computer",
                "suitability": "HIGH - Good resolution, annual updates, global coverage",
            },
            {
                "name": "Dynamic World (Google / WRI)",
                "provider": "Google / World Resources Institute",
                "url": "https://dynamicworld.app/",
                "resolution": "10m",
                "temporal": "Near-real-time",
                "classes": 9,
                "license": "CC-BY-4.0",
                "access": "Google Earth Engine API",
                "suitability": "HIGH - Near-real-time, good NER coverage",
            },
            {
                "name": "Copernicus Global Land Cover",
                "provider": "Copernicus",
                "url": "https://land.copernicus.eu/global/products/lc",
                "resolution": "100m",
                "year": "2019",
                "classes": 23,
                "license": "Free for non-commercial use",
                "access": "Direct download via Copernicus Land Service",
                "suitability": "MEDIUM - Coarser resolution but reliable",
            },
            {
                "name": "GlobCover (ESA)",
                "provider": "ESA",
                "resolution": "300m",
                "year": "2009",
                "suitability": "LOW - Outdated, coarse resolution",
            },
            {
                "name": "Sentinel-2 derived (project pipeline)",
                "provider": "Self-derived",
                "resolution": "10m",
                "temporal": "Monthly composites available",
                "suitability": "HIGH - Matches project satellite data, customizable classes",
                "note": "Derived through Sentinel-2 processing pipeline (see Step 9)"
            }
        ]
    }


def attempt_copernicus_lulc():
    """Try to get Copernicus Global Land Cover 100m for NER."""
    # Copernicus Land Service - Global Land Cover 2019
    url = "https://s3-eu-west-1.amazonaws.com/vito.landcover.global/v3.0.1/2019/"

    try:
        resp = requests.head(url, timeout=15)
        return resp.status_code < 400, f"Status: {resp.status_code}"
    except Exception as e:
        return False, str(e)


def main():
    print("\n=== Step 10: LULC Acquisition ===\n")

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "status": "IN_PROGRESS",
        "bhuvan_status": "REQUIRES_MANUAL_REQUEST",
        "alternative_sources": [],
        "files_created": []
    }

    # Document Bhuvan LULC
    print("  Documenting Bhuvan LULC requirements...")
    bhuvan_doc = document_bhuvan_lulc()
    bhuvan_path = BHUVAN_LULC_DIR / "bhuvan_lulc_acquisition_guide.json"
    with open(bhuvan_path, "w") as f:
        json.dump(bhuvan_doc, f, indent=2)
    print(f"  Bhuvan LULC guide → {bhuvan_path}")
    report["files_created"].append(str(bhuvan_path))

    # Document alternatives
    print("  Documenting alternative LULC sources...")
    alt_doc = document_alternative_lulc()
    alt_path = LULC_DIR / "lulc_alternative_sources.json"
    with open(alt_path, "w") as f:
        json.dump(alt_doc, f, indent=2)
    print(f"  Alternative sources → {alt_path}")
    report["files_created"].append(str(alt_path))

    # Check ESRI LULC via Planetary Computer
    print("  Checking ESRI LULC via Planetary Computer...")
    esri_data, esri_err = check_esri_lulc()
    if esri_data:
        esri_path = LULC_DIR / "esri_lulc_collection_info.json"
        with open(esri_path, "w") as f:
            json.dump(esri_data, f, indent=2)
        print(f"  ESRI LULC accessible → {esri_path}")
        report["alternative_sources"].append({
            "name": "ESRI 2020 Land Cover (10m)",
            "status": "ACCESSIBLE",
            "details": esri_data.get("description", "")[:200]
        })
    else:
        print(f"  ESRI LULC check: {esri_err}")
        report["alternative_sources"].append({
            "name": "ESRI 2020 Land Cover (10m)",
            "status": f"NOT_ACCESSIBLE: {esri_err}",
            "note": "May require Planetary Computer authentication"
        })

    # Create Sentinel-2 derived LULC pipeline documentation
    print("  Creating Sentinel-2 LULC pipeline documentation...")
    s2_pipeline_doc = {
        "pipeline_name": "Sentinel-2 Derived LULC for NER",
        "status": "PIPELINE_DOCUMENTED",
        "note": (
            "This pipeline derives LULC from Sentinel-2 L2A imagery. "
            "It is the practical fallback when Bhuvan LULC is unavailable. "
            "Sentinel-2 LULC is labelled 'model-derived' in all outputs."
        ),
        "inputs": [
            "Sentinel-2 L2A products (see data/raw/sentinel2/)",
            "NER boundary (data/raw/boundaries/)",
            "Cloud mask (Sentinel-2 SCL band)"
        ],
        "steps": [
            "1. Load Sentinel-2 L2A product",
            "2. Apply Scene Classification Layer (SCL) cloud mask",
            "3. Create monthly/seasonal cloud-free composite",
            "4. Extract spectral bands: B02(Blue), B03(Green), B04(Red), B08(NIR), B11(SWIR), B12(SWIR2)",
            "5. Compute indices: NDVI, NDWI, NDBI, EVI, BSI",
            "6. Apply supervised classification (Random Forest) using training samples",
            "7. Map to land cover classes: Forest, Shrub, Grassland, Cropland, Built-up, Water, Bare, Snow",
            "8. Reproject to EPSG:4326",
            "9. Save as GeoTIFF under data/raw/lulc/sentinel2_derived/"
        ],
        "output_path": "data/raw/lulc/sentinel2_derived/lulc_ner_s2derived.tif",
        "classes": {
            "1": "Forest",
            "2": "Shrub/Scrub",
            "3": "Grassland",
            "4": "Cropland",
            "5": "Built-up/Urban",
            "6": "Water",
            "7": "Bare/Rock",
            "8": "Snow/Ice",
            "0": "No data/Cloud"
        },
        "disclaimer": "Model-derived classification — not authoritative reference LULC",
        "requires": "Sentinel-2 data download (see scripts/step9_sentinel_catalog.py)"
    }
    s2_doc_path = S2_LULC_DIR / "s2_lulc_pipeline_spec.json"
    with open(s2_doc_path, "w") as f:
        json.dump(s2_pipeline_doc, f, indent=2)
    print(f"  S2 LULC pipeline spec → {s2_doc_path}")
    report["files_created"].append(str(s2_doc_path))

    report["status"] = "COMPLETED_WITH_BLOCKERS"
    report["summary"] = {
        "bhuvan_lulc": "REQUIRES_MANUAL_REQUEST",
        "esri_lulc": "ACCESSIBLE" if esri_data else "NOT_ACCESSIBLE",
        "sentinel2_pipeline": "DOCUMENTED",
        "recommended_action": (
            "1. Request Bhuvan LULC via portal (authoritative reference). "
            "2. Download ESRI 2020 10m LULC if Bhuvan not available. "
            "3. Use Sentinel-2 derived LULC as fallback for model development."
        )
    }

    # Write report
    report_path = LULC_DIR / "lulc_acquisition_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  LULC acquisition report → {report_path}")
    print(f"  Status: {report['status']}")


if __name__ == "__main__":
    main()
