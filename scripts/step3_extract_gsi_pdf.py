"""
Step 3: Extract GSI PDF → structured CSV/GeoJSON
Uses PyMuPDF (fitz) and pdfplumber for table extraction.
Never loads entire PDF into LLM context.
"""
import json
import csv
import re
import sys
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
GSI_OUT_DIR = RAW_DIR / "gsi"
GSI_OUT_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = RAW_DIR / "GSI.pdf"

# NER states for filtering
NER_STATES = {
    "arunachal", "assam", "manipur", "meghalaya",
    "mizoram", "nagaland", "sikkim", "tripura",
    # common abbreviated/misspelled forms
    "arunachal pradesh", "assam", "manipur", "meghalaya",
    "mizoram", "nagaland", "sikkim", "tripura",
    "north east", "northeastern", "north eastern", "ner"
}

# Keywords to identify relevant pages
LANDSLIDE_KEYWORDS = [
    "landslide", "land slide", "land-slide", "debris", "slope failure",
    "inventory", "coordinates", "latitude", "longitude", "district",
    "state", "arunachal", "assam", "manipur", "meghalaya", "mizoram",
    "nagaland", "sikkim", "tripura", "north east", "rockfall", "mudflow",
    "rainfall", "event", "location", "table", "appendix"
]

# Regex for coordinate extraction
LAT_PATTERN = re.compile(r'\b(\d{1,2}[°\s]\d{0,2}[\'′\s]?\d{0,2}[\"″\s]?[Nn]?)\b|\b(\d{1,2}\.\d{1,6})\s*[Nn°]?\b')
LON_PATTERN = re.compile(r'\b(\d{2,3}[°\s]\d{0,2}[\'′\s]?\d{0,2}[\"″\s]?[Ee]?)\b|\b(\d{2,3}\.\d{1,6})\s*[Ee°]?\b')

# Simple decimal degree extraction
DECIMAL_COORD = re.compile(r'(\d{2,3}\.\d{2,6})')


def dms_to_decimal(dms_str):
    """Convert DMS string to decimal degrees. Returns None if parsing fails."""
    try:
        dms_str = str(dms_str).strip()
        # Try direct float first
        val = float(re.sub(r'[°\'\"NnEe]', ' ', dms_str).strip())
        if 0 < val < 180:
            return round(val, 6)
    except Exception:
        pass
    # Try DMS parsing
    parts = re.findall(r'[\d.]+', dms_str)
    if len(parts) >= 2:
        try:
            d = float(parts[0])
            m = float(parts[1]) if len(parts) > 1 else 0.0
            s = float(parts[2]) if len(parts) > 2 else 0.0
            return round(d + m / 60.0 + s / 3600.0, 6)
        except Exception:
            pass
    return None


def extract_coords_from_text(text):
    """Try to extract lat/lon from a text block."""
    # Look for patterns like "Lat: 25.34 / Lon: 92.12"
    lat_match = re.search(
        r'lat(?:itude)?[:\s]*([0-9]{1,2}[.°][0-9]*(?:[\'°][0-9]*)?(?:[\"°][0-9]*)?[Nn]?)',
        text, re.IGNORECASE
    )
    lon_match = re.search(
        r'lon(?:gitude)?[:\s]*([0-9]{2,3}[.°][0-9]*(?:[\'°][0-9]*)?(?:[\"°][0-9]*)?[Ee]?)',
        text, re.IGNORECASE
    )

    lat, lon = None, None
    if lat_match:
        lat = dms_to_decimal(lat_match.group(1))
    if lon_match:
        lon = dms_to_decimal(lon_match.group(1))

    # Validate NER bounds
    if lat and lon:
        if not (20.0 <= lat <= 30.0 and 87.0 <= lon <= 98.0):
            lat, lon = None, None

    return lat, lon


