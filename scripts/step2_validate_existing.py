"""
Step 2: Validate existing files — IMD NetCDF, SRTM ZIP, SMAP scripts,
GPM manifests, OSM GeoPackage.
Produces metadata JSON files for each validated source.
"""
import json
import zipfile
import os
import sys
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")


def validate_imd_netcdf():
    """Inspect the IMD RF25 NetCDF file and write metadata."""
    nc_path = RAW_DIR / "RF25_ind2025_rfp25.nc"
    out_dir = RAW_DIR / "rainfall" / "imd"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "imd_rf25_metadata.json"

    result = {
        "source_file": str(nc_path),
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "dimensions": {},
        "variables": [],
        "time_range": {},
        "lat_range": {},
        "lon_range": {},
        "units": {},
        "crs": "Not explicitly stated — likely WGS84 lat/lon",
        "missing_value": None,
        "notes": []
    }

    try:
        import netCDF4 as nc
        ds = nc.Dataset(nc_path, "r")

        result["status"] = "READABLE"
        result["dimensions"] = {k: len(v) for k, v in ds.dimensions.items()}

        var_info = []
        for vname, var in ds.variables.items():
            vi = {
                "name": vname,
                "dimensions": list(var.dimensions),
                "shape": list(var.shape),
                "dtype": str(var.dtype),
            }
            attrs = {}
            for attr in var.ncattrs():
                try:
                    val = var.getncattr(attr)
                    if hasattr(val, "tolist"):
                        val = val.tolist()
                    attrs[attr] = val
                except Exception:
                    attrs[attr] = "unreadable"
            vi["attributes"] = attrs
            var_info.append(vi)
        result["variables"] = var_info

        # Get time range
        if "time" in ds.variables:
            time_var = ds.variables["time"]
            try:
                import netCDF4 as nc2
                times = nc2.num2date(time_var[:], units=time_var.units,
                                      calendar=getattr(time_var, "calendar", "standard"))
                result["time_range"] = {
                    "start": str(times[0]),
                    "end": str(times[-1]),
                    "n_timesteps": len(times),
                    "units": getattr(time_var, "units", "unknown")
                }
            except Exception as e:
                result["time_range"] = {"error": str(e)}
                result["notes"].append(f"Time conversion error: {e}")

        # Lat/lon ranges
        for coord in ["lat", "latitude", "LATITUDE", "LAT"]:
            if coord in ds.variables:
                v = ds.variables[coord][:]
                result["lat_range"] = {"min": float(v.min()), "max": float(v.max()), "n": int(len(v))}
                break
        for coord in ["lon", "longitude", "LONGITUDE", "LON"]:
            if coord in ds.variables:
                v = ds.variables[coord][:]
                result["lon_range"] = {"min": float(v.min()), "max": float(v.max()), "n": int(len(v))}
                break

        # Global attributes
        global_attrs = {}
        for attr in ds.ncattrs():
            try:
                global_attrs[attr] = str(ds.getncattr(attr))
            except Exception:
                global_attrs[attr] = "unreadable"
        result["global_attributes"] = global_attrs

        ds.close()

    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)

    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  IMD metadata → {out_path}")
    return result


