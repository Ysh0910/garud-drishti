import assert from 'assert';
import { MockReportService } from '../src/services/reportService';
import { ReportCreateRequest } from '../src/types/reports';
import { setStorageAdapterForTesting, IStorageAdapter } from '../src/storage/storageAdapter';

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

export async function runReportServiceTests() {
  console.log('\n--- Running ReportService Tests ---');
  setStorageAdapterForTesting(new MockTestStorage());

  const service = new MockReportService();

  const payload: ReportCreateRequest = {
    client_report_id: 'client-test-uuid-4444',
    category: 'ROAD_BLOCKAGE',
    description: 'Boulders blocked NH-10 near Rangpo',
    latitude: 27.1767,
    longitude: 88.5303,
    location_accuracy_m: 8.0,
    captured_at: new Date().toISOString(),
    severity: 'HIGH',
    photo: {
      uri: 'mock://local/storage/rockfall.jpg',
      name: 'rockfall.jpg',
      type: 'image/jpeg',
    },
  };

  const response = await service.submitReport(payload);

  // Assertions against contracts/reports.md specification
  assert.ok(response.report_id.startsWith('srv-rep-'), 'report_id should follow srv-rep- pattern');
  assert.strictEqual(response.client_report_id, payload.client_report_id, 'client_report_id must match request');
  assert.strictEqual(response.status, 'PENDING', 'Initial lifecycle status must be PENDING per contract');
  assert.strictEqual(response.category, 'ROAD_BLOCKAGE');
  assert.strictEqual(response.latitude, 27.1767);
  assert.strictEqual(response.longitude, 88.5303);
  assert.strictEqual(response.severity, 'HIGH');
  assert.ok(response.submitted_at, 'submitted_at must be populated');
  console.log('✓ MockReportService outputs contract-conforming ReportResponse');

  // Verify caching for "My Reports"
  const reports = await service.getReports();
  assert.strictEqual(reports.length, 1, 'Submitted report must be retrievable from getReports()');
  assert.strictEqual(reports[0].report_id, response.report_id);
  console.log('✓ Submitted report stored and retrieved for My Reports list');

  // Retrieve by ID
  const found = await service.getReportById(response.report_id);
  assert.ok(found != null, 'Report should be retrievable by report_id');
  assert.strictEqual(found?.client_report_id, 'client-test-uuid-4444');
  console.log('✓ Report successfully queried by report_id');
}
