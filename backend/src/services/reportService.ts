import {
  reportRepository,
  CitizenReportRecord,
  CreateReportDTO,
  ReportFilter,
} from '../repositories/reportRepository';
import {
  ReportCategory,
  ReportStatus,
  GeoJsonPoint,
  GeoJsonFeatureCollection,
} from '../types';
import { notFound } from '../utils/errors';
import crypto from 'crypto';

export interface ReportResponse {
  report_id: string;
  client_report_id: string;
  status: ReportStatus;
  category: ReportCategory;
  description: string | null;
  latitude: number;
  longitude: number;
  location_accuracy_m: number | null;
  captured_at: string;
  submitted_at: string;
  severity: string | null;
  media_url: string | null;
  evidence_score: number | null;
  nearest_cell_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

export interface ListReportsResponse {
  reports: ReportResponse[];
  total: number;
  limit: number;
  offset: number;
}

// In-memory store for dev/test fallback when database is offline
const inMemoryReports = new Map<string, CitizenReportRecord>();

export class ReportService {
  /**
   * Create or ingest a new citizen report (with idempotency support).
   */
  async createReport(input: {
    client_report_id: string;
    category: ReportCategory;
    description?: string | null;
    latitude: number;
    longitude: number;
    location_accuracy_m?: number | null;
    captured_at: string;
    severity?: string | null;
    media_url?: string | null;
  }): Promise<ReportResponse> {
    const dto: CreateReportDTO = {
      client_report_id: input.client_report_id,
      category: input.category,
      description: input.description ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      location_accuracy_m: input.location_accuracy_m ?? null,
      captured_at: new Date(input.captured_at),
      severity: input.severity ?? null,
      media_url: input.media_url ?? null,
    };

    try {
      const record = await reportRepository.createReport(dto);
      if (record) {
        inMemoryReports.set(record.report_id, record);
        return this.mapRecordToResponse(record);
      }
    } catch (err) {
      console.warn('[reportService] Database createReport failed, using in-memory store:', err);
    }

    // Check in-memory idempotency by client_report_id
    for (const existing of inMemoryReports.values()) {
      if (existing.client_report_id === dto.client_report_id) {
        return this.mapRecordToResponse(existing);
      }
    }

    // In-memory fallback record
    const mockId = crypto.randomUUID();
    const fallbackRecord: CitizenReportRecord = {
      report_id: mockId,
      client_report_id: dto.client_report_id,
      category: dto.category,
      description: dto.description || null,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      location_accuracy_m: dto.location_accuracy_m || null,
      captured_at: dto.captured_at,
      submitted_at: new Date(),
      severity: dto.severity || null,
      media_url: dto.media_url || null,
      evidence_score: null,
      nearest_cell_id: 'CELL_NER_001',
      status: 'PENDING',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
    };

    inMemoryReports.set(mockId, fallbackRecord);
    return this.mapRecordToResponse(fallbackRecord);
  }

  /**
   * Find report by server UUID.
   */
  async getReportById(reportId: string): Promise<ReportResponse> {
    try {
      const record = await reportRepository.findById(reportId);
      if (record) {
        return this.mapRecordToResponse(record);
      }
    } catch (err) {
      console.warn('[reportService] Database findById failed, checking in-memory store:', err);
    }

    const fallback = inMemoryReports.get(reportId);
    if (fallback) {
      return this.mapRecordToResponse(fallback);
    }

    throw notFound(`Report '${reportId}'`);
  }

  /**
   * Query filtered reports or export GeoJSON for map display.
   */
  async listReports(
    filter: ReportFilter,
    format: 'json' | 'geojson' = 'json',
  ): Promise<ListReportsResponse | GeoJsonFeatureCollection<GeoJsonPoint>> {
    let records: CitizenReportRecord[] = [];
    let total = 0;

    try {
      const result = await reportRepository.findReports(filter);
      records = result.reports;
      total = result.total;
    } catch (err) {
      console.warn('[reportService] Database findReports failed, using in-memory store:', err);
      // Filter in-memory
      let all = Array.from(inMemoryReports.values());
      if (filter.status) all = all.filter((r) => r.status === filter.status);
      if (filter.category) all = all.filter((r) => r.category === filter.category);
      if (filter.since) all = all.filter((r) => r.submitted_at >= filter.since!);
      if (filter.bbox) {
        const { west, south, east, north } = filter.bbox;
        all = all.filter((r) => {
          const [lon, lat] = r.location.coordinates;
          return lon >= west && lon <= east && lat >= south && lat <= north;
        });
      }

      total = all.length;
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      records = all.slice(offset, offset + limit);
    }

    if (format === 'geojson') {
      return {
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
        },
        meta: {
          total_reports: total,
          returned: records.length,
          generated_at: new Date().toISOString(),
        },
        features: records.map((r) => ({
          type: 'Feature',
          geometry: r.location,
          properties: {
            report_id: r.report_id,
            category: r.category,
            status: r.status,
            severity: r.severity,
            captured_at: r.captured_at.toISOString(),
            submitted_at: r.submitted_at.toISOString(),
            media_url: r.media_url,
          },
        })),
      };
    }

    return {
      reports: records.map((r) => this.mapRecordToResponse(r)),
      total,
      limit: filter.limit || 50,
      offset: filter.offset || 0,
    };
  }

  /**
   * Authority verification action on a citizen report.
   */
  async verifyReport(
    reportId: string,
    action: 'VERIFY' | 'REJECT' | 'MARK_PROBABLE',
    rejectionReason?: string | null,
    verifiedBy?: string,
  ): Promise<ReportResponse> {
    let targetStatus: ReportStatus;
    if (action === 'VERIFY') targetStatus = 'VERIFIED';
    else if (action === 'REJECT') targetStatus = 'REJECTED';
    else targetStatus = 'PROBABLE';

    try {
      const updated = await reportRepository.updateStatus(
        reportId,
        targetStatus,
        verifiedBy || 'authority_officer_01',
        rejectionReason || undefined,
      );
      if (updated) {
        inMemoryReports.set(updated.report_id, updated);
        return this.mapRecordToResponse(updated);
      }
    } catch (err) {
      console.warn('[reportService] Database updateStatus failed, updating in-memory store:', err);
    }

    const fallback = inMemoryReports.get(reportId);
    if (!fallback) {
      throw notFound(`Report '${reportId}'`);
    }

    fallback.status = targetStatus;
    fallback.verified_by = verifiedBy || 'authority_officer_01';
    fallback.verified_at = new Date();
    fallback.rejection_reason = rejectionReason || null;
    inMemoryReports.set(reportId, fallback);

    return this.mapRecordToResponse(fallback);
  }

  // --- Helper mappers ---

  private mapRecordToResponse(record: CitizenReportRecord): ReportResponse {
    const [lon, lat] = record.location.coordinates;
    return {
      report_id: record.report_id,
      client_report_id: record.client_report_id,
      status: record.status,
      category: record.category,
      description: record.description,
      latitude: lat,
      longitude: lon,
      location_accuracy_m: record.location_accuracy_m,
      captured_at: record.captured_at instanceof Date ? record.captured_at.toISOString() : record.captured_at,
      submitted_at: record.submitted_at instanceof Date ? record.submitted_at.toISOString() : record.submitted_at,
      severity: record.severity,
      media_url: record.media_url,
      evidence_score: record.evidence_score,
      nearest_cell_id: record.nearest_cell_id,
      verified_by: record.verified_by,
      verified_at: record.verified_at instanceof Date ? record.verified_at.toISOString() : record.verified_at,
      rejection_reason: record.rejection_reason,
    };
  }
}

export const reportService = new ReportService();
