# NER Landslide Project --- Raw Dataset Completion Runbook

## Objective

This document is the **execution specification for the coding/data
agent**.

The goal is simple:

> Inspect the existing project first, reuse everything already
> downloaded, download/derive every remaining dataset required by the
> NER landslide early-warning system, and finish with a complete,
> organized `data/raw/` directory plus machine-readable inventory and
> validation reports.

Do **not** repeatedly download data that already exists.

Do **not** waste time/credits reading entire long PDFs into the agent
context. For the GSI and ISRO/Landslide Atlas PDFs, use local Python/PDF
extraction to convert the relevant information into CSV/JSON/GeoJSON and
work from those compact files.

Do **not** fabricate a dataset when an official source cannot be
accessed. If a source requires registration/approval, use the best
official machine-accessible alternative (for example an official
WMS/WMTS raster) where scientifically appropriate, and record the
provenance and limitation.

------------------------------------------------------------------------

# 1. Expected project structure

The agent must first inspect the repository and preserve its existing
structure.

Expected relevant area:

``` text
project/
├── data/
│   ├── raw/
│   ├── processed/
│   └── final/
├── ml/
├── backend/
└── ...
```

All source datasets obtained in this run must ultimately be placed
under:

``` text
data/raw/
```

Use subdirectories where useful:

``` text
data/raw/
├── gsi/
├── landslide_atlas/
├── dem/
├── rainfall/
│   ├── imd/
│   └── gpm/
├── soil_moisture/
├── sentinel1/
├── sentinel2/
├── osm/
├── boundaries/
├── geology/
├── geomorphology/
├── lulc/
└── manifests/
```

If the repository already uses a different organization, do not blindly
restructure it. Adapt to the existing layout while maintaining the same
logical separation.

------------------------------------------------------------------------

# 2. FIRST TASK --- inventory everything already present

Before downloading anything:

1.  Recursively inspect `data/raw/`.
2.  Record:
    -   filename
    -   extension
    -   size
    -   directory
    -   likely dataset
    -   whether it is an actual data file, script, manifest,
        documentation, or archive
    -   whether it appears complete or partial
3.  Inspect existing downloader scripts.
4.  Inspect `data/processed/` and `data/final/` only to determine
    whether anything has already been generated.
5.  Do not delete existing data.
6.  Do not redownload an existing valid file unless it is
    corrupt/incomplete.

Create:

``` text
data/raw/dataset_inventory.csv
```

Suggested columns:

``` text
dataset
path
file_type
size_bytes
status
coverage
temporal_resolution
spatial_resolution
source
notes
```

Statuses:

``` text
PRESENT
MANIFEST_ONLY
SCRIPT_ONLY
ARCHIVE
PARTIAL
CORRUPT
MISSING
```

Also create:

``` text
data/raw/dataset_inventory.json
```

------------------------------------------------------------------------

# 3. Current known files --- verify, do not assume

The project currently contains files similar to:

``` text
data/raw/
├── GSI.pdf
├── LandslideAtlas_2023.pdf
├── RF25_ind2025_rfp25.nc
├── subset_GPM_3IMERGDF_07_*.txt
├── subset_GPM_3IMERGHH_07_*.txt
├── nsidc-download_SPL3SMAP.003_*.py
├── nsidc-download_NSIDC-0800.002_*.py
├── srtm_v3_*.zip
├── eastern-zone-*.pbf / *.gpkg.zip
└── ...
```

These names are examples based on the current working repository. **Use
the actual repository contents as the source of truth.**

Known facts that should be verified locally:

### IMD

`RF25_ind2025_rfp25.nc` is expected to be an actual NetCDF rainfall
dataset, not merely a URL list.

Inspect it with Python/xarray/netCDF4 and report:

-   dimensions
-   coordinates
-   variables
-   units
-   time range
-   latitude range
-   longitude range
-   CRS if available
-   missing-value encoding

Do not convert or modify the original file.

### GPM Daily

`subset_GPM_3IMERGDF_*.txt` is expected to be a URL manifest, not the
actual rainfall files.

The manifest contains direct Earthdata `.nc4` URLs.

### GPM Half-Hourly

