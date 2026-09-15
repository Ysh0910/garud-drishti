"""
Step 9: Search Copernicus STAC for Sentinel-1 and Sentinel-2 products over NER.
Downloads metadata/catalogs. Actual data download requires Copernicus credentials.
"""
import json
import requests
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
S1_DIR = RAW_DIR / "sentinel1"
S2_DIR = RAW_DIR / "sentinel2"
S1_DIR.mkdir(parents=True, exist_ok=True)
S2_DIR.mkdir(parents=True, exist_ok=True)

# Copernicus Data Space STAC
STAC_URL = "https://stac.dataspace.copernicus.eu/v1"

# NER bounding box (WGS84): minlon, minlat, maxlon, maxlat
NER_BBOX = [88.0, 20.0, 98.0, 30.5]

# Search period (historical period matching landslide seasons — monsoon months)
SEARCH_DATE_START = "2020-06-01T00:00:00Z"
SEARCH_DATE_END = "2023-10-31T23:59:59Z"

# Sentinel-2 cloud cover threshold
S2_CLOUD_MAX = 30  # percent


def search_stac(collection, bbox, datetime_range, max_items=10, extra_params=None):
    """Search Copernicus STAC API."""
    endpoint = f"{STAC_URL}/search"

    payload = {
        "collections": [collection],
        "bbox": bbox,
        "datetime": datetime_range,
        "limit": max_items,
    }
    if extra_params:
        payload.update(extra_params)

    try:
        resp = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        if resp.status_code == 200:
            return resp.json(), None
        else:
            return None, f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return None, str(e)


def get_stac_collections():
    """List available STAC collections."""
    try:
        resp = requests.get(f"{STAC_URL}/collections", timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            collections = data.get("collections", [])
            return [{"id": c["id"], "title": c.get("title", "")} for c in collections], None
        return None, f"HTTP {resp.status_code}"
    except Exception as e:
        return None, str(e)


def build_item_summary(item):
    """Extract key fields from a STAC item."""
    props = item.get("properties", {})
    return {
        "id": item.get("id", ""),
        "collection": item.get("collection", ""),
        "datetime": props.get("datetime", ""),
        "cloud_cover": props.get("eo:cloud_cover", props.get("s2:cloud_cover", None)),
        "platform": props.get("platform", ""),
        "instrument": props.get("instruments", []),
        "processing_level": props.get("processing:level", ""),
        "bbox": item.get("bbox", []),
        "assets": list(item.get("assets", {}).keys()),
        "links": [l.get("href") for l in item.get("links", []) if l.get("rel") == "self"],
    }


def search_sentinel1():
    """Search for Sentinel-1 GRD products over NER."""
    print("  Searching Sentinel-1 GRD products...")

    result = {
        "collection": "sentinel-1-grd",
        "search_bbox": NER_BBOX,
        "search_period": f"{SEARCH_DATE_START}/{SEARCH_DATE_END}",
        "search_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "items_found": 0,
        "catalog": [],
        "notes": []
    }

    datetime_range = f"{SEARCH_DATE_START}/{SEARCH_DATE_END}"

    data, error = search_stac(
        "sentinel-1-grd",
        NER_BBOX,
        datetime_range,
        max_items=20
    )

    if error:
        result["status"] = f"SEARCH_FAILED: {error}"
        result["notes"].append(f"STAC search failed: {error}")
        result["notes"].append(
            "Sentinel-1 data requires Copernicus Data Space registration. "
            "Search endpoint: https://stac.dataspace.copernicus.eu/v1/search "
            "Collection: sentinel-1-grd"
        )
    elif data:
        items = data.get("features", [])
        result["items_found"] = len(items)
        result["total_available"] = data.get("context", {}).get("matched", len(items))
        result["catalog"] = [build_item_summary(item) for item in items]
        result["status"] = "CATALOG_ONLY"
        result["notes"].append(
            "Catalog metadata retrieved. Actual product download requires "
            "Copernicus Data Space credentials (COPERNICUS_USER, COPERNICUS_PASSWORD env vars). "
            "Set credentials and re-run with download_sentinel.py to fetch actual data."
        )

    return result


def search_sentinel2():
    """Search for Sentinel-2 L2A products over NER with cloud filter."""
    print("  Searching Sentinel-2 L2A products...")

    result = {
        "collection": "sentinel-2-l2a",
        "search_bbox": NER_BBOX,
        "search_period": f"{SEARCH_DATE_START}/{SEARCH_DATE_END}",
        "cloud_cover_max": S2_CLOUD_MAX,
        "search_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "items_found": 0,
        "catalog": [],
        "notes": []
    }

    datetime_range = f"{SEARCH_DATE_START}/{SEARCH_DATE_END}"

    # Add cloud cover filter via query
    extra = {
        "query": {
            "eo:cloud_cover": {"lte": S2_CLOUD_MAX}
        }
    }

    data, error = search_stac(
        "sentinel-2-l2a",
        NER_BBOX,
        datetime_range,
        max_items=20,
        extra_params=extra
    )

    if error:
        # Try without cloud filter
        data, error2 = search_stac(
            "sentinel-2-l2a",
            NER_BBOX,
            datetime_range,
            max_items=20
        )
        if error2:
            result["status"] = f"SEARCH_FAILED: {error}"
            result["notes"].append(f"STAC search failed: {error}")
            result["notes"].append(
                "Sentinel-2 data accessible via Copernicus Data Space. "
                "Collection: sentinel-2-l2a, Level: L2A (surface reflectance)"
            )
        else:
            items = data.get("features", [])
            result["items_found"] = len(items)
            result["total_available"] = data.get("context", {}).get("matched", len(items))
            result["catalog"] = [build_item_summary(item) for item in items]
            result["status"] = "CATALOG_ONLY_NO_CLOUD_FILTER"
    else:
        if data:
            items = data.get("features", [])
            result["items_found"] = len(items)
            result["total_available"] = data.get("context", {}).get("matched", len(items))
            result["catalog"] = [build_item_summary(item) for item in items]
            result["status"] = "CATALOG_ONLY"
            result["notes"].append(
                f"Found {result['total_available']} S2 scenes with <={S2_CLOUD_MAX}% cloud cover. "
                "Actual download requires Copernicus credentials."
            )

    return result


def create_download_report(s1_result, s2_result):
    """Create a combined download report."""
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "stac_endpoint": STAC_URL,
        "search_area": "North Eastern India (NER)",
        "search_bbox_wgs84": NER_BBOX,
        "sentinel1": {
            "status": s1_result["status"],
            "items_in_catalog": s1_result.get("items_found", 0),
            "total_available": s1_result.get("total_available", "unknown"),
            "notes": s1_result.get("notes", [])
        },
        "sentinel2": {
            "status": s2_result["status"],
            "items_in_catalog": s2_result.get("items_found", 0),
            "total_available": s2_result.get("total_available", "unknown"),
            "cloud_cover_filter": f"<={S2_CLOUD_MAX}%",
            "notes": s2_result.get("notes", [])
        },
        "download_instructions": {
            "registration": "https://dataspace.copernicus.eu/register",
            "documentation": "https://documentation.dataspace.copernicus.eu/APIs/STAC.html",
            "credential_env_vars": ["COPERNICUS_USER", "COPERNICUS_PASSWORD"],
            "recommended_tool": "sentinelsat or the official Copernicus Data Space client",
            "next_steps": [
                "1. Register at https://dataspace.copernicus.eu/",
                "2. Set COPERNICUS_USER and COPERNICUS_PASSWORD environment variables",
                "3. Use catalog.json to identify target product IDs",
                "4. Download selected products using sentinelsat or curl with OAuth",
                "5. Store in data/raw/sentinel1/ or data/raw/sentinel2/"
            ]
        }
    }