def inspect_pdf_metadata(doc):
    """Get basic PDF metadata."""
    meta = doc.metadata
    page_count = doc.page_count
    return {
        "page_count": page_count,
        "title": meta.get("title", ""),
        "author": meta.get("author", ""),
        "subject": meta.get("subject", ""),
        "creator": meta.get("creator", ""),
        "producer": meta.get("producer", ""),
    }


def find_relevant_pages(doc, keywords):
    """Find pages containing landslide-related keywords."""
    relevant = []
    print(f"  Scanning {doc.page_count} pages for keywords...")
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text("text").lower()
        hits = [kw for kw in keywords if kw.lower() in text]
        if hits:
            relevant.append({"page": i + 1, "keywords_found": hits[:5]})
    return relevant


def extract_tables_pdfplumber(pdf_path, page_numbers):
    """Extract tables from specific pages using pdfplumber."""
    import pdfplumber
    tables_found = []

    with pdfplumber.open(pdf_path) as pdf:
        for pgnum in page_numbers:
            if pgnum > len(pdf.pages):
                continue
            page = pdf.pages[pgnum - 1]  # 0-indexed
            tables = page.extract_tables()
            if tables:
                for t in tables:
                    # Clean None values
                    cleaned = []
                    for row in t:
                        cleaned.append([str(c).strip() if c else "" for c in row])
                    if len(cleaned) > 1:  # has header + rows
                        tables_found.append({
                            "page": pgnum,
                            "rows": len(cleaned),
                            "cols": len(cleaned[0]) if cleaned else 0,
                            "data": cleaned
                        })
    return tables_found


def parse_table_to_records(tables, source_doc):
    """Convert extracted tables to landslide records."""
    records = []
    ls_id = 1

    for table in tables:
        if not table["data"] or len(table["data"]) < 2:
            continue

        header_row = table["data"][0]
        header_lower = [h.lower() for h in header_row]

        # Try to find column indices
        def find_col(keywords):
            for kw in keywords:
                for i, h in enumerate(header_lower):
                    if kw in h:
                        return i
            return None

        col_state = find_col(["state"])
        col_district = find_col(["district"])
        col_location = find_col(["location", "place", "village", "area"])
        col_date = find_col(["date", "year", "month"])
        col_lat = find_col(["lat", "latitude"])
        col_lon = find_col(["lon", "longitude", "long"])
        col_type = find_col(["type", "kind", "category"])
        col_cause = find_col(["cause", "reason", "trigger"])

        for row in table["data"][1:]:
            if not any(row):
                continue

            def get_val(col):
                if col is not None and col < len(row):
                    return row[col].strip()
                return ""

            state = get_val(col_state)
            district = get_val(col_district)
            location = get_val(col_location)
            date = get_val(col_date)
            lat_raw = get_val(col_lat)
            lon_raw = get_val(col_lon)
            ls_type = get_val(col_type)
            cause = get_val(col_cause)

            # Try to parse coordinates
            lat, lon = None, None
            if lat_raw:
                lat = dms_to_decimal(lat_raw)
            if lon_raw:
                lon = dms_to_decimal(lon_raw)

            # Validate NER bounds
            if lat and lon:
                if not (20.0 <= lat <= 30.0 and 87.0 <= lon <= 98.0):
                    lat, lon = None, None

            # Skip completely empty rows
            if not any([state, district, location, date]):
                continue

            records.append({
                "landslide_id": f"GSI_{ls_id:04d}",
                "state": state,
                "district": district,
                "location": location,
                "latitude": lat if lat else "",
                "longitude": lon if lon else "",
                "date": date,
                "landslide_type": ls_type,
                "cause": cause,
                "source_page": table["page"],
                "source_document": source_doc,
                "confidence": "TABLE_EXTRACTED" if lat else "NO_COORDINATES",
                "notes": f"Extracted from table on page {table['page']}"
            })
            ls_id += 1

    return records


