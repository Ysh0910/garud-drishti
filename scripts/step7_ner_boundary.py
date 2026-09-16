"""
Step 7: Obtain NER administrative boundary.
Uses the OSM GeoPackage already present (north-eastern-zone.gpkg)
to derive NER state boundaries, and also queries a public GADM/Natural Earth
source as a fallback for administrative boundaries.
"""
import json
import re
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
BOUNDARY_DIR = RAW_DIR / "boundaries"
BOUNDARY_DIR.mkdir(parents=True, exist_ok=True)

OSM_GPKG = RAW_DIR / "north-eastern-zone.gpkg"

NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura"
]

# Approximate bounding boxes for NER states (WGS84)
NER_STATE_APPROX_BOUNDS = {
    "Arunachal Pradesh": {"min_lat": 26.6, "max_lat": 29.5, "min_lon": 91.5, "max_lon": 97.4},
    "Assam":             {"min_lat": 24.1, "max_lat": 27.9, "min_lon": 89.7, "max_lon": 96.0},
    "Manipur":           {"min_lat": 23.8, "max_lat": 25.7, "min_lon": 92.9, "max_lon": 94.8},
    "Meghalaya":         {"min_lat": 25.0, "max_lat": 26.1, "min_lon": 89.8, "max_lon": 92.8},
    "Mizoram":           {"min_lat": 21.9, "max_lat": 24.5, "min_lon": 92.2, "max_lon": 93.4},
    "Nagaland":          {"min_lat": 25.2, "max_lat": 27.0, "min_lon": 93.3, "max_lon": 95.2},
    "Sikkim":            {"min_lat": 27.1, "max_lat": 28.1, "min_lon": 88.0, "max_lon": 88.9},
    "Tripura":           {"min_lat": 22.9, "max_lat": 24.5, "min_lon": 91.1, "max_lon": 92.3},
}


def get_ner_boundary_from_osm():
    """
    Extract NER boundary from OSM GeoPackage using admin_level relations.
    """
    import geopandas as gpd
    import pyogrio

    report = {
        "method": "OSM GeoPackage extraction",
        "source": str(OSM_GPKG),
        "status": "UNKNOWN",
        "layers_checked": [],
        "features_found": 0,
        "states_found": [],
        "warnings": []
    }

    try:
        layer_array = pyogrio.list_layers(OSM_GPKG)
        layers = [row[0] for row in layer_array]
        report["layers_available"] = layers

        # Look for administrative boundary layers
        admin_layers = [l for l in layers if any(
            kw in l.lower() for kw in ["admin", "boundary", "relation", "area", "multipolygon"]
        )]
        report["layers_checked"] = admin_layers

        boundary_gdf = None
        for layer in admin_layers:
            try:
                print(f"    Checking layer: {layer}")
                gdf = gpd.read_file(OSM_GPKG, layer=layer)

                if gdf.empty:
                    continue

                # Look for state-level features
                name_cols = [c for c in gdf.columns if "name" in c.lower()]
                admin_cols = [c for c in gdf.columns if "admin" in c.lower()]

                state_features = []
                for state in NER_STATES:
                    for col in name_cols:
                        matches = gdf[gdf[col].astype(str).str.contains(
                            state[:6], case=False, na=False
                        )]
                        if not matches.empty:
                            state_features.append((state, len(matches), col))

                if state_features:
                    report["layers_checked"].append({
                        "layer": layer,
                        "state_matches": state_features
                    })

                    # Try to extract state polygons
                    state_gdfs = []
                    for state in NER_STATES:
                        for col in name_cols:
                            mask = gdf[col].astype(str).str.contains(state[:6], case=False, na=False)
                            s_gdf = gdf[mask].copy()
                            if not s_gdf.empty:
                                s_gdf["ner_state"] = state
                                state_gdfs.append(s_gdf)
                                break

                    if state_gdfs:
                        import pandas as pd
                        combined = pd.concat(state_gdfs, ignore_index=True)
                        if boundary_gdf is None or len(combined) > len(boundary_gdf):
                            boundary_gdf = combined
                            report["best_layer"] = layer

            except Exception as e:
                report["warnings"].append(f"Layer {layer}: {str(e)}")
                continue

        if boundary_gdf is not None and not boundary_gdf.empty:
            # Ensure CRS is WGS84
            if boundary_gdf.crs is None:
                boundary_gdf = boundary_gdf.set_crs("EPSG:4326")
            elif boundary_gdf.crs.to_epsg() != 4326:
                boundary_gdf = boundary_gdf.to_crs("EPSG:4326")

            states_found = list(boundary_gdf["ner_state"].unique()) if "ner_state" in boundary_gdf.columns else []
            report["states_found"] = states_found
            report["features_found"] = len(boundary_gdf)
            report["status"] = "SUCCESS"
            return boundary_gdf, report
        else:
            report["status"] = "NO_ADMIN_BOUNDARIES_FOUND"
            report["warnings"].append(
                "OSM GeoPackage did not contain extractable NER state boundaries. "
                "OSM admin boundaries in the NER extract may use different attribute schemas."
            )
            return None, report

    except Exception as e:
        report["status"] = f"ERROR: {str(e)}"
        report["warnings"].append(str(e))
        return None, report


