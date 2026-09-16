# Data Processing Specification --- NER Landslide Early-Warning System

## 1. Objective

This document is the execution specification for the project's
data-processing pipeline.

The coding/data agent must inspect the already downloaded raw datasets
under:

``` text
data/raw/
```

and produce these two final ML-ready datasets:

``` text
data/final/susceptibility_dataset.csv
data/final/dynamic_risk_dataset.csv
```

The pipeline must be reproducible, spatially and temporally correct, and
must never fabricate missing source data.

------------------------------------------------------------------------

## 2. Required final outputs

At minimum:

``` text
data/final/
├── susceptibility_dataset.csv
└── dynamic_risk_dataset.csv
```

Also generate:

``` text
docs/data/
├── DATA_DICTIONARY.md
├── DATA_SOURCES.md
├── DATA_QUALITY_REPORT.md
└── PROCESSING_REPORT.md
```

Recommended processed structure:

``` text
data/processed/
├── spatial/
├── rainfall/
├── soil_moisture/
├── satellite/
├── temporal/
├── features/
└── validation/
```

Do not modify anything inside `data/raw/`.

------------------------------------------------------------------------

# 3. First step: inventory the raw data

Before processing anything, recursively inspect `data/raw/`.

Do not assume filenames, folders, formats, CRS, variables, units,
temporal coverage, or product versions.

Supported formats may include:

``` text
CSV, TXT, JSON, GeoJSON, SHP, GPKG, KML/KMZ,
NetCDF/NC4, HDF5/H5, GeoTIFF/TIF, PBF, SAFE, ZIP
```

Create a machine-readable and human-readable inventory containing:

-   filename
-   file type
-   size
-   source/product
-   spatial extent
-   CRS
-   temporal coverage
-   spatial resolution
-   temporal resolution
-   variables/layers
-   units
-   nodata/fill values
-   usable/unusable status
-   reason if unusable

If a source differs from expectations, adapt the processing to the
actual source metadata and document the decision.

------------------------------------------------------------------------

# 4. Project region

The study region is India's North Eastern Region:

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

Use authoritative administrative boundaries available in the raw data.

A broad initial filter may use approximately:

``` text
Latitude:  21°N to 30°N
Longitude: 88°E to 98°E
```

but final samples must be checked against the actual NER boundary.

------------------------------------------------------------------------

# 5. CRS and spatial processing

Use WGS84 (`EPSG:4326`) for stored latitude/longitude.

For distances, buffers and spatial matching, use an appropriate
projected CRS or geodesic calculation.

Never calculate a distance in degrees and label it as metres.

For rasters:

-   preserve source CRS where possible;
-   reproject only when necessary;
-   document every reprojection;
-   use a consistent project analysis grid.

Do not imply 30 m prediction accuracy simply because the DEM is 30 m if
dynamic inputs are much coarser.

------------------------------------------------------------------------

# 6. Master spatial grid

Create a regular analysis grid covering NER.

Choose a resolution appropriate for the coarsest important dynamic data
and computational resources.

Every grid/sample should retain:

``` text
cell_id or sample_id
latitude
longitude
state
district
geometry where used internally
```

The same spatial framework should support both datasets and later GIS
visualization.

------------------------------------------------------------------------

# 7. Landslide inventory

Use the downloaded ISRO/GSI landslide inventory as the primary
historical landslide source where available.

Processing:

1.  Load all relevant inventory files.
2.  Normalize geometry.
3.  Normalize dates.
4.  Validate coordinates.
5.  Remove exact duplicates.
6.  Identify likely duplicate events between overlapping sources.
7.  Preserve source/provenance.
8.  Clip to NER.
9.  Save a processed master inventory.

Recommended intermediate output:

``` text
data/processed/spatial/landslide_inventory.gpkg
```

Do not assume that absence from an inventory proves absence of a
landslide.

If an event has only a date and no reliable time, do not invent a time.

------------------------------------------------------------------------

# 8. Dataset 1 --- susceptibility dataset

## Purpose

Dataset 1 answers:

> How inherently susceptible is this location to a landslide?

It must primarily contain static or slowly changing features.

Do not include current rainfall or future rainfall in Model 1.

## Required core schema

