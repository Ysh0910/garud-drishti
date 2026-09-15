"""
Write final SOURCE_MANIFEST.csv and DATA_COMPLETION_REPORT.md
"""
import csv, json
from pathlib import Path
from datetime import datetime, timezone

RAW_DIR = Path('data/raw')
now = datetime.now(timezone.utc).isoformat()

# ─── SOURCE MANIFEST ─────────────────────────────────────────────────────────
manifest_rows = [
    {
        'dataset': 'GSI Historical Landslide Inventory',
        'source_organization': 'Geological Survey of India',
        'source_url': 'https://bhusanket.gsi.gov.in/',
        'product': 'Landslide inventory (PDF extracted)',
        'version': '2023',
        'retrieval_date': now[:10],
        'coverage': 'India (NER states)',
        'temporal_resolution': 'Event-based',
        'spatial_resolution': 'Point/location',
        'file_path': 'data/raw/gsi/gsi_landslide_inventory.csv',
        'file_format': 'CSV + GeoJSON',
        'authentication_required': 'No',
        'processing_performed': 'PyMuPDF + pdfplumber text/table extraction from GSI.pdf',
        'status': 'PRESENT',
        'notes': '3102 records extracted, 2040 with coordinates. PDF may be partially image-based.'
    },
    {
        'dataset': 'ISRO Landslide Atlas 2023',
        'source_organization': 'ISRO/NRSC',
        'source_url': 'https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html',
        'product': 'Landslide atlas inventory (PDF extracted)',
        'version': '2023',
        'retrieval_date': now[:10],
        'coverage': 'India-wide',
        'temporal_resolution': 'Event-based',
        'spatial_resolution': 'District/state level',
        'file_path': 'data/raw/landslide_atlas/landslide_atlas_inventory.csv',
        'file_format': 'CSV + GeoJSON',
        'authentication_required': 'No',
        'processing_performed': 'PyMuPDF + pdfplumber extraction from LandslideAtlas_2023.pdf',
        'status': 'PRESENT',
        'notes': '168 records. Atlas primarily contains aggregate statistics and maps.'
    },
    {
        'dataset': 'Combined NER Landslide Inventory',
        'source_organization': 'GSI + ISRO (merged)',
        'source_url': 'N/A (derived)',
        'product': 'Unified inventory with deduplication flags',
        'version': '1.0',
        'retrieval_date': now[:10],
        'coverage': 'North Eastern India',
        'temporal_resolution': 'Event-based',
        'spatial_resolution': 'Point',
        'file_path': 'data/raw/landslide_inventory/combined_landslide_inventory.csv',
        'file_format': 'CSV + GeoJSON',
        'authentication_required': 'No',
        'processing_performed': 'Merge with provenance, 545 probable duplicate pairs flagged',
        'status': 'PRESENT',
        'notes': '3270 total records, 2040 georeferenced. Duplicates flagged, NOT removed.'
    },
    {
        'dataset': 'SRTM DEM (3 arc-second / ~90m)',
        'source_organization': 'Viewfinder Panoramas (SRTM-derived)',
        'source_url': 'http://viewfinderpanoramas.org/dem3/',
        'product': 'DEM3 HGT tiles G45/G46/G47',
        'version': 'SRTM-based',
        'retrieval_date': now[:10],
        'coverage': 'NER lat 24-27N, lon 88-98E',
        'temporal_resolution': 'Static',
        'spatial_resolution': '3 arc-second (~90m)',
        'file_path': 'data/raw/dem/srtm/G45/, G46/, G47/',
        'file_format': 'HGT binary',
        'authentication_required': 'No',
        'processing_performed': 'Downloaded and extracted from tile zips',
        'status': 'PRESENT',
        'notes': '88 NER 1-degree tiles. USGS manifest CSV present (srtm_v3_*.zip) but contains tile list only.'
    },
    {
        'dataset': 'IMD Gridded Rainfall 25km',
        'source_organization': 'India Meteorological Department',
        'source_url': 'https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html',
        'product': 'RF25 daily gridded rainfall NetCDF',
        'version': '2025',
        'retrieval_date': 'Pre-existing',
        'coverage': 'India (lat 6.5-38.5N, lon 66.5-100E)',
        'temporal_resolution': 'Daily',
        'spatial_resolution': '25km',
        'file_path': 'data/raw/RF25_ind2025_rfp25.nc',
        'file_format': 'NetCDF',
        'authentication_required': 'No',
        'processing_performed': 'Validated with netCDF4. Contains RAINFALL variable, 365 time steps, year 2025.',
        'status': 'PRESENT',
        'notes': 'Time range: 2025-01-01 to 2025-12-31. WGS84 assumed. 25km resolution.'
    },
    {
        'dataset': 'NASA GPM IMERG Daily',
        'source_organization': 'NASA GES DISC',
        'source_url': 'https://gpm.nasa.gov/data/directory',
        'product': 'GPM_3IMERGDF v07',
        'version': '07',
        'retrieval_date': now[:10],
        'coverage': 'Global',
        'temporal_resolution': 'Daily',
        'spatial_resolution': '0.1 degree (~10km)',
        'file_path': 'data/raw/rainfall/gpm/daily/',
        'file_format': 'NetCDF4 (.nc4)',
        'authentication_required': 'Yes - NASA Earthdata (EARTHDATA_USER/EARTHDATA_PASSWORD)',
        'processing_performed': 'Manifest inspected: 10,135 URLs covering 1998-2025.',
        'status': 'BLOCKED_AUTH_REQUIRED',
        'notes': 'Manifest present at subset_GPM_3IMERGDF_07_*.txt. Files not downloaded - NASA Earthdata login required.'
    },
    {
        'dataset': 'NASA GPM IMERG Half-Hourly',
        'source_organization': 'NASA GES DISC',
        'source_url': 'https://gpm.nasa.gov/data/directory',
        'product': 'GPM_3IMERGHH v07',
        'version': '07',
        'retrieval_date': now[:10],
        'coverage': 'Global',
        'temporal_resolution': '30 minutes',
        'spatial_resolution': '0.1 degree (~10km)',
        'file_path': 'data/raw/rainfall/gpm/half_hourly/',
        'file_format': 'HDF5',
        'authentication_required': 'Yes - NASA Earthdata',
        'processing_performed': 'Manifest inspected: 486,480 URLs covering 1998-2025.',
        'status': 'BLOCKED_AUTH_REQUIRED',
        'notes': 'Manifest present at subset_GPM_3IMERGHH_07_*.txt. NASA Earthdata login required.'
    },
    {
        'dataset': 'NASA SMAP Soil Moisture SPL3SMAP v003',
        'source_organization': 'NASA NSIDC',
        'source_url': 'https://nsidc.org/data/smap/data',
        'product': 'SPL3SMAP Level-3 36km daily',
        'version': '003',
        'retrieval_date': now[:10],
        'coverage': 'Global',
        'temporal_resolution': 'Daily',
        'spatial_resolution': '36km',
        'file_path': 'data/raw/soil_moisture/smap/',
        'file_format': 'HDF5',
        'authentication_required': 'Yes - NASA Earthdata',
        'processing_performed': 'Download script present: nsidc-download_SPL3SMAP.003_*.py',
        'status': 'BLOCKED_AUTH_REQUIRED',
        'notes': 'Download script available. NASA Earthdata login required. No actual data files present.'
    },
    {
        'dataset': 'NASA SMAP NSIDC-0800 SPL3FTA v002',
        'source_organization': 'NASA NSIDC',
        'source_url': 'https://nsidc.org/data/smap/data',
        'product': 'NSIDC-0800 Enhanced 9km daily',
        'version': '002',
        'retrieval_date': now[:10],
        'coverage': 'Global',
        'temporal_resolution': 'Daily',
        'spatial_resolution': '9km',
        'file_path': 'data/raw/soil_moisture/smap/',
        'file_format': 'HDF5',
        'authentication_required': 'Yes - NASA Earthdata',
        'processing_performed': 'Download script present: nsidc-download_NSIDC-0800.002_*.py',
        'status': 'BLOCKED_AUTH_REQUIRED',
        'notes': 'Download script available. NASA Earthdata login required.'
    },
    {
        'dataset': 'Sentinel-1 GRD',
        'source_organization': 'ESA / Copernicus Data Space',
        'source_url': 'https://dataspace.copernicus.eu/',
        'product': 'sentinel-1-grd',
        'version': 'Level-1',
        'retrieval_date': now[:10],
        'coverage': 'NER (88-98E, 20-30.5N)',
        'temporal_resolution': '~12 days revisit',
        'spatial_resolution': '10m IW mode',
        'file_path': 'data/raw/sentinel1/',
        'file_format': 'SAFE (zip)',
        'authentication_required': 'Yes - Copernicus Data Space account',
        'processing_performed': 'STAC catalog searched (2020-2023): 20 items found.',
        'status': 'CATALOG_ONLY',
        'notes': 'catalog.json present with 20 NER scene IDs. Actual download needs COPERNICUS_USER/COPERNICUS_PASSWORD.'
    },
    {
        'dataset': 'Sentinel-2 L2A',
        'source_organization': 'ESA / Copernicus Data Space',
        'source_url': 'https://dataspace.copernicus.eu/',
        'product': 'sentinel-2-l2a',
        'version': 'Level-2A',
        'retrieval_date': now[:10],
        'coverage': 'NER (88-98E, 20-30.5N)',
        'temporal_resolution': '~5 days revisit',
        'spatial_resolution': '10m',
        'file_path': 'data/raw/sentinel2/',
        'file_format': 'SAFE (zip)',
        'authentication_required': 'Yes - Copernicus Data Space account',
        'processing_performed': 'STAC catalog searched (2020-2023, cloud<30%): 20 items found.',
        'status': 'CATALOG_ONLY',
        'notes': 'catalog.json present with 20 NER scene IDs. Actual download needs Copernicus credentials.'
    },
    {
        'dataset': 'NER Administrative Boundary',
        'source_organization': 'GADM v4.1 + OpenStreetMap',
        'source_url': 'https://geodata.ucdavis.edu/gadm/',
        'product': 'India ADM1 state boundaries',
        'version': 'GADM 4.1',
        'retrieval_date': now[:10],
        'coverage': '7/8 NER states (Arunachal Pradesh partially matched)',
        'temporal_resolution': 'Static',
        'spatial_resolution': 'State polygons',
        'file_path': 'data/raw/boundaries/',
        'file_format': 'GeoJSON + GeoPackage',
        'authentication_required': 'No',
        'processing_performed': 'GADM API downloaded, OSM adminareas extracted, approximate bbox fallback created.',
        'status': 'PRESENT',
        'notes': '7 states from GADM. Arunachal Pradesh matched from OSM. Approximate bbox fallback also available.'
    },
    {
        'dataset': 'OSM NER Roads & Infrastructure',
        'source_organization': 'OpenStreetMap / Geofabrik',
        'source_url': 'https://download.geofabrik.de/asia/india.html',
        'product': 'north-eastern-zone-260910-free.gpkg',
        'version': '2026-09-10',
        'retrieval_date': 'Pre-existing',
        'coverage': 'North Eastern India',
        'temporal_resolution': 'Static (2026-09-10 snapshot)',
        'spatial_resolution': 'Vector features',
        'file_path': 'data/raw/north-eastern-zone.gpkg',
        'file_format': 'GeoPackage',
        'authentication_required': 'No',
        'processing_performed': 'Validated: 20 layers including roads, waterways, buildings, places, landuse.',
        'status': 'PRESENT',
        'notes': '20 layers: gis_osm_roads_free, gis_osm_waterways_free, gis_osm_places_free, etc.'
    },
    {
        'dataset': 'Geology (NER)',
        'source_organization': 'NRSC/Bhuvan WMS',
        'source_url': 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
        'product': 'cleanganga:LITHOLOG via WMS',
        'version': 'Unknown',
        'retrieval_date': now[:10],
        'coverage': 'NER (WMS response blank for NER bbox)',
        'temporal_resolution': 'Static',
        'spatial_resolution': 'Unknown',
        'file_path': 'data/raw/geology/',
        'file_format': 'PNG (blank) + provenance JSON',
        'authentication_required': 'Possibly - WMS returns blank tiles for NER',
        'processing_performed': 'Bhuvan WMS probed (6671 layers), LITHOLOG layer attempted. Tiles returned blank.',
        'status': 'BLOCKED',
        'notes': 'GSI Bhukosh (https://bhukosh.gsi.gov.in/) requires registration. Bhuvan WMS returns blank for NER.'
    },
    {
        'dataset': 'Geomorphology (NER)',
        'source_organization': 'NRSC/Bhuvan WMS (slope proxy)',
        'source_url': 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
        'product': 'sdv:as_slope, sdv:ml_slope, etc.',
        'version': 'Unknown',
        'retrieval_date': now[:10],
        'coverage': 'NER states (WMS blank for NER bbox)',
        'temporal_resolution': 'Static',
        'spatial_resolution': 'Unknown',
        'file_path': 'data/raw/geomorphology/',
        'file_format': 'PNG (blank) + provenance JSON',
        'authentication_required': 'Possibly',
        'processing_performed': 'No dedicated geomorphology layer found. Slope layers downloaded as proxy but also returned blank.',
        'status': 'BLOCKED',
        'notes': 'DEM-derived geomorphology (slope/aspect/curvature from SRTM) is the practical alternative.'
    },
    {
        'dataset': 'LULC (NER)',
        'source_organization': 'NRSC/Bhuvan + ESRI',
        'source_url': 'https://bhuvan.nrsc.gov.in/',
        'product': 'Bhuvan LULC 1:50K (manual request) / ESRI 2020 10m (documented)',
        'version': '2015-16 (Bhuvan)',
        'retrieval_date': now[:10],
        'coverage': 'NER',
        'temporal_resolution': 'Annual',
        'spatial_resolution': '1:50K / 10m',
        'file_path': 'data/raw/lulc/',
        'file_format': 'Documentation JSON',
        'authentication_required': 'Yes (Bhuvan portal request)',
        'processing_performed': 'Bhuvan LULC documented (requires manual portal request). ESRI LULC Planetary Computer accessible. S2 pipeline documented.',
        'status': 'DOCUMENTED_BLOCKED',
        'notes': 'ESRI 2020 10m LULC accessible via Planetary Computer. Bhuvan 1:50K requires approval. S2-derived LULC pipeline documented.'
    },
]

