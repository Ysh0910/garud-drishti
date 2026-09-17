/**
 * Typed API Client for GARUD DRISHTI Backend
 * Connects to FastAPI routes defined in contracts/reports.md and contracts/risk.md.
 */

import { APP_CONFIG } from '../constants/config';
import { ReportCreateRequest, ReportResponse } from '../types/reports';
import { RiskPointResponse } from '../types/risk';

export interface CitizenAnalysisData {
  report_id: string;
  status: string;
  environmental_risk: number;
  image_confidence: number;
  credibility: number;
  observed_impact: number;
  exposure: number;
  response_priority: number;
  coordination_risk: number;
  priority_level: string;
  recommended_action: string;
  landslide_detected: boolean;
  road_blockage_detected: boolean;
  debris_detected: boolean;
  visible_affected_fraction: number;
  audit_positive_signals: string[];
  audit_risk_flags: string[];
  decision_path: string[];
}

export class ApiClient {
  private static baseUrl = APP_CONFIG.apiBaseUrl;

  /** Set custom base URL at runtime */
  static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /** Submit citizen report via multipart/form-data to POST /api/v1/reports */
  static async submitReport(payload: ReportCreateRequest): Promise<ReportResponse> {
    const url = `${this.baseUrl}/api/v1/reports`;

    // Build FormData
    const formData = new FormData();
    formData.append('client_report_id', payload.client_report_id);
    formData.append('category', payload.category);
    if (payload.description) formData.append('description', payload.description);
    formData.append('latitude', String(payload.latitude));
    formData.append('longitude', String(payload.longitude));
    if (payload.location_accuracy_m != null) {
      formData.append('location_accuracy_m', String(payload.location_accuracy_m));
    }
    formData.append('captured_at', payload.captured_at);
    if (payload.severity) formData.append('severity', payload.severity);

    if (payload.photo && payload.photo.uri) {
      const uri = payload.photo.uri;
      const fileName = payload.photo.name || `hazard_${Date.now()}.jpg`;
      const mimeType = payload.photo.type || 'image/jpeg';

      if (typeof window !== 'undefined' && uri.startsWith('data:')) {
        // Convert data URI to Blob for browser environment
        try {
          const parts = uri.split(',');
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeType });
          formData.append('photo', blob, fileName);
        } catch (e) {
          console.warn('Failed to parse photo data URI, attaching as file object:', e);
          const photoFile = { uri, name: fileName, type: mimeType };
          formData.append('photo', photoFile as unknown as Blob);
        }
      } else if (typeof window !== 'undefined' && uri.startsWith('blob:')) {
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          formData.append('photo', blob, fileName);
        } catch {
          const photoFile = { uri, name: fileName, type: mimeType };
          formData.append('photo', photoFile as unknown as Blob);
        }
      } else {
        // Native React Native format
        const photoFile = { uri, name: fileName, type: mimeType };
        formData.append('photo', photoFile as unknown as Blob);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
    }

    return (await response.json()) as ReportResponse;
  }

  /** Fetch list of reports from GET /api/v1/reports */
  static async getReports(limit = 50, offset = 0): Promise<{ reports: ReportResponse[]; total: number }> {
    const url = `${this.baseUrl}/api/v1/reports?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }
    return (await response.json()) as { reports: ReportResponse[]; total: number };
  }

  /** Fetch local point risk from GET /api/v1/risk/{latitude}/{longitude} */
  static async getPointRisk(latitude: number, longitude: number): Promise<RiskPointResponse> {
    const url = `${this.baseUrl}/api/v1/risk/${latitude}/${longitude}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch point risk: ${response.statusText}`);
    }
    return (await response.json()) as RiskPointResponse;
  }

  /** Fetch AI Vision analysis details from GET /api/v1/citizen/reports/{report_id}/analysis */
  static async getReportAnalysis(reportId: string): Promise<CitizenAnalysisData> {
    const url = `${this.baseUrl}/api/v1/citizen/reports/${reportId}/analysis`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch report analysis: ${response.statusText}`);
    }
    return (await response.json()) as CitizenAnalysisData;
  }
}
