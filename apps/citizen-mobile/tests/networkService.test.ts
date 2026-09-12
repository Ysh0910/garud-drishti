import assert from 'assert';
import { NetworkService } from '../src/services/networkService';
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

export async function runNetworkServiceTests() {
  console.log('\n--- Running NetworkService & Sync Tests ---');
  setStorageAdapterForTesting(new MockTestStorage());

  // 1. Initial status
  NetworkService.setOnline(true);
  assert.strictEqual(NetworkService.getStatus(), true);
  console.log('✓ Initial network status is ONLINE');

  // 2. Offline transition
  let observedStatus: boolean | null = null;
  const unsubscribe = NetworkService.subscribe((status) => {
    observedStatus = status;
  });

  NetworkService.setOnline(false);
  assert.strictEqual(NetworkService.getStatus(), false);
  assert.strictEqual(observedStatus, false, 'Subscriber should be notified of OFFLINE transition');
  console.log('✓ OFFLINE toggle correctly notified listeners');

  // 3. Add pending report in offline mode
  const payload: ReportCreateRequest = {
    client_report_id: 'offline-sync-test-uuid',
    category: 'SEEPAGE',
    description: 'Muddy water welling up from slope toe',
    latitude: 25.6185,
    longitude: 91.8792,
    captured_at: new Date().toISOString(),
  };
  await ReportQueueManager.enqueue(payload);

  let pending = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pending.length, 1, 'Report should be pending while offline');
  console.log('✓ Report queued locally while in OFFLINE state');

  // 4. Restore connectivity and run sync
  NetworkService.setOnline(true);
  assert.strictEqual(observedStatus, true, 'Subscriber should be notified of ONLINE transition');

  const { syncedCount } = await NetworkService.syncPendingReports();
  assert.strictEqual(syncedCount, 1, 'Pending report should sync successfully upon network restoration');

  pending = await ReportQueueManager.getPendingItems();
  assert.strictEqual(pending.length, 0, 'No reports should remain pending after sync');
  console.log('✓ Auto-sync uploaded offline report to backend upon network reconnection');

  unsubscribe();
}
