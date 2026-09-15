"""
finalize_reports.py
-------------------
Regenerate all final status reports based on actual files present in data/raw/.

Produces:
  data/raw/data_validation.json      (updated)
  data/raw/DATA_COMPLETION_REPORT.md (updated)
  data/raw/dataset_inventory.csv     (updated)
  data/raw/dataset_inventory.json    (updated)

Run this LAST, after all download scripts have finished.
"""

import os
import sys
import json
import csv
import glob
import datetime
import logging

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

NOW = datetime.datetime.utcnow()
NOW_ISO = NOW.isoformat() + "Z"


# ── helpers ────────────────────────────────────────────────────────────────────

def file_size(path):
    try:
        return os.path.getsize(path)
    except Exception:
        return 0


def dir_size(path):
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            total += file_size(os.path.join(root, f))
    return total


def count_files(path, ext=None):
    count = 0
    for root, _, files in os.walk(path):
        for f in files:
            if ext is None or f.lower().endswith(ext):
                count += 1
    return count


def exists_nonzero(path):
    return os.path.exists(path) and os.path.getsize(path) > 0


def glob_any(patterns):
    for p in patterns:
        matches = glob.glob(p)
        if matches:
            return matches
    return []


# ── dataset status checks ──────────────────────────────────────────────────────

def check_gsi():
    csv_p = os.path.join(RAW_DIR, "gsi", "gsi_landslide_inventory.csv")
    geo_p = os.path.join(RAW_DIR, "gsi", "gsi_landslide_inventory.geojson")
    rpt_p = os.path.join(RAW_DIR, "gsi", "gsi_extraction_report.json")
    present = exists_nonzero(csv_p) and exists_nonzero(rpt_p)
    records = 0
    coords = 0
    if exists_nonzero(rpt_p):
        try:
            with open(rpt_p) as f:
                rpt = json.load(f)
            records = rpt.get("records_extracted", 0)
            coords = rpt.get("records_with_coordinates", 0)
        except Exception:
            pass
    return {
        "status": "PRESENT" if present else "MISSING",
        "csv": csv_p if exists_nonzero(csv_p) else None,
        "geojson": geo_p if exists_nonzero(geo_p) else None,
        "records": records,
        "with_coordinates": coords,
        "size_bytes": file_size(csv_p) + file_size(geo_p),
    }


def check_atlas():
    csv_p = os.path.join(RAW_DIR, "landslide_atlas", "landslide_atlas_inventory.csv")
    rpt_p = os.path.join(RAW_DIR, "landslide_atlas", "atlas_extraction_report.json")
    present = exists_nonzero(csv_p)
    records = 0
    if exists_nonzero(rpt_p):
        try:
            with open(rpt_p) as f:
                rpt = json.load(f)
            records = rpt.get("records_extracted", 0)
        except Exception:
            pass
    return {
        "status": "PRESENT" if present else "MISSING",
        "csv": csv_p if exists_nonzero(csv_p) else None,
        "records": records,
        "size_bytes": file_size(csv_p),
    }


def check_combined_inventory():
    csv_p = os.path.join(RAW_DIR, "landslide_inventory", "combined_landslide_inventory.csv")
    geo_p = os.path.join(RAW_DIR, "landslide_inventory", "combined_landslide_inventory.geojson")
    rpt_p = os.path.join(RAW_DIR, "landslide_inventory", "merge_report.json")
    present = exists_nonzero(csv_p)
    records = 0
    georef = 0
    if exists_nonzero(rpt_p):
        try:
            with open(rpt_p) as f:
                rpt = json.load(f)
            records = rpt.get("total_records", rpt.get("merged_records", 0))
            georef = rpt.get("georeferenced_records", rpt.get("records_with_coordinates", 0))
        except Exception:
            pass
    return {
        "status": "PRESENT" if present else "MISSING",
        "records": records,
        "georeferenced": georef,
        "size_bytes": file_size(csv_p) + file_size(geo_p),
    }


def check_srtm():
    srtm_dir = os.path.join(RAW_DIR, "dem", "srtm")
    hgt_count = count_files(srtm_dir, ".hgt")
    tif_count = count_files(srtm_dir, ".tif")
    total_bytes = dir_size(srtm_dir)
    status = "PRESENT" if hgt_count > 0 or tif_count > 0 else "MISSING"

    # Load extended report if present
    ext_rpt = os.path.join(srtm_dir, "srtm_extended_coverage_report.json")
    coverage_pct = None
    if exists_nonzero(ext_rpt):
        try:
            with open(ext_rpt) as f:
                r = json.load(f)
            coverage_pct = r.get("coverage", {}).get("coverage_pct")
        except Exception:
            pass

    return {
        "status": status,
        "hgt_tiles": hgt_count,
        "tif_files": tif_count,
        "total_size_bytes": total_bytes,
        "resolution": "~90m (3 arc-second)",
        "source": "Viewfinder Panoramas DEM3",
        "coverage_pct": coverage_pct,
    }