``` text
sample_id
latitude
longitude
state
district
elevation_m
slope_deg
aspect_deg
curvature
landcover
geology
geomorphology
hydrological_condition
distance_to_drainage_m
historical_ls_density
distance_to_historical_ls_m
label
```

Additional provenance columns are allowed if documented and
downstream-compatible.

------------------------------------------------------------------------

# 9. Dataset 1 feature engineering

## 9.1 Elevation

Derive:

``` text
elevation_m
```

from the available DEM, preferably SRTM or another authoritative
compatible DEM present in `data/raw/`.

Read units and nodata from metadata.

## 9.2 Slope

Derive:

``` text
slope_deg
```

from the DEM using a documented terrain-analysis method.

## 9.3 Aspect

Derive:

``` text
aspect_deg
```

and normalize to 0--360 degrees.

For undefined aspect on flat cells, use an explicit documented
convention.

## 9.4 Curvature

Derive:

``` text
curvature
```

using a documented method.

## 9.5 Land cover

Use an authoritative land-cover source or a documented Sentinel-2
classification.

If Sentinel-2 is used:

-   apply cloud/quality masking;
-   create a documented composite;
-   classify using a reproducible method;
-   validate enough for the prototype.

Do not use arbitrary RGB values as the `landcover` category.

## 9.6 Geology

Use authoritative geological data found in the raw data.

Do not invent geological categories.

## 9.7 Geomorphology

Use authoritative geomorphological data if available.

Do not manufacture geomorphology from arbitrary slope/elevation
thresholds and label it as authoritative.

## 9.8 Hydrological condition

Use available hydrological/wetness information.

Do not convert missing hydrological data to zero.

## 9.9 Distance to drainage

Calculate:

``` text
distance_to_drainage_m
```

from an authoritative drainage/hydrographic layer.

Use metre-based or geodesic distance.

## 9.10 Historical landslide density

Calculate:

``` text
historical_ls_density
```

using the processed landslide inventory.

Document:

-   inventory time range;
-   search radius/window;
-   normalization;
-   duplicate-event handling.

## 9.11 Distance to historical landslide

Calculate:

``` text
distance_to_historical_ls_m
```

to the nearest valid historical landslide.

------------------------------------------------------------------------

# 10. Dataset 1 labels

Target:

``` text
label
```

with:

``` text
1 = landslide
0 = control/non-landslide
```

### Positive samples

Use historical landslide locations.

For polygons, use a documented representative point or controlled
sampling strategy.

Do not massively oversample one event without documenting it.

### Negative/control samples

Generate controls only from valid NER areas and avoid:

-   known landslides;
-   configurable buffers around known landslides;
-   nodata/invalid terrain;
-   ambiguous locations.

Controls should be spatially and environmentally representative.

Document the negative-sampling method.

------------------------------------------------------------------------

# 11. Sentinel-2 processing

Sentinel-2 is primarily used for slowly changing/monthly features such
as:

``` text
landcover
vegetation
exposed_soil
surface_disturbance
```

Prefer Level-2A products.

Processing:

1.  inspect product metadata;
2.  identify bands and CRS;
3.  cloud-mask;
4.  reject unusable scenes;
5.  clip to NER;
6.  build monthly or otherwise documented composites;
7.  derive required features;
8.  aggregate to the project grid.

Monthly satellite refresh is an inference/feature-refresh operation, not
automatically model retraining.

Do not rewrite historical training labels when new satellite data
arrive.

------------------------------------------------------------------------

# 12. Sentinel-1 processing

Use Sentinel-1 primarily for:

``` text
satellite_change_score
```

and, only when a valid deformation workflow exists:

``` text
deformation_score
```

For the initial implementation, Sentinel-1 GRD is acceptable.

Do not call a GRD change metric physical deformation in millimetres.

Processing:

1.  identify compatible acquisitions;
2.  preprocess consistently;
3.  create temporal pairs/composites;
4.  calculate a documented change metric;
5.  aggregate to the project grid.

If Sentinel-1 data are unavailable or unusable, document that fact.

------------------------------------------------------------------------

# 13. Rainfall processing

Potential raw sources include:

-   IMD gridded rainfall;
-   NASA GPM IMERG;
-   other authoritative rainfall products actually present in
    `data/raw/`.

Normalize rainfall to:

``` text
mm
```

and timestamps to UTC internally.