def main():
    print("\n=== Step 9: Sentinel Catalog Search ===\n")

    # Check STAC availability
    print("  Checking STAC endpoint...")
    collections, err = get_stac_collections()
    if collections:
        relevant = [c for c in collections if "sentinel" in c["id"].lower()]
        print(f"  STAC accessible. Sentinel collections: {[c['id'] for c in relevant]}")
    else:
        print(f"  STAC check: {err}")

    s1_result = search_sentinel1()
    s2_result = search_sentinel2()

    # Save catalogs
    s1_catalog_path = S1_DIR / "catalog.json"
    with open(s1_catalog_path, "w") as f:
        json.dump(s1_result, f, indent=2)
    print(f"  Sentinel-1 catalog → {s1_catalog_path} ({s1_result.get('items_found', 0)} items)")

    s2_catalog_path = S2_DIR / "catalog.json"
    with open(s2_catalog_path, "w") as f:
        json.dump(s2_result, f, indent=2)
    print(f"  Sentinel-2 catalog → {s2_catalog_path} ({s2_result.get('items_found', 0)} items)")

    # Save download reports
    s1_report_path = S1_DIR / "download_report.json"
    with open(s1_report_path, "w") as f:
        json.dump({
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "status": s1_result["status"],
            "catalog_items": s1_result.get("items_found", 0),
            "actual_files_downloaded": 0,
            "notes": s1_result.get("notes", [])
        }, f, indent=2)

    s2_report_path = S2_DIR / "download_report.json"
    with open(s2_report_path, "w") as f:
        json.dump({
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "status": s2_result["status"],
            "catalog_items": s2_result.get("items_found", 0),
            "actual_files_downloaded": 0,
            "notes": s2_result.get("notes", [])
        }, f, indent=2)

    # Combined download report
    combined_report = create_download_report(s1_result, s2_result)
    combined_path = RAW_DIR / "sentinel_download_report.json"
    with open(combined_path, "w") as f:
        json.dump(combined_report, f, indent=2)
    print(f"  Combined Sentinel report → {combined_path}")

    print(f"\n  Sentinel-1: {s1_result['status']}")
    print(f"  Sentinel-2: {s2_result['status']}")
    print("  NOTE: Actual product download requires Copernicus Data Space credentials")


if __name__ == "__main__":
    main()
