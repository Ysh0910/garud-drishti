"""
Step 4: Extract ISRO Landslide Atlas PDF → structured CSV/GeoJSON
Uses PyMuPDF (fitz) and pdfplumber.
"""
import json
import csv
import re
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("data/raw")
ATLAS_OUT_DIR = RAW_DIR / "landslide_atlas"
ATLAS_OUT_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = RAW_DIR / "LandslideAtlas_2023.pdf"

NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura"
]

KEYWORDS = [
    "landslide", "land slide", "inventory", "district", "state",
    "latitude", "longitude", "coordinates", "arunachal", "assam",
    "manipur", "meghalaya", "mizoram", "nagaland", "sikkim", "tripura",
    "north east", "northeastern", "event", "occurrence", "table",
    "appendix", "frequency", "susceptibility", "hotspot", "zone",
    "rainfall", "trigger", "date", "year", "location"
]


def inspect_pdf_metadata(doc):
    meta = doc.metadata
    return {
        "page_count": doc.page_count,
        "title": meta.get("title", ""),
        "author": meta.get("author", ""),
        "subject": meta.get("subject", ""),
        "producer": meta.get("producer", ""),
    }


def find_relevant_pages(doc, keywords):
    """Find pages with keyword matches."""
    relevant = []
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text("text").lower()
        hits = [kw for kw in keywords if kw.lower() in text]
        if len(hits) >= 2:  # require at least 2 keyword hits
            relevant.append({
                "page": i + 1,
                "keywords_found": hits[:8],
                "text_length": len(text)
            })
    return relevant


def extract_tables_pdfplumber(pdf_path, page_numbers):
    """Extract tables from specific pages."""
    import pdfplumber
    tables_found = []

    with pdfplumber.open(pdf_path) as pdf:
        for pgnum in page_numbers:
            if pgnum > len(pdf.pages):
                continue
            page = pdf.pages[pgnum - 1]
            tables = page.extract_tables()
            if tables:
                for t in tables:
                    cleaned = []
                    for row in t:
                        cleaned.append([str(c).strip() if c else "" for c in row])
                    if len(cleaned) > 1:
                        tables_found.append({
                            "page": pgnum,
                            "rows": len(cleaned),
                            "cols": len(cleaned[0]) if cleaned else 0,
                            "data": cleaned
                        })
    return tables_found


def dms_to_decimal(s):
    """Convert DMS or decimal string to float."""
    if not s:
        return None
    s = str(s).strip()
    # Try direct float
    try:
        vals = re.sub(r'[°\'\"NnEeSsWw\s]', ' ', s).split()
        nums = [float(v) for v in vals if v]
        if len(nums) == 1 and 0 < nums[0] < 200:
            return round(nums[0], 6)
        elif len(nums) >= 2:
            return round(nums[0] + nums[1] / 60.0 + (nums[2] / 3600.0 if len(nums) > 2 else 0), 6)
    except Exception:
        pass
    return None


