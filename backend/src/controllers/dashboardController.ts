import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/summary
   * Provides single endpoint KPI summary for authority dashboard.
   */
  async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await dashboardService.getSummary();
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