Do not mix products without documenting the choice.

------------------------------------------------------------------------

# 14. Rainfall features

Dataset 2 requires:

``` text
rainfall_1h_mm
rainfall_3h_mm
rainfall_6h_mm
rainfall_12h_mm
rainfall_24h_mm
rainfall_72h_mm
rainfall_7d_mm
```

If half-hourly data are available, calculate the compatible rolling
accumulations correctly.

If a source is daily, it cannot legitimately create true 1-hour or
3-hour rainfall observations.

Use source metadata to determine the correct accumulation semantics.

Never treat missing rainfall as zero.

------------------------------------------------------------------------

# 15. GPM IMERG processing

If `.nc4` IMERG files exist:

1.  inspect dimensions;
2.  inspect variable names;
3.  inspect units;
4.  inspect time encoding;
5.  identify precipitation variable;
6.  convert to the correct accumulation units;
7.  spatially subset to NER;
8.  aggregate temporally;
9.  aggregate to the project grid.

Do not hard-code a variable name without inspecting the actual product.

For historical modelling, use Final products where available and
appropriate.

Do not retain unnecessary global data after deriving the required NER
intermediates unless archival retention is desired.

------------------------------------------------------------------------

# 16. SMAP processing

If SMAP HDF5/NetCDF files exist:

1.  inspect metadata;
2.  identify the soil-moisture variable;
3.  identify valid range and fill values;
4.  preserve missing values;
5.  convert units only when required;
6.  spatially subset/regrid to NER;
7.  aggregate to the project grid;
8.  preserve timestamps.

Final feature:

``` text
soil_moisture
```

Do not use missing SMAP values as zero.

Document the limitations of coarse soil-moisture observations in
mountainous terrain.

------------------------------------------------------------------------

# 17. Dataset 2 --- dynamic risk dataset

## Purpose

Dataset 2 answers:

> Given current environmental conditions, how elevated is landslide risk
> now and over future windows?

## Required core schema

``` text
sample_id
latitude
longitude
timestamp
base_susceptibility
rainfall_1h_mm
rainfall_3h_mm
rainfall_6h_mm
rainfall_12h_mm
rainfall_24h_mm
rainfall_72h_mm
rainfall_7d_mm
soil_moisture
forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm
landslide_within_6h
landslide_within_24h
landslide_within_48h
landslide_within_72h
```

------------------------------------------------------------------------

# 18. Dynamic timestamp rule

Each row represents prediction time:

``` text
T
```

Every input feature must represent information that could have been
available at or before `T`.

This is mandatory.

Do not use observed future rainfall as an input.

------------------------------------------------------------------------

# 19. Base susceptibility

`base_susceptibility` must be derived from Model 1.

For clean ML experimentation, use out-of-fold or spatially held-out
Model 1 predictions for rows used to train Model 2, rather than
predictions from a Model 1 trained directly on the same rows without
leakage control.

If Model 1 has not yet been trained, create the data-processing handoff
so the field can later be populated from Model 1 outputs. Do not
fabricate susceptibility values.

------------------------------------------------------------------------

# 20. Historical forecast rainfall --- critical leakage rule

Required fields:

``` text
forecast_rain_6h_mm
forecast_rain_24h_mm
forecast_rain_48h_mm
```

These must come from forecasts that would actually have been available
at prediction time.

Never construct a historical forecast by looking at observed future
rainfall.

If archived forecast data are present in `data/raw/`:

-   identify forecast issuance time;
-   identify target horizon;
-   match the forecast to prediction time;
-   document the matching rule.

If historical forecast archives are absent:

-   do not fabricate forecast values;
-   do not rename observed future rainfall as forecast rainfall;
-   preserve the required columns as missing if schema compatibility
    requires them;
-   document that a forecast-aware training configuration cannot be
    honestly completed until historical forecast data are supplied.

------------------------------------------------------------------------

# 21. Future-event targets

For each prediction time `T` create:

``` text
landslide_within_6h
landslide_within_24h
landslide_within_48h
landslide_within_72h
```

Definitions:

``` text
landslide_within_6h  = 1 if a valid event occurs in (T, T+6h]
landslide_within_24h = 1 if a valid event occurs in (T, T+24h]
landslide_within_48h = 1 if a valid event occurs in (T, T+48h]
landslide_within_72h = 1 if a valid event occurs in (T, T+72h]
```

