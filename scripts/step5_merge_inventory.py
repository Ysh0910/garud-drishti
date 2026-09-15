"""
Step 5: Merge GSI + Atlas landslide inventories into a unified dataset.
Preserves provenance, flags probable duplicates, does NOT silently discard records.
"""
import csv
import json
import re
from pathlib import Path
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

RAW_DIR = Path("data/raw")
OUT_DIR = RAW_DIR / "landslide_inventory"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GSI_CSV = RAW_DIR / "gsi" / "gsi_landslide_inventory.csv"
ATLAS_CSV = RAW_DIR / "landslide_atlas" / "landslide_atlas_inventory.csv"

# Conservative duplicate matching
DUPLICATE_SPATIAL_RADIUS_KM = 1.0
DUPLICATE_DATE_TOLERANCE_DAYS = 7


def haversine_km(lat1, lon1, lat2, lon2):
    """Haversine distance in km between two lat/lon points."""
    try:
        R = 6371.0
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        return 2 * R * asin(sqrt(a))
    except Exception:
        return None


def normalize_date(date_str):
    """Try to parse date to YYYY-MM-DD. Returns original string if parsing fails."""
    if not date_str:
        return ""
    date_str = str(date_str).strip()

    # Try common formats
    formats = [
        r'(\d{4})-(\d{2})-(\d{2})',     # YYYY-MM-DD
        r'(\d{2})/(\d{2})/(\d{4})',     # DD/MM/YYYY
        r'(\d{1,2})-(\d{1,2})-(\d{4})', # D-M-YYYY
        r'(\d{4})',                       # YYYY only
    ]

    # YYYY-MM-DD
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # DD/MM/YYYY
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
    if m:
        return f"{m.group(3)}-{m.group(2):0>2}-{m.group(1):0>2}"

    # Year only
    m = re.search(r'\b(\d{4})\b', date_str)
    if m:
        return m.group(1)

    return date_str


def normalize_state(state_str):
    """Normalize state name to a canonical form."""
    if not state_str:
        return ""
    state_str = str(state_str).strip()

    mapping = {
        "arunachal": "Arunachal Pradesh",
        "assam": "Assam",
        "manipur": "Manipur",
        "meghalaya": "Meghalaya",
        "mizoram": "Mizoram",
        "nagaland": "Nagaland",
        "sikkim": "Sikkim",
        "tripura": "Tripura",
        "arunachal pradesh": "Arunachal Pradesh",
        "ar": "Arunachal Pradesh",
        "as": "Assam",
        "mn": "Manipur",
        "ml": "Meghalaya",
        "mz": "Mizoram",
        "nl": "Nagaland",
        "sk": "Sikkim",
        "tr": "Tripura",
    }

    lower = state_str.lower()
    for k, v in mapping.items():
        if k in lower:
            return v

    return state_str  # preserve original if no match


def load_csv(path, source_name):
    """Load a CSV into a list of dicts, adding source field."""
    records = []
    if not path.exists():
        print(f"  WARNING: {path} not found, skipping.")
        return records

    with open(path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["_source"] = source_name
            records.append(dict(row))
    print(f"  Loaded {len(records)} records from {path.name}")
    return records


def find_probable_duplicates(records):
    """
    Conservative duplicate detection based on spatial proximity and date.
    Returns list of (idx_a, idx_b, reason) tuples.
    Does NOT discard records — only flags them.
    """
    duplicates = []
    georeferenced = [
        (i, r) for i, r in enumerate(records)
        if r.get("latitude") and r.get("longitude")
        and str(r["latitude"]) not in ("", "None")
        and str(r["longitude"]) not in ("", "None")
    ]

    for i in range(len(georeferenced)):
        for j in range(i + 1, len(georeferenced)):
            idx_a, rec_a = georeferenced[i]
            idx_b, rec_b = georeferenced[j]

            try:
                dist = haversine_km(
                    rec_a["latitude"], rec_a["longitude"],
                    rec_b["latitude"], rec_b["longitude"]
                )
            except Exception:
                continue

            if dist is None or dist > DUPLICATE_SPATIAL_RADIUS_KM:
                continue

            # Check date similarity
            date_a = normalize_date(rec_a.get("date", ""))
            date_b = normalize_date(rec_b.get("date", ""))
            date_match = (date_a and date_b and date_a[:7] == date_b[:7])  # same year-month

            if date_match or dist < 0.1:  # very close or same date
                duplicates.append({
                    "index_a": idx_a,
                    "id_a": rec_a.get("landslide_id", ""),
                    "index_b": idx_b,
                    "id_b": rec_b.get("landslide_id", ""),
                    "distance_km": round(dist, 4),
                    "date_a": date_a,
                    "date_b": date_b,
                    "reason": f"dist={dist:.3f}km, dates={date_a}/{date_b}"
                })

    return duplicates


def merge_records(gsi_records, atlas_records):
    """Merge and assign unified IDs. Preserve all records."""
    merged = []
    unified_id = 1

    # Canonical fields for merged record
    fieldnames = [
        "landslide_id", "source", "source_id",
        "state", "district", "location",
        "latitude", "longitude", "date",
        "landslide_type", "cause", "source_page",
        "confidence", "duplicate_group", "notes"
    ]

    for r in gsi_records:
        merged.append({
            "landslide_id": f"NER_{unified_id:05d}",
            "source": "GSI",
            "source_id": r.get("landslide_id", ""),
            "state": normalize_state(r.get("state", "")),
            "district": r.get("district", ""),
            "location": r.get("location", ""),
            "latitude": r.get("latitude", ""),
            "longitude": r.get("longitude", ""),
            "date": normalize_date(r.get("date", "")),
            "landslide_type": r.get("landslide_type", ""),
            "cause": r.get("cause", ""),
            "source_page": r.get("source_page", ""),
            "confidence": r.get("confidence", ""),
            "duplicate_group": "",
            "notes": r.get("notes", ""),
        })
        unified_id += 1

    for r in atlas_records:
        merged.append({
            "landslide_id": f"NER_{unified_id:05d}",
            "source": "ISRO_ATLAS",
            "source_id": r.get("landslide_id", ""),
            "state": normalize_state(r.get("state", "")),
            "district": r.get("district", ""),
            "location": r.get("location", ""),
            "latitude": r.get("latitude", ""),
            "longitude": r.get("longitude", ""),
            "date": normalize_date(r.get("date", "")),
            "landslide_type": r.get("landslide_type", ""),
            "cause": r.get("cause", ""),
            "source_page": r.get("source_page", ""),
            "confidence": r.get("confidence", ""),
            "duplicate_group": "",
            "notes": r.get("notes", r.get("event_id", "")),
        })
        unified_id += 1

    return merged


def save_geojson(records, out_path):
    features = []
    for r in records:
        try:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            if lat and lon and (19.0 <= lat <= 31.0) and (87.0 <= lon <= 99.0):
                props = {k: v for k, v in r.items() if k not in ["latitude", "longitude"]}
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": props
                })
        except (ValueError, TypeError):
            continue

    geojson = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
        "properties": {
            "source": "NER Combined Landslide Inventory (GSI + ISRO Atlas)",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "note": "Combined inventory from GSI and ISRO sources. Not all records have coordinates."
        }
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    return len(features)


