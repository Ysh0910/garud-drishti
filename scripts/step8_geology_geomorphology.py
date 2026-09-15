"""
Step 8: Obtain geology and geomorphology layers for NER.
Tries Bhuvan WMS services, documents what is available,
and saves either a raster (WMS export) or a provenance record.
"""
import json
import requests
from pathlib import Path
from datetime import datetime
from xml.etree import ElementTree as ET

RAW_DIR = Path("data/raw")
GEO_DIR = RAW_DIR / "geology"
GEOMORPH_DIR = RAW_DIR / "geomorphology"
GEO_DIR.mkdir(parents=True, exist_ok=True)
GEOMORPH_DIR.mkdir(parents=True, exist_ok=True)

# NER approximate bounding box
NER_BBOX = "88.0,20.0,98.0,30.5"  # minx,miny,maxx,maxy (WGS84)
NER_BBOX_EPSG = "88.0,20.0,98.0,30.5"

# Bhuvan WMS endpoints to try
BHUVAN_WMS_ENDPOINTS = [
    "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
    "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
    "https://bhuvan-app1.nrsc.gov.in/bhuvan/wms",
    "https://bhuvan-gp1.nrsc.gov.in/bhuvan/wms",
]

GEOLOGY_KEYWORDS = ["geology", "geological", "litho", "lithology", "rocks", "formation"]
GEOMORPH_KEYWORDS = ["geomorpho", "geomorphology", "terrain", "landform", "morph"]
NER_KEYWORDS = ["northeast", "north_east", "ner", "assam", "meghalaya", "manipur",
                "arunachal", "mizoram", "nagaland", "sikkim", "tripura"]


def get_wms_capabilities(endpoint, timeout=30):
    """Fetch WMS GetCapabilities and parse layer list."""
    url = f"{endpoint}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code == 200:
            return resp.text
        return None
    except Exception as e:
        return None


def parse_layers_from_capabilities(xml_text):
    """Parse layer names and titles from WMS GetCapabilities XML."""
    layers = []
    try:
        root = ET.fromstring(xml_text)
        # Handle namespaces
        ns = ""
        if root.tag.startswith("{"):
            ns = root.tag.split("}")[0] + "}"

        for layer_elem in root.iter(f"{ns}Layer"):
            name_elem = layer_elem.find(f"{ns}Name")
            title_elem = layer_elem.find(f"{ns}Title")
            abstract_elem = layer_elem.find(f"{ns}Abstract")

            if name_elem is not None and name_elem.text:
                layers.append({
                    "name": name_elem.text.strip(),
                    "title": title_elem.text.strip() if title_elem is not None and title_elem.text else "",
                    "abstract": (abstract_elem.text.strip()[:200]
                                 if abstract_elem is not None and abstract_elem.text else "")
                })
    except Exception as e:
        pass
    return layers


def find_relevant_layers(layers, keywords):
    """Filter layers matching keywords."""
    relevant = []
    for layer in layers:
        combined = f"{layer['name']} {layer['title']} {layer['abstract']}".lower()
        if any(kw.lower() in combined for kw in keywords):
            relevant.append(layer)
    return relevant


