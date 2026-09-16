# GARUD DRISHTI Data Dictionary

## 1. Dataset 1: Static Landslide Susceptibility (`data/final/susceptibility_dataset.csv`)

| Column Name | Data Type | Units / Format | Description | Source / Extraction Method | Static / Dynamic | Target / Input |
|---|---|---|---|---|---|---|
| `sample_id` | String | Identifier | Unique spatial sample point identifier (`SMP_XXXXXX`) | System Generated | Static | Identifier |
| `latitude` | Float | Degrees North (WGS84) | Latitude coordinate | GSI Inventory / Spatial Grid | Static | Spatial Reference |
| `longitude` | Float | Degrees East (WGS84) | Longitude coordinate | GSI Inventory / Spatial Grid | Static | Spatial Reference |
| `state` | String | Text | Indian State Name within NER | GADM Administrative Boundaries | Static | Metadata |
| `district` | String | Text | District Name within NER | GADM Administrative Boundaries | Static | Metadata |
| `elevation_m` | Float | Meters above MSL | Terrain elevation | SRTM 90m DEM | Static | Input Feature |
| `slope_deg` | Float | Degrees (0-90°) | Topographic slope angle | DEM Horn/Zevenbergen derivative | Static | Input Feature |
| `aspect_deg` | Float | Degrees (0-360°) | Topographic aspect direction (clockwise from North) | DEM Gradient derivative | Static | Input Feature |
| `curvature` | Float | 1/100 m | Terrain surface profile curvature | DEM 2nd derivative | Static | Input Feature |
| `landcover` | String | Categorical | Land use and land cover class | ESA WorldCover 10m (2021 v200) | Static | Input Feature |
| `geology` | String | Categorical | Lithological / soil parent group classification | SoilGrids WRB Most Probable Group | Static | Input Feature |
| `geomorphology` | String | Categorical | Geomorphological landform unit | DEM-derived landform classification | Static | Input Feature |
| `hydrological_condition` | String | Categorical | Topographic wetness and drainage convergence index | Curvature / drainage convergence | Static | Input Feature |
| `distance_to_drainage_m` | Float | Meters | Geodesic distance to nearest drainage/stream channel | OSM Drainage / Flow Accumulation | Static | Input Feature |
| `historical_ls_density` | Float | Landslides / km² | Spatial density of known landslide events within 5km | GSI Landslide Inventory BallTree KDE | Static | Input Feature |
| `distance_to_historical_ls_m`| Float | Meters | Geodesic distance to nearest historical landslide | GSI Landslide Inventory BallTree | Static | Input Feature |
| `label` | Integer | Binary (0 / 1) | Landslide presence (1) vs. Control non-landslide (0) | Ground Truth Landslide Inventory | Static | **Target (Model 1)** |

---

## 2. Dataset 2: Dynamic Landslide Risk (`data/final/dynamic_risk_dataset.csv`)

| Column Name | Data Type | Units / Format | Description | Source / Extraction Method | Static / Dynamic | Target / Input |
|---|---|---|---|---|---|---|
| `sample_id` | String | Identifier | Unique spatial point identifier | Linked to Dataset 1 | Static | Identifier |
| `latitude` | Float | Degrees North (WGS84) | Latitude coordinate | Linked to Dataset 1 | Static | Spatial Reference |
| `longitude` | Float | Degrees East (WGS84) | Longitude coordinate | Linked to Dataset 1 | Static | Spatial Reference |
| `timestamp` | String | ISO 8601 UTC | Observation / Prediction Time ($T$) | Prediction Epoch | Dynamic | Temporal Key |
| `base_susceptibility` | Float | Probability [0.0 - 1.0] | Baseline static terrain susceptibility score | Model 1 Output / Out-of-fold score | Static/Handoff | Input Feature |
| `rainfall_1h_mm` | Float | mm | Accumulated rainfall in $(T-1h, T]$ | GPM Half-Hourly IMERG | Dynamic | Input Feature |
| `rainfall_3h_mm` | Float | mm | Accumulated rainfall in $(T-3h, T]$ | GPM Half-Hourly IMERG | Dynamic | Input Feature |
| `rainfall_6h_mm` | Float | mm | Accumulated rainfall in $(T-6h, T]$ | GPM Half-Hourly / IMD | Dynamic | Input Feature |
| `rainfall_12h_mm` | Float | mm | Accumulated rainfall in $(T-12h, T]$ | GPM IMERG | Dynamic | Input Feature |
| `rainfall_24h_mm` | Float | mm | Accumulated rainfall in $(T-24h, T]$ | GPM Daily IMERG / IMD | Dynamic | Input Feature |
| `rainfall_72h_mm` | Float | mm | 3-day antecedent accumulated rainfall | GPM Daily IMERG | Dynamic | Input Feature |
| `rainfall_7d_mm` | Float | mm | 7-day antecedent accumulated rainfall | GPM Daily IMERG | Dynamic | Input Feature |
| `soil_moisture` | Float | $	ext{m}^3/	ext{m}^3$ | Volumetric root-zone / surface soil moisture | NASA SMAP Level-3 Enhanced (9km) | Dynamic | Input Feature |
| `forecast_rain_6h_mm` | Float | mm | Numerical weather prediction forecast $(T, T+6h]$ | Atmospheric Forecast Model | Dynamic | Input Feature |
| `forecast_rain_24h_mm` | Float | mm | Numerical weather prediction forecast $(T, T+24h]$ | Atmospheric Forecast Model | Dynamic | Input Feature |
| `forecast_rain_48h_mm` | Float | mm | Numerical weather prediction forecast $(T, T+48h]$ | Atmospheric Forecast Model | Dynamic | Input Feature |
| `landslide_within_6h` | Integer | Binary (0 / 1) | Landslide occurrence in $(T, T+6h]$ | Historical Event Verification | Dynamic | **Target (Model 2)** |
| `landslide_within_24h`| Integer | Binary (0 / 1) | Landslide occurrence in $(T, T+24h]$ | Historical Event Verification | Dynamic | **Target (Model 2)** |
| `landslide_within_48h`| Integer | Binary (0 / 1) | Landslide occurrence in $(T, T+48h]$ | Historical Event Verification | Dynamic | **Target (Model 2)** |
| `landslide_within_72h`| Integer | Binary (0 / 1) | Landslide occurrence in $(T, T+72h]$ | Historical Event Verification | Dynamic | **Target (Model 2)** |
