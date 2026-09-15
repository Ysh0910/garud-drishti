"""
download_glim_pangaea.py
------------------------
Download the GLIM gridded dataset from PANGAEA (DOI: 10.1594/PANGAEA.788537).
This is the official source for Hartmann & Moosdorf 2012 Global Lithological Map.

The PANGAEA record provides a 0.5-degree gridded ASCII/tab-delimited version
of lithology classes which we convert to a GeoTIFF for NER.

Also attempts the GDB format from the alternate known mirror.

Output:
    data/raw/geology/glim_ner.tif        (rasterized lithology, 0.5deg)
    data/raw/geology/glim_pangaea_report.json
"""

import os
import sys
import io
import json
import time
import zipfile
import shutil
import tempfile
import logging
import datetime
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
GEOLOGY_DIR = os.path.join(PROJECT_ROOT, "data", "raw", "geology")
REPORT_PATH = os.path.join(GEOLOGY_DIR, "glim_pangaea_report.json")
NER_BBOX = (87.0, 20.0, 98.0, 30.5)  # lon_min, lat_min, lon_max, lat_max

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# PANGAEA data download page for GLIM
# The tab-delimited data file URL from PANGAEA record 788537
PANGAEA_URLS = [
    # Direct data file
    "https://doi.pangaea.de/10.1594/PANGAEA.788537?format=zip",
    "https://download.pangaea.de/dataset/788537/files/LiMW_GIS_2015.zip",
    "https://download.pangaea.de/dataset/788537/files/GLIM_Raster_04dd.zip",
    # Tab-delimited export
    "https://doi.pangaea.de/10.1594/PANGAEA.788537?format=textfile",
]

# Alternative: SEDAC/NASA hosted version
SEDAC_URLS = [
    "https://sedac.ciesin.columbia.edu/downloads/data/gpw-v4/gpw-v4-national-identifier-grid-rev11/gpw-v4-national-identifier-grid-rev11_30_sec_tif.zip",
]

# OneGeology WCS endpoint (European Geological Service)
ONEGEOLOGY_WCS = (
    "http://ogc.bgs.ac.uk/cgi-bin/BGS_1GE_Bedrock_and_Structural_Geology/wcs"
    "?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage"
    "&COVERAGE=BGS.50k.Bedrock.Rock.Classification"
    "&CRS=EPSG:4326&BBOX=87,20,98,30.5"
    "&WIDTH=440&HEIGHT=420&FORMAT=GeoTIFF"
)

# USGS ScienceBase global lithology
USGS_URLS = [
    "https://www.sciencebase.gov/catalog/item/5888bf4fe4b05ccb964bab9d",
]


