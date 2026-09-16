# GARUD DRISHTI Data Processing Pipeline Execution Report

## Execution Details
- **Timestamp:** 2026-09-15T13:07:17.315717+00:00
- **Script:** `scripts/process_all_data.py`
- **Output Files:**
  - `data/final/susceptibility_dataset.csv` (1640 rows)
  - `data/final/dynamic_risk_dataset.csv` (3000 rows)

## Pipeline Stages Executed
1. **Raw Inventory:** Verified presence of GSI, ISRO, SRTM DEM, ESA WorldCover, SoilGrids, IMD, GPM, SMAP, and Sentinel-1/2 data.
2. **Spatial Boundary Normalization:** 8 NER state boundaries extracted from GADM v4.1 (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura).
3. **Historical Inventory Parsing:** Cleaned and deduplicated 13,246 geocoded landslide points from official GSI reports.
4. **Terrain Analysis:** Extracted elevation, slope, aspect, and profile curvature from 288 SRTM HGT tiles.
5. **Static Feature Engineering:** Linked ESA WorldCover LULC classes, SoilGrids lithological proxies, geomorphic units, drainage channel proximity, and landslide spatial density.
6. **Dynamic Feature Integration:** Assembled hourly-to-daily rainfall accumulations, SMAP volumetric soil moisture, and forward-looking hazard triggers without data leakage.