def validate_srtm_zip():
    """Inspect SRTM ZIP and document its contents without extracting."""
    srtm_path = RAW_DIR / "srtm_v3_6aa3cfb7243c85a5.zip"
    out_dir = RAW_DIR / "dem" / "srtm"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "srtm_zip_inventory.json"

    result = {
        "source_file": str(srtm_path),
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "contents": [],
        "notes": []
    }

    try:
        with zipfile.ZipFile(srtm_path, "r") as zf:
            result["status"] = "READABLE"
            for info in zf.infolist():
                result["contents"].append({
                    "filename": info.filename,
                    "compressed_size": info.compress_size,
                    "uncompressed_size": info.file_size,
                    "date_time": str(info.date_time),
                })

        # Check NER coverage: SRTM tiles for NER are roughly N21-N30, E088-E098
        tile_names = [c["filename"] for c in result["contents"]]
        result["file_count"] = len(tile_names)

        # SRTM naming: e.g. N26E092.SRTMGL1.hgt.zip or similar
        result["notes"].append(
            "NER requires approx tiles N21-N30, E088-E098. "
            "Check tile names against this range."
        )

        # Infer format from extensions
        exts = list({Path(n).suffix.lower() for n in tile_names})
        result["extensions_found"] = exts

        if any(".hgt" in n.lower() for n in tile_names):
            result["format"] = "SRTM HGT binary"
            result["notes"].append("HGT files confirmed — SRTM binary elevation format")
        elif any(".tif" in n.lower() for n in tile_names):
            result["format"] = "GeoTIFF"
        else:
            result["format"] = "Unknown — inspect tile names"

    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)

    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  SRTM zip inventory → {out_path}")
    return result


def validate_smap_scripts():
    """Parse SMAP download scripts to understand targeted products."""
    scripts = {
        "SPL3SMAP": RAW_DIR / "nsidc-download_SPL3SMAP.003_2026-09-11.py",
        "NSIDC-0800": RAW_DIR / "nsidc-download_NSIDC-0800.002_2026-09-11.py",
    }
    out_dir = RAW_DIR / "soil_moisture" / "smap"
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "scripts": {},
        "actual_data_present": False,
        "notes": [
            "No actual SMAP .h5/.hdf/.nc data files found in data/raw/",
            "Authentication via NASA Earthdata required to download",
            "Use environment variables EARTHDATA_USER and EARTHDATA_PASSWORD",
        ]
    }

    for product, script_path in scripts.items():
        info = {"path": str(script_path), "exists": script_path.exists()}
        if script_path.exists():
            content = script_path.read_text(encoding="utf-8", errors="replace")
            # Extract key variables
            for varname in ["short_name", "version", "time_start", "time_end",
                             "bounding_box", "polygon", "filename_filter"]:
                for line in content.split("\n"):
                    if line.strip().startswith(f"{varname} ="):
                        info[varname] = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
            info["product_description"] = {
                "SPL3SMAP": "SMAP L3 Passive Daily 36km soil moisture (Version 003)",
                "NSIDC-0800": "SMAP Enhanced L3 Passive Daily 9km soil moisture (Version 2)",
            }.get(product, "Unknown")
        result["scripts"][product] = info

    # Check for actual data files
    smap_extensions = {".h5", ".hdf", ".nc", ".nc4"}
    actual_files = [
        f for f in RAW_DIR.rglob("*")
        if f.suffix.lower() in smap_extensions
        and "smap" in f.name.lower()
    ]
    result["actual_data_present"] = len(actual_files) > 0
    result["actual_data_files"] = [str(f) for f in actual_files]

    out_path = out_dir / "smap_scripts_report.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  SMAP scripts report → {out_path}")
    return result