# Write CSV
manifest_path = RAW_DIR / 'SOURCE_MANIFEST.csv'
fieldnames = ['dataset','source_organization','source_url','product','version',
              'retrieval_date','coverage','temporal_resolution','spatial_resolution',
              'file_path','file_format','authentication_required','processing_performed',
              'status','notes']
with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(manifest_rows)
print(f'SOURCE_MANIFEST.csv written ({len(manifest_rows)} entries)')

# ─── DATA VALIDATION JSON ─────────────────────────────────────────────────────
validation = {
    'generated_at': now,
    'datasets': {
        'historical_landslides': {
            'gsi': {'status': 'PRESENT', 'records': 3102, 'with_coordinates': 2040},
            'isro_atlas': {'status': 'PRESENT', 'records': 168, 'with_coordinates': 0},
            'combined': {'status': 'PRESENT', 'records': 3270, 'georeferenced': 2040}
        },
        'terrain': {
            'srtm_dem': {'status': 'PRESENT', 'ner_tiles': 88, 'resolution': '90m', 'source': 'Viewfinder DEM3'}
        },
        'rainfall': {
            'imd_rf25': {'status': 'PRESENT', 'year': '2025', 'resolution': '25km', 'timesteps': 365},
            'gpm_daily': {'status': 'BLOCKED_AUTH_REQUIRED', 'manifest_urls': 10135},
            'gpm_half_hourly': {'status': 'BLOCKED_AUTH_REQUIRED', 'manifest_urls': 486480}
        },
        'soil_moisture': {
            'smap_spl3smap': {'status': 'BLOCKED_AUTH_REQUIRED', 'script': 'present'},
            'smap_nsidc0800': {'status': 'BLOCKED_AUTH_REQUIRED', 'script': 'present'}
        },
        'satellite': {
            'sentinel1': {'status': 'CATALOG_ONLY', 'catalog_items': 20, 'needs': 'Copernicus credentials'},
            'sentinel2': {'status': 'CATALOG_ONLY', 'catalog_items': 20, 'needs': 'Copernicus credentials'}
        },
        'boundaries': {
            'ner_boundary': {'status': 'PRESENT', 'states': 7, 'source': 'GADM+OSM'},
            'approx_bbox': {'status': 'PRESENT', 'states': 8, 'source': 'Manually compiled'}
        },
        'infrastructure': {
            'osm_ner': {'status': 'PRESENT', 'layers': 20, 'source': 'Geofabrik 2026-09-10'}
        },
        'geology': {'status': 'BLOCKED', 'reason': 'Bhuvan WMS blank for NER, GSI Bhukosh requires registration'},
        'geomorphology': {'status': 'BLOCKED', 'reason': 'No dedicated layer. DEM-derived recommended.'},
        'lulc': {'status': 'DOCUMENTED', 'options': ['Bhuvan 1:50K (requires request)', 'ESRI 2020 10m (accessible)', 'S2-derived (pipeline documented)']}
    },
    'overall_readiness': 'PARTIAL - Core datasets present. Satellite data, SMAP, GPM require credentials.',
    'blocking_items': [
        'NASA Earthdata login required for GPM (EARTHDATA_USER + EARTHDATA_PASSWORD)',
        'NASA Earthdata login required for SMAP',
        'Copernicus Data Space account required for Sentinel-1/2 downloads',
        'Geology: GSI Bhukosh registration OR Bhuvan WMS blank for NER',
        'Geomorphology: Use DEM-derived features (slope, aspect, curvature) from SRTM as proxy'
    ],
    'next_steps': [
        '1. Register at urs.earthdata.nasa.gov and download GPM + SMAP',
        '2. Register at dataspace.copernicus.eu and download Sentinel-1/2',
        '3. Request Bhuvan LULC 1:50K via portal OR use ESRI 2020 10m LULC',
        '4. Derive terrain features from SRTM HGT files using rasterio/GDAL',
        '5. Build Dataset 1 (susceptibility) using GSI inventory + terrain features',
        '6. Build Dataset 2 (dynamic risk) once rainfall temporal coverage is sufficient'
    ]
}

