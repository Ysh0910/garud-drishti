import { Request, Response, NextFunction } from 'express';
import { riskService } from '../services/riskService';

export class RiskController {
  /**
   * GET /api/v1/risk/:latitude/:longitude OR GET /api/v1/risk/point?lat=...&lon=...
   */
  async getPointRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat =
        req.params.latitude !== undefined
          ? parseFloat(req.params.latitude as string)
          : parseFloat(req.query.lat as string);
      const lon =
        req.params.longitude !== undefined
          ? parseFloat(req.params.longitude as string)
          : parseFloat(req.query.lon as string);

      const result = await riskService.getPointRisk(lat, lon);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/risk/grid?bbox=west,south,east,north&horizon=...&min_risk=...
   */
  async getRiskGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bbox = req.query.bbox as unknown as {
        west: number;
        south: number;
        east: number;
        north: number;
      };
      const horizon = (req.query.horizon as string) || 'current';
      const minRisk = req.query.min_risk !== undefined ? Number(req.query.min_risk) : undefined;

      const result = await riskService.getRiskGrid(bbox, horizon, minRisk);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/risk/:cell_id
   */
  async getZoneDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cell_id = req.params.cell_id as string;
      const result = await riskService.getZoneDetail(cell_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/risk/:cell_id/explain
   */
  async getZoneExplanation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cell_id = req.params.cell_id as string;
      const result = await riskService.getZoneExplanation(cell_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const riskController = new RiskController();
