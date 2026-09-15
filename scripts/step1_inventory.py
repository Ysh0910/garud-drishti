"""
Step 1: Inventory all existing files in data/raw/
Produces: data/raw/dataset_inventory.csv and dataset_inventory.json
"""
import os
import csv
import json
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")

# Classify files by name/extension
def classify_file(name, ext, size, rel_path):
    """Determine likely dataset, file_type, and status."""
    name_lower = name.lower()
    ext_lower = ext.lower()

    # File type
    ext_map = {
        ".pdf": "PDF",
        ".nc": "NetCDF",
        ".nc4": "NetCDF4",
        ".h5": "HDF5",
        ".hdf": "HDF5",
        ".tif": "GeoTIFF",
        ".tiff": "GeoTIFF",
        ".zip": "Archive",
        ".gpkg": "GeoPackage",
        ".geojson": "GeoJSON",
        ".shp": "Shapefile",
        ".pbf": "PBF",
        ".csv": "CSV",
        ".json": "JSON",
        ".txt": "Text",
        ".py": "Python Script",
        ".md": "Markdown",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".gitkeep": "Placeholder",
        "": "Unknown",
    }
    file_type = ext_map.get(ext_lower, "Unknown")

    # Dataset
    dataset = "unknown"
    source = "unknown"
    status = "PRESENT"
    coverage = ""
    temporal_res = ""
    spatial_res = ""
    notes = ""

    if "gsi" in name_lower and ext_lower == ".pdf":
        dataset = "GSI Landslide Inventory"
        source = "Geological Survey of India"
        status = "PRESENT"
        coverage = "India (NER relevant)"
        notes = "PDF - needs extraction"
    elif "landslide" in name_lower and "atlas" in name_lower and ext_lower == ".pdf":
        dataset = "ISRO Landslide Atlas 2023"
        source = "ISRO/NRSC"
        status = "PRESENT"
        coverage = "India-wide"
        notes = "PDF - needs extraction"
    elif "rf25" in name_lower and ext_lower == ".nc":
        dataset = "IMD Rainfall 25km Gridded"
        source = "India Meteorological Department"
        status = "PRESENT"
        coverage = "India"
        temporal_res = "Daily"
        spatial_res = "25km"
        notes = "NetCDF - needs metadata inspection"
    elif "gpm_3imergdf" in name_lower:
        dataset = "NASA GPM IMERG Daily"
        source = "NASA GES DISC"
        status = "MANIFEST_ONLY"
        coverage = "Global"
        temporal_res = "Daily"
        spatial_res = "0.1 degree"
        notes = "URL manifest - actual .nc4 files not yet downloaded"
    elif "gpm_3imerghh" in name_lower:
        dataset = "NASA GPM IMERG Half-Hourly"
        source = "NASA GES DISC"
        status = "MANIFEST_ONLY"
        coverage = "Global"
        temporal_res = "30-minute"
        spatial_res = "0.1 degree"
        notes = "URL manifest - actual HDF5 files not yet downloaded"
    elif "spl3smap" in name_lower and ext_lower == ".py":
        dataset = "NASA SMAP SPL3SMAP Level-3 Soil Moisture"
        source = "NSIDC / NASA"
        status = "SCRIPT_ONLY"
        coverage = "Global"
        temporal_res = "Daily"
        spatial_res = "9km enhanced / 36km baseline"
        notes = "Download script only - actual SMAP data not present"
    elif "nsidc-0800" in name_lower and ext_lower == ".py":
        dataset = "NASA SMAP NSIDC-0800 SPL3FTA"
        source = "NSIDC / NASA"
        status = "SCRIPT_ONLY"
        coverage = "Global"
        temporal_res = "Daily"
        spatial_res = "1km"
        notes = "Download script only - actual data not present"
    elif "srtm" in name_lower and ext_lower == ".zip":
        dataset = "SRTM DEM v3"
        source = "NASA / USGS"
        status = "ARCHIVE"
        coverage = "To be verified"
        spatial_res = "30m (1 arc-second) or 90m (3 arc-second)"
        notes = "ZIP archive - needs extraction and coverage check"
    elif "north-eastern-zone" in name_lower and ext_lower == ".zip":
        dataset = "OSM North Eastern Zone GeoPackage"
        source = "Geofabrik / OpenStreetMap"
        status = "ARCHIVE"
        coverage = "North Eastern India"
        notes = "ZIP archive containing GPKG"
    elif "north-eastern-zone" in name_lower and ext_lower == ".gpkg":
        dataset = "OSM North Eastern Zone GeoPackage"
        source = "Geofabrik / OpenStreetMap"
        status = "PRESENT"
        coverage = "North Eastern India"
        notes = "GeoPackage - OSM data as of 2026-09-10"
    elif "eastern-zone" in name_lower and ext_lower == ".zip":
        dataset = "OSM Eastern Zone GeoPackage"
        source = "Geofabrik / OpenStreetMap"
        status = "ARCHIVE"
        coverage = "Eastern India"
        notes = "ZIP archive containing GPKG"
    elif "eastern-zone" in name_lower and ext_lower == ".gpkg":
        dataset = "OSM Eastern Zone GeoPackage"
        source = "Geofabrik / OpenStreetMap"
        status = "PRESENT"
        coverage = "Eastern India"
        notes = "GeoPackage - OSM data as of 2026-09-10"
    elif name_lower == ".gitkeep":
        dataset = "Placeholder"
        source = "Project"
        status = "PRESENT"
        notes = "Empty placeholder file"
    elif ext_lower == ".md":
        dataset = "Documentation"
        source = "Project"
        status = "PRESENT"
        notes = "Project documentation file"
    elif name_lower == "readme":
        dataset = "Documentation"
        source = "Geofabrik / OpenStreetMap"
        status = "PRESENT"
        notes = "README for OSM data"

    return {
        "file_type": file_type,
        "dataset": dataset,
        "source": source,
        "status": status,
        "coverage": coverage,
        "temporal_resolution": temporal_res,
        "spatial_resolution": spatial_res,
        "notes": notes,
    }