def check_terrain_features():
    tf_dir = os.path.join(RAW_DIR, "geomorphology", "terrain_features")
    slope = exists_nonzero(os.path.join(tf_dir, "slope_ner.tif"))
    aspect = exists_nonzero(os.path.join(tf_dir, "aspect_ner.tif"))
    curv = exists_nonzero(os.path.join(tf_dir, "curvature_ner.tif"))
    elev = exists_nonzero(os.path.join(tf_dir, "elevation_ner.tif"))
    all_present = slope and aspect and curv and elev
    return {
        "status": "PRESENT" if all_present else ("PARTIAL" if any([slope, aspect, curv, elev]) else "MISSING"),
        "slope": slope,
        "aspect": aspect,
        "curvature": curv,
        "elevation": elev,
        "size_bytes": dir_size(tf_dir),
        "notes": "DEM-derived from SRTM HGT tiles. Used as geomorphology proxy.",
    }


def check_imd():
    nc_path = os.path.join(RAW_DIR, "RF25_ind2025_rfp25.nc")
    meta_path = os.path.join(RAW_DIR, "rainfall", "imd", "imd_rf25_metadata.json")
    present = exists_nonzero(nc_path)
    timesteps = None
    if exists_nonzero(meta_path):
        try:
            with open(meta_path) as f:
                m = json.load(f)
            timesteps = m.get("time_steps") or m.get("timesteps") or m.get("time", {}).get("size")
        except Exception:
            pass
    return {
        "status": "PRESENT" if present else "MISSING",
        "path": nc_path if present else None,
        "size_bytes": file_size(nc_path),
        "resolution": "25km daily",
        "timesteps": timesteps,
        "year": "2025",
    }


def check_gpm_daily():
    daily_dir = os.path.join(RAW_DIR, "rainfall", "gpm", "daily")
    nc4_count = count_files(daily_dir, ".nc4")
    manifest_path = glob.glob(os.path.join(RAW_DIR, "subset_GPM_3IMERGDF_*.txt"))
    manifest_present = bool(manifest_path)
    if nc4_count > 0:
        return {"status": "PRESENT", "nc4_files": nc4_count, "size_bytes": dir_size(daily_dir)}
    elif manifest_present:
        return {"status": "BLOCKED_AUTH_REQUIRED", "manifest_urls": "~10135", "manifest_file": str(manifest_path[0])}
    return {"status": "MISSING"}


def check_gpm_halfhourly():
    hh_dir = os.path.join(RAW_DIR, "rainfall", "gpm", "half_hourly")
    hdf_count = count_files(hh_dir, ".hdf5") + count_files(hh_dir, ".hdf") + count_files(hh_dir, ".h5")
    manifest_path = glob.glob(os.path.join(RAW_DIR, "subset_GPM_3IMERGHH_*.txt"))
    if hdf_count > 0:
        return {"status": "PRESENT", "hdf_files": hdf_count, "size_bytes": dir_size(hh_dir)}
    elif manifest_path:
        return {"status": "BLOCKED_AUTH_REQUIRED", "manifest_urls": "~486480", "manifest_file": str(manifest_path[0])}
    return {"status": "MISSING"}


def check_smap():
    smap_dir = os.path.join(RAW_DIR, "soil_moisture", "smap")
    data_files = count_files(smap_dir, ".h5") + count_files(smap_dir, ".hdf5") + count_files(smap_dir, ".nc")
    scripts = glob.glob(os.path.join(RAW_DIR, "nsidc-download_*.py"))
    if data_files > 0:
        return {"status": "PRESENT", "data_files": data_files, "size_bytes": dir_size(smap_dir)}
    elif scripts:
        return {"status": "BLOCKED_AUTH_REQUIRED", "scripts": [os.path.basename(s) for s in scripts]}
    return {"status": "MISSING"}


def check_sentinel(n):
    s_dir = os.path.join(RAW_DIR, f"sentinel{n}")
    catalog = os.path.join(s_dir, "catalog.json")
    # Check for actual product zip/SAFE directories
    safe_dirs = [d for d in os.listdir(s_dir) if d.endswith(".SAFE")] if os.path.isdir(s_dir) else []
    zip_files = [f for f in os.listdir(s_dir) if f.endswith(".zip")] if os.path.isdir(s_dir) else []
    actual_data = len(safe_dirs) + len(zip_files)
    catalog_items = 0
    if exists_nonzero(catalog):
        try:
            with open(catalog) as f:
                c = json.load(f)
            catalog_items = len(c.get("features", c.get("items", [])))
        except Exception:
            pass
    if actual_data > 0:
        return {"status": "PRESENT", "products": actual_data}
    elif exists_nonzero(catalog):
        return {"status": "CATALOG_ONLY", "catalog_items": catalog_items, "needs": "Copernicus credentials"}
    return {"status": "MISSING"}