`subset_GPM_3IMERGHH_*.txt` is expected to be a URL manifest containing
30-minute IMERG HDF5 URLs.

Do not treat the TXT files themselves as rainfall data.

### SMAP

The `nsidc-download_*.py` files are expected to be download
scripts/manifests. Determine whether actual SMAP `.h5`, `.hdf`, `.nc`,
etc. data are already present.

### SRTM

Inspect the ZIP. Determine whether it contains actual DEM tiles and
whether the NER is covered.

### OSM

Determine whether an OSM `.pbf` or GeoPackage already exists. If it
does, do not download another copy.

------------------------------------------------------------------------

# 4. GSI PDF --- convert locally instead of reading the whole PDF

Input:

``` text
data/raw/GSI.pdf
```

Do NOT load the entire PDF into the LLM/context.

Use local Python tooling.

Recommended order:

1.  `pdfinfo` or PyMuPDF to inspect:
    -   page count
    -   metadata
2.  Extract text locally page-by-page using PyMuPDF (`fitz`) or
    `pdftotext`.
3.  Search the extracted text for:
    -   landslide
    -   inventory
    -   coordinates
    -   latitude
    -   longitude
    -   date
    -   district
    -   state
    -   location
    -   ID
    -   rainfall
    -   event
4.  Identify pages containing actual landslide inventory/table
    information.
5.  Extract only those pages.
6.  If tables are present:
    -   try Camelot/Tabula/pdfplumber
    -   otherwise use a custom Python parser
7.  If pages are scanned images:
    -   OCR only the relevant pages
    -   do not OCR the entire document unnecessarily.

Produce a compact machine-readable representation:

``` text
data/raw/gsi/gsi_landslide_inventory.csv
```

If geometry can be reliably extracted:

``` text
data/raw/gsi/gsi_landslide_inventory.geojson
```

Recommended fields:

``` text
landslide_id
state
district
location
latitude
longitude
date
landslide_type
cause
source_page
source_document
confidence
notes
```

Rules:

-   Never invent coordinates.
-   Never convert an ambiguous location into coordinates by guessing.
-   Preserve the original page number.
-   Preserve the original wording where useful.
-   If only district/location is available, leave latitude/longitude
    empty.
-   Keep a provenance field.

Also create:

``` text
data/raw/gsi/gsi_extraction_report.json
```

containing:

``` text
source_pdf
page_count
pages_inspected
pages_used
records_extracted
records_with_coordinates
records_without_coordinates
extraction_method
warnings
```

------------------------------------------------------------------------

# 5. ISRO Landslide Atlas PDF --- same strategy

Input:

``` text
data/raw/LandslideAtlas_2023.pdf
```

Again:

**Do not read the entire PDF into context.**

Use Python locally.

The objective is to extract the useful landslide inventory/reference
information into compact files.

First inspect PDF metadata and page count.

Then search locally for:

``` text
landslide
inventory
state
district
latitude
longitude
date
event
location
```

Extract only relevant pages/tables.

Produce:

``` text
data/raw/landslide_atlas/landslide_atlas_inventory.csv
```

and, if reliable coordinates exist:

``` text
data/raw/landslide_atlas/landslide_atlas_inventory.geojson
```

Recommended fields:

``` text
landslide_id
state
district
location
latitude
longitude
date
event_id
landslide_type
source_page
source_document
confidence
notes
```

Also:

``` text
data/raw/landslide_atlas/atlas_extraction_report.json
```

Do not infer coordinates from a map image unless the extraction method
is genuinely georeferenced and documented.

------------------------------------------------------------------------

# 6. Create a unified historical landslide inventory

After extracting both sources, create:

``` text
data/raw/landslide_inventory/
├── combined_landslide_inventory.csv
├── combined_landslide_inventory.geojson
└── merge_report.json
```

The merge process must:

1.  preserve source provenance;
2.  retain the original source ID;
3.  avoid silently deduplicating records;
4.  identify probable duplicates separately;
5.  flag records with missing coordinates;
6.  standardize state/district names only through an explicit mapping
    table.

Recommended unified fields:

``` text
landslide_id
source
source_id
state
district
location
latitude
longitude
date
landslide_type
cause
source_page
confidence
duplicate_group
notes
```

