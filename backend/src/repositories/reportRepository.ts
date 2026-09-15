import { query, transaction } from '../db/client';
import { sqlAsGeoJson, sqlBboxIntersects, BoundingBox } from './geo';
import { ReportCategory, ReportStatus, GeoJsonPoint } from '../types';

export interface CreateReportDTO {
  client_report_id: string;
  category: ReportCategory;
  description?: string | null;
  latitude: number;
  longitude: number;
  location_accuracy_m?: number | null;
  captured_at: Date;
  severity?: string | null;
  media_url?: string | null;
}

export interface CitizenReportRecord {
  report_id: string;
  client_report_id: string;
  category: ReportCategory;
  description: string | null;
  location: GeoJsonPoint;
  location_accuracy_m: number | null;
  captured_at: Date;
  submitted_at: Date;
  severity: string | null;
  media_url: string | null;
  evidence_score: number | null;
  nearest_cell_id: string | null;
  status: ReportStatus;
  verified_by: string | null;
  verified_at: Date | null;
  rejection_reason: string | null;
}

export interface ReportFilter {
  status?: ReportStatus;
  category?: ReportCategory;
  bbox?: BoundingBox;
  since?: Date;
  limit?: number;
  offset?: number;
}

export class ReportRepository {
  /**
   * Insert a new citizen report idempotently using client_report_id.
   */
  async createReport(input: CreateReportDTO): Promise<CitizenReportRecord> {
    return transaction(async (client) => {
      // 1. Find nearest risk cell for spatial context
      const nearestCellRes = await client.query<{ cell_id: string }>(
        `SELECT cell_id FROM risk_cells
         ORDER BY ST_Distance(geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) ASC
         LIMIT 1`,
        [input.longitude, input.latitude],
      );
      const nearestCellId = nearestCellRes.rows[0]?.cell_id || null;

      // 2. Insert report with ON CONFLICT (client_report_id) for idempotency
      const insertRes = await client.query<CitizenReportRecord>(
        `INSERT INTO citizen_reports (
          client_report_id, category, description, location, location_accuracy_m,
          captured_at, severity, media_url, nearest_cell_id, status
        ) VALUES (
          $1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326), $6,
          $7, $8, $9, $10, 'PENDING'
        )
        ON CONFLICT (client_report_id) DO UPDATE SET
          submitted_at = citizen_reports.submitted_at
        RETURNING 
          report_id, client_report_id, category, description,
          ${sqlAsGeoJson('location', 'location')},
          location_accuracy_m, captured_at, submitted_at, severity,
          media_url, evidence_score, nearest_cell_id, status,
          verified_by, verified_at, rejection_reason`,
        [
          input.client_report_id,
          input.category,
          input.description || null,
          input.longitude,
          input.latitude,
          input.location_accuracy_m || null,
          input.captured_at,
          input.severity || null,
          input.media_url || null,
          nearestCellId,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * Find report by server UUID.
   */
  async findById(reportId: string): Promise<CitizenReportRecord | null> {
    const res = await query<CitizenReportRecord>(
      `SELECT 
        report_id, client_report_id, category, description,
        ${sqlAsGeoJson('location', 'location')},
        location_accuracy_m, captured_at, submitted_at, severity,
        media_url, evidence_score, nearest_cell_id, status,
        verified_by, verified_at, rejection_reason
      FROM citizen_reports
      WHERE report_id = $1`,
      [reportId],
    );

    return res.rows[0] || null;
  }

  /**
   * Query filtered reports with pagination.
   */
  async findReports(filter: ReportFilter): Promise<{ reports: CitizenReportRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filter.category) {
      params.push(filter.category);
      conditions.push(`category = $${params.length}`);
    }

    if (filter.since) {
      params.push(filter.since);
      conditions.push(`submitted_at >= $${params.length}`);
    }

    if (filter.bbox) {
      const startIndex = params.length + 1;
      params.push(filter.bbox.west, filter.bbox.south, filter.bbox.east, filter.bbox.north);
      const { clause } = sqlBboxIntersects(startIndex, 'location');
      conditions.push(clause);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matches
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM citizen_reports ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Fetch paginated results
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const rowsRes = await query<CitizenReportRecord>(
      `SELECT 
        report_id, client_report_id, category, description,
        ${sqlAsGeoJson('location', 'location')},
        location_accuracy_m, captured_at, submitted_at, severity,
        media_url, evidence_score, nearest_cell_id, status,
        verified_by, verified_at, rejection_reason
      FROM citizen_reports
      ${whereClause}
      ORDER BY submitted_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { reports: rowsRes.rows, total };
  }

  /**
   * Update report status (review action: VERIFIED, REJECTED, PROBABLE).
   */
  async updateStatus(
    reportId: string,
    status: ReportStatus,
    verifiedBy?: string,
    rejectionReason?: string,
  ): Promise<CitizenReportRecord | null> {
    const res = await query<CitizenReportRecord>(
      `UPDATE citizen_reports
       SET 
         status = $2,
         verified_by = $3,
         verified_at = NOW(),
         rejection_reason = $4
       WHERE report_id = $1
       RETURNING 
         report_id, client_report_id, category, description,
         ${sqlAsGeoJson('location', 'location')},
         location_accuracy_m, captured_at, submitted_at, severity,
         media_url, evidence_score, nearest_cell_id, status,
         verified_by, verified_at, rejection_reason`,
      [reportId, status, verifiedBy || null, rejectionReason || null],
    );

    return res.rows[0] || null;
  }
}

export const reportRepository = new ReportRepository();
