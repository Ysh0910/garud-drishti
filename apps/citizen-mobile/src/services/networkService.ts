/**
 * Network Reachability & Offline Sync Coordinator
 * Supports testing offline queue transitions and triggers automatic retry on reconnection.
 */

import { ReportQueueManager } from '../storage/reportQueue';
import { reportService } from './reportService';

type NetworkListener = (isOnline: boolean) => void;

export class NetworkService {
  private static isOnline = true;
  private static listeners: Set<NetworkListener> = new Set();
  private static activeSyncPromise: Promise<{ syncedCount: number; failedCount: number }> | null = null;

  /** Get current online status */
  static getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Toggle network status (used both for real net detection and for hackathon offline demo)
   */
  static setOnline(status: boolean) {
    if (this.isOnline !== status) {
      this.isOnline = status;
      this.listeners.forEach((listener) => listener(status));

      // Trigger automatic background sync when reconnected
      if (status) {
        this.syncPendingReports().catch(console.error);
      }
    }
  }

  /** Subscribe to connectivity status changes */
  static subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Attempts to upload all PENDING or FAILED items in the local offline queue.
   * Coalesces concurrent calls so callers can safely await in-flight syncs.
   */
  static async syncPendingReports(): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline) {
      return { syncedCount: 0, failedCount: 0 };
    }

    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    this.activeSyncPromise = (async () => {
      let syncedCount = 0;
      let failedCount = 0;

      try {
        const pendingItems = await ReportQueueManager.getPendingItems();

        for (const item of pendingItems) {
          try {
            await ReportQueueManager.updateItem(item.local_id, { status: 'UPLOADING' });
            const response = await reportService.submitReport(item.payload);
            await ReportQueueManager.markSynced(item.local_id, response.report_id);
            syncedCount++;
          } catch (error: unknown) {
            failedCount++;
            const errorMessage = error instanceof Error ? error.message : 'Network sync failed';
            await ReportQueueManager.updateItem(item.local_id, {
              status: 'FAILED',
              retry_count: item.retry_count + 1,
              error_message: errorMessage,
            });
          }
        }
      } finally {
        this.activeSyncPromise = null;
      }

      return { syncedCount, failedCount };
    })();

    return this.activeSyncPromise;
  }
}
