"""
extend_srtm_coverage.py
-----------------------
Download additional Viewfinder DEM3 packages to extend SRTM coverage
to northern NER (Arunachal Pradesh extends to ~30°N).

Currently tiles go to lat 27N (packages G45, G46, G47).
Add packages H44, H45, H46, H47 which cover lat 28-32N.

Also downloads any missing tiles from lat 20-28N if needed.

Output:
    data/raw/dem/srtm/<package>/  (HGT files, grouped by package)
    data/raw/dem/srtm/srtm_extended_coverage_report.json
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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SRTM_DIR = os.path.join(PROJECT_ROOT, "data", "raw", "dem", "srtm")
REPORT_PATH = os.path.join(SRTM_DIR, "srtm_extended_coverage_report.json")

# Viewfinder Panoramas DEM3 base URL
VFP_BASE = "http://viewfinderpanoramas.org/dem3/"

# NER bbox for filtering tiles
NER_LAT_MIN, NER_LAT_MAX = 20, 32   # extended to cover AP
NER_LON_MIN, NER_LON_MAX = 87, 98

# Additional packages needed for northern NER (AP goes to ~29°N)
# Package naming: G=lat20-30, H=lat28-32 (approx)
# lon 84-90E = 45, lon 90-96E = 46, lon 96-102E = 47, lon 78-84E = 44
PACKAGES_TO_CHECK = [
    # Already downloaded (may exist)
    {"name": "G45", "lat_range": (20, 30), "lon_range": (84, 90)},
    {"name": "G46", "lat_range": (20, 30), "lon_range": (90, 96)},
    {"name": "G47", "lat_range": (20, 30), "lon_range": (96, 102)},
    # Northern extension
    {"name": "H44", "lat_range": (28, 32), "lon_range": (78, 84)},
    {"name": "H45", "lat_range": (28, 32), "lon_range": (84, 90)},
    {"name": "H46", "lat_range": (28, 32), "lon_range": (90, 96)},
    {"name": "H47", "lat_range": (28, 32), "lon_range": (96, 102)},
    # Eastern extension (Nagaland/Manipur/Mizoram lower lat)
    {"name": "J44", "lat_range": (16, 24), "lon_range": (78, 84)},
    {"name": "J45", "lat_range": (16, 24), "lon_range": (84, 90)},
    {"name": "J46", "lat_range": (16, 24), "lon_range": (90, 96)},
    {"name": "J47", "lat_range": (16, 24), "lon_range": (96, 102)},
    {"name": "K44", "lat_range": (12, 20), "lon_range": (78, 84)},
    {"name": "K45", "lat_range": (12, 20), "lon_range": (84, 90)},
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def count_hgt_files(directory):
    """Count .hgt files in directory tree."""
    count = 0
    for root, _, files in os.walk(directory):
        for fn in files:
            if fn.upper().endswith(".HGT"):
                count += 1
    return count


def get_existing_tiles():
    """Return set of existing HGT tile names (without extension)."""
    existing = set()
    for root, _, files in os.walk(SRTM_DIR):
        for fn in files:
            if fn.upper().endswith(".HGT"):
                existing.add(fn.upper().replace(".HGT", ""))
    return existing


def download_package(pkg_name, dest_parent):
    """Download a Viewfinder DEM3 package ZIP and extract HGT files."""
    url = f"{VFP_BASE}{pkg_name}.zip"
    pkg_dir = os.path.join(dest_parent, pkg_name)
    os.makedirs(pkg_dir, exist_ok=True)

    # Check if already downloaded
    existing_hgt = [f for f in os.listdir(pkg_dir) if f.upper().endswith(".HGT")]
    if len(existing_hgt) > 0:
        log.info(f"  {pkg_name}: {len(existing_hgt)} HGT tiles already present, skipping download")
        return existing_hgt, "ALREADY_PRESENT"

    log.info(f"  Downloading {url} …")
    headers = {"User-Agent": "garud-drishti-dataset-agent/1.0"}
    req = urllib.request.Request(url, headers=headers)

    tmp_zip = tempfile.mktemp(suffix=".zip")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            size = 0
            with open(tmp_zip, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    size += len(chunk)
        log.info(f"  Downloaded {size:,} bytes")

        if not zipfile.is_zipfile(tmp_zip):
            log.warning(f"  {pkg_name}: Response is not a valid ZIP")
            return [], "NOT_ZIP"

        with zipfile.ZipFile(tmp_zip) as zf:
            hgt_files = [n for n in zf.namelist() if n.upper().endswith(".HGT")]
            log.info(f"  ZIP contains {len(hgt_files)} HGT files")
            zf.extractall(pkg_dir)

        # Move HGT files to pkg_dir root (flatten subfolders)
        for root, _, files in os.walk(pkg_dir):
            for fn in files:
                if fn.upper().endswith(".HGT") and root != pkg_dir:
                    src = os.path.join(root, fn)
                    dst = os.path.join(pkg_dir, fn)
                    if not os.path.exists(dst):
                        shutil.move(src, dst)

        final_hgts = [f for f in os.listdir(pkg_dir) if f.upper().endswith(".HGT")]
        log.info(f"  {pkg_name}: {len(final_hgts)} HGT tiles extracted")
        return final_hgts, "DOWNLOADED"

    except urllib.error.HTTPError as e:
        log.warning(f"  {pkg_name}: HTTP {e.code} – {e.reason}")
        return [], f"HTTP_{e.code}"
    except urllib.error.URLError as e:
        log.warning(f"  {pkg_name}: {e.reason}")
        return [], str(e.reason)
    except Exception as e:
        log.warning(f"  {pkg_name}: {e}")
        return [], str(e)
    finally:
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)


def tiles_covering_ner(pkg):
    """Check if package bbox overlaps NER bbox."""
    p_lat_min, p_lat_max = pkg["lat_range"]
    p_lon_min, p_lon_max = pkg["lon_range"]
    # overlap check
    return not (p_lat_max <= NER_LAT_MIN or p_lat_min >= NER_LAT_MAX or
                p_lon_max <= NER_LON_MIN or p_lon_min >= NER_LON_MAX)


def main():
    os.makedirs(SRTM_DIR, exist_ok=True)

    existing_before = get_existing_tiles()
    log.info(f"Existing HGT tiles before run: {len(existing_before)}")

    report = {
        "script": "extend_srtm_coverage.py",
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "source": "Viewfinder Panoramas DEM3",
        "source_url": VFP_BASE,
        "ner_bbox": [NER_LAT_MIN, NER_LON_MIN, NER_LAT_MAX, NER_LON_MAX],
        "tiles_before": len(existing_before),
        "packages": [],
        "tiles_added": [],
        "status": "IN_PROGRESS",
    }

    new_tiles = []

    for pkg in PACKAGES_TO_CHECK:
        if not tiles_covering_ner(pkg):
            log.info(f"  {pkg['name']}: does not overlap NER bbox, skipping")
            continue

        log.info(f"Processing package {pkg['name']} (lat {pkg['lat_range']}, lon {pkg['lon_range']}) …")
        hgts, status = download_package(pkg["name"], SRTM_DIR)

        pkg_info = {
            "package": pkg["name"],
            "lat_range": pkg["lat_range"],
            "lon_range": pkg["lon_range"],
            "status": status,
            "tiles_count": len(hgts),
        }

        # Identify new tiles
        for hgt in hgts:
            tile_name = hgt.upper().replace(".HGT", "")
            if tile_name not in existing_before:
                new_tiles.append(tile_name)
                pkg_info.setdefault("new_tiles", []).append(hgt)

        report["packages"].append(pkg_info)

        if status == "DOWNLOADED":
            time.sleep(2)  # be polite to the server

    existing_after = get_existing_tiles()
    report["tiles_after"] = len(existing_after)
    report["tiles_added"] = new_tiles
    report["new_tiles_count"] = len(new_tiles)
    report["status"] = "COMPLETE"

    # Coverage summary
    ner_lats = range(NER_LAT_MIN, NER_LAT_MAX)
    ner_lons = range(NER_LON_MIN, NER_LON_MAX)
    expected_tiles = [f"N{lat:02d}E{lon:03d}" for lat in ner_lats for lon in ner_lons]
    covered = [t for t in expected_tiles if t in existing_after]
    missing = [t for t in expected_tiles if t not in existing_after]

    report["coverage"] = {
        "expected_ner_tiles": len(expected_tiles),
        "covered": len(covered),
        "missing_count": len(missing),
        "missing_tiles": missing[:20],  # first 20 only
        "coverage_pct": round(100 * len(covered) / max(len(expected_tiles), 1), 1),
    }

    log.info(f"\nSummary:")
    log.info(f"  Tiles before: {report['tiles_before']}")
    log.info(f"  Tiles after:  {report['tiles_after']}")
    log.info(f"  New tiles:    {len(new_tiles)}")
    log.info(f"  NER coverage: {len(covered)}/{len(expected_tiles)} = {report['coverage']['coverage_pct']}%")
    if missing:
        log.info(f"  Missing tiles: {missing[:10]} …")

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    log.info(f"Report written: {REPORT_PATH}")


if __name__ == "__main__":
    main()
