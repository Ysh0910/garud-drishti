/**
 * Citizen Alert Service
 * Ingests authoritative emergency alerts dispatched by Disaster Management Authorities.
 * Synchronized with backend /api/v1/alerts and triggers real-time mobile notifications.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';
import { AlertResponse } from '../types/alerts';

const SEEN_ALERTS_KEY = '@garud_seen_alert_ids';

export type AlertListener = (alert: AlertResponse) => void;

class CitizenAlertService {
  private baseUrl = APP_CONFIG.apiBaseUrl;
  private listeners: Set<AlertListener> = new Set();
  private pollInterval: any = null;
  private isPolling = false;
  private knownAlertIds: Set<string> = new Set();
  private initialized = false;

  constructor() {
    this.initSeenAlerts();
  }

  private async initSeenAlerts() {
    try {
      const stored = await AsyncStorage.getItem(SEEN_ALERTS_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        ids.forEach((id) => this.knownAlertIds.add(id));
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  /**
   * Request browser notification permission if running on web
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
      } catch (e) {
        console.warn('[AlertService] Notification permission request error', e);
      }
    }
    return false;
  }

  /**
   * Trigger local browser/system notification
   */
  private triggerSystemNotification(alert: AlertResponse) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = `🚨 ${alert.severity} LANDSLIDE ALERT`;
        const body = `${alert.zone_name || alert.cell_id || 'Regional Zone'}: ${alert.trigger_reason}`;
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: alert.alert_id,
        });
      } catch (e) {
        console.warn('[AlertService] Failed to show system notification', e);
      }
    }
  }

  /**
   * Fetch active alerts from backend
   */
  async getActiveAlerts(): Promise<AlertResponse[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/alerts?state=ACTIVE`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.alerts || [];
    } catch {
      return [];
    }
  }

  /**
   * Subscribe to new incoming alert dispatches
   */
  subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check for newly dispatched alerts and notify listeners
   */
  async checkForNewAlerts(): Promise<AlertResponse[]> {
    const active = await this.getActiveAlerts();
    if (!active.length) return [];

    const newAlerts: AlertResponse[] = [];

    for (const alert of active) {
      if (!this.knownAlertIds.has(alert.alert_id)) {
        newAlerts.push(alert);
        this.knownAlertIds.add(alert.alert_id);
        this.triggerSystemNotification(alert);
        this.listeners.forEach((fn) => fn(alert));
      }
    }

    if (newAlerts.length > 0) {
      try {
        await AsyncStorage.setItem(
          SEEN_ALERTS_KEY,
          JSON.stringify(Array.from(this.knownAlertIds)),
        );
      } catch {
        // Storage failover
      }
    }

    return active;
  }

  /**
   * Start polling active alerts (every 4 seconds)
   */
  startPolling(intervalMs = 4000) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.checkForNewAlerts();
    this.pollInterval = setInterval(() => {
      this.checkForNewAlerts();
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Dismiss/acknowledge an alert by marking it seen
   */
  async dismissAlert(alertId: string) {
    this.knownAlertIds.add(alertId);
    try {
      await AsyncStorage.setItem(
        SEEN_ALERTS_KEY,
        JSON.stringify(Array.from(this.knownAlertIds)),
      );
    } catch {
      // ignore
    }
  }
}

export const alertService = new CitizenAlertService();
