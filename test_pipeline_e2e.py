"""
End-to-End test of the Citizen AI Vision Pipeline via HTTP.
"""
import io, json, uuid, http.client
from PIL import Image, ImageDraw


def make_test_image() -> bytes:
    """Create a synthetic landslide-like test image."""
    img = Image.new("RGB", (640, 480), color=(101, 85, 65))
    draw = ImageDraw.Draw(img)
    for y in range(200, 380, 20):
        draw.line([(0, y), (640, y + 30)], fill=(80, 65, 50), width=15)
    draw.polygon(
        [(50, 300), (250, 150), (450, 300), (320, 480), (100, 480)],
        fill=(120, 100, 70),
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def submit_report_multipart(img_bytes: bytes) -> dict:
    boundary = "GarudTestBoundary2026"
    crid = str(uuid.uuid4())
    fields = {
        "client_report_id": crid,
        "category": "LANDSLIDE",
        "latitude": "25.6185",
        "longitude": "91.8792",
        "captured_at": "2026-09-16T15:00:00Z",
        "severity": "HIGH",
        "description": "Large debris flow across road, tension cracks observed",
    }

    parts = b""
    for k, v in fields.items():
        parts += (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{k}"\r\n\r\n'
            f"{v}\r\n"
        ).encode()

    parts += (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="photo"; filename="landslide.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + img_bytes + f"\r\n--{boundary}--\r\n".encode()

    conn = http.client.HTTPConnection("localhost", 8000, timeout=30)
    conn.request(
        "POST",
        "/api/v1/reports",
        parts,
        {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
    )
    resp = conn.getresponse()
    body = resp.read()
    print(f"  POST /api/v1/reports → HTTP {resp.status}")
    return json.loads(body), resp.status


def get_analysis(report_id: str) -> dict:
    conn = http.client.HTTPConnection("localhost", 8000, timeout=15)
    conn.request("GET", f"/api/v1/citizen/reports/{report_id}/analysis", headers={"Accept": "application/json"})
    resp = conn.getresponse()
    body = resp.read()
    print(f"  GET /api/v1/citizen/reports/{report_id}/analysis → HTTP {resp.status}")
    return json.loads(body), resp.status


def main():
    print("=" * 60)
    print("GARUD DRISHTI - Citizen AI Vision Pipeline E2E Test")
    print("=" * 60)

    print("\n[1] Health check...")
    conn = http.client.HTTPConnection("localhost", 8000, timeout=10)
    conn.request("GET", "/health", headers={"Accept": "application/json"})
    r = conn.getresponse()
    health = json.loads(r.read())
    print(f"  /health → {health}")
    assert health["status"] == "healthy", "Health check failed!"

    print("\n[2] Risk assessment (NER coordinates)...")
    conn = http.client.HTTPConnection("localhost", 8000, timeout=10)
    conn.request("GET", "/api/v1/risk/25.6185/91.8792", headers={"Accept": "application/json"})
    r = conn.getresponse()
    risk = json.loads(r.read())
    print(f"  Risk level: {risk['risk_level']}, score: {risk['current_risk']}")
    assert "risk_level" in risk

    print("\n[3] Generating synthetic landslide image...")
    img_bytes = make_test_image()
    print(f"  Image size: {len(img_bytes)} bytes (JPEG)")

    print("\n[4] Submitting citizen report with photo...")
    report, status_code = submit_report_multipart(img_bytes)
    assert status_code == 201, f"Expected 201, got {status_code}: {report}"
    report_id = report["report_id"]
    print(f"  Report ID: {report_id}")
    print(f"  Status: {report['status']}")
    print(f"  Evidence Score: {report['evidence_score']}")
    print(f"  Category: {report['category']}")

    print("\n[5] Fetching Vision AI analysis...")
    analysis, a_status = get_analysis(report_id)
    assert a_status == 200, f"Expected 200, got {a_status}: {analysis}"

    print("\n  === AI ANALYSIS RESULTS ===")
    print(f"  Priority Level      : {analysis['priority_level']}")
    print(f"  Response Priority   : {analysis['response_priority']}/100")
    print(f"  Environmental Risk  : {analysis['environmental_risk']}/100")
    print(f"  Image Confidence    : {analysis['image_confidence']}/100")
    print(f"  Report Credibility  : {analysis['credibility']}/100")
    print(f"  Observed Impact     : {analysis['observed_impact']}/100")
    print(f"  Exposure Score      : {analysis['exposure']}/100")
    print(f"  Coordination Risk   : {analysis['coordination_risk']}/100")
    print(f"  Landslide Detected  : {analysis['landslide_detected']}")
    print(f"  Road Blockage       : {analysis['road_blockage_detected']}")
    print(f"  Debris Detected     : {analysis['debris_detected']}")
    print(f"  Affected Fraction   : {analysis['visible_affected_fraction']:.2%}")
    print(f"  Recommended Action  : {analysis['recommended_action']}")
    if analysis.get("audit_positive_signals"):
        print(f"  Positive Signals    : {analysis['audit_positive_signals']}")
    if analysis.get("audit_risk_flags"):
        print(f"  Risk Flags          : {analysis['audit_risk_flags']}")

    print("\n[6] Listing reports...")
    conn = http.client.HTTPConnection("localhost", 8000, timeout=10)
    conn.request("GET", "/api/v1/reports", headers={"Accept": "application/json"})
    r = conn.getresponse()
    list_data = json.loads(r.read())
    print(f"  Total reports in system: {list_data['total']}")
    assert list_data["total"] >= 1

    print("\n" + "=" * 60)
    print("✅ ALL PIPELINE TESTS PASSED")
    print("=" * 60)
    print("\nSummary:")
    print(f"  Backend   → http://localhost:8000 (FastAPI/uvicorn)")
    print(f"  Frontend  → http://localhost:3001 (Vite/React-Native-Web)")
    print(f"  Pipeline  → {len([k for k in analysis.keys()])} analysis fields returned")
    print(f"  Vision AI → Priority={analysis['priority_level']}, "
          f"Credibility={analysis['credibility']}/100")


if __name__ == "__main__":
    main()