def create_approximate_ner_boundary():
    """
    Create an approximate NER boundary GeoJSON from known bounding box coordinates.
    This is a documented fallback — NOT a precise administrative boundary.
    """
    from shapely.geometry import box, mapping

    features = []
    for state, bounds in NER_STATE_APPROX_BOUNDS.items():
        geom = box(bounds["min_lon"], bounds["min_lat"],
                   bounds["max_lon"], bounds["max_lat"])
        features.append({
            "type": "Feature",
            "geometry": mapping(geom),
            "properties": {
                "state": state,
                "geometry_type": "APPROXIMATE_BOUNDING_BOX",
                "confidence": "LOW",
                "note": "Approximate bounding box only. Not a precise administrative boundary.",
                "source": "Manually compiled from known state extents",
            }
        })

    # Overall NER bbox
    all_lats = [v for b in NER_STATE_APPROX_BOUNDS.values() for v in [b["min_lat"], b["max_lat"]]]
    all_lons = [v for b in NER_STATE_APPROX_BOUNDS.values() for v in [b["min_lon"], b["max_lon"]]]
    ner_bbox = box(min(all_lons), min(all_lats), max(all_lons), max(all_lats))
    features.append({
        "type": "Feature",
        "geometry": mapping(ner_bbox),
        "properties": {
            "state": "NER_COMBINED",
            "geometry_type": "APPROXIMATE_BOUNDING_BOX",
            "confidence": "LOW",
            "note": "Approximate NER overall bounding box.",
            "source": "Manually compiled"
        }
    })

    return {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
        "properties": {
            "WARNING": "APPROXIMATE BOUNDING BOXES ONLY — NOT precise administrative boundaries",
            "states": list(NER_STATE_APPROX_BOUNDS.keys()),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "intended_use": "Spatial filter only. Replace with authoritative boundary for production."
        }
    }


