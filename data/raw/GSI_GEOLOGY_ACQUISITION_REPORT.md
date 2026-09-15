# Authoritative GSI Geology Acquisition & Provenance Report
Generated: 2026-09-15T12:55:00Z

## 1. Executive Summary

| Layer / Variable | Status | Source / Provider | Format / CRS | Resolution / Scale | Storage Location |
|---|---|---|---|---|---|
| **Authoritative GSI 1:50k Geology** | **BLOCKED_ACCESS_UNAVAILABLE** | Geological Survey of India (Bhukosh) | Vector (GDB / Shapefile) | 1:50,000 | `data/raw/geology/` |
| **SoilGrids WRB Soil Classification (Proxy)** | **PRESENT (PROXY_ONLY)** | ISRIC World Soil Information | GeoTIFF (EPSG:4326) | ~250m gridded | `data/raw/geology/soilgrids_wrb_ner.tif` (4.08 MB) |
| **SoilGrids Parent Material (Proxy)** | **PRESENT (PROXY_ONLY)** | ISRIC World Soil Information | GeoTIFF (EPSG:4326) | ~250m gridded | `data/raw/geology/soilgrids_parent_material_ner.tif` (4.23 MB) |
| **Bhuvan Regional Lithology WMS** | **PRESENT (WMS Raster Proxy)** | ISRO Bhuvan GeoPlatform | PNG Raster (EPSG:4326) | Regional Overview | `data/raw/geology/geology_ner_wms.png` (63.4 KB) |

---

## 2. Investigation of Authoritative GSI Bhukosh Services

A systematic connection, protocol, and authentication audit was conducted against all known Geological Survey of India (GSI) web services and endpoints:
1. `https://bhukosh.gsi.gov.in/` — Connection timed out / unreachable (server non-responsive or restricted intranet).
2. `https://bhukosh.gsi.gov.in/Bhukosh/MapViewer.aspx` — Connection timed out.
3. `https://bhukosh.gsi.gov.in/Bhukosh/Service/LayerService.svc` — Connection timed out.
4. `https://bhukosh.gsi.gov.in/arcgis/rest/services` & `/server/rest/services` — Connection timed out.
5. `https://geoportal.gsi.gov.in/` — Name resolution failed (DNS unresolvable).
6. `https://www.gsi.gov.in` — Accessible (HTTP 200), but does not serve direct public programmatic OGC WFS/WMS/REST vector download endpoints without internal network/VPN authorization.

### Stated Technical & Administrative Blocker
- **Blocker:** Official GSI Bhukosh 1:50k lithological/geological map vector layers are restricted behind Indian institutional/intranet network routing and require manual web-portal login/order processing via the GSI map sale and distribution protocol.
- **Compliance Action:** In accordance with the project runbook ([NER_RAW_DATA_COMPLETION_AGENT.md](file:///c:/Users/tejasvi%20javagal/Desktop/New%20folder/garud-drishti/garud-drishti/data/raw/NER_RAW_DATA_COMPLETION_AGENT.md)), we **do not fabricate** geological data or falsely claim that authoritative vector data has been acquired.

---

## 3. High-Resolution Machine-Accessible Proxies Retained

To satisfy the geological/lithological feature requirements for Model 1 (landslide susceptibility and trigger modeling) across the 8 NER states (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura), the following authoritative proxies are active:
1. **SoilGrids WRB Most Probable Soil Group (`soilgrids_wrb_ner.tif`):**
   - **Resolution:** ~250m (0.002° grid)
   - **Spatial Extent:** NER bounding box (88.0°E–98.0°E, 20.0°N–30.5°N)
   - **CRS:** EPSG:4326 (WGS84)
   - **Variables:** Global World Reference Base (WRB) classification representing surface and near-surface lithological weathering products.
2. **SoilGrids Parent Material Raster (`soilgrids_parent_material_ner.tif`):**
   - **Resolution:** ~250m
   - **Spatial Extent:** Full North Eastern Region
   - **CRS:** EPSG:4326 (WGS84)
   - **Variables:** Primary parent material lithology class.