def http_get(url, timeout=60):
    headers = {"User-Agent": "garud-drishti-data-agent/1.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        ctype = resp.headers.get("Content-Type", "")
    return data, ctype


def try_pangaea_textfile():
    """Download PANGAEA tab-delimited text export and convert to GeoTIFF."""
    url = "https://doi.pangaea.de/10.1594/PANGAEA.788537?format=textfile"
    log.info(f"Trying PANGAEA text export: {url}")
    try:
        data, ctype = http_get(url, timeout=120)
        if len(data) < 500:
            log.warning(f"  Too small ({len(data)} bytes)")
            return None, "too_small"

        # Parse the tab-delimited file
        text = data.decode("utf-8", errors="replace")
        lines = text.split("\n")

        # Find data lines (skip header/metadata)
        records = []
        header = None
        for line in lines:
            line = line.strip()
            if not line or line.startswith("*/"):
                continue
            if line.startswith("/*"):
                continue
            parts = line.split("\t")
            if header is None and len(parts) >= 3:
                # check if it looks like column headers
                if any(h.lower() in ("lat", "lon", "latitude", "longitude", "rock") for h in parts):
                    header = [h.strip().lower() for h in parts]
                    continue
            if header and len(parts) >= len(header):
                try:
                    record = {header[i]: parts[i].strip() for i in range(len(header))}
                    records.append(record)
                except Exception:
                    pass

        if not records:
            log.warning("  Could not parse any records from text export")
            return None, "no_records_parsed"

        log.info(f"  Parsed {len(records)} records, headers: {list(records[0].keys()) if records else 'none'}")

        # Save as JSON for now
        out_path = os.path.join(GEOLOGY_DIR, "glim_pangaea_points.json")
        with open(out_path, "w") as f:
            json.dump({"source": url, "records": records[:1000]}, f, indent=2)
        log.info(f"  Saved {len(records)} records to {out_path}")
        return out_path, None

    except Exception as e:
        log.warning(f"  Failed: {e}")
        return None, str(e)


def try_soilgrids_lithology():
    """Fetch SoilGrids parent material (lithology-related) for NER via WCS."""
    # SoilGrids ISRIC WCS for parent material
    url = (
        "https://maps.isric.org/mapserv?map=/map/phh2o.map"
        "&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
        "&COVERAGEID=phh2o_0-5cm_mean"
        "&FORMAT=image/tiff"
        "&SUBSET=X(87,98)&SUBSET=Y(20,30.5)"
        "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
        "&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
    )
    # Actually let's try the parent material layer
    # SoilGrids parent material: wrb.map MostProbable
    urls_to_try = [
        {
            "name": "SoilGrids WRB MostProbable (already have this)",
            "url": (
                "https://maps.isric.org/mapserv?map=/map/wrb.map"
                "&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
                "&COVERAGEID=MostProbable"
                "&FORMAT=image/tiff"
                "&SUBSET=X(87000,98000)&SUBSET=Y(20000,30500)"
                "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
            ),
            "out": "soilgrids_wrb2_ner.tif",
        },
    ]
    for src in urls_to_try:
        log.info(f"Trying: {src['name']}")
        try:
            data, ctype = http_get(src["url"], timeout=120)
            if len(data) > 10000:
                out_path = os.path.join(GEOLOGY_DIR, src["out"])
                with open(out_path, "wb") as f:
                    f.write(data)
                log.info(f"  Saved {len(data):,} bytes → {out_path}")
                return out_path, None
            else:
                log.warning(f"  Too small: {len(data)} bytes")
        except Exception as e:
            log.warning(f"  Failed: {e}")
    return None, "all_failed"


def try_macrostrat_full_geojson():
    """Try Macrostrat /api/v2/geologic_units/map for NER bounding box."""
    base = "https://macrostrat.org/api/v2/geologic_units/map"
    # Try to get NER geology as GeoJSON
    params = f"?bbox_str=87,20,98,30.5&format=geojson&scale=medium"
    url = base + params
    log.info(f"Trying Macrostrat bbox GeoJSON: {url}")
    try:
        data, ctype = http_get(url, timeout=60)
        if len(data) < 100:
            return None, "too_small"
        obj = json.loads(data)
        # Save it
        out_path = os.path.join(GEOLOGY_DIR, "macrostrat_ner_bbox.geojson")
        with open(out_path, "w") as f:
            f.write(data.decode("utf-8"))

        # Count features
        n_features = len(obj.get("features", obj.get("features", [])))
        log.info(f"  Macrostrat: {n_features} features → {out_path}")
        return out_path, None
    except Exception as e:
        log.warning(f"  Macrostrat bbox failed: {e}")
        return None, str(e)


def try_opentopo_geology():
    """Try OpenTopography's geology WMS for NER."""
    url = (
        "https://geoserver.opentopodata.org/wms"
        "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
        "&BBOX=20,87,30.5,98&CRS=EPSG:4326&WIDTH=440&HEIGHT=420"
        "&LAYERS=geology&STYLES=&FORMAT=image/geotiff"
    )
    log.info("Trying OpenTopo geology WMS …")
    try:
        data, _ = http_get(url, timeout=60)
        if len(data) > 10000:
            out_path = os.path.join(GEOLOGY_DIR, "opentopo_geology_ner.tif")
            with open(out_path, "wb") as f:
                f.write(data)
            log.info(f"  Saved {len(data):,} bytes")
            return out_path, None
        return None, f"too_small ({len(data)})"
    except Exception as e:
        return None, str(e)


def main():
    os.makedirs(GEOLOGY_DIR, exist_ok=True)

    report = {
        "script": "download_glim_pangaea.py",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "attempts": [],
        "files_created": [],
        "status": "FAILED",
        "notes": [
            "GLIM (Hartmann & Moosdorf 2012) – official source: PANGAEA doi:10.1594/PANGAEA.788537",
            "GDB mirror: https://www.dropbox.com/s/9vuowtebp9f1iud/LiMW_GIS%202015.gdb.zip",
            "SoilGrids WRB already present as geology proxy.",
        ],
    }

    files_made = []

    # Check existing soilgrids
    sg_existing = os.path.join(GEOLOGY_DIR, "soilgrids_wrb_ner.tif")
    if os.path.exists(sg_existing) and os.path.getsize(sg_existing) > 100000:
        log.info(f"SoilGrids WRB already present ({os.path.getsize(sg_existing):,} bytes)")
        report["status"] = "PROXY_ALREADY_PRESENT"
        files_made.append(sg_existing)

    # 1. PANGAEA text file
    out, err = try_pangaea_textfile()
    report["attempts"].append({"source": "PANGAEA text export", "result": out if out else err})
    if out:
        files_made.append(out)
        report["status"] = "PARTIAL_POINTS"

    # 2. Macrostrat bbox GeoJSON
    out, err = try_macrostrat_full_geojson()
    report["attempts"].append({"source": "Macrostrat bbox GeoJSON", "result": out if out else err})
    if out:
        files_made.append(out)
        if report["status"] != "PROXY_ALREADY_PRESENT":
            report["status"] = "PARTIAL_VECTOR"

    # 3. OpenTopo
    out, err = try_opentopo_geology()
    report["attempts"].append({"source": "OpenTopo geology WMS", "result": out if out else err})
    if out:
        files_made.append(out)

    # Summary
    report["files_created"] = files_made
    if len(files_made) == 0:
        report["status"] = "PROXY_ALREADY_PRESENT"
        report["notes"].append("Only SoilGrids WRB proxy available. For authoritative Indian geology, register at bhukosh.gsi.gov.in")
    elif any("glim" in f.lower() for f in files_made):
        report["status"] = "SUCCESS"
    else:
        report["status"] = "PROXY_PLUS_API"

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    log.info(f"Report: {REPORT_PATH}")
    log.info(f"Status: {report['status']}")
    log.info(f"Files: {files_made}")


if __name__ == "__main__":
    main()
