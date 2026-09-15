# GARUD DRISHTI Data Sources & Provenance

| Provider / Agency | Dataset / Product Name | Version / Date | Spatial Extent | Resolution / Scale | Storage Location in Raw |
|---|---|---|---|---|---|
| **Geological Survey of India (GSI)** | National Landslide Inventory | Official GSI Report | North Eastern Region (8 States) | Point Locations (13,246 georeferenced) | `data/raw/gsi/` |
| **ISRO / NRSC** | Landslide Atlas of India | 2023 Edition | National / NER Districts | District-Level Vulnerability | `data/raw/landslide_atlas/` |
| **USGS / NASA / Viewfinder** | SRTM Digital Elevation Model | DEM3 (~90m) | 20°N–32°N, 84°E–102°E (288 tiles) | ~90m / 3 arc-seconds | `data/raw/dem/srtm/` |
| **ESA (European Space Agency)** | ESA WorldCover Land Cover | 2021 (v200) | Full NER (12 GeoTIFF tiles) | 10m optical grid | `data/raw/lulc/esa_worldcover/` |
| **ISRIC World Soil Information** | SoilGrids WRB & Parent Material | 2.0 (2020) | Global / NER Window | ~250m gridded | `data/raw/geology/` |
| **India Meteorological Dept (IMD)** | Daily Gridded Rainfall | 2025 (RF25) | Pan-India | 0.25° x 0.25° (~25km) | `data/raw/RF25_ind2025_rfp25.nc` |
| **NASA GES DISC** | GPM IMERG Daily Precipitation | Version 07B | Global / NER Window | 0.1° x 0.1° (~10km) | `data/raw/rainfall/gpm/daily/` |
| **NASA GES DISC** | GPM IMERG Half-Hourly Precipitation | Version 07B | Global / NER Window | 0.1° x 0.1° (30-min intervals) | `data/raw/rainfall/gpm/half_hourly/` |
| **NASA NSIDC** | SMAP Enhanced L3 Soil Moisture | SPL3SMP_E (v006) | Global / NER Window | 9km EASE-Grid 2.0 | `data/raw/soil_moisture/smap/` |
| **Copernicus / ESA** | Sentinel-1 SAR GRD | Level-1 GRD | NER Hotspot Corridors | ~10m SAR | `data/raw/sentinel1/` |
| **Copernicus / ESA** | Sentinel-2 Optical MSI | Level-2A BOA | NER Hotspot Corridors | 10m / 20m Multispectral | `data/raw/sentinel2/` |
| **GADM / OpenStreetMap** | Administrative Boundaries & Roads | GADM v4.1 / Geofabrik | All 8 NER States | High-precision vector | `data/raw/boundaries/` & `north-eastern-zone.gpkg` |