If duplicate matching is performed, use a conservative spatial/date rule
and document it.

Do not discard records merely because they lack coordinates.

------------------------------------------------------------------------

# 7. GPM --- download actual rainfall data from the existing manifests

The existing GPM TXT files should be treated as manifests.

### Daily IMERG

Use:

``` text
subset_GPM_3IMERGDF_*.txt
```

Download actual `.nc4` files into:

``` text
data/raw/rainfall/gpm/daily/
```

### Half-hourly IMERG

Use:

``` text
subset_GPM_3IMERGHH_*.txt
```

Download actual HDF5 files into:

``` text
data/raw/rainfall/gpm/half_hourly/
```

Do NOT blindly download every historical file.

First determine the historical period required for the landslide
inventory and model.

At minimum:

-   cover the dates of the extracted landslide events;
-   include enough antecedent rainfall before each event for 72-hour and
    7-day features;
-   if practical, include a broader historical period for
    negative/control samples.

Use the NER spatial extent later during processing.

Implement:

-   HTTP retries
-   timeout
-   resume support where possible
-   skip existing files
-   checksum/file-size sanity checks where available
-   rate limiting
-   logging

Never put Earthdata credentials in source code.

If authentication is required, read credentials from environment
variables or the existing approved Earthdata mechanism.

Create:

``` text
data/raw/rainfall/gpm/download_manifest_used.csv
data/raw/rainfall/gpm/download_report.json
```

------------------------------------------------------------------------

# 8. IMD rainfall --- validate and retain

Keep the existing IMD NetCDF as the original source.

Do not overwrite it.

Create only a metadata report:

``` text
data/raw/rainfall/imd/imd_rf25_metadata.json
```

If the file is currently located directly under `data/raw/`, it may
remain there if moving it would break existing workflows. Otherwise
copy/organize it under:

``` text
data/raw/rainfall/imd/
```

The eventual feature engineering must respect its daily temporal
resolution.

Do NOT fabricate 1h/3h/6h/12h rainfall from daily IMD rainfall.

------------------------------------------------------------------------

# 9. SMAP --- determine whether actual soil-moisture data exist

Inspect:

``` text
nsidc-download_SPL3SMAP.003_*.py
nsidc-download_NSIDC-0800.002_*.py
```

Determine what products they target.

If actual SMAP data are missing:

1.  inspect the scripts;
2.  identify the intended product;
3.  use the official NSIDC/Earthdata source;
4.  download only the period needed for the model;
5.  subset to NER during processing where possible;
6.  place actual files under:

``` text
data/raw/soil_moisture/smap/
```

Do not modify the existing scripts unless necessary.

Create:

``` text
data/raw/soil_moisture/smap/download_report.json
```

------------------------------------------------------------------------

# 10. Sentinel-1 --- programmatic download

Use Copernicus Data Space Ecosystem.

Official STAC documentation:

https://documentation.dataspace.copernicus.eu/APIs/STAC.html

STAC endpoint:

``` text
https://stac.dataspace.copernicus.eu/v1/
```

Collection:

``` text
sentinel-1-grd
```

Use the STAC API to search spatially and temporally.

Do not download the entire Sentinel-1 archive.

Target:

-   NER boundary/AOI
-   relevant historical period
-   preferably acquisitions that support monthly change/deformation
    analysis
-   VV/VH GRD products where available/appropriate

Store:

``` text
data/raw/sentinel1/
```

Keep product metadata alongside downloads.

Recommended:

``` text
data/raw/sentinel1/catalog.json
data/raw/sentinel1/download_report.json
```

Use environment variables for authentication if product download
requires a token.

Never hard-code username/password/client secrets.

------------------------------------------------------------------------

# 11. Sentinel-2 --- programmatic download

Use Copernicus Data Space Ecosystem.

STAC collection:

``` text
sentinel-2-l2a
```

Search using:

-   NER AOI
-   date range
-   cloud-cover threshold
-   relevant monthly/seasonal periods

Do NOT download every Sentinel-2 scene.

For the project's monthly land-cover/change workflow, select suitable
scenes or a small number of cloud-filtered scenes per month/period.

Store:

``` text
data/raw/sentinel2/
```

Keep metadata:

