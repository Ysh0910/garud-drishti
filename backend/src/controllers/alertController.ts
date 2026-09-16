import { Request, Response, NextFunction } from 'express';
import { alertService } from '../services/alertService';
import {
  createAlertSchema,
  listAlertsQuerySchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
} from '../schemas/alert';

export class AlertController {
  /**
   * GET /api/v1/alerts
   */
  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listAlertsQuerySchema.parse(req.query);
      const filter = {
        state: query.state,
        severity: query.severity,
        cell_id: query.cell_id,
        since: query.since ? new Date(query.since) : undefined,
        limit: query.limit,
        offset: query.offset,
      };

      const result = await alertService.listAlerts(filter);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/alerts (Manual Creation)
   */
  async createAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createAlertSchema.parse(req.body);
      const alert = await alertService.createManualAlert(body);
      res.status(201).json(alert);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/alerts/:id
   */
  async getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const alert = await alertService.getAlertById(alertId);
      res.status(200).json(alert);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/alerts/:id/acknowledge
   */
  async acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = acknowledgeAlertSchema.parse(req.body || {});
      const alert = await alertService.acknowledgeAlert(
        alertId,
        body.approved_by
      );
      res.status(200).json(alert);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/alerts/:id/resolve
   */
  async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = resolveAlertSchema.parse(req.body || {});
      const alert = await alertService.resolveAlert(
        alertId,
        body.resolution_reason
      );
      res.status(200).json(alert);
    } catch (error) {
      next(error);
    }
  }

}

export const alertController = new AlertController();