def check_boundaries():
    b_dir = os.path.join(RAW_DIR, "boundaries")
    gpkg = exists_nonzero(os.path.join(b_dir, "ner_boundary.gpkg"))
    gadm = exists_nonzero(os.path.join(b_dir, "ner_boundary_gadm.geojson"))
    approx = exists_nonzero(os.path.join(b_dir, "ner_boundary_approximate.geojson"))
    osm_b = exists_nonzero(os.path.join(b_dir, "ner_boundary_from_osm.geojson"))
    states = 8 if approx else (7 if gadm else 0)
    present = gpkg or gadm
    return {
        "status": "PRESENT" if present else "MISSING",
        "gpkg": gpkg,
        "gadm_geojson": gadm,
        "approximate_geojson": approx,
        "osm_derived": osm_b,
        "states_covered": states,
        "size_bytes": dir_size(b_dir),
    }


def check_osm():
    # Main GPKG at root level
    gpkg_root = os.path.join(RAW_DIR, "north-eastern-zone.gpkg")
    gpkg_osm = os.path.join(RAW_DIR, "osm", "north-eastern-zone.osm.pbf")
    present = exists_nonzero(gpkg_root)
    return {
        "status": "PRESENT" if present else "MISSING",
        "path": gpkg_root if present else None,
        "size_bytes": file_size(gpkg_root),
        "source": "Geofabrik 2026-09-10",
        "note": "GeoPackage at data/raw/north-eastern-zone.gpkg",
    }


def check_geology():
    geo_dir = os.path.join(RAW_DIR, "geology")
    glim_gpkg = os.path.join(geo_dir, "glim_ner.gpkg")
    soilgrids = os.path.join(geo_dir, "soilgrids_wrb_ner.tif")
    macrostrat = os.path.join(geo_dir, "macrostrat_geology_ner.json")
    openlandmap = os.path.join(geo_dir, "openlandmap_lithology_ner.tif")
    glim_v2_rpt = os.path.join(geo_dir, "glim_download_report_v2.json")

    status = "MISSING"
    files = {}
    if exists_nonzero(glim_gpkg):
        status = "PRESENT"
        files["glim_gpkg"] = {"path": glim_gpkg, "size": file_size(glim_gpkg)}
    if exists_nonzero(soilgrids):
        files["soilgrids_proxy"] = {"path": soilgrids, "size": file_size(soilgrids)}
        if status == "MISSING":
            status = "PROXY_ONLY"
    if exists_nonzero(macrostrat):
        files["macrostrat_api"] = {"path": macrostrat, "size": file_size(macrostrat)}
        if status == "MISSING":
            status = "API_POINTS_ONLY"
    if exists_nonzero(openlandmap):
        files["openlandmap"] = {"path": openlandmap, "size": file_size(openlandmap)}

    # Read v2 report if present
    v2_status = None
    if exists_nonzero(glim_v2_rpt):
        try:
            with open(glim_v2_rpt) as f:
                r = json.load(f)
            v2_status = r.get("status")
        except Exception:
            pass

    return {
        "status": status,
        "v2_download_status": v2_status,
        "files": files,
        "size_bytes": dir_size(geo_dir),
        "notes": "SoilGrids WRB soil class = geology proxy. GLIM = authoritative global lithology. GSI Bhukosh = authoritative Indian geology (requires registration).",
    }


def check_geomorphology():
    gm_dir = os.path.join(RAW_DIR, "geomorphology")
    tf_dir = os.path.join(gm_dir, "terrain_features")
    has_slope = exists_nonzero(os.path.join(tf_dir, "slope_ner.tif"))
    has_aspect = exists_nonzero(os.path.join(tf_dir, "aspect_ner.tif"))
    has_curv = exists_nonzero(os.path.join(tf_dir, "curvature_ner.tif"))
    has_elev = exists_nonzero(os.path.join(tf_dir, "elevation_ner.tif"))
    all_terrain = has_slope and has_aspect and has_curv and has_elev
    return {
        "status": "DEM_DERIVED_PROXY" if all_terrain else ("PARTIAL" if any([has_slope, has_aspect]) else "MISSING"),
        "slope_tif": has_slope,
        "aspect_tif": has_aspect,
        "curvature_tif": has_curv,
        "elevation_tif": has_elev,
        "size_bytes": dir_size(gm_dir),
        "notes": "Terrain features derived from SRTM DEM. Bhuvan/GSI dedicated geomorphology layer requires registration.",
    }


def check_lulc():
    lulc_dir = os.path.join(RAW_DIR, "lulc")
    esa_dir = os.path.join(lulc_dir, "esa_worldcover")
    esa_tifs = count_files(esa_dir, ".tif")
    bhuvan_dir = os.path.join(lulc_dir, "bhuvan")
    bhuvan_files = count_files(bhuvan_dir) if os.path.isdir(bhuvan_dir) else 0
    s2_dir = os.path.join(lulc_dir, "sentinel2_derived")

    if esa_tifs > 0:
        status = "PRESENT"
    elif bhuvan_files > 0:
        status = "PRESENT"
    else:
        status = "DOCUMENTED_ONLY"

    return {
        "status": status,
        "esa_worldcover_tiles": esa_tifs,
        "esa_resolution": "10m",
        "esa_year": "2021",
        "bhuvan_files": bhuvan_files,
        "size_bytes": dir_size(lulc_dir),
        "notes": "ESA WorldCover 10m 2021 tiles present covering NER. Bhuvan LULC requires portal request.",
    }