``` text
data/raw/sentinel2/catalog.json
data/raw/sentinel2/download_report.json
```

Use Sentinel-2 to derive:

-   land-cover features
-   vegetation indices such as NDVI
-   exposed/bare-soil indicators
-   vegetation disturbance/change indicators

Do not claim that raw Sentinel-2 itself is a "land-cover dataset"; it is
imagery from which land-cover/features can be derived.

------------------------------------------------------------------------

# 12. SRTM --- validate actual DEM coverage

Inspect the existing SRTM ZIP.

Confirm:

-   actual DEM tiles exist;
-   file format;
-   CRS;
-   resolution;
-   geographic coverage;
-   NER coverage.

Extract the required tiles into:

``` text
data/raw/dem/srtm/
```

Keep the original ZIP.

Do not download another DEM if the existing SRTM already provides
adequate NER coverage.

Later processing will derive:

``` text
elevation
slope
aspect
curvature
```

and potentially:

``` text
roughness
local relief
TWI
distance to drainage
```

------------------------------------------------------------------------

# 13. OSM --- roads and infrastructure

Use the official Geofabrik India regional extracts.

Preferred NER source:

``` text
https://download.geofabrik.de/asia/india.html
```

The India page lists a dedicated **North-Eastern Zone** extract and
indicates an `.osm.pbf` around 104 MB. Use the dedicated NER extract
rather than downloading the full India 1.6 GB file.

Download the current appropriate North-Eastern Zone PBF if one is not
already present.

Store:

``` text
data/raw/osm/north-eastern-zone.osm.pbf
```

Optionally also download/use the GeoPackage if it makes downstream GIS
processing simpler.

Important layers/features:

-   roads
-   tracks
-   railways if relevant
-   bridges
-   buildings
-   schools
-   hospitals
-   settlements
-   waterways
-   other critical infrastructure

Do not assume OSM is complete or authoritative for all infrastructure.

------------------------------------------------------------------------

# 14. NER administrative boundary

The agent must obtain an actual machine-readable NER/state boundary.

Preferred sources, in order:

1.  Official Indian government/NRSC/Bhuvan source.
2.  Official state/administrative GIS source.
3.  A reputable geospatial source only if the official source cannot
    provide a usable downloadable boundary.

The boundary must cover:

``` text
Arunachal Pradesh
Assam
Manipur
Meghalaya
Mizoram
Nagaland
Sikkim
Tripura
```

Save:

``` text
data/raw/boundaries/ner_boundary.gpkg
```

and/or:

``` text
data/raw/boundaries/ner_boundary.geojson
```

Also save state/district boundaries if available and useful.

Validate:

-   CRS
-   geometry validity
-   state coverage
-   no accidental missing state

------------------------------------------------------------------------

# 15. Geology

This is a required Model 1 feature.

The agent must actively investigate official Indian sources rather than
stopping because one Bhuvan dataset name is missing.

Potential official sources include:

-   GSI Bhukosh
-   Bhuvan state portals
-   NRSC/Bhuvan thematic services
-   official OGC WMS/WMTS services

Bhuvan's state portals list Geology & Mines among available state-level
geospatial layers.

If vector download is unavailable but an official WMS/WMTS geology layer
is accessible:

1.  identify the correct geology layer;
2.  query its capabilities;
3.  use a georeferenced WMS/WMTS export or other officially supported
    machine-readable method;
4.  save the resulting raster/geospatial file locally.

Do not call a screenshot or ordinary web map an analytical dataset.

Preferred final raw format:

``` text
data/raw/geology/geology_ner.gpkg
```

or, if only an official raster service is accessible:

``` text
data/raw/geology/geology_ner.tif
```

Record:

``` text
source
layer_name
service_url
retrieval_date
CRS
resolution
coverage
download_method
limitations
```

If GSI/Bhukosh requires an account or manual approval, do not fake
access. Document the exact blocker and use an official alternative if
one exists.

------------------------------------------------------------------------

# 16. Geomorphology

Do NOT waste time looking for a file literally named `MZ_GM50K`.

The required concept is a **geomorphology layer**, not necessarily a
particular filename.

Investigate Bhuvan thematic services and official NRSC/NESAC sources.