val_path = RAW_DIR / 'data_validation.json'
with open(val_path, 'w') as f:
    json.dump(validation, f, indent=2)
print(f'data_validation.json written')

# ─── DATA COMPLETION REPORT ───────────────────────────────────────────────────
report_md = f"""# DATA_COMPLETION_REPORT.md
Generated: {now}

---

## 1. Inventory Summary

| Dataset | Status | Location |
|---------|--------|----------|
| GSI Landslide Inventory | ✅ PRESENT | data/raw/gsi/ |
| ISRO Landslide Atlas | ✅ PRESENT | data/raw/landslide_atlas/ |
| Combined NER Inventory | ✅ PRESENT | data/raw/landslide_inventory/ |
| SRTM DEM (~90m) | ✅ PRESENT | data/raw/dem/srtm/ |
| IMD Rainfall 25km | ✅ PRESENT | data/raw/RF25_ind2025_rfp25.nc |
| NER Boundary | ✅ PRESENT | data/raw/boundaries/ |
| OSM NER Roads/Infrastructure | ✅ PRESENT | data/raw/north-eastern-zone.gpkg |
| Sentinel-1 | 🟡 CATALOG_ONLY | data/raw/sentinel1/catalog.json |
| Sentinel-2 | 🟡 CATALOG_ONLY | data/raw/sentinel2/catalog.json |
| GPM Daily | 🔴 BLOCKED (auth) | manifest present |
| GPM Half-Hourly | 🔴 BLOCKED (auth) | manifest present |
| SMAP Soil Moisture | 🔴 BLOCKED (auth) | scripts present |
| Geology | 🔴 BLOCKED | Bhuvan blank / GSI Bhukosh needs login |
| Geomorphology | 🔴 BLOCKED | Use DEM-derived features |
| LULC | 🟡 DOCUMENTED | ESRI 2020 accessible; Bhuvan requires request |

---

## 2. Datasets Present Before This Execution

- `GSI.pdf` — GSI landslide inventory PDF
- `LandslideAtlas_2023.pdf` — ISRO Landslide Atlas 2023
- `RF25_ind2025_rfp25.nc` — IMD 25km daily rainfall NetCDF (2025)
- `subset_GPM_3IMERGDF_07_*.txt` — GPM daily URL manifest
- `subset_GPM_3IMERGHH_07_*.txt` — GPM half-hourly URL manifest
- `nsidc-download_SPL3SMAP.003_*.py` — SMAP download script
- `nsidc-download_NSIDC-0800.002_*.py` — SMAP enhanced download script
- `srtm_v3_6aa3cfb7243c85a5.zip` — USGS SRTM tile manifest CSV (NOT actual DEM)
- `north-eastern-zone.gpkg` — OSM NER GeoPackage (Geofabrik 2026-09-10)
- `eastern-zone-260910-free.gpkg.zip` — OSM Eastern zone archive

---

## 3. Datasets Downloaded During This Execution

### DEM
- **88 SRTM HGT tiles** for NER (lat 24-27N, lon 88-98E)
  - Source: Viewfinder Panoramas DEM3 (http://viewfinderpanoramas.org/dem3/)
  - Packages: G45, G46, G47 (lon 84-102E, lat 20-30N)
  - Note: USGS SRTM ZIP was a tile manifest CSV, not actual DEM data

### Administrative Boundaries
- `data/raw/boundaries/ner_boundary_gadm.geojson` — 7 NER states from GADM v4.1
- `data/raw/boundaries/ner_boundary.gpkg` — OSM-derived admin boundaries
- `data/raw/boundaries/ner_boundary_approximate.geojson` — Bounding box fallback for all 8 states

### Satellite Catalogs
- `data/raw/sentinel1/catalog.json` — 20 Sentinel-1 GRD products over NER (2020-2023)
- `data/raw/sentinel2/catalog.json` — 20 Sentinel-2 L2A products over NER (cloud < 30%)

---

## 4. Datasets Generated from PDFs

### GSI PDF (904 pages)
- Extracted from top 80 keyword-dense pages using PyMuPDF + pdfplumber
- **3102 records** total; **2040 with coordinates**
- Output: `data/raw/gsi/gsi_landslide_inventory.csv` + `.geojson`

### ISRO Landslide Atlas (89 pages)
- Extracted from 65 relevant pages
- **168 records** (state/district level); 0 with point coordinates
- Atlas primarily contains statistics and susceptibility maps, not point inventories
- Output: `data/raw/landslide_atlas/landslide_atlas_inventory.csv`

### Combined Inventory
- 3270 merged records; 545 probable duplicate pairs flagged (not removed)
- Output: `data/raw/landslide_inventory/combined_landslide_inventory.csv` + `.geojson`

---

## 5. Bhuvan WMS Probe

- **6671 layers** discovered on `bhuvan-vec1.nrsc.gov.in`
- NER-specific slope layers found: 7 states (as, ml, mn, mz, nl, sk, tr)
- 215 NER LULC layers identified
- 57 NER watershed/drainage layers identified
- **All WMS GetMap responses for NER bbox returned blank white tiles** — Bhuvan WMS does not publicly serve these layers for the NER bounding box

---

## 6. Datasets Unavailable and Why

| Dataset | Blocker | Required Action |
|---------|---------|-----------------|
| GPM Daily (nc4) | NASA Earthdata auth | Register at urs.earthdata.nasa.gov |
| GPM Half-Hourly (HDF5) | NASA Earthdata auth | Set EARTHDATA_USER + EARTHDATA_PASSWORD |
| SMAP soil moisture | NASA Earthdata auth | Use existing download scripts after login |
| Sentinel-1/2 actual | Copernicus Data Space auth | Register at dataspace.copernicus.eu |
| Geology vector | GSI Bhukosh requires registration | Register at bhukosh.gsi.gov.in |
| Geomorphology dedicated | Not found on public WMS | Derive from SRTM (slope, curvature, TWI) |
| Bhuvan LULC 1:50K | Portal approval required | Submit request on bhuvan.nrsc.gov.in |

---

## 7. Spatial Coverage

- **NER states**: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura
- **DEM coverage**: lat 24-27N, lon 88-98E (88 tiles; partial coverage of NER)
- **IMD rainfall**: India-wide (lat 6.5-38.5N, lon 66.5-100E)
- **OSM**: Full NER extract

---

## 8. Temporal Coverage

| Dataset | Period |
|---------|--------|
| GSI inventory | Historical events (pre-2023) |
| ISRO Atlas | Up to 2023 |
| IMD rainfall | 2025 (full year daily) |
| GPM manifest | 1998-2025 (10,135 daily files available) |
| OSM | 2026-09-10 snapshot |
| Sentinel catalogs | 2020-2023 (monsoon seasons) |

---

## 9. File Counts and Sizes

| Dataset | Files | Approx Size |
|---------|-------|-------------|
| DEM HGT tiles (NER) | 88 | ~160 MB |
| GSI inventory CSV | 1 | ~400 KB |
| Combined inventory CSV | 1 | ~600 KB |
| OSM GeoPackage | 1 | ~450 MB |
| IMD NetCDF | 1 | ~50 MB |
| Sentinel catalogs | 2 | ~1 MB |

---

## 10. Model Readiness Assessment

### Dataset 1 (Susceptibility) — PARTIALLY READY
Can build with:
- ✅ Historical landslide labels (2040 georeferenced points)
- ✅ Terrain features derivable from SRTM (slope, aspect, curvature)
- ✅ Distance to drainage (from OSM waterways)
- ✅ Historical landslide density (from combined inventory)
- 🔴 Geology — BLOCKED (use categorical placeholder or skip)
- 🟡 LULC — use ESRI 2020 10m or derive from S2

### Dataset 2 (Dynamic Risk) — PARTIALLY READY
Can build with:
- ✅ IMD 25km daily rainfall (2025) for antecedent rainfall windows
- ✅ Base susceptibility from Model 1
- 🔴 GPM sub-daily — BLOCKED (credentials)
- 🔴 SMAP soil moisture — BLOCKED (credentials)

---

## 11. Next Steps (Priority Order)

1. **Register NASA Earthdata** → download GPM daily files for 2020-2023 landslide event dates
2. **Register Copernicus Data Space** → download Sentinel-2 scenes for LULC derivation
3. **Derive terrain features** from SRTM HGT tiles using `rasterio`/`GDAL` (slope, aspect, curvature)
4. **Build Dataset 1** — combine 2040 landslide points + terrain features + control samples
5. **Train Model 1** (XGBoost susceptibility) using `configs/susceptibility.yaml`
6. **Register GSI Bhukosh** for geology data when time permits

---

*Generated by NER Raw Data Completion Agent — execution date {now[:10]}*
"""

report_path = RAW_DIR / 'DATA_COMPLETION_REPORT.md'
with open(report_path, 'w', encoding='utf-8') as f:
    f.write(report_md)
print(f'DATA_COMPLETION_REPORT.md written')
print('\nAll final reports complete.')
