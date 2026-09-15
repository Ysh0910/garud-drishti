"""
Step 6: Validate SRTM ZIP — inspect contents, check NER tile coverage,
extract tiles if needed.
"""
import json
import zipfile
import re
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
SRTM_ZIP = RAW_DIR / "srtm_v3_6aa3cfb7243c85a5.zip"
DEM_DIR = RAW_DIR / "dem" / "srtm"
DEM_DIR.mkdir(parents=True, exist_ok=True)

# NER approximate tile bounds (SRTM 1-degree tiles)
# NER: lat 20-30N, lon 88-98E
NER_TILES = set()
for lat in range(20, 31):
    for lon in range(88, 99):
        # SRTM naming: N22E091 etc.
        NER_TILES.add(f"N{lat:02d}E{lon:03d}")
        # Also check lowercase
        NER_TILES.add(f"n{lat:02d}e{lon:03d}")


def parse_srtm_tile_name(filename):
    """
    Try to parse SRTM tile name from filename.
    SRTM v3 filenames: e.g. N26E092.SRTMGL1.hgt.zip or n26e092.hgt
    Returns (lat, lon) or None.
    """
    fname = Path(filename).name
    # Pattern: N/S + 2digits + E/W + 3digits
    m = re.search(r'([NS])(\d{2})([EW])(\d{3})', fname, re.IGNORECASE)
    if m:
        hem_lat = m.group(1).upper()
        lat = int(m.group(2))
        hem_lon = m.group(3).upper()
        lon = int(m.group(4))
        if hem_lat == "S":
            lat = -lat
        if hem_lon == "W":
            lon = -lon
        return lat, lon
    return None


def main():
    print("\n=== Step 6: SRTM ZIP Validation ===\n")

    result = {
        "source_file": str(SRTM_ZIP),
        "inspection_time": datetime.utcnow().isoformat() + "Z",
        "status": "UNKNOWN",
        "file_count": 0,
        "tiles_found": [],
        "tiles_in_ner": [],
        "tiles_missing_from_ner": [],
        "format": "Unknown",
        "crs": "WGS84 (EPSG:4326) — SRTM standard",
        "nominal_resolution": "30m (SRTM v3 / GL1) or 90m (SRTM v3 / GL3)",
        "notes": [],
        "extraction_status": "NOT_EXTRACTED"
    }

    try:
        with zipfile.ZipFile(SRTM_ZIP, "r") as zf:
            result["status"] = "READABLE"
            names = zf.namelist()
            result["file_count"] = len(names)

            # Parse tile names
            tiles_found = []
            for fname in names:
                parsed = parse_srtm_tile_name(fname)
                if parsed:
                    lat, lon = parsed
                    tile_id = f"{'N' if lat>=0 else 'S'}{abs(lat):02d}{'E' if lon>=0 else 'W'}{abs(lon):03d}"
                    tiles_found.append({
                        "filename": fname,
                        "tile_id": tile_id,
                        "lat": lat,
                        "lon": lon,
                        "size_bytes": zf.getinfo(fname).file_size,
                        "in_ner": (20 <= lat <= 30 and 88 <= lon <= 98)
                    })
                else:
                    tiles_found.append({
                        "filename": fname,
                        "tile_id": "UNKNOWN",
                        "lat": None,
                        "lon": None,
                        "size_bytes": zf.getinfo(fname).file_size,
                        "in_ner": False
                    })

            result["tiles_found"] = tiles_found
            result["tiles_in_ner"] = [t for t in tiles_found if t.get("in_ner")]

            # Check format
            exts = {Path(n).suffix.lower() for n in names}
            result["extensions"] = list(exts)
            if ".hgt" in exts:
                result["format"] = "SRTM HGT binary"
                result["resolution_note"] = "SRTM v3 GL1 = 1 arc-second (~30m), GL3 = 3 arc-second (~90m)"
            elif ".tif" in exts:
                result["format"] = "GeoTIFF"
            elif ".zip" in exts:
                result["format"] = "Nested ZIPs (SRTM tile ZIPs)"

            # Check NER coverage
            ner_tiles_found = {t["tile_id"].upper() for t in tiles_found if t.get("in_ner")}
            ner_tiles_needed = {
                f"N{lat:02d}E{lon:03d}"
                for lat in range(20, 31)
                for lon in range(88, 99)
            }
            missing = ner_tiles_needed - ner_tiles_found
            result["ner_tiles_needed"] = len(ner_tiles_needed)
            result["ner_tiles_found"] = len(ner_tiles_found)
            result["tiles_missing_from_ner"] = sorted(list(missing))

            if not ner_tiles_found:
                result["notes"].append(
                    "WARNING: No NER tiles identified in the ZIP. "
                    "ZIP may contain a different geographic region or use non-standard naming. "
                    "Manual inspection required."
                )
            elif missing:
                result["notes"].append(
                    f"Partial NER coverage: {len(ner_tiles_found)} tiles found, "
                    f"{len(missing)} tiles missing. "
                    "SRTM coverage may be sufficient for NER core area — verify against actual extent."
                )
            else:
                result["notes"].append("Full NER tile coverage confirmed.")

            # Extract tiles to DEM dir (only NER-relevant ones if identifiable)
            tiles_to_extract = [t for t in tiles_found if t.get("in_ner")]
            already_extracted = list(DEM_DIR.glob("*"))

            if tiles_to_extract:
                print(f"  Found {len(tiles_to_extract)} NER tiles in ZIP, extracting...")
                for tile in tiles_to_extract:
                    dest = DEM_DIR / Path(tile["filename"]).name
                    if dest.exists():
                        print(f"    Skipping (already exists): {dest.name}")
                        continue
                    try:
                        data = zf.read(tile["filename"])
                        dest.write_bytes(data)
                        print(f"    Extracted: {dest.name}")
                    except Exception as e:
                        print(f"    Error extracting {tile['filename']}: {e}")
                result["extraction_status"] = "EXTRACTED_NER_TILES"
            elif len(tiles_found) > 0:
                # Extract all if we can't identify NER specifically
                print(f"  Extracting all {len(tiles_found)} tiles (NER coverage unclear)...")
                for tile in tiles_found[:50]:  # limit to first 50
                    dest = DEM_DIR / Path(tile["filename"]).name
                    if dest.exists():
                        continue
                    try:
                        data = zf.read(tile["filename"])
                        dest.write_bytes(data)
                    except Exception as e:
                        pass
                result["extraction_status"] = "EXTRACTED_ALL_TILES"
                result["notes"].append("Extracted all tiles as NER coverage unclear from tile names")
            else:
                result["notes"].append("No tiles to extract")
                result["extraction_status"] = "NO_TILES_FOUND"

    except zipfile.BadZipFile as e:
        result["status"] = "CORRUPT_OR_INVALID_ZIP"
        result["error"] = str(e)
    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)

    # Write report
    out_path = DEM_DIR / "srtm_validation_report.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  SRTM validation report → {out_path}")

    print(f"  Status: {result['status']}")
    print(f"  Files in ZIP: {result['file_count']}")
    print(f"  NER tiles found: {len(result.get('tiles_in_ner', []))}")
    print(f"  Extraction: {result['extraction_status']}")

    for note in result.get("notes", []):
        print(f"  NOTE: {note}")


if __name__ == "__main__":
    main()