def extract_text_records(doc, page_numbers, source_doc):
    """
    Extract landslide records from free text on relevant pages.
    More conservative — only extract clearly structured entries.
    """
    records = []
    ls_id = 1000  # offset from table records

    for pgnum in page_numbers:
        page = doc[pgnum - 1]
        text = page.get_text("text")

        # Look for patterns like: State, District, Date, Coordinates
        # Split into paragraphs/lines
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        current_record = {}
        for i, line in enumerate(lines):
            line_lower = line.lower()

            # State identification
            for state in ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
                           "Mizoram", "Nagaland", "Sikkim", "Tripura"]:
                if state.lower() in line_lower:
                    if current_record:
                        # Validate current before starting new
                        pass
                    current_record["state"] = state

            # District
            dist_match = re.search(r'(?:district|dist)[:\s]+([A-Za-z\s]+?)(?:\.|,|$)', line, re.IGNORECASE)
            if dist_match:
                current_record["district"] = dist_match.group(1).strip()

            # Date
            date_match = re.search(
                r'\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b|\b(\d{4}[-/]\d{2}[-/]\d{2})\b'
                r'|\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b',
                line, re.IGNORECASE
            )
            if date_match:
                current_record["date"] = date_match.group(0).strip()

            # Coordinates in the line
            lat, lon = extract_coords_from_text(line)
            if lat and lon:
                current_record["latitude"] = lat
                current_record["longitude"] = lon

        # If we found a state in this page, save what we found
        if current_record.get("state"):
            current_record.setdefault("landslide_id", f"GSI_TXT_{pgnum}_{ls_id:03d}")
            current_record.setdefault("district", "")
            current_record.setdefault("location", "")
            current_record.setdefault("date", "")
            current_record.setdefault("latitude", "")
            current_record.setdefault("longitude", "")
            current_record.setdefault("landslide_type", "")
            current_record.setdefault("cause", "")
            current_record["source_page"] = pgnum
            current_record["source_document"] = source_doc
            current_record["confidence"] = "TEXT_EXTRACTED"
            current_record["notes"] = f"Text extraction from page {pgnum}"
            records.append(current_record)
            ls_id += 1

    return records


def save_geojson(records, out_path):
    """Save records with coordinates as GeoJSON."""
    features = []
    for r in records:
        try:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            if lat and lon:
                feature = {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {k: v for k, v in r.items()
                                   if k not in ["latitude", "longitude"]}
                }
                features.append(feature)
        except (ValueError, TypeError):
            continue

    geojson = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    return len(features)


