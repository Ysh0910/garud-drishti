/**
 * Network Reachability & Offline Sync Coordinator
 * Real-time hardware telemetry detection for WiFi, Cellular, Weak Signal, and Offline states.
 * Automatically synchronizes pending reports upon reconnection.
 */

import { ReportQueueManager } from '../storage/reportQueue';
import { reportService } from './reportService';

export type ConnectionMedium = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';
export type EffectiveSpeed = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
export type SignalQuality = 'strong' | 'moderate' | 'weak' | 'offline';

export interface NetworkState {
  isOnline: boolean;
  medium: ConnectionMedium;
  effectiveSpeed: EffectiveSpeed;
  signalQuality: SignalQuality;
  downlinkMbps?: number;
  rttMs?: number;
}

type NetworkListener = (isOnline: boolean) => void;
type DetailedNetworkListener = (state: NetworkState) => void;

export class NetworkService {
  private static networkState: NetworkState = {
    isOnline: true,
    medium: 'unknown',
    effectiveSpeed: 'unknown',
    signalQuality: 'strong',
  };

  private static listeners: Set<NetworkListener> = new Set();
  private static detailedListeners: Set<DetailedNetworkListener> = new Set();
  private static activeSyncPromise: Promise<{ syncedCount: number; failedCount: number }> | null = null;
  private static isInitialized = false;
  private static manualOverride: boolean | null = null;

  /** Initialize automatic hardware network detection */
  static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof window !== 'undefined') {
      // 1. Listen to standard window online/offline events
      window.addEventListener('online', () => {
        this.manualOverride = null;
        this.detectRealtimeNetwork();
      });

      window.addEventListener('offline', () => {
        this.manualOverride = null;
        this.detectRealtimeNetwork();
      });

      // 2. Listen to Network Information API changes (WiFi vs Cellular vs Weak)
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

      if (conn && typeof conn.addEventListener === 'function') {
        conn.addEventListener('change', () => {
          this.manualOverride = null;
          this.detectRealtimeNetwork();
        });
      }

      // 3. Periodic real-time probe every 6 seconds
      setInterval(() => {
        if (this.manualOverride === null) {
          this.detectRealtimeNetwork();
        }
      }, 6000);

      // Perform initial detection
      this.detectRealtimeNetwork();
    }
  }

  /**
   * Probe and compute real-time connection telemetry from hardware APIs
   */
  static detectRealtimeNetwork() {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    const isBrowserOnline = nav ? nav.onLine !== false : true;

    // Honor manual override if set by testing environment
    const isOnline = this.manualOverride !== null ? this.manualOverride : isBrowserOnline;

    if (!isOnline) {
      this.updateState({
        isOnline: false,
        medium: 'none',
        effectiveSpeed: 'unknown',
        signalQuality: 'offline',
      });
      return;
    }

    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    let medium: ConnectionMedium = 'unknown';
    let effectiveSpeed: EffectiveSpeed = 'unknown';
    let signalQuality: SignalQuality = 'strong';
    let downlinkMbps: number | undefined;
    let rttMs: number | undefined;

    if (conn) {
      downlinkMbps = typeof conn.downlink === 'number' ? conn.downlink : undefined;
      rttMs = typeof conn.rtt === 'number' ? conn.rtt : undefined;

      // Classify effective network speed
      if (conn.effectiveType) {
        effectiveSpeed = conn.effectiveType as EffectiveSpeed;
      }

      // Classify connection medium (WiFi vs Cellular vs Ethernet)
      const rawType = (conn.type || '').toLowerCase();
      if (rawType.includes('wifi')) {
        medium = 'wifi';
      } else if (rawType.includes('cellular') || rawType.includes('wimax')) {
        medium = 'cellular';
      } else if (rawType.includes('ethernet')) {
        medium = 'ethernet';
      } else {
        // Infer medium if raw type is unspecified
        const isMobile = /Android|iPhone|iPad|iPod/i.test(nav?.userAgent || '');
        if (isMobile && conn.effectiveType) {
          medium = 'cellular';
        } else {
          medium = 'wifi';
        }
      }

      // Dynamically detect weak / low signal
      // Low network condition: 2g/slow-2g, high latency (>600ms), or very low throughput (<0.8 Mbps)
      const isWeak =
        effectiveSpeed === 'slow-2g' ||
        effectiveSpeed === '2g' ||
        (rttMs !== undefined && rttMs > 600) ||
        (downlinkMbps !== undefined && downlinkMbps < 0.8);

      const isModerate =
        effectiveSpeed === '3g' ||
        (rttMs !== undefined && rttMs > 250) ||
        (downlinkMbps !== undefined && downlinkMbps < 2.5);

      if (isWeak) {
        signalQuality = 'weak';
      } else if (isModerate) {
        signalQuality = 'moderate';
      } else {
        signalQuality = 'strong';
      }
    } else {
      // Fallback when Network Information API is not available
      medium = 'wifi';
      effectiveSpeed = '4g';
      signalQuality = 'strong';
    }

    this.updateState({
      isOnline: true,
      medium,
      effectiveSpeed,
      signalQuality,
      downlinkMbps,
      rttMs,
    });
  }

  private static updateState(newState: NetworkState) {
    const wasOnline = this.networkState.isOnline;
    const hasChanged =
      this.networkState.isOnline !== newState.isOnline ||
      this.networkState.medium !== newState.medium ||
      this.networkState.signalQuality !== newState.signalQuality ||
      this.networkState.effectiveSpeed !== newState.effectiveSpeed;

    this.networkState = newState;

    if (hasChanged) {
      // Notify binary listeners
      this.listeners.forEach((listener) => listener(newState.isOnline));

      // Notify detailed telemetry listeners
      this.detailedListeners.forEach((listener) => listener(newState));

      // Trigger automatic background sync when network is restored
      if (!wasOnline && newState.isOnline) {
        this.syncPendingReports().catch(console.error);
      }
    }
  }

  /** Get current online status */
  static getStatus(): boolean {
    return this.networkState.isOnline;
  }

  /** Get detailed real-time network state */
  static getNetworkState(): NetworkState {
    return this.networkState;
  }

  /**
   * Set network status programmatically (used for tests or simulation)
   */
  static setOnline(status: boolean) {
    this.manualOverride = status;
    if (status) {
      this.updateState({
        isOnline: true,
        medium: 'wifi',
        effectiveSpeed: '4g',
        signalQuality: 'strong',
      });
    } else {
      this.updateState({
        isOnline: false,
        medium: 'none',
        effectiveSpeed: 'unknown',
        signalQuality: 'offline',
      });
    }
  }

  /** Subscribe to connectivity status changes */
  static subscribe(listener: NetworkListener): () => void {
    this.init();
    this.listeners.add(listener);
    listener(this.networkState.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Subscribe to detailed real-time network state changes */
  static subscribeDetailed(listener: DetailedNetworkListener): () => void {
    this.init();
    this.detailedListeners.add(listener);
    listener(this.networkState);
    return () => {
      this.detailedListeners.delete(listener);
    };
  }

  /**
   * Attempts to upload all PENDING or FAILED items in the local offline queue.
   * Coalesces concurrent calls so callers can safely await in-flight syncs.
   */
  static async syncPendingReports(): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.networkState.isOnline) {
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

// Auto-initialize when loaded
NetworkService.init();