def build_inventory():
    records = []
    for root, dirs, files in os.walk(RAW_DIR):
        # Skip hidden dirs
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for fname in files:
            fpath = Path(root) / fname
            rel_path = str(fpath.relative_to(Path(".")))
            size = fpath.stat().st_size
            ext = fpath.suffix
            info = classify_file(fname, ext, size, rel_path)
            records.append({
                "dataset": info["dataset"],
                "path": rel_path,
                "file_type": info["file_type"],
                "size_bytes": size,
                "status": info["status"],
                "coverage": info["coverage"],
                "temporal_resolution": info["temporal_resolution"],
                "spatial_resolution": info["spatial_resolution"],
                "source": info["source"],
                "notes": info["notes"],
            })

    # Sort by dataset then path
    records.sort(key=lambda r: (r["dataset"], r["path"]))
    return records


def main():
    print("Building data/raw inventory...")
    records = build_inventory()

    # Write CSV
    csv_path = RAW_DIR / "dataset_inventory.csv"
    fieldnames = ["dataset", "path", "file_type", "size_bytes", "status",
                  "coverage", "temporal_resolution", "spatial_resolution", "source", "notes"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"  Written: {csv_path}")

    # Write JSON
    json_path = RAW_DIR / "dataset_inventory.json"
    inventory_doc = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_files": len(records),
        "records": records,
        "status_summary": {},
    }
    # Count by status
    for r in records:
        s = r["status"]
        inventory_doc["status_summary"][s] = inventory_doc["status_summary"].get(s, 0) + 1

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(inventory_doc, f, indent=2)
    print(f"  Written: {json_path}")

    print(f"\nInventory summary ({len(records)} files):")
    for status, count in sorted(inventory_doc["status_summary"].items()):
        print(f"  {status}: {count}")


if __name__ == "__main__":
    main()
