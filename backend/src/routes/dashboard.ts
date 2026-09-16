import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

// GET /api/v1/dashboard/summary - System-wide KPIs & data freshness
router.get('/summary', (req, res, next) => dashboardController.getSummary(req, res, next));

export default router;