def query_gadm_boundary():
    """
    Attempt to download India state boundaries from GADM via their API.
    """
    import requests

    # GADM provides GeoJSON for administrative boundaries
    # Level 1 = states
    url = "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IND_1.json"

    try:
        print("  Attempting GADM India states download...")
        resp = requests.get(url, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            # Filter for NER states
            ner_features = []
            ner_state_keywords = [s.lower() for s in NER_STATES]
            for feature in data.get("features", []):
                state_name = feature.get("properties", {}).get("NAME_1", "")
                if any(kw in state_name.lower() for kw in ner_state_keywords):
                    ner_features.append(feature)

            if ner_features:
                return {
                    "type": "FeatureCollection",
                    "features": ner_features,
                    "properties": {
                        "source": "GADM v4.1",
                        "source_url": url,
                        "level": "ADM1 (State)",
                        "country": "India",
                        "states_found": [f["properties"].get("NAME_1", "") for f in ner_features],
                        "generated_at": datetime.utcnow().isoformat() + "Z",
                        "license": "GADM data are freely available for academic and non-commercial use"
                    }
                }, len(ner_features)
            else:
                return None, 0
        else:
            return None, 0
    except Exception as e:
        print(f"  GADM download failed: {e}")
        return None, 0


def main():
    print("\n=== Step 7: NER Administrative Boundary ===\n")

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "status": "IN_PROGRESS",
        "methods_attempted": [],
        "final_source": None,
        "states_covered": [],
        "notes": []
    }

    # Method 1: Try OSM GeoPackage
    print("  Method 1: Extracting from OSM GeoPackage...")
    osm_gdf, osm_report = get_ner_boundary_from_osm()
    report["methods_attempted"].append({"method": "OSM_GPKG", "result": osm_report["status"]})

    boundary_saved = False

    if osm_gdf is not None:
        out_path = BOUNDARY_DIR / "ner_boundary.gpkg"
        if not out_path.exists():
            osm_gdf.to_file(out_path, driver="GPKG")
        geojson_path = BOUNDARY_DIR / "ner_boundary_from_osm.geojson"
        if not geojson_path.exists():
            osm_gdf.to_file(geojson_path, driver="GeoJSON")
        print(f"  Saved OSM-derived boundary → {out_path}")
        report["final_source"] = "OSM_GPKG"
        report["states_covered"] = osm_report.get("states_found", [])
        boundary_saved = True
    else:
        print(f"  OSM extraction: {osm_report['status']}")

    # Method 2: Try GADM
    print("  Method 2: Attempting GADM download...")
    gadm_data, n_states = query_gadm_boundary()
    report["methods_attempted"].append({
        "method": "GADM_v4.1",
        "result": f"SUCCESS ({n_states} states)" if gadm_data else "FAILED"
    })

    if gadm_data:
        gadm_path = BOUNDARY_DIR / "ner_boundary_gadm.geojson"
        with open(gadm_path, "w", encoding="utf-8") as f:
            json.dump(gadm_data, f)
        print(f"  Saved GADM boundary → {gadm_path} ({n_states} states)")

        if not boundary_saved:
            report["final_source"] = "GADM_v4.1"
            report["states_covered"] = [f["properties"].get("NAME_1", "") for f in gadm_data["features"]]
            boundary_saved = True

        # Also save as GPKG
        if not (BOUNDARY_DIR / "ner_boundary.gpkg").exists() or not boundary_saved:
            try:
                import geopandas as gpd
                gdf = gpd.read_file(gadm_path)
                gdf.to_file(BOUNDARY_DIR / "ner_boundary.gpkg", driver="GPKG")
            except Exception as e:
                report["notes"].append(f"Could not save GADM as GPKG: {e}")

    # Method 3: Always create approximate fallback
    print("  Method 3: Creating approximate bounding box fallback...")
    approx_boundary = create_approximate_ner_boundary()
    approx_path = BOUNDARY_DIR / "ner_boundary_approximate.geojson"
    with open(approx_path, "w", encoding="utf-8") as f:
        json.dump(approx_boundary, f, indent=2)
    print(f"  Saved approximate boundary → {approx_path}")
    report["methods_attempted"].append({
        "method": "APPROXIMATE_BBOXES",
        "result": "ALWAYS_CREATED"
    })

    if not boundary_saved:
        report["final_source"] = "APPROXIMATE_BBOXES"
        report["states_covered"] = list(NER_STATE_APPROX_BOUNDS.keys())
        report["notes"].append(
            "WARNING: Only approximate bounding boxes available. "
            "Authoritative boundary needed for production use."
        )

    report["status"] = "COMPLETED" if boundary_saved else "PARTIAL"
    report["boundary_files"] = [str(p) for p in BOUNDARY_DIR.glob("*")]

    # Write report
    report_path = BOUNDARY_DIR / "boundary_acquisition_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Boundary report → {report_path}")
    print(f"  Final source: {report['final_source']}")
    print(f"  States covered: {report['states_covered']}")


if __name__ == "__main__":
    main()