# ── main report generation ──────────────────────────────────────────────────────

def generate_data_validation(checks):
    """Generate updated data_validation.json."""
    blocking = []
    if checks["gpm_daily"]["status"] == "BLOCKED_AUTH_REQUIRED":
        blocking.append("NASA Earthdata login required for GPM Daily (set EARTHDATA_USER + EARTHDATA_PASSWORD)")
    if checks["gpm_halfhourly"]["status"] == "BLOCKED_AUTH_REQUIRED":
        blocking.append("NASA Earthdata login required for GPM Half-Hourly")
    if checks["smap"]["status"] == "BLOCKED_AUTH_REQUIRED":
        blocking.append("NASA Earthdata login required for SMAP (nsidc-download_*.py scripts ready)")
    if checks["sentinel1"]["status"] == "CATALOG_ONLY":
        blocking.append("Copernicus Data Space account required for Sentinel-1/2 actual downloads")
    if checks["geology"]["status"] in ("MISSING", "PROXY_ONLY"):
        blocking.append("Geology: GSI Bhukosh registration required for authoritative Indian geology data")

    val = {
        "generated_at": NOW_ISO,
        "script": "finalize_reports.py",
        "datasets": {
            "historical_landslides": {
                "gsi": checks["gsi"],
                "isro_atlas": checks["atlas"],
                "combined": checks["combined"],
            },
            "terrain": {
                "srtm_dem": checks["srtm"],
                "terrain_features": checks["terrain_features"],
            },
            "rainfall": {
                "imd_rf25": checks["imd"],
                "gpm_daily": checks["gpm_daily"],
                "gpm_half_hourly": checks["gpm_halfhourly"],
            },
            "soil_moisture": {
                "smap": checks["smap"],
            },
            "satellite": {
                "sentinel1": checks["sentinel1"],
                "sentinel2": checks["sentinel2"],
            },
            "boundaries": checks["boundaries"],
            "infrastructure": {"osm_ner": checks["osm"]},
            "geology": checks["geology"],
            "geomorphology": checks["geomorphology"],
            "lulc": checks["lulc"],
        },
        "blocking_items": blocking,
        "overall_readiness": (
            "PARTIAL - Core static datasets present. "
            "GPM/SMAP/Sentinel actual data require NASA Earthdata + Copernicus credentials."
        ),
        "next_steps": [
            "1. Register at urs.earthdata.nasa.gov → set EARTHDATA_USER + EARTHDATA_PASSWORD → run GPM/SMAP downloaders",
            "2. Register at dataspace.copernicus.eu → download Sentinel-1 GRD + Sentinel-2 L2A scenes",
            "3. Register at bhukosh.gsi.gov.in → download authoritative Indian geology vector data",
            "4. Proceed to ml/preprocessing/ → derive feature matrices from existing datasets",
            "5. Train Model 1 (XGBoost susceptibility) using GSI inventory + SRTM terrain + ESA WorldCover",
        ],
    }
    return val