def download_wms_image(endpoint, layer_name, bbox, width=2048, height=2048,
                        crs="EPSG:4326", out_path=None, format="image/tiff"):
    """
    Download a WMS GetMap image.
    Returns (success, notes).
    """
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.3.0",
        "REQUEST": "GetMap",
        "LAYERS": layer_name,
        "BBOX": bbox,
        "CRS": crs,
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "FORMAT": format,
        "STYLES": "",
    }

    try:
        resp = requests.get(endpoint, params=params, timeout=60, stream=True)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            if "xml" in content_type or "html" in content_type:
                # WMS returned an error XML
                return False, f"WMS error response: {resp.text[:200]}"
            if out_path:
                with open(out_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                return True, f"Downloaded {out_path.stat().st_size} bytes"
        return False, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def probe_bhuvan_services():
    """Probe Bhuvan WMS endpoints for geology and geomorphology layers."""
    result = {
        "probe_time": datetime.utcnow().isoformat() + "Z",
        "endpoints_tried": [],
        "geology_layers": [],
        "geomorphology_layers": [],
        "accessible_endpoints": []
    }

    for endpoint in BHUVAN_WMS_ENDPOINTS:
        print(f"  Probing: {endpoint}")
        caps_xml = get_wms_capabilities(endpoint)

        if caps_xml is None:
            result["endpoints_tried"].append({"url": endpoint, "status": "UNREACHABLE"})
            print(f"    Unreachable")
            continue

        if "<WMS_Capabilities" not in caps_xml and "<WMT_MS_Capabilities" not in caps_xml:
            result["endpoints_tried"].append({"url": endpoint, "status": "NOT_WMS"})
            print(f"    Not a WMS endpoint")
            continue

        result["accessible_endpoints"].append(endpoint)
        layers = parse_layers_from_capabilities(caps_xml)
        result["endpoints_tried"].append({
            "url": endpoint,
            "status": "ACCESSIBLE",
            "total_layers": len(layers)
        })
        print(f"    Accessible — {len(layers)} layers found")

        # Find geology layers
        geo_layers = find_relevant_layers(layers, GEOLOGY_KEYWORDS)
        for l in geo_layers:
            l["endpoint"] = endpoint
        result["geology_layers"].extend(geo_layers)

        # Find geomorphology layers
        gm_layers = find_relevant_layers(layers, GEOMORPH_KEYWORDS)
        for l in gm_layers:
            l["endpoint"] = endpoint
        result["geomorphology_layers"].extend(gm_layers)

        print(f"    Geology layers: {len(geo_layers)}")
        print(f"    Geomorphology layers: {len(gm_layers)}")

    return result


def attempt_wms_download(layers, out_dir, dataset_name, bbox=NER_BBOX):
    """Try to download the best available WMS layer."""
    if not layers:
        return False, "No layers available"

    # Prefer NER-specific layers, then national geology
    # Sort by specificity
    preferred = sorted(
        layers,
        key=lambda l: sum(1 for kw in NER_KEYWORDS if kw in l["name"].lower() + l["title"].lower()),
        reverse=True
    )

    for layer in preferred[:3]:  # Try top 3
        endpoint = layer.get("endpoint", BHUVAN_WMS_ENDPOINTS[0])
        layer_name = layer["name"]

        # Try GeoTIFF first, then PNG
        for fmt, ext in [("image/tiff", ".tif"), ("image/png", ".png"), ("image/geotiff", ".tif")]:
            out_file = out_dir / f"{dataset_name}_ner_wms{ext}"
            if out_file.exists():
                return True, f"Already exists: {out_file}"

            print(f"    Trying layer: {layer_name} ({fmt})...")
            success, note = download_wms_image(
                endpoint, layer_name, bbox,
                out_path=out_file, format=fmt
            )
            if success:
                return True, f"Downloaded {layer_name} → {out_file}"

    return False, "All download attempts failed"


def create_provenance_record(dataset_name, out_dir, probe_result, download_note, status):
    """Create a provenance JSON for a dataset that couldn't be downloaded."""
    record = {
        "dataset": dataset_name,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "status": status,
        "download_note": download_note,
        "official_sources": [
            "GSI Bhukosh: https://bhukosh.gsi.gov.in/",
            "Bhuvan WMS: https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
            "Bhuvan thematic data: https://bhuvan.nrsc.gov.in/",
            "NESAC NER data: http://www.nesac.gov.in/"
        ],
        "layers_found": probe_result.get(
            "geology_layers" if "geology" in dataset_name.lower() else "geomorphology_layers", []
        )[:10],
        "accessible_endpoints": probe_result.get("accessible_endpoints", []),
        "required_action": (
            "Manual download from GSI Bhukosh or Bhuvan portal required. "
            "Registration/approval may be needed. "
            f"For {dataset_name}: use Bhuvan thematic services or GSI Bhukosh API once access is obtained."
        ),
        "interim_fallback": (
            "For development/training purposes, a DEM-derived terrain analysis can provide "
            "a proxy for geomorphology (slope, curvature, TWI). "
            "Geology categorical features require authoritative GSI data."
        )
    }
    out_path = out_dir / f"{dataset_name}_provenance.json"
    with open(out_path, "w") as f:
        json.dump(record, f, indent=2)
    return out_path


def main():
    print("\n=== Step 8: Geology and Geomorphology Acquisition ===\n")

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "geology": {"status": "UNKNOWN"},
        "geomorphology": {"status": "UNKNOWN"},
    }

    # Probe Bhuvan WMS services
    print("  Probing Bhuvan WMS services...")
    probe_result = probe_bhuvan_services()

    # Save probe result
    probe_path = RAW_DIR / "bhuvan_wms_probe.json"
    with open(probe_path, "w") as f:
        json.dump(probe_result, f, indent=2)
    print(f"  WMS probe results → {probe_path}")

    # --- GEOLOGY ---
    print("\n  Attempting geology download...")
    if probe_result["geology_layers"]:
        success, note = attempt_wms_download(
            probe_result["geology_layers"], GEO_DIR, "geology"
        )
        if success:
            report["geology"] = {"status": "DOWNLOADED", "note": note}
            print(f"  Geology: {note}")
        else:
            report["geology"] = {"status": "BLOCKED", "note": note}
            print(f"  Geology download failed: {note}")
    else:
        report["geology"] = {
            "status": "BLOCKED",
            "note": "No geology layers found on accessible Bhuvan WMS endpoints"
        }
        print("  No geology layers found on accessible WMS endpoints")

    if report["geology"]["status"] != "DOWNLOADED":
        prov_path = create_provenance_record(
            "geology", GEO_DIR, probe_result,
            report["geology"]["note"],
            "BLOCKED_REQUIRES_MANUAL_DOWNLOAD"
        )
        report["geology"]["provenance_file"] = str(prov_path)
        print(f"  Geology provenance → {prov_path}")

    # --- GEOMORPHOLOGY ---
    print("\n  Attempting geomorphology download...")
    if probe_result["geomorphology_layers"]:
        success, note = attempt_wms_download(
            probe_result["geomorphology_layers"], GEOMORPH_DIR, "geomorphology"
        )
        if success:
            report["geomorphology"] = {"status": "DOWNLOADED", "note": note}
            print(f"  Geomorphology: {note}")
        else:
            report["geomorphology"] = {"status": "BLOCKED", "note": note}
            print(f"  Geomorphology download failed: {note}")
    else:
        report["geomorphology"] = {
            "status": "BLOCKED",
            "note": "No geomorphology layers found on accessible Bhuvan WMS endpoints"
        }
        print("  No geomorphology layers found on accessible WMS endpoints")

    if report["geomorphology"]["status"] != "DOWNLOADED":
        prov_path = create_provenance_record(
            "geomorphology", GEOMORPH_DIR, probe_result,
            report["geomorphology"]["note"],
            "BLOCKED_REQUIRES_MANUAL_DOWNLOAD"
        )
        report["geomorphology"]["provenance_file"] = str(prov_path)
        print(f"  Geomorphology provenance → {prov_path}")

    # Write overall report
    report_path = RAW_DIR / "geology_geomorphology_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  Overall report → {report_path}")
    print(f"  Geology: {report['geology']['status']}")
    print(f"  Geomorphology: {report['geomorphology']['status']}")

    if probe_result["accessible_endpoints"]:
        print(f"  Accessible Bhuvan endpoints: {probe_result['accessible_endpoints']}")
    else:
        print("  WARNING: No Bhuvan WMS endpoints accessible from this machine.")
        print("  Manual download from Bhuvan portal required.")


if __name__ == "__main__":
    main()
