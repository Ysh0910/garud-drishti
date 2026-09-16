import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import { ReportFilter } from '../repositories/reportRepository';
import { ReportCategory, ReportStatus } from '../types';
import { BoundingBox } from '../repositories/geo';

export class ReportController {
  /**
   * POST /api/v1/reports
   * Create a new hazard report (supports JSON and multipart/form-data).
   */
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let mediaUrl = req.body.media_url || null;
      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
      }

      const lat =
        typeof req.body.latitude === 'string'
          ? parseFloat(req.body.latitude)
          : Number(req.body.latitude);

      const lon =
        typeof req.body.longitude === 'string'
          ? parseFloat(req.body.longitude)
          : Number(req.body.longitude);

      const accuracy =
        req.body.location_accuracy_m !== undefined && req.body.location_accuracy_m !== null
          ? Number(req.body.location_accuracy_m)
          : null;

      const result = await reportService.createReport({
        client_report_id: req.body.client_report_id,
        category: req.body.category as ReportCategory,
        description: req.body.description,
        latitude: lat,
        longitude: lon,
        location_accuracy_m: accuracy,
        captured_at: req.body.captured_at,
        severity: req.body.severity,
        media_url: mediaUrl,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports
   * List filtered reports with pagination or GeoJSON output.
   */
  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let bbox: BoundingBox | undefined;
      if (req.query.bbox) {
        const parts = (req.query.bbox as string).split(',').map(Number);
        if (parts.length === 4 && !parts.some(Number.isNaN)) {
          bbox = { west: parts[0], south: parts[1], east: parts[2], north: parts[3] };
        }
      }

      const filter: ReportFilter = {
        status: req.query.status as ReportStatus | undefined,
        category: req.query.category as ReportCategory | undefined,
        bbox,
        since: req.query.since ? new Date(req.query.since as string) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : 50,
        offset: req.query.offset !== undefined ? Number(req.query.offset) : 0,
      };

      const format = (req.query.format as 'json' | 'geojson') || 'json';
      const result = await reportService.listReports(filter, format);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/:report_id
   * Get single report by UUID.
   */
  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = req.params.report_id as string;
      const result = await reportService.getReportById(reportId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/reports/:report_id/verify
   * Authority review & verification action.
   */
  async verifyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = req.params.report_id as string;
      const { action, rejection_reason } = req.body;
      const result = await reportService.verifyReport(
        reportId,
        action,
        rejection_reason,
        'authority_officer_01',
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