Use only observed historical landslide events for target generation.

If source timestamps have only day-level precision, document the
uncertainty and do not claim event-time precision the source does not
support.

------------------------------------------------------------------------

# 22. Spatial event matching

Associate future events to prediction samples/grid cells using a
documented method.

Preferred:

1.  polygon intersection where polygons exist;
2.  otherwise point-to-cell assignment;
3.  otherwise a documented configurable spatial radius.

Record the matching method and radius.

Do not silently choose a radius that artificially inflates target
positives.

------------------------------------------------------------------------

# 23. Temporal sampling

Choose a prediction-time frequency supported by the available source
data.

Possible approach:

``` text
hourly
```

if the rainfall data support it.

Avoid unnecessary millions of near-duplicate rows.

Ensure each `sample_id + timestamp` pair is unique.

Do not create negative rows from periods where the required observation
data are unavailable.

------------------------------------------------------------------------

# 24. Missing-data policy

Mandatory:

``` text
missing rainfall != 0
missing soil moisture != 0
missing satellite observation != 0
missing forecast != observed future rainfall
```

Use explicit missing-value handling.

For numeric XGBoost features, NaN may be retained where appropriate.

For categorical variables, use an explicit documented missing category
or another reproducible encoding.

Report missing counts and percentages for every final column.

------------------------------------------------------------------------

# 25. Physical-range validation

Check at minimum:

``` text
latitude       -90 to 90
longitude      -180 to 180
slope_deg      0 to 90
aspect_deg     0 to 360
rainfall       >= 0
targets        0 or 1
```

Check soil moisture and elevation against the actual product metadata
and valid ranges.

Do not silently clip suspicious values.

------------------------------------------------------------------------

# 26. Leakage prevention

The pipeline must prevent:

-   future observed rainfall becoming a forecast feature;
-   future soil moisture entering prediction features;
-   landslide labels influencing current input features;
-   duplicated event samples crossing train/test spatial boundaries
    without documentation;
-   Model 1 target leakage into Model 2.

Primary later evaluation should use spatial/temporal strategies such as:

``` text
spatial block split
district holdout
state holdout where feasible
temporal/event holdout
```

Do not rely only on random row-level train/test splitting.

------------------------------------------------------------------------

# 27. Deduplication

Before writing final CSVs:

Dataset 1:

``` text
sample_id
```

must be unique.

Dataset 2:

``` text
sample_id + timestamp
```

must be unique.

Remove exact duplicates and document any non-trivial deduplication.

------------------------------------------------------------------------

# 28. Validation script

Create:

``` text
ml/data_validation/validate_final_datasets.py
```

It must return a non-zero exit code when critical checks fail.

Validate:

### Dataset 1

-   required columns;
-   non-zero row count;
-   valid coordinates;
-   all samples inside NER;
-   labels only 0/1;
-   both positive and negative classes;
-   unique sample IDs;
-   reasonable terrain-feature coverage;
-   no dynamic rainfall leakage.

### Dataset 2

-   required columns;
-   timestamps parse;
-   unique sample/time keys;
-   valid coordinates;
-   valid target values;
-   rainfall values/ranges;
-   no future observed rainfall masquerading as forecasts;
-   spatial/temporal target matching;
-   missingness report.

------------------------------------------------------------------------

# 29. Reproducible pipeline

Create:

``` text
scripts/process_all_data.py
```

Running:

``` bash
python scripts/process_all_data.py
```

should execute the pipeline.

Recommended order:

``` text
1. inventory raw files
2. validate raw files
3. load NER boundaries
4. process landslide inventory
5. process DEM
6. process drainage/hydrology
7. process geology
8. process geomorphology
9. process land cover
10. process Sentinel-2
11. process Sentinel-1
12. process rainfall
13. process SMAP
14. build master grid
15. build susceptibility dataset
16. build dynamic observations
17. build future-event targets
18. validate final datasets
19. generate reports
```

Stages should be rerunnable without corrupting raw data or unrelated
outputs.

------------------------------------------------------------------------

# 30. Efficiency

Do not load the entire global satellite/raster archive into memory.

Use:

-   spatial windowing;
-   chunked NetCDF access;
-   raster windows;
-   spatial indexes;
-   vectorized operations;
-   parquet intermediates;
-   cached processed results.

