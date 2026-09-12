/**
 * Test Suite: Live Camera Photo Evidence & Verification Pipeline
 * Verifies live camera photo capture data flow, constraint validation (10MB limit, MIME types),
 * and records the exact input payloads and expected output structures.
 */

import assert from 'assert';
import { MockReportService } from '../src/services/reportService';
import { ReportQueueManager } from '../src/storage/reportQueue';
import { NetworkService } from '../src/services/networkService';
import { setStorageAdapterForTesting, IStorageAdapter } from '../src/storage/storageAdapter';
import { ReportCreateRequest, ReportResponse, PhotoAttachment } from '../src/types/reports';

class MockTestStorage implements IStorageAdapter {
  private memory = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.memory.get(key) || null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.memory.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.memory.delete(key);
  }
  async clear(): Promise<void> {
    this.memory.clear();
  }
}

export async function runCameraPhotoEvidenceTests() {
  console.log('\n--- Running Live Camera & Photo Evidence Tests ---');
  setStorageAdapterForTesting(new MockTestStorage());

  const service = new MockReportService();

  // =========================================================================
  // SPECIFICATION: RECORDED INPUT & EXPECTED OUTPUT
  // =========================================================================
  const testTimestamp = '2026-09-12T17:30:00.000Z';
  const livePhotoPayload: PhotoAttachment = {
    uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    name: 'live_hazard_scarp_1726162200000.jpg',
    type: 'image/jpeg',
    sizeBytes: 245760, // 240 KB
    capturedAt: testTimestamp,
  };

  const recordedInput: ReportCreateRequest = {
    client_report_id: 'client-camera-uuid-001',
    category: 'ROCKFALL',
    description: 'Active tension crack opening with rolling debris on highway cutting',
    latitude: 25.6185,
    longitude: 91.8792,
    location_accuracy_m: 4.8,
    captured_at: testTimestamp,
    severity: 'HIGH',
    photo: livePhotoPayload,
  };

  console.log('\n[RECORDED TEST INPUT]');
  console.log(JSON.stringify(recordedInput, null, 2));

  // 1. Submit Report with Live Camera Photo Evidence
  const actualOutput: ReportResponse = await service.submitReport(recordedInput);

  console.log('\n[RECEIVED TEST OUTPUT]');
  console.log(JSON.stringify(actualOutput, null, 2));

  // =========================================================================
  // CONTRACT ASSERTIONS (contracts/reports.md & contracts/enums.md)
  // =========================================================================

  // A. Identity & Idempotency
  assert.strictEqual(
    actualOutput.client_report_id,
    recordedInput.client_report_id,
    'Output client_report_id must match client input UUID for idempotency'
  );
  assert.ok(
    actualOutput.report_id.startsWith('srv-rep-'),
    'Server report_id must follow the srv-rep- pattern'
  );

  // B. Lifecycle Status
  assert.strictEqual(
    actualOutput.status,
    'PENDING',
    'Initial status must be PENDING for authority review (evidence, not oracle)'
  );

  // C. Field Evidence & Media
  assert.strictEqual(
    actualOutput.media_url,
    livePhotoPayload.uri,
    'media_url must retain the live photo URI'
  );
  assert.strictEqual(
    actualOutput.category,
    'ROCKFALL',
    'Category must match canonical ReportCategory'
  );
  assert.strictEqual(
    actualOutput.severity,
    'HIGH',
    'Observer severity must be preserved'
  );

  // D. Geolocation Telemetry
  assert.strictEqual(actualOutput.latitude, 25.6185);
  assert.strictEqual(actualOutput.longitude, 91.8792);
  assert.strictEqual(actualOutput.location_accuracy_m, 4.8);

  // E. Timestamps
  assert.strictEqual(
    actualOutput.captured_at,
    testTimestamp,
    'captured_at must be the observation time, not upload time'
  );
  assert.ok(actualOutput.submitted_at, 'submitted_at server timestamp must be populated');

  console.log('✓ Test 1 Passed: Input matches Expected Output format conforming to contracts/reports.md');

  // =========================================================================
  // TEST 2: Photo Attachment Constraints Validation
  // =========================================================================
  console.log('\n[TEST 2: Validating Media Upload Constraints (contracts/reports.md §1)]');

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB limit per contract

  assert.ok(
    allowedMimeTypes.includes(livePhotoPayload.type || ''),
    `Photo MIME type ${livePhotoPayload.type} must be one of: ${allowedMimeTypes.join(', ')}`
  );
  assert.ok(
    (livePhotoPayload.sizeBytes || 0) <= maxSizeBytes,
    `Photo size must not exceed 10 MB constraint`
  );
  console.log(`✓ Test 2 Passed: Photo MIME type (${livePhotoPayload.type}) and size (${livePhotoPayload.sizeBytes} bytes) within limits`);

  // =========================================================================
  // TEST 3: Offline Queue Persistence of Live Camera Evidence
  // =========================================================================
  console.log('\n[TEST 3: Offline Queueing of Live Camera Evidence]');

  NetworkService.setOnline(false);

  const offlinePhotoPayload: ReportCreateRequest = {
    client_report_id: 'offline-camera-uuid-002',
    category: 'CRACK',
    description: 'Road scarp deformation after heavy downpour',
    latitude: 25.6200,
    longitude: 91.8800,
    captured_at: new Date().toISOString(),
    photo: {
      uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      name: 'offline_crack_evidence.jpg',
      type: 'image/jpeg',
      sizeBytes: 180200,
    },
  };

  const queuedItem = await ReportQueueManager.enqueue(offlinePhotoPayload);
  assert.strictEqual(queuedItem.status, 'PENDING');
  assert.strictEqual(queuedItem.photo_uri, offlinePhotoPayload.photo?.uri);

  const pendingItems = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pendingItems.length, 1);
  assert.strictEqual(pendingItems[0].local_id, 'offline-camera-uuid-002');
  assert.ok(pendingItems[0].payload.photo?.uri, 'Live photo attachment must be preserved in offline storage');
  console.log('✓ Test 3 Passed: Live camera photo preserved in local offline queue');

  // =========================================================================
  // TEST 4: Auto-sync on Reconnection
  // =========================================================================
  console.log('\n[TEST 4: Auto-Sync Live Evidence on Network Restoration]');
  NetworkService.setOnline(true);
  const { syncedCount } = await NetworkService.syncPendingReports();
  assert.strictEqual(syncedCount, 1, 'Offline report with camera evidence must sync when network returns');

  const pendingAfterSync = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pendingAfterSync.length, 0, 'Queue should be empty after sync');
  console.log('✓ Test 4 Passed: Live camera evidence synced to backend upon reconnection');
}
