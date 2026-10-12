#!/usr/bin/env python3
"""
scripts/download_datasets.py
----------------------------
GARUD DRISHTI — On-Demand Dataset Acquisition & Verification Utility.

Provides an on-demand, selective downloader for external raw datasets used by
GARUD DRISHTI. This script does NOT run automatically during installation.

Standard development and deployment do NOT require downloading these files,
as precomputed model features and risk grids are tracked in data/final/ and data/processed/.
"""

import sys
import os
import argparse
from pathlib import Path
import urllib.request
import shutil

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = PROJECT_ROOT / "data" / "raw"

DATASET_CATALOG = {
    "osm_ner": {
        "name": "OpenStreetMap North Eastern Zone GeoPackage",
        "filename": "north-eastern-zone-260910-free.gpkg.zip",
        "url": "https://download.geofabrik.de/asia/india.html",
        "direct_download": False,
        "size_approx": "295 MB",
        "source": "Geofabrik / OpenStreetMap",
        "instructions": "Download the North Eastern Zone free GeoPackage zip from Geofabrik Asia repository and place in data/raw/."
    },
    "osm_eastern": {
        "name": "OpenStreetMap Eastern Zone GeoPackage",
        "filename": "eastern-zone-260910-free.gpkg.zip",
        "url": "https://download.geofabrik.de/asia/india.html",
        "direct_download": False,
        "size_approx": "605 MB",
        "source": "Geofabrik / OpenStreetMap",
        "instructions": "Download the Eastern Zone free GeoPackage zip from Geofabrik Asia repository and place in data/raw/."
    },
    "gsi_pdf": {
        "name": "GSI National Landslide Susceptibility Mapping Compendium",
        "filename": "GSI.pdf",
        "url": "https://bhusanket.gsi.gov.in/",
        "direct_download": False,
        "size_approx": "316 MB",
        "source": "Geological Survey of India (Bhusanket Portal)",
        "instructions": "Log in to Bhusanket Portal, download NLSM NER district landslide inventory reports, and save as data/raw/GSI.pdf."
    },
    "isro_atlas": {
        "name": "ISRO / NRSC Landslide Atlas of India 2023",
        "filename": "LandslideAtlas_2023.pdf",
        "url": "https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html",
        "direct_download": False,
        "size_approx": "64 MB",
        "source": "ISRO / National Remote Sensing Centre",
        "instructions": "Download the official Landslide Atlas of India (2023) publication PDF and place in data/raw/."
    },
    "imd_rainfall": {
        "name": "IMD Gridded Daily Rainfall NetCDF (0.25 deg)",
        "filename": "RF25_ind2025_rfp25.nc",
        "url": "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html",
        "direct_download": False,
        "size_approx": "25 MB",
        "source": "India Meteorological Department (IMD Pune CMPG)",
        "instructions": "Download 0.25-degree daily gridded NetCDF rainfall for India and place in data/raw/RF25_ind2025_rfp25.nc."
    },
    "nasa_gpm": {
        "name": "NASA GPM IMERG Precipitation Manifests",
        "filename": "subset_GPM_3IMERGDF_07_20260911_085145_.txt",
        "url": "https://search.earthdata.nasa.gov/",
        "direct_download": False,
        "size_approx": "1.3 MB - 68 MB",
        "source": "NASA Earthdata / GES DISC",
        "instructions": "Query GPM_3IMERGDF / GPM_3IMERGHH granules on NASA Earthdata Search and save link list in data/raw/."
    }
}


def check_status():
    print("=" * 72)
    print("  GARUD DRISHTI — RAW DATASET INVENTORY STATUS")
    print("=" * 72)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    all_present = True
    for key, info in DATASET_CATALOG.items():
        target = RAW_DIR / info["filename"]
        exists = target.exists()
        if exists:
            size_mb = round(target.stat().st_size / (1024 * 1024), 2)
            status_str = f"[PRESENT] ({size_mb} MB)"
        else:
            status_str = f"[MISSING] (Approx {info['size_approx']})"
            all_present = False

        print(f"[{key:12}] {info['name']}")
        print(f"               File: {info['filename']}")
        print(f"               Status: {status_str}")
        print(f"               Source: {info['source']}")
        print()

    print("=" * 72)
    print("NOTE: Missing raw datasets do NOT prevent running the server or dashboard.")
    print("Precomputed risk grids and models are already available in data/final/ and models/.")
    print("=" * 72)


def print_instructions(dataset_key):
    if dataset_key not in DATASET_CATALOG:
        print(f"Error: Unknown dataset key '{dataset_key}'. Available keys: {list(DATASET_CATALOG.keys())}")
        return

    info = DATASET_CATALOG[dataset_key]
    print(f"\nDataset: {info['name']}")
    print(f"Expected file: data/raw/{info['filename']}")
    print(f"Portal URL:    {info['url']}")
    print(f"Instructions:  {info['instructions']}\n")


def main():
    parser = argparse.ArgumentParser(
        description="GARUD DRISHTI On-Demand Dataset Acquisition Helper",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--status", action="store_true", help="Audit local presence of all raw datasets")
    parser.add_argument("--info", type=str, metavar="KEY", help="Print download instructions for a dataset key")

    args = parser.parse_args()

    if args.status:
        check_status()
    elif args.info:
        print_instructions(args.info)
    else:
        check_status()
        print("\nRun with --info <KEY> to see acquisition steps for any dataset.")


if __name__ == "__main__":
    main()
