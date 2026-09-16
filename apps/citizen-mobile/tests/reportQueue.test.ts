import assert from 'assert';
import { ReportQueueManager } from '../src/storage/reportQueue';
import { setStorageAdapterForTesting, IStorageAdapter } from '../src/storage/storageAdapter';
import { ReportCreateRequest } from '../src/types/reports';

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

export async function runReportQueueTests() {
  console.log('--- Running ReportQueue Tests ---');
  setStorageAdapterForTesting(new MockTestStorage());

  // 1. Initial queue should be empty
  let items = await ReportQueueManager.getAllQueueItems();
  assert.strictEqual(items.length, 0, 'Initial queue should be empty');
  console.log('✓ Initial queue is empty');

  // 2. Enqueue a report
  const payload1: ReportCreateRequest = {
    client_report_id: 'test-uuid-1111',
    category: 'CRACK',
    description: 'Widening tension crack on cut slope',
    latitude: 25.6185,
    longitude: 91.8792,
    location_accuracy_m: 5.2,
    captured_at: new Date().toISOString(),
    severity: 'HIGH',
  };

  const queuedItem = await ReportQueueManager.enqueue(payload1);
  assert.strictEqual(queuedItem.local_id, 'test-uuid-1111');
  assert.strictEqual(queuedItem.status, 'PENDING');
  assert.strictEqual(queuedItem.retry_count, 0);

  items = await ReportQueueManager.getAllQueueItems();
  assert.strictEqual(items.length, 1, 'Queue should contain 1 item');
  console.log('✓ Successfully enqueued report with PENDING status');

  // 3. Deduplication check: Enqueue same client_report_id
  const duplicate = await ReportQueueManager.enqueue(payload1);
  assert.strictEqual(duplicate.local_id, 'test-uuid-1111');
  items = await ReportQueueManager.getAllQueueItems();
  assert.strictEqual(items.length, 1, 'Duplicate client_report_id should not duplicate items in queue');
  console.log('✓ Idempotency: Duplicate client_report_id prevented');

  // 4. Update item status to UPLOADING then SYNCED
  await ReportQueueManager.updateItem('test-uuid-1111', { status: 'UPLOADING' });
  items = await ReportQueueManager.getAllQueueItems();
  assert.strictEqual(items[0].status, 'UPLOADING');
  console.log('✓ Item status transitioned to UPLOADING');

  await ReportQueueManager.markSynced('test-uuid-1111', 'srv-rep-9999');
  items = await ReportQueueManager.getAllQueueItems();
  assert.strictEqual(items[0].status, 'SYNCED');
  assert.strictEqual(items[0].server_report_id, 'srv-rep-9999');
  assert.ok(items[0].synced_at, 'synced_at timestamp should be set');
  console.log('✓ Item marked SYNCED with server report ID');

  // 5. getPendingItems should now return 0 since item is SYNCED
  const pending = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pending.length, 0, 'SYNCED item should not appear in pending queue');
  console.log('✓ SYNCED item excluded from pending items');

  // 6. Test FAILED status and retry_count
  const payload2: ReportCreateRequest = {
    client_report_id: 'test-uuid-2222',
    category: 'ROCKFALL',
    latitude: 25.62,
    longitude: 91.88,
    captured_at: new Date().toISOString(),
  };
  await ReportQueueManager.enqueue(payload2);
  await ReportQueueManager.updateItem('test-uuid-2222', {
    status: 'FAILED',
    retry_count: 1,
    error_message: 'Connection timed out in mountain pass',
  });

  const pendingAfterFail = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pendingAfterFail.length, 1);
  assert.strictEqual(pendingAfterFail[0].status, 'FAILED');
  assert.strictEqual(pendingAfterFail[0].retry_count, 1);
  console.log('✓ FAILED status and retry_count accurately tracked');
}