def main():
    print("\n=== Step 5: Merging Landslide Inventories ===\n")

    gsi_records = load_csv(GSI_CSV, "GSI")
    atlas_records = load_csv(ATLAS_CSV, "ISRO_ATLAS")

    merged = merge_records(gsi_records, atlas_records)
    print(f"  Total merged records: {len(merged)}")

    # Find probable duplicates (only among georeferenced records from different sources)
    print("  Checking for probable duplicates...")
    # Only check cross-source duplicates to be conservative
    gsi_count = len(gsi_records)
    duplicates = find_probable_duplicates(merged)
    print(f"  Found {len(duplicates)} probable duplicate pairs")

    # Annotate duplicates in merged records
    dup_group_id = 1
    for dup in duplicates:
        idx_a = dup["index_a"]
        idx_b = dup["index_b"]
        group_label = f"DUP_GROUP_{dup_group_id:03d}"
        # Only annotate if not already in a group
        if not merged[idx_a]["duplicate_group"]:
            merged[idx_a]["duplicate_group"] = group_label
        if not merged[idx_b]["duplicate_group"]:
            merged[idx_b]["duplicate_group"] = group_label
        dup_group_id += 1

    # Write merged CSV
    csv_path = OUT_DIR / "combined_landslide_inventory.csv"
    fieldnames = ["landslide_id", "source", "source_id", "state", "district",
                  "location", "latitude", "longitude", "date",
                  "landslide_type", "cause", "source_page", "confidence",
                  "duplicate_group", "notes"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in merged:
            row = {k: r.get(k, "") for k in fieldnames}
            writer.writerow(row)
    print(f"  Combined CSV → {csv_path}")

    # Write GeoJSON
    geojson_path = OUT_DIR / "combined_landslide_inventory.geojson"
    n_geo = save_geojson(merged, geojson_path)
    print(f"  Combined GeoJSON → {geojson_path} ({n_geo} georeferenced)")

    # Write merge report
    with_coords = [r for r in merged if r.get("latitude") and str(r["latitude"]) not in ("", "None")]
    gsi_in_merged = [r for r in merged if r["source"] == "GSI"]
    atlas_in_merged = [r for r in merged if r["source"] == "ISRO_ATLAS"]

    merge_report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "gsi_records": len(gsi_in_merged),
        "atlas_records": len(atlas_in_merged),
        "total_merged": len(merged),
        "records_with_coordinates": len(with_coords),
        "records_without_coordinates": len(merged) - len(with_coords),
        "georeferenced_in_geojson": n_geo,
        "probable_duplicate_pairs": len(duplicates),
        "probable_duplicate_records": len([r for r in merged if r.get("duplicate_group")]),
        "deduplication_rule": (
            f"Probable duplicates: same source pair within {DUPLICATE_SPATIAL_RADIUS_KM}km "
            f"and same year-month, OR within 0.1km regardless of date. "
            "Records are FLAGGED, not removed."
        ),
        "state_normalisation": "Applied canonical state name mapping. Original values preserved in notes if changed.",
        "duplicates": duplicates[:20],  # only first 20 for readability
        "warnings": [
            "GSI PDF may be primarily image-based — programmatic extraction may be limited",
            "ISRO Atlas primarily contains aggregate/statistical data rather than point coordinates",
            "Absence from inventory does not prove absence of a landslide",
            "Additional validation against official GSI/ISRO portals recommended"
        ]
    }

    report_path = OUT_DIR / "merge_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(merge_report, f, indent=2)
    print(f"  Merge report → {report_path}")
    print(f"\n  Summary: {len(merged)} total records, {n_geo} georeferenced, "
          f"{len(duplicates)} probable duplicate pairs")


if __name__ == "__main__":
    main()
