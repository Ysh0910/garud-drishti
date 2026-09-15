"""
download_glim_v2.py
-------------------
Download GLIM (Global Lithological Map v1.2 / Hartmann & Moosdorf 2012)
and clip it to the NER bounding box.

Tries multiple known hosting locations in order.

Output:
    data/raw/geology/glim_ner.gpkg      (vector, if available)
    data/raw/geology/glim_ner.tif       (rasterised fallback, if needed)
    data/raw/geology/glim_download_report.json  (updated)

Usage:
    python scripts/download_glim_v2.py
"""

import os
import sys
import json
import time
import zipfile
import shutil
import tempfile
import logging
import datetime
import urllib.request
import urllib.error

# ── configuration ──────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

GEOLOGY_DIR = os.path.join(PROJECT_ROOT, "data", "raw", "geology")
REPORT_PATH = os.path.join(GEOLOGY_DIR, "glim_download_report_v2.json")

# NER bounding box (lon_min, lat_min, lon_max, lat_max)
NER_BBOX = (87.0, 20.0, 98.0, 30.5)

# Candidate sources – tried in order
GLIM_SOURCES = [
    # Zenodo record 3653428 – multiple filenames tried
    {
        "name": "Zenodo 3653428 – glim_wgs84_v1.2.1.zip",
        "url": "https://zenodo.org/record/3653428/files/glim_wgs84_v1.2.1.zip",
    },
    {
        "name": "Zenodo 3653428 – GLIM_v1.zip",
        "url": "https://zenodo.org/record/3653428/files/GLIM_v1.zip",
    },
    {
        "name": "Zenodo 3653428 – lithology_glim.zip",
        "url": "https://zenodo.org/record/3653428/files/lithology_glim.zip",
    },
    # Alternative Zenodo DOI path
    {
        "name": "Zenodo DOI redirect – glim_wgs84_v1.2.1.zip",
        "url": "https://zenodo.org/records/3653428/files/glim_wgs84_v1.2.1.zip",
    },
    # OpenTopography / HydroSHEDS host
    {
        "name": "HydroSHEDS – glim_v1.2_lithology",
        "url": "https://hydrosheds.org/images/inpages/geol_l07b_1m_s0_2007oct.zip",
    },
    # GFZ Potsdam (original authors)
    {
        "name": "GFZ Potsdam GLIM",
        "url": "https://dataservices.gfz-potsdam.de/panmetaworks/review/6e1b73b6c8cc3cb0a9bcec2c30b0b3e7daee5b1028f3d08a63d7f5bd4e23ef2a/",
    },
    # Figshare / alternative GLIM mirror
    {
        "name": "Figshare GLIM v1",
        "url": "https://figshare.com/ndownloader/files/3551370",
    },
    # BGS OneGeology – WCS endpoint for lithology (raster fallback)
    {
        "name": "BGS OneGeology WMS GetMap – NER bbox raster",
        "url": (
            "http://ogc.bgs.ac.uk/cgi-bin/BGS_1GE_Bedrock_and_Structural_Geology/wms"
            "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
            "&BBOX=20,87,30.5,98&CRS=EPSG:4326&WIDTH=1100&HEIGHT=1050"
            "&LAYERS=GBG&STYLES=&FORMAT=image/geotiff"
        ),
        "is_raster": True,
        "output_name": "geology_bgs_ner.tif",
    },
    # USGS MRDS – North American only, skip
    # macrostrat API – JSON tile service
    {
        "name": "Macrostrat tiles API – NER geology JSON",
        "url": "https://macrostrat.org/api/geologic_units/map?lat=25&lng=92&z=6",
        "is_api": True,
    },
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def http_get(url, timeout=60):
    """Fetch URL, return (bytes, content_type) or raise."""
    headers = {"User-Agent": "garud-drishti-dataset-agent/1.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(), resp.headers.get("Content-Type", "")


def try_download_zip(source, dest_dir):
    """Download a ZIP, extract, look for shapefiles/gpkg."""
    log.info(f"Trying: {source['name']}  →  {source['url']}")
    try:
        data, ctype = http_get(source["url"])
    except Exception as e:
        log.warning(f"  FAILED: {e}")
        return None, str(e)

    if len(data) < 1000:
        msg = f"Response too small ({len(data)} bytes), likely error page"
        log.warning(f"  {msg}")
        return None, msg

    # Save to temp file
    tmp = tempfile.mktemp(suffix=".zip")
    try:
        with open(tmp, "wb") as f:
            f.write(data)

        if not zipfile.is_zipfile(tmp):
            msg = "Response is not a valid ZIP file"
            log.warning(f"  {msg}")
            return None, msg

        with zipfile.ZipFile(tmp) as zf:
            names = zf.namelist()
            log.info(f"  ZIP contains {len(names)} files: {names[:10]}")
            zf.extractall(dest_dir)

        # Find shapefiles or gpkg
        found = []
        for root, dirs, files in os.walk(dest_dir):
            for fn in files:
                if fn.lower().endswith((".shp", ".gpkg", ".geojson")):
                    found.append(os.path.join(root, fn))

        return found, None
    except Exception as e:
        log.warning(f"  ZIP extraction failed: {e}")
        return None, str(e)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def try_download_raster(source, dest_dir):
    """Download a direct raster (TIF/PNG) response."""
    log.info(f"Trying raster: {source['name']}")
    try:
        data, ctype = http_get(source["url"], timeout=120)
    except Exception as e:
        log.warning(f"  FAILED: {e}")
        return None, str(e)

    if len(data) < 1000:
        return None, f"Too small ({len(data)} bytes)"

    out_name = source.get("output_name", "geology_raster_ner.tif")
    out_path = os.path.join(dest_dir, out_name)
    with open(out_path, "wb") as f:
        f.write(data)
    log.info(f"  Saved {len(data):,} bytes → {out_path}")
    return out_path, None


def try_macrostrat_api(dest_dir):
    """Query Macrostrat for NER geology and save as GeoJSON."""
    log.info("Trying Macrostrat API for NER geology …")
    try:
        # Sample a grid of points over NER and collect unique units
        results = []
        lats = [22, 24, 25, 26, 27, 28]
        lons = [89, 91, 93, 95, 97]
        for lat in lats:
            for lon in lons:
                url = f"https://macrostrat.org/api/geologic_units/map?lat={lat}&lng={lon}&z=6&format=geojson"
                try:
                    data, _ = http_get(url, timeout=30)
                    obj = json.loads(data)
                    if obj.get("success") and obj["success"].get("data"):
                        results.extend(obj["success"]["data"])
                    time.sleep(0.3)
                except Exception as e:
                    log.warning(f"    Point ({lat},{lon}) failed: {e}")

        if not results:
            return None, "No Macrostrat data returned"

        # Deduplicate by map_id
        seen = set()
        unique = []
        for r in results:
            mid = r.get("map_id") or r.get("source_id")
            if mid not in seen:
                seen.add(mid)
                unique.append(r)

        out_path = os.path.join(dest_dir, "macrostrat_geology_ner.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"type": "macrostrat_geology_points", "records": unique}, f, indent=2)

        log.info(f"  Macrostrat: {len(unique)} unique units → {out_path}")
        return out_path, None
    except Exception as e:
        log.warning(f"  Macrostrat API failed: {e}")
        return None, str(e)


def clip_shapefile_to_ner(shp_path, out_gpkg):
    """Use geopandas to clip shapefile to NER bbox."""
    try:
        import geopandas as gpd
        from shapely.geometry import box as shapely_box

        log.info(f"Clipping {os.path.basename(shp_path)} to NER bbox …")
        gdf = gpd.read_file(shp_path)
        log.info(f"  Original CRS: {gdf.crs}, rows: {len(gdf)}")

        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        elif str(gdf.crs).upper() != "EPSG:4326":
            gdf = gdf.to_crs("EPSG:4326")

        ner_box = shapely_box(*NER_BBOX)
        clipped = gdf[gdf.geometry.intersects(ner_box)].copy()
        clipped = clipped.clip(ner_box)

        log.info(f"  Clipped rows: {len(clipped)}")
        if len(clipped) == 0:
            return None, "No features intersect NER bbox after clipping"

        clipped.to_file(out_gpkg, driver="GPKG")
        log.info(f"  Saved: {out_gpkg}")
        return out_gpkg, None
    except ImportError:
        return None, "geopandas not available – cannot clip shapefile"
    except Exception as e:
        return None, f"Clipping failed: {e}"


def main():
    os.makedirs(GEOLOGY_DIR, exist_ok=True)

    report = {
        "script": "download_glim_v2.py",
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "ner_bbox": NER_BBOX,
        "attempts": [],
        "status": "FAILED",
        "files_created": [],
        "notes": [],
    }

    glim_gpkg = os.path.join(GEOLOGY_DIR, "glim_ner.gpkg")
    geology_tif = os.path.join(GEOLOGY_DIR, "geology_ner.tif")

    # Skip if output already exists
    if os.path.exists(glim_gpkg) and os.path.getsize(glim_gpkg) > 10000:
        log.info(f"GLIM NER GPKG already exists ({os.path.getsize(glim_gpkg):,} bytes), skipping download.")
        report["status"] = "ALREADY_PRESENT"
        report["files_created"].append(glim_gpkg)
        with open(REPORT_PATH, "w") as f:
            json.dump(report, f, indent=2)
        return

    # ── Try each source ────────────────────────────────────────────────────────
    tmp_dir = tempfile.mkdtemp(prefix="glim_")
    success = False

    for source in GLIM_SOURCES:
        attempt = {"source": source["name"], "url": source["url"]}

        if source.get("is_api"):
            out_path, err = try_macrostrat_api(GEOLOGY_DIR)
            if out_path:
                attempt["status"] = "DOWNLOADED"
                attempt["file"] = out_path
                report["attempts"].append(attempt)
                report["files_created"].append(out_path)
                report["status"] = "PARTIAL_API_ONLY"
                report["notes"].append(
                    "Macrostrat geology API point samples obtained. Not a full vector layer."
                )
                success = True  # partial success – keep trying for vector
                continue
            else:
                attempt["status"] = f"FAILED: {err}"
                report["attempts"].append(attempt)
                continue

        if source.get("is_raster"):
            out_path, err = try_download_raster(source, GEOLOGY_DIR)
            if out_path:
                attempt["status"] = "DOWNLOADED"
                attempt["file"] = out_path
                report["attempts"].append(attempt)
                report["files_created"].append(out_path)
                if not success:
                    report["status"] = "RASTER_ONLY"
                continue
            else:
                attempt["status"] = f"FAILED: {err}"
                report["attempts"].append(attempt)
                continue

        # ZIP download
        extract_dir = os.path.join(tmp_dir, f"attempt_{len(report['attempts'])}")
        os.makedirs(extract_dir, exist_ok=True)
        found_files, err = try_download_zip(source, extract_dir)

        if not found_files:
            attempt["status"] = f"FAILED: {err}"
            report["attempts"].append(attempt)
            time.sleep(1)
            continue

        attempt["status"] = "EXTRACTED"
        attempt["found_files"] = found_files
        report["attempts"].append(attempt)

        # Try to clip each found file
        for shp_path in found_files:
            out_gpkg, clip_err = clip_shapefile_to_ner(shp_path, glim_gpkg)
            if out_gpkg:
                log.info(f"SUCCESS: GLIM clipped to NER → {glim_gpkg}")
                report["status"] = "SUCCESS"
                report["files_created"].append(glim_gpkg)
                report["source_used"] = source["name"]
                success = True
                break

        if success and report["status"] == "SUCCESS":
            break

    # ── Fallback: try OpenLandMap geology raster ───────────────────────────────
    if not success or report["status"] != "SUCCESS":
        log.info("Vector GLIM not obtained. Trying OpenLandMap geology raster …")
        # OpenLandMap provides parent material / lithology class rasters
        openlandmap_urls = [
            {
                "name": "OpenLandMap Lithology (USGS) 250m NER bbox",
                "url": (
                    "https://openlandmap.org/api/v1/map/landform"
                    "?bbox=87,20,98,30.5&width=440&height=420&format=tif"
                ),
                "output_name": "openlandmap_lithology_ner.tif",
                "is_raster": True,
            },
            {
                "name": "SoilGrids parent material WCS",
                "url": (
                    "https://maps.isric.org/mapserv?map=/map/wrb.map"
                    "&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
                    "&COVERAGEID=MostProbable"
                    "&FORMAT=image/tiff"
                    "&SUBSET=X(87,98)&SUBSET=Y(20,30.5)"
                    "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
                    "&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
                ),
                "output_name": "soilgrids_parent_material_ner.tif",
                "is_raster": True,
            },
        ]
        for src in openlandmap_urls:
            attempt = {"source": src["name"], "url": src["url"]}
            out_path, err = try_download_raster(src, GEOLOGY_DIR)
            if out_path and os.path.getsize(out_path) > 10000:
                attempt["status"] = "DOWNLOADED"
                attempt["file"] = out_path
                report["attempts"].append(attempt)
                report["files_created"].append(out_path)
                if report["status"] not in ("SUCCESS",):
                    report["status"] = "RASTER_PROXY"
                report["notes"].append(
                    f"Using {src['name']} as geology proxy. Not a formal lithology vector layer."
                )
            else:
                attempt["status"] = f"FAILED: {err}"
                report["attempts"].append(attempt)

    # ── Check SoilGrids TIF already present ───────────────────────────────────
    soilgrids_existing = os.path.join(GEOLOGY_DIR, "soilgrids_wrb_ner.tif")
    if os.path.exists(soilgrids_existing) and os.path.getsize(soilgrids_existing) > 100000:
        if report["status"] not in ("SUCCESS", "RASTER_PROXY"):
            report["status"] = "PROXY_ALREADY_PRESENT"
        report["notes"].append(
            f"SoilGrids WRB soil classification already present: {soilgrids_existing} "
            f"({os.path.getsize(soilgrids_existing):,} bytes). "
            "This is a geology proxy adequate for ML feature engineering."
        )
        if soilgrids_existing not in report["files_created"]:
            report["files_created"].append(soilgrids_existing)

    # ── Cleanup temp dir ──────────────────────────────────────────────────────
    try:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception:
        pass

    # ── Write report ──────────────────────────────────────────────────────────
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    log.info(f"Report written: {REPORT_PATH}")
    log.info(f"Final status: {report['status']}")
    log.info(f"Files created: {report['files_created']}")


if __name__ == "__main__":
    main()