Bhuvan documents that geomorphology is available as a thematic
geospatial service and supports WMS/WMTS consumption.

Official Bhuvan WMS:

``` text
https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms
```

Official Bhuvan thematic documentation:

https://bhuvan.nrsc.gov.in/wiki/index.php/How_to_use_WMS_services

Find the actual NER-relevant geomorphology layer names using the WMS
GetCapabilities response or Bhuvan's thematic metadata.

If a downloadable vector is unavailable:

-   obtain a georeferenced raster through the official WMS service;
-   preserve the source layer name and service URL;
-   save it locally.

Preferred output:

``` text
data/raw/geomorphology/geomorphology_ner.gpkg
```

or:

``` text
data/raw/geomorphology/geomorphology_ner.tif
```

Do not substitute a random global geomorphology product without
documenting that it is a fallback.

------------------------------------------------------------------------

# 17. Land Use / Land Cover

First inspect whether an appropriate LULC dataset already exists.

Bhuvan currently provides an official workflow for
requesting/downloading LULC 1:50K shapefiles for:

-   2015--16
-   2011--12
-   2005--06

The request can be made for selected districts/AOI/bounding box and may
require approval.

Official Bhuvan update:

https://bhuvan.nrsc.gov.in/updates/bhuvan_apr2026.html

If the required Bhuvan LULC data can be obtained automatically, store it
under:

``` text
data/raw/lulc/bhuvan/
```

If direct download is unavailable or approval is required, do not
fabricate the file.

Use the Sentinel-2 pipeline to derive a current land-cover feature layer
as the practical fallback:

``` text
Sentinel-2
    ↓
cloud masking
    ↓
monthly/seasonal composite
    ↓
spectral indices
    ↓
land-cover classification
    ↓
land-cover raster
```

Store:

``` text
data/raw/lulc/sentinel2_derived/
```

Clearly distinguish:

``` text
reference LULC
```

from:

``` text
model-derived LULC
```

------------------------------------------------------------------------

# 18. Do NOT fabricate historical forecast rainfall

The Dynamic Risk dataset eventually contains:

``` text
forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm
```

Do not create historical forecast values from observed rainfall.

For training, forecast values must represent what would actually have
been available at prediction time.

If archived historical forecast data cannot be obtained:

1.  do not fabricate them;
2.  document the limitation;
3.  build the historical dynamic-risk training dataset using valid
    observed antecedent rainfall features;
4.  keep forecast-dependent features as a later extension unless
    legitimate historical forecast archives are available.

This is a hard scientific constraint.

------------------------------------------------------------------------

# 19. Required final raw dataset checklist

Before declaring completion, the agent must verify the following.

## Historical landslide sources

``` text
[ ] GSI source processed
[ ] GSI compact CSV generated
[ ] GSI GeoJSON generated if coordinates available
[ ] ISRO Landslide Atlas processed
[ ] Atlas compact CSV generated
[ ] Atlas GeoJSON generated if coordinates available
[ ] Combined inventory generated
```

## Terrain

``` text
[ ] SRTM actual tiles available
[ ] NER coverage verified
```

## Rainfall

``` text
[ ] IMD NetCDF present
[ ] GPM Daily actual files downloaded
[ ] GPM Half-Hourly actual files downloaded
```

## Soil moisture

``` text
[ ] SMAP actual data present
```

## Satellite

``` text
[ ] Sentinel-1 products downloaded
[ ] Sentinel-2 products downloaded
```

## GIS

``` text
[ ] NER boundary
[ ] state boundaries where useful
[ ] district boundaries where useful
[ ] geology
[ ] geomorphology
[ ] LULC/reference or derived LULC
```

## Human/infrastructure exposure

``` text
[ ] OSM NER extract
```

------------------------------------------------------------------------

# 20. Required provenance file

Create:

``` text
data/raw/SOURCE_MANIFEST.csv
```

Columns:

``` text
dataset
source_organization
source_url
product
version
retrieval_date
coverage
temporal_resolution
spatial_resolution
file_path
file_format
authentication_required
processing_performed
status
notes
```

Every dataset must have an entry.

------------------------------------------------------------------------

# 21. Required validation report

Create:

``` text
data/raw/DATA_COMPLETION_REPORT.md
```