After initial inspection, process only the NER region whenever possible.

------------------------------------------------------------------------

# 31. Monthly satellite update

Keep historical training data separate from current satellite feature
refreshes.

Architecture:

``` text
historical raw data
      ↓
historical processing
      ↓
training datasets

latest Sentinel data
      ↓
monthly feature extraction
      ↓
latest feature layer
      ↓
Model 1 inference
      ↓
updated susceptibility map
```

Do not automatically rewrite historical training labels when a new
monthly image arrives.

------------------------------------------------------------------------

# 32. Final data dictionary

Create:

``` text
docs/data/DATA_DICTIONARY.md
```

For every final field document:

-   field name;
-   description;
-   unit;
-   source;
-   processing method;
-   spatial resolution;
-   temporal resolution;
-   missing-value policy;
-   static/dynamic;
-   input/target status.

------------------------------------------------------------------------

# 33. Source documentation

Create:

``` text
docs/data/DATA_SOURCES.md
```

For every raw source record:

``` text
provider
dataset/product
version
filename(s)
downloaded date if available
spatial coverage
temporal coverage
resolution
processing performed
license/access notes
```

Use metadata from the actual files where possible. Do not invent
metadata.

------------------------------------------------------------------------

# 34. Quality report

Create:

``` text
docs/data/DATA_QUALITY_REPORT.md
```

Include:

-   raw files discovered;
-   usable/unusable files;
-   row/feature counts;
-   spatial coverage;
-   temporal coverage;
-   missingness;
-   invalid records;
-   duplicate counts;
-   class balance;
-   forecast availability;
-   Sentinel-1 availability;
-   Sentinel-2 availability;
-   SMAP availability;
-   leakage checks;
-   known limitations.

------------------------------------------------------------------------

# 35. Processing report

Create:

``` text
docs/data/PROCESSING_REPORT.md
```

Document:

1.  NER boundary;
2.  analysis-grid resolution;
3.  CRS choices;
4.  landslide deduplication;
5.  positive sampling;
6.  negative sampling;
7.  DEM derivation;
8.  rainfall aggregation;
9.  soil-moisture processing;
10. Sentinel processing;
11. spatial event matching;
12. temporal event matching;
13. missing-data handling;
14. forecast availability;
15. leakage controls;
16. final row counts;
17. feature coverage;
18. assumptions and limitations.

------------------------------------------------------------------------

# 36. Final acceptance criteria

The task is complete only when:

``` text
[ ] raw data inventory completed
[ ] source metadata documented
[ ] NER boundary established
[ ] landslide inventory processed
[ ] master spatial grid created
[ ] DEM features generated
[ ] rainfall features generated
[ ] soil-moisture features generated
[ ] Sentinel-2 processed where usable
[ ] Sentinel-1 processed where usable
[ ] susceptibility_dataset.csv created
[ ] dynamic_risk_dataset.csv created
[ ] future targets generated without leakage
[ ] forecast availability verified
[ ] final validation passes
[ ] DATA_DICTIONARY.md created
[ ] DATA_SOURCES.md created
[ ] DATA_QUALITY_REPORT.md created
[ ] PROCESSING_REPORT.md created
[ ] pipeline is reproducible
```

If an expected source is absent or unusable, do not fake it. Complete
all valid processing and clearly mark the missing capability in the
reports.

------------------------------------------------------------------------

# 37. Final agent report

At completion, report:

``` text
NER LANDSLIDE DATA PROCESSING
==============================

Raw files discovered:       N
Raw files usable:           N

Landslide events:           N
Analysis-grid samples:      N

Susceptibility rows:        N
Dynamic rows:               N

Positive susceptibility:    N
Negative susceptibility:    N

6h positive targets:        N
24h positive targets:       N
48h positive targets:       N
72h positive targets:       N

Rainfall available:         YES/NO
SMAP available:             YES/NO
Sentinel-1 usable:          YES/NO
Sentinel-2 usable:          YES/NO
Historical forecasts:       YES/NO

Validation status:          PASS/FAIL

Final datasets:
data/final/susceptibility_dataset.csv
data/final/dynamic_risk_dataset.csv
```

Do not report `PASS` if any critical validation gate fails.
