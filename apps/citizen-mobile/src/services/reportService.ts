/**
 * Report Service Abstraction & Implementations
 * Satisfies Task 3.2: Decoupled Mock and Real transport adapters with graceful offline fallback.
 */

import { APP_CONFIG } from '../constants/config';
import { ReportCreateRequest, ReportResponse } from '../types/reports';
import { ApiClient, CitizenAnalysisData } from './api';
import { ReportQueueManager } from '../storage/reportQueue';
import { generateUUID } from '../utils/id';

export interface IReportService {
  submitReport(payload: ReportCreateRequest): Promise<ReportResponse>;
  getReports(): Promise<ReportResponse[]>;
  getReportById(reportId: string): Promise<ReportResponse | null>;
  getReportAnalysis?(reportId: string): Promise<CitizenAnalysisData | null>;
}

/**
 * MockReportService simulates server responses following contracts/reports.md
 * and contracts/examples/report-response.json.
 */
export class MockReportService implements IReportService {
  async submitReport(payload: ReportCreateRequest): Promise<ReportResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockResponse: ReportResponse = {
      report_id: `srv-rep-${generateUUID().substring(0, 8)}`,
      client_report_id: payload.client_report_id,
      status: 'PENDING',
      category: payload.category,
      description: payload.description || null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_accuracy_m: payload.location_accuracy_m ?? null,
      captured_at: payload.captured_at,
      submitted_at: new Date().toISOString(),
      severity: payload.severity ?? null,
      media_url: payload.photo?.uri ? payload.photo.uri : null,
      evidence_score: 0.82,
      nearest_cell_id: 'cell_ner_0042',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
    };

    await ReportQueueManager.cacheReport(mockResponse);
    return mockResponse;
  }

  async getReports(): Promise<ReportResponse[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return await ReportQueueManager.getCachedReports();
  }

  async getReportById(reportId: string): Promise<ReportResponse | null> {
    const cached = await ReportQueueManager.getCachedReports();
    return cached.find((r) => r.report_id === reportId || r.client_report_id === reportId) || null;
  }

  async getReportAnalysis(reportId: string): Promise<CitizenAnalysisData | null> {
    return {
      report_id: reportId,
      status: 'AUTHORITY_REVIEW',
      environmental_risk: 76,
      image_confidence: 91,
      credibility: 88,
      observed_impact: 84,
      exposure: 80,
      response_priority: 85,
      coordination_risk: 10,
      priority_level: 'CRITICAL',
      recommended_action: 'DISPATCH_AND_WARN',
      landslide_detected: true,
      road_blockage_detected: true,
      debris_detected: true,
      visible_affected_fraction: 0.18,
      audit_positive_signals: ['Strong landslide CV confidence', 'GPS consistent with NER terrain'],
      audit_risk_flags: [],
      decision_path: ['Verified: High credibility allows full evidence weighting'],
    };
  }
}

/**
 * RealReportService calls the active FastAPI backend, falling back to mock adapter if server is unavailable.
 */
export class RealReportService implements IReportService {
  private fallbackMock = new MockReportService();

  async submitReport(payload: ReportCreateRequest): Promise<ReportResponse> {
    try {
      const response = await ApiClient.submitReport(payload);
      await ReportQueueManager.cacheReport(response);
      return response;
    } catch (err) {
      console.warn('Backend submit failed or unavailable, using local mock/cache fallback:', err);
      return await this.fallbackMock.submitReport(payload);
    }
  }

  async getReports(): Promise<ReportResponse[]> {
    try {
      const data = await ApiClient.getReports();
      if (data && Array.isArray(data.reports)) {
        for (const r of data.reports) {
          await ReportQueueManager.cacheReport(r);
        }
        return data.reports;
      }
      return await ReportQueueManager.getCachedReports();
    } catch {
      return await ReportQueueManager.getCachedReports();
    }
  }

  async getReportById(reportId: string): Promise<ReportResponse | null> {
    const reports = await this.getReports();
    return reports.find((r) => r.report_id === reportId || r.client_report_id === reportId) || null;
  }

  async getReportAnalysis(reportId: string): Promise<CitizenAnalysisData | null> {
    try {
      return await ApiClient.getReportAnalysis(reportId);
    } catch {
      return await this.fallbackMock.getReportAnalysis(reportId);
    }
  }
}

let activeService: IReportService = APP_CONFIG.useMockTransport
  ? new MockReportService()
  : new RealReportService();

export const reportService = {
  submitReport: (payload: ReportCreateRequest) => activeService.submitReport(payload),
  getReports: () => activeService.getReports(),
  getReportById: (reportId: string) => activeService.getReportById(reportId),
  getReportAnalysis: (reportId: string) => (activeService.getReportAnalysis ? activeService.getReportAnalysis(reportId) : null),
  setService: (service: IReportService) => {
    activeService = service;
  },
  useMock: () => {
    activeService = new MockReportService();
  },
  useReal: () => {
    activeService = new RealReportService();
  },
};
