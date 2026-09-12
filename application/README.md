# 🛰️ GARUD DRISHTI — Citizen Field Mobile Application

> **Institutional Field Hazard Observation & Early Warning Mobile App**  
> Developed as part of the **GARUD DRISHTI** AI-Powered Landslide Early Warning System for the North Eastern Region (NER), India.

---

## 📋 Role & Scope

The **Citizen Field Mobile Application** empowers citizens, village safety volunteers, and field engineers to:
1. **Acquire High-Accuracy GPS Satellite Fixes** with automatic regional area name and geological sector resolution.
2. **Capture Live Optical Sensor Evidence** using the device camera hardware (strictly blocking pre-recorded gallery uploads to prevent fraudulent or stale reports).
3. **File Structured Hazard Observations** across standardized categories (e.g. *Crack, Rockfall, Road Blockage, Soil Movement, Seepage, Active Landslide*).
4. **Operate 100% Offline in Mountain Valleys** with a local FIFO queue and automatic background synchronization upon network restoration.
5. **Receive Authoritative Geological Risk Advisories** including 6h, 24h, 48h, and 72h calibrated landslide risk forecast outlooks.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native (0.73.4) + TypeScript (5.0.4) |
| **Web Engine** | React Native Web + Vite (8.3.0) with adaptive mobile display breakpoints |
| **Navigation** | React Navigation v6 (Native Stack) with zero-minification component contracts |
| **Local Storage** | React Native AsyncStorage with memory adapter fallback |
| **Media Hardware** | Direct WebRTC Camera Viewfinder + Native Hardware Shutter (`capture="environment"`) |
| **Positioning** | WGS-84 Geolocation with reverse geocoding & regional geological sector lookup |
| **Testing** | Automated Node.js / TSX test runner verifying Phase 1–6 requirements |

---

## 📂 Architecture & Directory Structure

```text
application/
├── index.html                  # Responsive mobile display wrapper (viewport-fit=cover)
├── index.web.tsx               # App entry point registered via AppRegistry
├── package.json                # Project dependencies and operational scripts
├── tsconfig.json               # Strict TypeScript configuration
├── vite.config.ts              # Vite bundler configuration with React Native Web aliasing
├── src/
│   ├── components/
│   │   ├── CategorySelector.tsx    # Responsive grid for 8 hazard observation classes
│   │   ├── Header.tsx              # Agency branding, station telemetry, and online toggle
│   │   ├── LiveCameraModal.tsx     # Live WebRTC camera viewfinder with instant Back dismissal
│   │   ├── LocationBadge.tsx       # GPS coordinates, exact area name & geo-sector card
│   │   ├── OfflineQueueBanner.tsx  # Queued offline reports counter with manual sync trigger
│   │   ├── PhotoPicker.tsx         # Live camera trigger and anti-fraud photo metadata badge
│   │   ├── ReportCard.tsx          # Observation history item with status badge (VERIFIED, etc.)
│   │   └── RiskSummaryCard.tsx     # Segmented hazard spectrum meter & telemetry HUD
│   ├── constants/
│   │   ├── config.ts               # API endpoints, default fallback coordinates & transport flags
│   │   └── theme.ts                # Institutional color palette (Slate, Emerald, Amber, Ruby)
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Stack Navigator for Home, Report, Confirmation, History, Advisory
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Primary command dashboard with quick precursor shortcuts
│   │   ├── ReportHazardScreen.tsx  # Complete field observation submission form
│   │   ├── ReportConfirmationScreen.tsx # Digital receipt with UUID, GPS, and operational notice
│   │   ├── MyReportsScreen.tsx     # Filterable log of past submitted/verified observations
│   │   └── RiskDetailScreen.tsx    # Geological risk estimation breakdown & 24h forecast horizons
│   ├── services/
│   │   ├── api.ts                  # Axios/Fetch HTTP client for backend dispatch
│   │   ├── locationService.ts      # GPS triangulation, reverse geocoding & terrain grid resolution
│   │   ├── networkService.ts       # Network connectivity monitor and queue synchronization
│   │   ├── reportService.ts        # Report creation, retrieval, and transport layer
│   │   └── riskService.ts          # Regional slope stability and forecast telemetry queries
│   ├── storage/
│   │   ├── reportQueue.ts          # Offline FIFO queue manager with idempotency enforcement
│   │   └── storageAdapter.ts       # Unified AsyncStorage interface
│   ├── types/
│   │   ├── enums.ts                # ReportCategory, ReportSeverity, ReportStatus, RiskLevel
│   │   ├── navigation.ts           # RootStackParamList type definitions
│   │   ├── reports.ts              # ReportCreateRequest, ReportResponse, PhotoAttachment
│   │   └── risk.ts                 # RiskPointResponse, ForecastHorizon, Telemetry
│   └── utils/
│       ├── formatters.ts           # Coordinate notation (° N, ° E) and date formatters
│       └── uuid.ts                 # Client-side UUID generator for idempotent submission
└── tests/
    ├── runAllTests.ts              # Test runner orchestrating all 5 test suites
    ├── reportQueue.test.ts         # Enqueue, status transitions, idempotency, retry tracking
    ├── reportService.test.ts       # API contract validation and query retrieval
    ├── locationService.test.ts     # Zero-coordinate guard and area details resolution
    ├── networkService.test.ts      # Offline mode transition and automatic network re-sync
    └── cameraPhotoEvidence.test.ts # Input/Output validation and media upload constraints
```

