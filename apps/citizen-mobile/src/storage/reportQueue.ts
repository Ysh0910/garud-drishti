/**
 * Offline Report Queue Manager
 * Persists unsent citizen hazard reports in local storage and manages sync lifecycles.
 */

import { QueueItem, ReportCreateRequest, ReportResponse } from '../types/reports';
import { storage } from './storageAdapter';

const QUEUE_STORAGE_KEY = '@garud_drishti_report_queue_v1';
const REPORTS_CACHE_KEY = '@garud_drishti_reports_cache_v1';

export class ReportQueueManager {
  /** Retrieves all items in the local queue */
  static async getAllQueueItems(): Promise<QueueItem[]> {
    try {
      const data = await storage.getItem(QUEUE_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as QueueItem[];
    } catch {
      return [];
    }
  }

  /** Retrieves items needing upload (PENDING or FAILED) */
  static async getPendingItems(): Promise<QueueItem[]> {
    const items = await this.getAllQueueItems();
    return items.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
  }

  /** Adds a new report payload into the local offline queue */
  static async enqueue(payload: ReportCreateRequest): Promise<QueueItem> {
    const items = await this.getAllQueueItems();

    // Check for duplicate client_report_id
    const existing = items.find((i) => i.local_id === payload.client_report_id);
    if (existing) {
      return existing;
    }

    const newItem: QueueItem = {
      local_id: payload.client_report_id,
      payload,
      photo_uri: payload.photo?.uri,
      created_at: payload.captured_at || new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };

    items.unshift(newItem);
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    return newItem;
  }

  /** Updates an item's status, error, or retry count */
  static async updateItem(localId: string, updates: Partial<QueueItem>): Promise<void> {
    const items = await this.getAllQueueItems();
    const index = items.findIndex((i) => i.local_id === localId);
    if (index === -1) return;

    items[index] = { ...items[index], ...updates };
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  }

  /** Marks an item as SYNCED with its backend server ID */
  static async markSynced(localId: string, serverReportId: string): Promise<void> {
    await this.updateItem(localId, {
      status: 'SYNCED',
      server_report_id: serverReportId,
      synced_at: new Date().toISOString(),
      error_message: undefined,
    });
  }

  /** Removes an item from the queue */
  static async removeItem(localId: string): Promise<void> {
    const items = await this.getAllQueueItems();
    const filtered = items.filter((i) => i.local_id !== localId);
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  }

  /** Clears entire queue (for debugging or user reset) */
  static async clearQueue(): Promise<void> {
    await storage.removeItem(QUEUE_STORAGE_KEY);
  }

  /** Cached submitted reports for the "My Reports" view */
  static async getCachedReports(): Promise<ReportResponse[]> {
    try {
      const data = await storage.getItem(REPORTS_CACHE_KEY);
      if (!data) return [];
      return JSON.parse(data) as ReportResponse[];
    } catch {
      return [];
    }
  }

  /** Cache a newly submitted or confirmed report */
  static async cacheReport(report: ReportResponse): Promise<void> {
    const current = await this.getCachedReports();
    // Deduplicate by report_id or client_report_id
    const index = current.findIndex(
      (r) => r.report_id === report.report_id || r.client_report_id === report.client_report_id
    );
    if (index >= 0) {
      current[index] = report;
    } else {
      current.unshift(report);
    }
    await storage.setItem(REPORTS_CACHE_KEY, JSON.stringify(current));
  }
}
