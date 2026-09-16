/**
 * Report Service Abstraction & Implementations
 * Satisfies Task 3.2: Decoupled Mock and Real transport adapters.
 */

import { APP_CONFIG } from '../constants/config';
import { ReportCreateRequest, ReportResponse } from '../types/reports';
import { ApiClient } from './api';
import { ReportQueueManager } from '../storage/reportQueue';
import { generateUUID } from '../utils/id';

export interface IReportService {
  submitReport(payload: ReportCreateRequest): Promise<ReportResponse>;
  getReports(): Promise<ReportResponse[]>;
  getReportById(reportId: string): Promise<ReportResponse | null>;
}

/**
 * MockReportService simulates server responses following contracts/reports.md
 * and contracts/examples/report-response.json.
 */
export class MockReportService implements IReportService {
  async submitReport(payload: ReportCreateRequest): Promise<ReportResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 400));

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
      evidence_score: null,
      nearest_cell_id: 'cell_ner_0042',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
    };

    // Cache locally so it immediately shows in My Reports
    await ReportQueueManager.cacheReport(mockResponse);

    return mockResponse;
  }

  async getReports(): Promise<ReportResponse[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return await ReportQueueManager.getCachedReports();
  }

  async getReportById(reportId: string): Promise<ReportResponse | null> {
    const cached = await ReportQueueManager.getCachedReports();
    return cached.find((r) => r.report_id === reportId || r.client_report_id === reportId) || null;
  }
}

/**
 * RealReportService calls the active FastAPI backend.
 */
export class RealReportService implements IReportService {
  async submitReport(payload: ReportCreateRequest): Promise<ReportResponse> {
    const response = await ApiClient.submitReport(payload);
    await ReportQueueManager.cacheReport(response);
    return response;
  }

  async getReports(): Promise<ReportResponse[]> {
    try {
      const data = await ApiClient.getReports();
      for (const r of data.reports) {
        await ReportQueueManager.cacheReport(r);
      }
      return data.reports;
    } catch {
      // Fallback to local cache if network call fails
      return await ReportQueueManager.getCachedReports();
    }
  }

  async getReportById(reportId: string): Promise<ReportResponse | null> {
    const reports = await this.getReports();
    return reports.find((r) => r.report_id === reportId || r.client_report_id === reportId) || null;
  }
}

// Active service instance toggled by configuration
let activeService: IReportService = APP_CONFIG.useMockTransport
  ? new MockReportService()
  : new RealReportService();

export const reportService = {
  submitReport: (payload: ReportCreateRequest) => activeService.submitReport(payload),
  getReports: () => activeService.getReports(),
  getReportById: (reportId: string) => activeService.getReportById(reportId),
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