It must contain:

1.  inventory summary;
2.  datasets already present before execution;
3.  datasets downloaded during execution;
4.  datasets generated from PDFs;
5.  datasets derived from satellite/DEM;
6.  datasets unavailable and why;
7.  authentication/approval requirements;
8.  spatial coverage;
9.  temporal coverage;
10. file counts and sizes;
11. corrupted/missing files;
12. provenance;
13. next steps.

Also create:

``` text
data/raw/data_validation.json
```

with machine-readable status.

------------------------------------------------------------------------

# 22. No-credit / no-waste rules

These rules are mandatory.

### Rule 1 --- inspect first

Never download a dataset until the local inventory confirms it is
missing or incomplete.

### Rule 2 --- don't feed giant PDFs to the LLM

Use Python/PyMuPDF/pdfplumber/pdftotext locally.

### Rule 3 --- extract only useful PDF pages

Search extracted text first. OCR only relevant pages.

### Rule 4 --- don't download entire satellite archives

Use STAC spatial/temporal/cloud filters.

### Rule 5 --- don't download full India OSM

Use the dedicated North-Eastern Zone extract.

### Rule 6 --- don't fabricate data

Especially:

-   historical forecast rainfall
-   coordinates
-   missing landslide events
-   geology
-   geomorphology

### Rule 7 --- preserve originals

Never overwrite source PDFs, NetCDFs, manifests, scripts, or ZIP
archives.

### Rule 8 --- resumable downloads

A rerun should continue from existing files rather than starting again.

### Rule 9 --- provenance for everything

Every derived/downloaded dataset must record its source.

### Rule 10 --- final condition matters

The task is not complete because a script was written.

The task is complete only when:

``` text
data/raw/
```

contains the required actual datasets, manifests, provenance, and
validation reports.

------------------------------------------------------------------------

# 23. Recommended execution order

Execute in this order:

``` text
1. Inventory existing files
        ↓
2. Validate existing NetCDF / ZIP / scripts
        ↓
3. Extract GSI PDF → CSV/GeoJSON
        ↓
4. Extract Landslide Atlas PDF → CSV/GeoJSON
        ↓
5. Merge historical inventory
        ↓
6. Validate SRTM
        ↓
7. Download required GPM data
        ↓
8. Validate/download SMAP
        ↓
9. Validate/download OSM
        ↓
10. Obtain NER administrative boundary
        ↓
11. Obtain geology
        ↓
12. Obtain geomorphology
        ↓
13. Obtain/reference/derive LULC
        ↓
14. Download Sentinel-1
        ↓
15. Download Sentinel-2
        ↓
16. Run complete validation
        ↓
17. Write SOURCE_MANIFEST.csv
        ↓
18. Write DATA_COMPLETION_REPORT.md
```

------------------------------------------------------------------------

# 24. Final acceptance criteria

The agent must finish with:

``` text
data/raw/
```

containing:

``` text
historical landslide inventory
terrain/DEM
IMD rainfall
GPM rainfall
SMAP soil moisture
Sentinel-1
Sentinel-2
NER boundaries
roads/infrastructure
geology
geomorphology
LULC/reference or derived LULC
```

plus:

``` text
dataset_inventory.csv
SOURCE_MANIFEST.csv
data_validation.json
DATA_COMPLETION_REPORT.md
```

and the original source files must remain intact.

The agent must report a final table:

  Dataset             Present Before Action              Final Status   Location
  ----------------- ---------------- ------------------- -------------- ----------
  GSI landslides                     Extract                            
  ISRO Atlas                         Extract                            
  SRTM                               Validate/Extract                   
  IMD rainfall                       Validate                           
  GPM daily                          Download                           
  GPM half-hourly                    Download                           
  SMAP                               Download/Validate                  
  Sentinel-1                         Download                           
  Sentinel-2                         Download                           
  NER boundary                       Obtain                             
  OSM                                Download/Validate                  
  Geology                            Obtain                             
  Geomorphology                      Obtain                             
  LULC                               Obtain/Derive                      

Do not claim "complete" if any mandatory dataset is missing. Instead
mark it `BLOCKED` and explain exactly why, including the official source
attempted and the required manual action if applicable.