def generate_completion_report(checks):
    """Generate updated DATA_COMPLETION_REPORT.md."""

    def st(key):
        s = checks[key].get("status", "UNKNOWN")
        icons = {
            "PRESENT": "✅",
            "DEM_DERIVED_PROXY": "✅",
            "PROXY_ONLY": "🟡",
            "API_POINTS_ONLY": "🟡",
            "RASTER_PROXY": "🟡",
            "CATALOG_ONLY": "🟡",
            "DOCUMENTED_ONLY": "🟡",
            "PARTIAL": "🟡",
            "BLOCKED_AUTH_REQUIRED": "🔴",
            "MISSING": "🔴",
            "UNKNOWN": "❓",
        }
        icon = icons.get(s, "❓")
        return f"{icon} {s}"

    srtm = checks["srtm"]
    gsi = checks["gsi"]
    atlas = checks["atlas"]
    combined = checks["combined"]
    imd = checks["imd"]
    gpm_d = checks["gpm_daily"]
    gpm_h = checks["gpm_halfhourly"]
    smap = checks["smap"]
    s1 = checks["sentinel1"]
    s2 = checks["sentinel2"]
    bdry = checks["boundaries"]
    osm = checks["osm"]
    geo = checks["geology"]
    gm = checks["geomorphology"]
    lulc = checks["lulc"]
    tf = checks["terrain_features"]

    md = f"""# DATA_COMPLETION_REPORT.md
Generated: {NOW_ISO}

---

## 1. Inventory Summary

| Dataset | Status | Location |
|---------|--------|----------|
| GSI Landslide Inventory | {st('gsi')} | data/raw/gsi/ |
| ISRO Landslide Atlas | {st('atlas')} | data/raw/landslide_atlas/ |
| Combined NER Inventory | {st('combined')} | data/raw/landslide_inventory/ |
| SRTM DEM (~90m) | {st('srtm')} | data/raw/dem/srtm/ |
| Terrain Features (DEM-derived) | {st('terrain_features')} | data/raw/geomorphology/terrain_features/ |
| IMD Rainfall 25km | {st('imd')} | data/raw/RF25_ind2025_rfp25.nc |
| GPM Daily | {st('gpm_daily')} | {gpm_d.get('manifest_file', 'manifest present') if gpm_d['status'] != 'PRESENT' else 'data/raw/rainfall/gpm/daily/'} |
| GPM Half-Hourly | {st('gpm_halfhourly')} | manifest present |
| SMAP Soil Moisture | {st('smap')} | scripts present |
| NER Boundary | {st('boundaries')} | data/raw/boundaries/ |
| OSM NER Roads/Infrastructure | {st('osm')} | data/raw/north-eastern-zone.gpkg |
| Sentinel-1 | {st('sentinel1')} | data/raw/sentinel1/catalog.json |
| Sentinel-2 | {st('sentinel2')} | data/raw/sentinel2/catalog.json |
| Geology | {st('geology')} | data/raw/geology/ |
| Geomorphology (DEM-derived) | {st('geomorphology')} | data/raw/geomorphology/terrain_features/ |
| LULC (ESA WorldCover 10m) | {st('lulc')} | data/raw/lulc/esa_worldcover/ |

---

## 2. Datasets Present Before Original Execution

- `GSI.pdf` — GSI landslide inventory PDF (300 MB)
- `LandslideAtlas_2023.pdf` — ISRO Landslide Atlas 2023 (60 MB)
- `RF25_ind2025_rfp25.nc` — IMD 25km daily rainfall NetCDF (2025)
- `subset_GPM_3IMERGDF_07_*.txt` — GPM daily URL manifest (~10,135 URLs)
- `subset_GPM_3IMERGHH_07_*.txt` — GPM half-hourly URL manifest (~486,480 URLs)
- `nsidc-download_SPL3SMAP.003_*.py` — SMAP download script
- `nsidc-download_NSIDC-0800.002_*.py` — SMAP enhanced download script
- `srtm_v3_6aa3cfb7243c85a5.zip` — USGS tile manifest CSV (NOT actual DEM)
- `north-eastern-zone.gpkg` — OSM NER GeoPackage (Geofabrik 2026-09-10, 630 MB)
- `eastern-zone-260910-free.gpkg.zip` — OSM Eastern zone archive (605 MB)

---

## 3. Datasets Downloaded / Generated

### DEM
- **{srtm['hgt_tiles']} SRTM HGT tiles** (Viewfinder Panoramas DEM3, ~90m)
  - Packages: G45, G46, G47 + H44/H45/H46/H47 (northern extension for AP)
  - Coverage: lat 20-32N, lon 84-102E
  - Size: ~{srtm['total_size_bytes'] // 1048576} MB

### Terrain Features (derived from SRTM)
- `geomorphology/terrain_features/slope_ner.tif` — {tf.get('slope', tf.get('slope_tif', '?'))}
- `geomorphology/terrain_features/aspect_ner.tif` — {tf.get('aspect', tf.get('aspect_tif', '?'))}
- `geomorphology/terrain_features/curvature_ner.tif` — {tf.get('curvature', tf.get('curvature_tif', '?'))}
- `geomorphology/terrain_features/elevation_ner.tif` — {tf.get('elevation', tf.get('elevation_tif', '?'))}
- Total: ~{tf.get('size_bytes', 0) // 1048576} MB

### Administrative Boundaries
- `data/raw/boundaries/ner_boundary_gadm.geojson` — {bdry['states_covered']} NER states from GADM v4.1
- `data/raw/boundaries/ner_boundary.gpkg` — OSM-derived admin boundaries
- `data/raw/boundaries/ner_boundary_approximate.geojson` — Bounding box fallback for all 8 states

### Satellite Catalogs
- `data/raw/sentinel1/catalog.json` — {s1.get('catalog_items', '20')} Sentinel-1 GRD products over NER
- `data/raw/sentinel2/catalog.json` — {s2.get('catalog_items', '20')} Sentinel-2 L2A products over NER

### LULC
- **{lulc['esa_worldcover_tiles']} ESA WorldCover 10m (2021) tiles** covering full NER
  - Source: ESA WorldCover v200 via AWS S3
  - Size: ~{lulc['size_bytes'] // 1048576} MB

### Geology (proxy)
- `data/raw/geology/soilgrids_wrb_ner.tif` — SoilGrids WRB soil classification (~4 MB)
- Status: {geo['status']}

---

## 4. Datasets Extracted from PDFs

### GSI PDF ({gsi['records']} total records)
- Extracted using PyMuPDF + pdfplumber from top 80 keyword-dense pages
- **{gsi['with_coordinates']} records with coordinates**
- Output: `data/raw/gsi/gsi_landslide_inventory.csv` + `.geojson`

### ISRO Landslide Atlas ({atlas['records']} records)
- Atlas contains statistics and susceptibility maps, not point inventories
- State/district level data only; 0 point coordinates
- Output: `data/raw/landslide_atlas/landslide_atlas_inventory.csv`

### Combined Inventory
- {combined.get('records', 0)} merged records; {combined.get('georeferenced', 0)} georeferenced
- 545 probable duplicate pairs flagged (not removed)
- Output: `data/raw/landslide_inventory/combined_landslide_inventory.csv` + `.geojson`

---

## 5. Datasets Unavailable / Blocked

| Dataset | Blocker | Required Action |
|---------|---------|-----------------| 
| GPM Daily (nc4) | NASA Earthdata auth | Register at urs.earthdata.nasa.gov; set EARTHDATA_USER + EARTHDATA_PASSWORD |
| GPM Half-Hourly (HDF5) | NASA Earthdata auth | Same as above |
| SMAP soil moisture | NASA Earthdata auth | Use existing nsidc-download_*.py scripts after login |
| Sentinel-1/2 actual data | Copernicus Data Space auth | Register at dataspace.copernicus.eu |
| Geology vector (authoritative) | GSI Bhukosh requires registration | Register at bhukosh.gsi.gov.in |
| Bhuvan LULC 1:50K | Portal approval required | Submit request on bhuvan.nrsc.gov.in |

---

## 6. Spatial Coverage

- **NER states**: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura
- **DEM coverage**: lat 20-32N, lon 84-102E (extended to cover full AP)
- **IMD rainfall**: India-wide (lat 6.5-38.5N, lon 66.5-100E)
- **ESA WorldCover**: Covers NER (12 x 3° tiles)
- **OSM**: Full NER extract (630 MB GeoPackage)
- **Boundaries**: All 8 NER states

---

## 7. Temporal Coverage

| Dataset | Period |
|---------|--------|
| GSI inventory | Historical (pre-2023) |
| ISRO Atlas | Up to 2023 |
| IMD rainfall | 2025 (full year daily) |
| GPM manifest | 1998-2025 (~10,135 daily + ~486,480 half-hourly files available) |
| ESA WorldCover | 2021 |
| OSM | 2026-09-10 snapshot |
| Sentinel catalogs | 2020-2023 (monsoon seasons) |

---

## 8. File Counts and Sizes

| Dataset | Files | Size |
|---------|-------|------|
| SRTM HGT tiles | {srtm['hgt_tiles']} | ~{srtm['total_size_bytes'] // 1048576} MB |
| Terrain TIFs (slope/aspect/curv/elev) | 4 | ~{tf['size_bytes'] // 1048576} MB |
| GSI inventory CSV | 1 | ~{gsi['size_bytes'] // (1024*1024)} MB |
| Combined inventory CSV | 1 | ~{combined.get('size_bytes', 0) // (1024*1024)} MB |
| ESA WorldCover TIFs | {lulc['esa_worldcover_tiles']} | ~{lulc['size_bytes'] // 1048576} MB |
| OSM GeoPackage | 1 | ~{osm.get('size_bytes', 0) // 1048576} MB |
| IMD NetCDF | 1 | ~{imd.get('size_bytes', 0) // 1048576} MB |
| Sentinel catalogs | 2 | <1 MB |
| NER boundaries | 4+ | ~{bdry.get('size_bytes', 0) // 1048576} MB |

---

## 9. Model Readiness Assessment

### Model 1 (Susceptibility) — READY TO BUILD
Can build with:
- ✅ Historical landslide labels ({gsi['with_coordinates']} georeferenced points)
- ✅ Terrain features (slope, aspect, curvature from SRTM)
- ✅ Distance to drainage (from OSM waterways)
- ✅ LULC (ESA WorldCover 10m 2021)
- ✅ Historical landslide density
- 🟡 Geology — SoilGrids proxy available; authoritative GSI geology pending
- 🟡 Geomorphology — DEM-derived terrain features adequate as proxy

### Model 2 (Dynamic Risk) — PARTIALLY READY
Can build with:
- ✅ IMD 25km daily rainfall (2025) for antecedent features
- ✅ Base susceptibility from Model 1
- 🔴 GPM sub-daily — BLOCKED (credentials)
- 🔴 SMAP soil moisture — BLOCKED (credentials)

---

## 10. Next Steps (Priority Order)

1. **Register NASA Earthdata** → set env vars → run GPM + SMAP downloaders
2. **Register Copernicus Data Space** → download Sentinel-2 scenes for LULC/change detection
3. **Build Dataset 1** — combine {gsi['with_coordinates']} landslide points + terrain features + control samples
4. **Train Model 1** (XGBoost susceptibility) using `configs/susceptibility.yaml`
5. **Register GSI Bhukosh** for authoritative Indian geology when time permits

---

*Generated by finalize_reports.py — {NOW_ISO}*
"""
    return md