---

## 🔒 Security & Anti-Fraud Architecture

1. **Hardware Camera Enforcement**:
   - File gallery imports (`<input type="file">` without camera capture) are strictly excluded.
   - Photos are captured in real-time from the physical camera sensor to prevent submitting downloaded or stale Internet images.
2. **Zero-Coordinate Submission Guard**:
   - The app explicitly detects and rejects `(0.0, 0.0)` null coordinates, preventing uncalibrated sensor data from corrupting the early-warning model.
3. **Client-Side UUID Idempotency**:
   - Every report generates a `client_report_id` UUID prior to transmission. If a network packet drops during submission and is retried, the backend identifies the duplicate and prevents double-counting.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run web
```
The application will launch on `http://localhost:3000/`.

### 3. Build Production Bundle
```bash
npm run web:build
```
Outputs optimized, minified production assets to `dist/`.

### 4. Run Unit Test Suite
```bash
npm test
```
Executes all 5 unit test suites validating Phase 1 through Phase 6 requirements.

### 5. Run TypeScript Type Check
```bash
npm run typecheck
```
Performs zero-error strict TypeScript validation across all modules.

---

## 📡 API Contract Compliance

The mobile application strictly conforms to the repository contracts defined under `contracts/reports.md` and `contracts/risk.md`:

- **Report Payload**:
  ```json
  {
    "client_report_id": "c8f1e582-7d31-419a-9e12-32b001a1d999",
    "category": "ROCKFALL",
    "description": "Active tension crack opening with rolling debris",
    "latitude": 25.6185,
    "longitude": 91.8792,
    "location_accuracy_m": 4.8,
    "captured_at": "2026-09-12T17:30:00.000Z",
    "severity": "HIGH",
    "photo": {
      "uri": "data:image/jpeg;base64,...",
      "name": "live_hazard_scarp_1726162200000.jpg",
      "type": "image/jpeg",
      "sizeBytes": 245760,
      "capturedAt": "2026-09-12T17:30:00.000Z"
    }
  }
  ```

- **Report Response**:
  ```json
  {
    "report_id": "srv-rep-f3a6ac5b",
    "client_report_id": "c8f1e582-7d31-419a-9e12-32b001a1d999",
    "status": "PENDING",
    "category": "ROCKFALL",
    "description": "Active tension crack opening with rolling debris",
    "latitude": 25.6185,
    "longitude": 91.8792,
    "location_accuracy_m": 4.8,
    "captured_at": "2026-09-12T17:30:00.000Z",
    "submitted_at": "2026-09-12T17:30:01.250Z",
    "severity": "HIGH",
    "media_url": "data:image/jpeg;base64,...",
    "evidence_score": null,
    "nearest_cell_id": "cell_ner_0042",
    "verified_by": null,
    "verified_at": null,
    "rejection_reason": null
  }
  ```

---

## 🧪 Test Verification Summary

```text
====================================================
  GARUD DRISHTI — Citizen Mobile App Unit Tests
  Testing Phase 1 to Phase 6 Core Workflows
====================================================

--- Running ReportQueue Tests ---
✓ Initial queue is empty
✓ Successfully enqueued report with PENDING status
✓ Idempotency: Duplicate client_report_id prevented
✓ Item status transitioned to UPLOADING
✓ Item marked SYNCED with server report ID
✓ SYNCED item excluded from pending items
✓ FAILED status and retry_count accurately tracked

--- Running ReportService Tests ---
✓ MockReportService outputs contract-conforming ReportResponse
✓ Submitted report stored and retrieved for My Reports list
✓ Report successfully queried by report_id

--- Running LocationService Tests ---
✓ GPS location acquired: 25.6185, 91.8792 (Accuracy: 6.8m)
✓ Resolved Area: "Mawkdok Dympep Valley (NH-106 Corridor)" in East Khasi Hills District, Meghalaya
✓ Sector Telemetry: Grid NER-GRID-42, Elevation ~1485m MSL
✓ Zero-coordinate guard verified (0,0 is never silently submitted)

--- Running NetworkService & Sync Tests ---
✓ Initial network status is ONLINE
✓ OFFLINE toggle correctly notified listeners
✓ Report queued locally while in OFFLINE state
✓ Auto-sync uploaded offline report to backend upon network reconnection

--- Running Live Camera & Photo Evidence Tests ---
✓ Test 1 Passed: Input matches Expected Output format conforming to contracts/reports.md
✓ Test 2 Passed: Photo MIME type (image/jpeg) and size (245760 bytes) within limits
✓ Test 3 Passed: Live camera photo preserved in local offline queue
✓ Test 4 Passed: Live camera evidence synced to backend upon reconnection

====================================================
  🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! (5/5 Suites)
====================================================
```