def parse_tables_to_records(tables, source_doc):
    """Parse extracted tables into landslide records."""
    records = []
    ls_id = 1

    for table in tables:
        if not table["data"] or len(table["data"]) < 2:
            continue

        header = table["data"][0]
        header_lower = [h.lower() for h in header]

        def find_col(keywords):
            for kw in keywords:
                for i, h in enumerate(header_lower):
                    if kw in h:
                        return i
            return None

        col_sl = find_col(["sl", "sr", "no", "id", "#"])
        col_state = find_col(["state"])
        col_district = find_col(["district"])
        col_location = find_col(["location", "taluk", "village", "place", "area", "name"])
        col_date = find_col(["date", "year", "month", "time"])
        col_lat = find_col(["lat", "latitude", "y coord", "y-coord"])
        col_lon = find_col(["lon", "longitude", "long", "x coord", "x-coord"])
        col_type = find_col(["type", "kind", "nature", "category"])
        col_cause = find_col(["cause", "reason", "trigger", "triggering"])
        col_event = find_col(["event", "event_id", "event id"])

        for row in table["data"][1:]:
            if not any(row):
                continue
            if all(c == "" for c in row):
                continue

            def get(col):
                if col is not None and col < len(row):
                    return row[col].strip()
                return ""

            state = get(col_state)
            district = get(col_district)
            location = get(col_location)
            date = get(col_date)
            lat_raw = get(col_lat)
            lon_raw = get(col_lon)
            ls_type = get(col_type)
            cause = get(col_cause)
            event_id = get(col_event)

            lat = dms_to_decimal(lat_raw)
            lon = dms_to_decimal(lon_raw)

            # Validate NER bounds
            if lat and lon:
                if not (19.0 <= lat <= 30.5 and 87.0 <= lon <= 98.5):
                    lat, lon = None, None

            if not any([state, district, location, date, event_id]):
                continue

            conf = "TABLE_EXTRACTED_WITH_COORDS" if (lat and lon) else "TABLE_EXTRACTED_NO_COORDS"
            records.append({
                "landslide_id": f"ATLAS_{ls_id:04d}",
                "state": state,
                "district": district,
                "location": location,
                "latitude": lat if lat else "",
                "longitude": lon if lon else "",
                "date": date,
                "event_id": event_id,
                "landslide_type": ls_type,
                "source_page": table["page"],
                "source_document": source_doc,
                "confidence": conf,
                "notes": f"Table row from page {table['page']}"
            })
            ls_id += 1

    return records


def extract_ner_stats_from_text(doc, relevant_pages):
    """
    Extract any state/district level landslide statistics or counts
    that appear in text form (not tables) on relevant pages.
    """
    stats = []
    for pg_info in relevant_pages[:50]:  # limit to first 50 relevant pages
        pgnum = pg_info["page"]
        page = doc[pgnum - 1]
        text = page.get_text("text")

        # Look for NER state mentions with numbers
        for state in NER_STATES:
            if state.lower() in text.lower():
                # Find sentences containing the state name
                sentences = re.split(r'[.;\n]', text)
                for sent in sentences:
                    if state.lower() in sent.lower():
                        # Look for numbers in the sentence
                        nums = re.findall(r'\b\d+\b', sent)
                        if nums:
                            stats.append({
                                "page": pgnum,
                                "state": state,
                                "context": sent.strip()[:200],
                                "numbers_mentioned": nums[:5]
                            })
    return stats


def save_geojson(records, out_path):
    """Save georeferenced records as GeoJSON."""
    features = []
    for r in records:
        try:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            if lat and lon:
                props = {k: v for k, v in r.items() if k not in ["latitude", "longitude"]}
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": props
                })
        except (ValueError, TypeError):
            continue

    geojson = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
        "properties": {
            "source": "ISRO Landslide Atlas 2023",
            "generated_at": datetime.utcnow().isoformat() + "Z"
        }
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    return len(features)