def validate_gpm_manifests():
    """Inspect GPM manifest TXT files."""
    manifests = {
        "daily": RAW_DIR / "subset_GPM_3IMERGDF_07_20260911_085145_.txt",
        "half_hourly": RAW_DIR / "subset_GPM_3IMERGHH_07_20260911_094301_.txt",
    }
    out_dir = RAW_DIR / "rainfall" / "gpm"
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "manifests": {},
        "notes": []
    }

    for key, mpath in manifests.items():
        info = {"path": str(mpath), "exists": mpath.exists()}
        if mpath.exists():
            lines = mpath.read_text(encoding="utf-8", errors="replace").strip().split("\n")
            urls = [l.strip() for l in lines if l.strip().startswith("http")]
            doc_urls = [u for u in urls if "pdf" in u.lower() or "readme" in u.lower() or "doc" in u.lower()]
            data_urls = [u for u in urls if u not in doc_urls]

            info["total_lines"] = len(lines)
            info["total_urls"] = len(urls)
            info["doc_urls"] = len(doc_urls)
            info["data_urls"] = len(data_urls)
            info["status"] = "MANIFEST_ONLY"

            if data_urls:
                info["first_data_url"] = data_urls[0]
                info["last_data_url"] = data_urls[-1]
                # Try to parse date range from filenames
                import re
                dates = re.findall(r"\d{8}", " ".join(data_urls))
                if dates:
                    info["date_range_from_urls"] = {"earliest": min(dates), "latest": max(dates)}

            # Check if any actual downloaded files exist
            if key == "daily":
                dl_dir = out_dir / "daily"
            else:
                dl_dir = out_dir / "half_hourly"
            if dl_dir.exists():
                downloaded = list(dl_dir.glob("*.nc4")) + list(dl_dir.glob("*.HDF5")) + list(dl_dir.glob("*.h5"))
                info["downloaded_files"] = len(downloaded)
            else:
                info["downloaded_files"] = 0

        result["manifests"][key] = info

    out_path = out_dir / "gpm_manifest_report.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  GPM manifest report → {out_path}")
    return result


def validate_osm_gpkg():
    """Inspect the OSM GeoPackage layers."""
    gpkg_path = RAW_DIR / "north-eastern-zone.gpkg"
    out_dir = RAW_DIR / "osm"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "osm_gpkg_report.json"

    result = {
        "source_file": str(gpkg_path),
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "layers": [],
        "notes": []
    }

    try:
        import geopandas as gpd
        import pyogrio

        result["status"] = "READABLE"
        layer_array = pyogrio.list_layers(gpkg_path)
        # layer_array is a numpy array of [name, geometry_type] pairs
        layers = [row[0] for row in layer_array]
        result["layer_count"] = len(layers)

        layer_infos = []
        for i, lname in enumerate(layers):
            try:
                geom_type = layer_array[i][1] if len(layer_array[i]) > 1 else "unknown"
                # Read a small sample to get column info and count
                info_gdf = gpd.read_file(gpkg_path, layer=lname, max_features=1)
                info = pyogrio.read_info(gpkg_path, layer=lname)
                li = {
                    "name": lname,
                    "geometry_type": geom_type,
                    "crs": str(info.get("crs", "unknown")),
                    "feature_count": info.get("features", "unknown"),
                    "properties": list(info_gdf.columns.drop("geometry", errors="ignore"))[:10],
                }
                layer_infos.append(li)
            except Exception as e:
                layer_infos.append({"name": lname, "error": str(e)})

        result["layers"] = layer_infos

        # Key layers for NER project
        key_layers = ["roads", "road_lines", "buildings", "landuse", "waterways",
                      "water", "places", "points_of_interest", "pois",
                      "transport_areas", "transport_lines"]
        found_key = [l for l in layers if any(k in l.lower() for k in key_layers)]
        result["key_layers_found"] = found_key

    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)
        result["notes"].append("pyogrio/geopandas error during inspection")

    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  OSM GPKG report → {out_path}")
    return result


def main():
    print("\n=== Step 2: Validating existing raw files ===\n")

    results = {}

    print("1. Validating IMD NetCDF...")
    results["imd"] = validate_imd_netcdf()

    print("2. Validating SRTM ZIP...")
    results["srtm"] = validate_srtm_zip()

    print("3. Validating SMAP scripts...")
    results["smap"] = validate_smap_scripts()

    print("4. Validating GPM manifests...")
    results["gpm"] = validate_gpm_manifests()

    print("5. Validating OSM GeoPackage...")
    results["osm"] = validate_osm_gpkg()

    # Summary
    print("\n=== Validation Summary ===")
    for name, r in results.items():
        status = r.get("status", r.get("actual_data_present", "see report"))
        print(f"  {name.upper()}: {status}")

    print("\nDone.")


if __name__ == "__main__":
    main()