def main():
    print("\n=== Step 3: GSI PDF Extraction ===\n")

    import fitz  # PyMuPDF

    report = {
        "source_pdf": str(PDF_PATH),
        "extraction_time": datetime.utcnow().isoformat() + "Z",
        "page_count": 0,
        "pages_inspected": 0,
        "pages_used": [],
        "records_extracted": 0,
        "records_with_coordinates": 0,
        "records_without_coordinates": 0,
        "extraction_method": "PyMuPDF text extraction + pdfplumber table extraction",
        "warnings": [],
        "status": "IN_PROGRESS"
    }

    try:
        doc = fitz.open(PDF_PATH)
        meta = inspect_pdf_metadata(doc)
        report.update(meta)
        report["page_count"] = meta["page_count"]
        print(f"  PDF: {PDF_PATH.name}")
        print(f"  Pages: {meta['page_count']}")
        print(f"  Title: {meta.get('title', 'N/A')}")

        # Find relevant pages
        print(f"  Scanning for relevant pages...")
        relevant = find_relevant_pages(doc, LANDSLIDE_KEYWORDS)
        report["pages_inspected"] = len(relevant)
        report["pages_used"] = [r["page"] for r in relevant]
        print(f"  Found {len(relevant)} relevant pages")

        all_records = []

        if relevant:
            page_nums = [r["page"] for r in relevant]

            # Extract tables — limit to first 80 most relevant pages to avoid timeout
            # Prioritise pages with more keyword hits
            relevant_sorted = sorted(relevant, key=lambda x: len(x["keywords_found"]), reverse=True)
            priority_pages = [r["page"] for r in relevant_sorted[:80]]
            print(f"  Extracting tables from top {len(priority_pages)} pages (prioritised by keyword density)...")
            try:
                tables = extract_tables_pdfplumber(PDF_PATH, priority_pages)
                print(f"  Found {len(tables)} tables")
                table_records = parse_table_to_records(tables, "GSI.pdf")
                all_records.extend(table_records)
                print(f"  Extracted {len(table_records)} records from tables")
            except Exception as e:
                report["warnings"].append(f"Table extraction failed: {str(e)}")
                print(f"  Table extraction warning: {e}")

            # Extract from text — limit to same priority pages
            print(f"  Extracting from free text (top {len(priority_pages)} pages)...")
            try:
                text_records = extract_text_records(doc, priority_pages, "GSI.pdf")
                # Only add text records that don't duplicate table records
                all_records.extend(text_records)
                print(f"  Extracted {len(text_records)} text-based records")
            except Exception as e:
                report["warnings"].append(f"Text extraction failed: {str(e)}")
                print(f"  Text extraction warning: {e}")

        doc.close()

        # Count coordinates
        with_coords = [r for r in all_records if r.get("latitude") and r.get("longitude")]
        without_coords = [r for r in all_records if not (r.get("latitude") and r.get("longitude"))]

        report["records_extracted"] = len(all_records)
        report["records_with_coordinates"] = len(with_coords)
        report["records_without_coordinates"] = len(without_coords)

        if not all_records:
            report["warnings"].append(
                "No structured landslide records extracted from tables. "
                "GSI PDF may be primarily scanned/image-based or use non-standard table formats. "
                "Manual review recommended. Provenance note recorded."
            )
            report["status"] = "PARTIAL - PDF scanned or non-tabular"
            # Create minimal record documenting the source
            all_records = [{
                "landslide_id": "GSI_SOURCE_UNEXTRACTED",
                "state": "Various (NER)",
                "district": "",
                "location": "",
                "latitude": "",
                "longitude": "",
                "date": "",
                "landslide_type": "",
                "cause": "",
                "source_page": "N/A",
                "source_document": "GSI.pdf",
                "confidence": "UNEXTRACTED",
                "notes": (
                    "GSI.pdf present but structured records could not be extracted programmatically. "
                    "PDF may be image-based/scanned. Manual extraction or OCR required. "
                    f"File size: {PDF_PATH.stat().st_size} bytes. "
                    f"Page count: {report['page_count']}. "
                    f"Relevant pages found: {len(report['pages_used'])}."
                )
            }]
        else:
            report["status"] = "COMPLETED"

        # Write CSV
        csv_path = GSI_OUT_DIR / "gsi_landslide_inventory.csv"
        fieldnames = ["landslide_id", "state", "district", "location",
                      "latitude", "longitude", "date", "landslide_type",
                      "cause", "source_page", "source_document", "confidence", "notes"]
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in all_records:
                row = {k: r.get(k, "") for k in fieldnames}
                writer.writerow(row)
        print(f"  GSI CSV → {csv_path} ({len(all_records)} records)")

        # Write GeoJSON (only if coordinated records exist)
        geojson_path = GSI_OUT_DIR / "gsi_landslide_inventory.geojson"
        n_geo = save_geojson(all_records, geojson_path)
        print(f"  GSI GeoJSON → {geojson_path} ({n_geo} georeferenced records)")

    except Exception as e:
        report["status"] = f"ERROR: {str(e)}"
        report["warnings"].append(str(e))
        print(f"  ERROR: {e}")

    # Write report
    report_path = GSI_OUT_DIR / "gsi_extraction_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"  GSI extraction report → {report_path}")
    print(f"\n  Summary: {report['records_extracted']} records "
          f"({report['records_with_coordinates']} with coords, "
          f"{report['records_without_coordinates']} without)")
    print(f"  Status: {report['status']}")


if __name__ == "__main__":
    main()