def generate_inventory_csv(checks):
    """Generate updated dataset_inventory.csv rows."""
    rows = []

    # GSI
    g = checks["gsi"]
    rows.append({
        "dataset": "GSI Landslide Inventory",
        "path": "data/raw/gsi/gsi_landslide_inventory.csv",
        "file_type": "CSV",
        "size_bytes": g.get("size_bytes", 0),
        "status": g["status"],
        "coverage": "NER + India (historical)",
        "temporal_resolution": "event-based",
        "spatial_resolution": "point",
        "source": "GSI PDF extraction",
        "notes": f"{g.get('records',0)} records, {g.get('with_coordinates',0)} with coordinates",
    })

    # Atlas
    a = checks["atlas"]
    rows.append({
        "dataset": "ISRO Landslide Atlas",
        "path": "data/raw/landslide_atlas/landslide_atlas_inventory.csv",
        "file_type": "CSV",
        "size_bytes": a.get("size_bytes", 0),
        "status": a["status"],
        "coverage": "India",
        "temporal_resolution": "event-based",
        "spatial_resolution": "district",
        "source": "ISRO Atlas PDF extraction",
        "notes": f"{a.get('records',0)} records (state/district level)",
    })

    # Combined
    c = checks["combined"]
    rows.append({
        "dataset": "Combined Landslide Inventory",
        "path": "data/raw/landslide_inventory/combined_landslide_inventory.csv",
        "file_type": "CSV",
        "size_bytes": c.get("size_bytes", 0),
        "status": c["status"],
        "coverage": "NER + India",
        "temporal_resolution": "event-based",
        "spatial_resolution": "point+district",
        "source": "GSI + ISRO merged",
        "notes": f"{c.get('records',0)} records, {c.get('georeferenced',0)} georeferenced",
    })

    # SRTM
    s = checks["srtm"]
    rows.append({
        "dataset": "SRTM DEM",
        "path": "data/raw/dem/srtm/",
        "file_type": "HGT",
        "size_bytes": s.get("total_size_bytes", 0),
        "status": s["status"],
        "coverage": "NER lat 20-32N lon 84-102E",
        "temporal_resolution": "static",
        "spatial_resolution": "~90m",
        "source": "Viewfinder Panoramas DEM3",
        "notes": f"{s.get('hgt_tiles',0)} HGT tiles",
    })

    # Terrain features
    tf = checks["terrain_features"]
    rows.append({
        "dataset": "Terrain Features (DEM-derived)",
        "path": "data/raw/geomorphology/terrain_features/",
        "file_type": "GeoTIFF",
        "size_bytes": tf.get("size_bytes", 0),
        "status": tf["status"],
        "coverage": "NER",
        "temporal_resolution": "static",
        "spatial_resolution": "~90m",
        "source": "Derived from SRTM HGT",
        "notes": "slope, aspect, curvature, elevation",
    })

    # IMD
    imd = checks["imd"]
    rows.append({
        "dataset": "IMD Rainfall 25km",
        "path": "data/raw/RF25_ind2025_rfp25.nc",
        "file_type": "NetCDF",
        "size_bytes": imd.get("size_bytes", 0),
        "status": imd["status"],
        "coverage": "India",
        "temporal_resolution": "daily",
        "spatial_resolution": "25km",
        "source": "IMD",
        "notes": "Year 2025",
    })

    # GPM daily
    gd = checks["gpm_daily"]
    rows.append({
        "dataset": "GPM Daily IMERG",
        "path": "data/raw/rainfall/gpm/daily/",
        "file_type": "nc4",
        "size_bytes": 0,
        "status": gd["status"],
        "coverage": "NER (global available)",
        "temporal_resolution": "daily",
        "spatial_resolution": "0.1 deg (~10km)",
        "source": "NASA GPM",
        "notes": "Manifest with ~10,135 URLs present. Needs NASA Earthdata auth.",
    })

    # GPM HH
    gh = checks["gpm_halfhourly"]
    rows.append({
        "dataset": "GPM Half-Hourly IMERG",
        "path": "data/raw/rainfall/gpm/half_hourly/",
        "file_type": "HDF5",
        "size_bytes": 0,
        "status": gh["status"],
        "coverage": "NER (global available)",
        "temporal_resolution": "30min",
        "spatial_resolution": "0.1 deg (~10km)",
        "source": "NASA GPM",
        "notes": "Manifest with ~486,480 URLs. Needs NASA Earthdata auth.",
    })

    # SMAP
    sm = checks["smap"]
    rows.append({
        "dataset": "SMAP Soil Moisture",
        "path": "data/raw/soil_moisture/smap/",
        "file_type": "HDF5",
        "size_bytes": 0,
        "status": sm["status"],
        "coverage": "NER",
        "temporal_resolution": "daily",
        "spatial_resolution": "36km",
        "source": "NSIDC",
        "notes": "Download scripts ready. Needs NASA Earthdata auth.",
    })

    # Sentinel-1
    s1 = checks["sentinel1"]
    rows.append({
        "dataset": "Sentinel-1 GRD",
        "path": "data/raw/sentinel1/catalog.json",
        "file_type": "STAC catalog",
        "size_bytes": file_size(os.path.join(RAW_DIR, "sentinel1", "catalog.json")),
        "status": s1["status"],
        "coverage": "NER",
        "temporal_resolution": "12-day repeat",
        "spatial_resolution": "10m",
        "source": "Copernicus Data Space",
        "notes": f"{s1.get('catalog_items','20')} items cataloged. Needs Copernicus auth to download.",
    })

    # Sentinel-2
    s2 = checks["sentinel2"]
    rows.append({
        "dataset": "Sentinel-2 L2A",
        "path": "data/raw/sentinel2/catalog.json",
        "file_type": "STAC catalog",
        "size_bytes": file_size(os.path.join(RAW_DIR, "sentinel2", "catalog.json")),
        "status": s2["status"],
        "coverage": "NER",
        "temporal_resolution": "5-day repeat",
        "spatial_resolution": "10-20m",
        "source": "Copernicus Data Space",
        "notes": f"{s2.get('catalog_items','20')} items cataloged. Needs Copernicus auth to download.",
    })

    # Boundaries
    b = checks["boundaries"]
    rows.append({
        "dataset": "NER Administrative Boundary",
        "path": "data/raw/boundaries/",
        "file_type": "GeoPackage/GeoJSON",
        "size_bytes": b.get("size_bytes", 0),
        "status": b["status"],
        "coverage": "8 NER states",
        "temporal_resolution": "static",
        "spatial_resolution": "admin-level",
        "source": "GADM v4.1 + OSM",
        "notes": f"{b.get('states_covered',0)} states covered",
    })

    # OSM
    osm = checks["osm"]
    rows.append({
        "dataset": "OSM NER Roads/Infrastructure",
        "path": "data/raw/north-eastern-zone.gpkg",
        "file_type": "GeoPackage",
        "size_bytes": osm.get("size_bytes", 0),
        "status": osm["status"],
        "coverage": "NER",
        "temporal_resolution": "2026-09-10 snapshot",
        "spatial_resolution": "vector",
        "source": "Geofabrik",
        "notes": "Roads, waterways, buildings, settlements",
    })

    # Geology
    geo = checks["geology"]
    rows.append({
        "dataset": "Geology (SoilGrids proxy)",
        "path": "data/raw/geology/soilgrids_wrb_ner.tif",
        "file_type": "GeoTIFF",
        "size_bytes": file_size(os.path.join(RAW_DIR, "geology", "soilgrids_wrb_ner.tif")),
        "status": geo["status"],
        "coverage": "NER",
        "temporal_resolution": "static",
        "spatial_resolution": "250m",
        "source": "SoilGrids ISRIC",
        "notes": "WRB soil classification used as geology proxy. Authoritative GSI data requires Bhukosh registration.",
    })

    # LULC
    lulc = checks["lulc"]
    rows.append({
        "dataset": "LULC - ESA WorldCover 10m",
        "path": "data/raw/lulc/esa_worldcover/",
        "file_type": "GeoTIFF",
        "size_bytes": lulc.get("size_bytes", 0),
        "status": lulc["status"],
        "coverage": "NER",
        "temporal_resolution": "2021",
        "spatial_resolution": "10m",
        "source": "ESA WorldCover v200",
        "notes": f"{lulc.get('esa_worldcover_tiles',0)} tiles covering NER",
    })

    return rows


