# 📊 GARUD DRISHTI — Data Directory Architecture & Acquisition Guide

This directory houses the geospatial, meteorological, and observation datasets powering **GARUD DRISHTI**.

---

## 🚀 Quick Summary for Developers

**You do NOT need to download large raw datasets to run, test, or develop Garud Drishti.**

All models, precomputed feature datasets, and seed geometries necessary for development and deployment are **already committed to normal Git**:
- `data/final/susceptibility_dataset.csv` (393 KB): Cleaned static features for Model 1 (XGBoost Susceptibility).
- `data/final/dynamic_risk_dataset.csv` (422 KB): Rolling antecedent weather observations for Model 2 (Dynamic Risk).
- `data/processed/risk_grid_latest.geojson` (98 KB): Multi-horizon risk surface for all 85 monitored NER cells.
- `models/`: Pre-trained, versioned XGBoost models and TreeSHAP explainers.

The large raw files (~1.37 GB) previously tracked via Git LFS are **offline reference archives** used during initial feature extraction. They have been decoupled from Git to eliminate bandwidth costs.

---

## 📦 Large Raw Datasets Catalog

The table below documents each raw file, its authoritative public source, license, and purpose:

| File Name | Size | Authoritative Source | Download URL / Access | Purpose & Usage in Project |
| :--- | :--- | :--- | :--- | :--- |
| `GSI.pdf` | 316 MB | **Geological Survey of India (GSI)** | [GSI Bhusanket](https://bhusanket.gsi.gov.in/) | National Landslide Susceptibility Mapping compendium. Processed by `scripts/step3_extract_gsi_pdf.py` into `data/raw/gsi/gsi_landslide_inventory.geojson`. |
| `LandslideAtlas_2023.pdf` | 64 MB | **ISRO / NRSC** | [ISRO Landslide Atlas](https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html) | Landslide Atlas of India 2023 report. Processed by `scripts/step4_extract_atlas_pdf.py` into `data/raw/landslide_atlas/landslide_atlas_inventory.csv`. |
| `RF25_ind2025_rfp25.nc` | 25 MB | **India Meteorological Department (IMD)** | [IMD Pune CMPG Gridded Rainfall](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html) | High-resolution daily gridded rainfall NetCDF (0.25° × 0.25°). `ml/ingestion/providers/imd_provider.py` falls back gracefully to regional orographic models if absent. |
| `eastern-zone-260910-free.gpkg.zip` | 605 MB | **OpenStreetMap / Geofabrik** | [Geofabrik India Downloads](https://download.geofabrik.de/asia/india.html) | Regional OSM GeoPackage for Eastern India (roads, waterways, administrative boundaries). |
| `north-eastern-zone-260910-free.gpkg.zip` | 295 MB | **OpenStreetMap / Geofabrik** | [Geofabrik India Downloads](https://download.geofabrik.de/asia/india.html) | Regional OSM GeoPackage for North Eastern Region. State boundary extracted to `data/raw/boundaries/ner_boundary_from_osm.geojson`. |
| `srtm_v3_6aa3cfb7243c85a5.zip` | 367 KB | **USGS EarthExplorer / NASA** | [USGS EarthExplorer](https://earthexplorer.usgs.gov/) | Tile manifest zip for SRTM DEM. Derived 3 arc-second elevation tiles for NER are cached in `data/raw/dem/srtm/`. |
| `subset_GPM_3IMERGDF_07_*.txt` | 1.3 MB | **NASA Earthdata / GES DISC** | [NASA GPM Directory](https://gpm.nasa.gov/data/directory) | HTTP URL manifest for GPM IMERG Daily granules. Summary report preserved in `data/raw/rainfall/gpm/gpm_manifest_report.json`. |
| `subset_GPM_3IMERGHH_07_*.txt` | 68 MB | **NASA Earthdata / GES DISC** | [NASA Earthdata Search](https://search.earthdata.nasa.gov/) | HTTP URL manifest for GPM IMERG Half-Hourly granules. |

---

## 🛠️ On-Demand Dataset Downloader

If you are retraining models from scratch or performing raw geospatial re-extraction, run the interactive downloader:

```bash
python scripts/download_datasets.py --help
```

### Options:
- Check local dataset inventory:
  ```bash
  python scripts/download_datasets.py --status
  ```
- Download specific public datasets (e.g., Geofabrik OSM or IMD rainfall):
  ```bash
  python scripts/download_datasets.py --dataset osm_ner
  python scripts/download_datasets.py --dataset imd_rainfall
  ```

*(Note: Authenticated datasets from NASA Earthdata or GSI Bhusanket require free user registration on their respective portals as detailed in the script).*

---

## 🔒 Git Policy

- Raw zip files, PDFs, large NetCDF files, and GeoPackages are ignored by `.gitignore` and must **never** be committed to Git or Git LFS.
- Only aggregated, privacy-vetted, and structured formats (`.geojson`, `.csv`, `.json`) should be tracked in version control under `data/processed/` and `data/final/`.