def main():
    print("\n=== Step 4: ISRO Landslide Atlas PDF Extraction ===\n")

    import fitz

    report = {
        "source_pdf": str(PDF_PATH),
        "extraction_time": datetime.utcnow().isoformat() + "Z",
        "page_count": 0,
        "pages_inspected": 0,
        "pages_used": [],
        "records_extracted": 0,
        "records_with_coordinates": 0,
        "records_without_coordinates": 0,
        "extraction_method": "PyMuPDF + pdfplumber table extraction",
        "warnings": [],
        "status": "IN_PROGRESS"
    }

    try:
        doc = fitz.open(PDF_PATH)
        meta = inspect_pdf_metadata(doc)
        report.update(meta)
        print(f"  PDF: {PDF_PATH.name}")
        print(f"  Pages: {meta['page_count']}")
        print(f"  Title: {meta.get('title', 'N/A')}")

        # Find relevant pages
        print(f"  Scanning {doc.page_count} pages for keywords...")
        relevant = find_relevant_pages(doc, KEYWORDS)
        print(f"  Found {len(relevant)} relevant pages")
        report["pages_inspected"] = len(relevant)
        report["pages_used"] = [r["page"] for r in relevant]

        all_records = []

        if relevant:
            page_nums = [r["page"] for r in relevant]

            # Extract tables
            print(f"  Extracting tables from {min(len(page_nums), 100)} pages...")
            try:
                # Limit to first 100 relevant pages to avoid excessive processing
                tables = extract_tables_pdfplumber(PDF_PATH, page_nums[:100])
                print(f"  Found {len(tables)} tables")
                table_records = parse_tables_to_records(tables, "LandslideAtlas_2023.pdf")
                all_records.extend(table_records)
                print(f"  Extracted {len(table_records)} records from tables")
            except Exception as e:
                report["warnings"].append(f"Table extraction error: {str(e)}")
                print(f"  Table extraction warning: {e}")

            # Extract NER statistics from text
            print("  Extracting NER statistical context from text...")
            try:
                stats = extract_ner_stats_from_text(doc, relevant)
                if stats:
                    stats_path = ATLAS_OUT_DIR / "atlas_ner_statistics.json"
                    with open(stats_path, "w", encoding="utf-8") as f:
                        json.dump(stats, f, indent=2)
                    print(f"  NER statistics context → {stats_path} ({len(stats)} entries)")
            except Exception as e:
                report["warnings"].append(f"Text stats extraction error: {str(e)}")

        doc.close()

        with_coords = [r for r in all_records if r.get("latitude") and r.get("longitude")]
        without_coords = [r for r in all_records if not (r.get("latitude") and r.get("longitude"))]

        report["records_extracted"] = len(all_records)
        report["records_with_coordinates"] = len(with_coords)
        report["records_without_coordinates"] = len(without_coords)

        if not all_records:
            report["warnings"].append(
                "No structured tabular records extracted. "
                "ISRO Landslide Atlas may use primarily mapped/visual data or "
                "district/state-level aggregate statistics rather than point inventories. "
                "Source is documented for provenance."
            )
            report["status"] = "PARTIAL - No point inventory extracted"
            all_records = [{
                "landslide_id": "ATLAS_SOURCE_DOCUMENTED",
                "state": "Various (NER)",
                "district": "",
                "location": "",
                "latitude": "",
                "longitude": "",
                "date": "",
                "event_id": "",
                "landslide_type": "",
                "source_page": "N/A",
                "source_document": "LandslideAtlas_2023.pdf",
                "confidence": "UNEXTRACTED",
                "notes": (
                    "ISRO Landslide Atlas 2023 present. "
                    "Programmatic table extraction yielded no structured point inventory. "
                    "Atlas likely contains state/district-level statistics and susceptibility maps. "
                    f"File: {PDF_PATH.name}, Size: {PDF_PATH.stat().st_size} bytes, "
                    f"Pages: {report['page_count']}, "
                    f"Relevant pages found: {len(report['pages_used'])}. "
                    "Provenance: ISRO/NRSC Landslide Atlas of India 2023."
                )
            }]
        else:
            report["status"] = "COMPLETED"

        # Write CSV
        csv_path = ATLAS_OUT_DIR / "landslide_atlas_inventory.csv"
        fieldnames = ["landslide_id", "state", "district", "location",
                      "latitude", "longitude", "date", "event_id",
                      "landslide_type", "source_page", "source_document",
                      "confidence", "notes"]
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in all_records:
                row = {k: r.get(k, "") for k in fieldnames}
                writer.writerow(row)
        print(f"  Atlas CSV → {csv_path} ({len(all_records)} records)")

        # Write GeoJSON
        geojson_path = ATLAS_OUT_DIR / "landslide_atlas_inventory.geojson"
        n_geo = save_geojson(all_records, geojson_path)
        print(f"  Atlas GeoJSON → {geojson_path} ({n_geo} georeferenced records)")

    except Exception as e:
        report["status"] = f"ERROR: {str(e)}"
        report["warnings"].append(str(e))
        print(f"  ERROR: {e}")

    # Write report
    report_path = ATLAS_OUT_DIR / "atlas_extraction_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"  Atlas extraction report → {report_path}")
    print(f"\n  Summary: {report['records_extracted']} records, status: {report['status']}")


if __name__ == "__main__":
    main()