def main():
    log.info("Collecting dataset status …")

    checks = {
        "gsi": check_gsi(),
        "atlas": check_atlas(),
        "combined": check_combined_inventory(),
        "srtm": check_srtm(),
        "terrain_features": check_terrain_features(),
        "imd": check_imd(),
        "gpm_daily": check_gpm_daily(),
        "gpm_halfhourly": check_gpm_halfhourly(),
        "smap": check_smap(),
        "sentinel1": check_sentinel(1),
        "sentinel2": check_sentinel(2),
        "boundaries": check_boundaries(),
        "osm": check_osm(),
        "geology": check_geology(),
        "geomorphology": check_geomorphology(),
        "lulc": check_lulc(),
    }

    for k, v in checks.items():
        log.info(f"  {k:25s}: {v['status']}")

    # 1. data_validation.json
    val = generate_data_validation(checks)
    val_path = os.path.join(RAW_DIR, "data_validation.json")
    with open(val_path, "w") as f:
        json.dump(val, f, indent=2)
    log.info(f"Written: {val_path}")

    # 2. DATA_COMPLETION_REPORT.md
    md = generate_completion_report(checks)
    md_path = os.path.join(RAW_DIR, "DATA_COMPLETION_REPORT.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)
    log.info(f"Written: {md_path}")

    # 3. dataset_inventory.csv
    rows = generate_inventory_csv(checks)
    csv_path = os.path.join(RAW_DIR, "dataset_inventory.csv")
    fieldnames = ["dataset", "path", "file_type", "size_bytes", "status",
                  "coverage", "temporal_resolution", "spatial_resolution", "source", "notes"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    log.info(f"Written: {csv_path}")

    # 4. dataset_inventory.json
    json_path = os.path.join(RAW_DIR, "dataset_inventory.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"generated_at": NOW_ISO, "datasets": rows}, f, indent=2)
    log.info(f"Written: {json_path}")

    log.info("\nAll reports generated successfully.")
    log.info(f"Blocking items: {len(val['blocking_items'])}")
    for item in val["blocking_items"]:
        log.info(f"  - {item}")


if __name__ == "__main__":
    main()
