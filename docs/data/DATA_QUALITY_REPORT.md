# GARUD DRISHTI Data Quality & Integrity Report
Generated: 2026-09-15T13:07:17.308339+00:00

## 1. Summary of Processed Datasets

- **Susceptibility Dataset Rows:** 1640 (Positives: 820, Controls: 820)
- **Dynamic Risk Dataset Rows:** 3000
- **Geocoded Historical Landslides Inside NER:** 820

## 2. Missingness Analysis

### Dataset 1: Susceptibility
| Susceptibility Feature | Missing Count |
| :--- | :--- |
| sample_id | 0 |
| latitude | 0 |
| longitude | 0 |
| state | 0 |
| district | 0 |
| elevation_m | 0 |
| slope_deg | 0 |
| aspect_deg | 0 |
| curvature | 0 |
| landcover | 0 |
| geology | 0 |
| geomorphology | 0 |
| hydrological_condition | 0 |
| distance_to_drainage_m | 0 |
| historical_ls_density | 0 |
| distance_to_historical_ls_m | 0 |
| label | 0 |

### Dataset 2: Dynamic Risk
| Dynamic Feature | Missing Count |
| :--- | :--- |
| sample_id | 0 |
| latitude | 0 |
| longitude | 0 |
| timestamp | 0 |
| base_susceptibility | 0 |
| rainfall_1h_mm | 0 |
| rainfall_3h_mm | 0 |
| rainfall_6h_mm | 0 |
| rainfall_12h_mm | 0 |
| rainfall_24h_mm | 0 |
| rainfall_72h_mm | 0 |
| rainfall_7d_mm | 0 |
| soil_moisture | 0 |
| forecast_rain_6h_mm | 0 |
| forecast_rain_24h_mm | 0 |
| forecast_rain_48h_mm | 0 |
| landslide_within_6h | 0 |
| landslide_within_24h | 0 |
| landslide_within_48h | 0 |
| landslide_within_72h | 0 |

## 3. Physical Range Validation Checks
- **Latitude:** [22.05°, 27.89°] (Valid: inside 20°N–30.5°N)
- **Longitude:** [89.84°, 95.96°] (Valid: inside 88°E–98°E)
- **Elevation:** [15.0m, 2985.0m]
- **Slope:** [0.0°, 43.8°]
- **Rainfall (24h):** [15.9mm, 275.8mm]
- **Soil Moisture:** [0.233, 0.550]
- **Target Distribution:**
  - 6h positives: 1266 (42.2%)
  - 24h positives: 1537 (51.2%)
  - 72h positives: 1810 (60.3%)

## 4. Anti-Leakage Compliance
- Static Model 1 does not use dynamic rainfall or real-time soil moisture.
- Dynamic Model 2 does not use future observed rainfall as forecast inputs.
- All target horizons ($T+6h, T+24h, T+48h, T+72h$) are strictly forward-looking relative to prediction timestamp $T$.
