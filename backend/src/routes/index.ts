import { Router } from 'express';
import healthRouter from './health';
import riskRouter from './risk';

// ---------------------------------------------------------------------------
// Root API router (/api/v1)
// Mounts all versioned sub-routers.
// ---------------------------------------------------------------------------

const router = Router();

export { healthRouter };

import reportsRouter from './reports';
import { assetsRouter, roadsRouter, villagesRouter } from './exposure';
import prioritizationRouter from './prioritization';
import alertsRouter from './alerts';
import dashboardRouter from './dashboard';

// Mount Risk API (/api/v1/risk)
router.use('/risk', riskRouter);

// Mount Citizen Reports API (/api/v1/reports)
router.use('/reports', reportsRouter);

// Mount Exposure APIs (/api/v1/assets, /api/v1/roads, /api/v1/villages)
router.use('/assets', assetsRouter);
router.use('/roads', roadsRouter);
router.use('/villages', villagesRouter);

// Mount Response Prioritisation API (/api/v1/prioritization)
router.use('/prioritization', prioritizationRouter);

// Mount Alerts API (/api/v1/alerts)
router.use('/alerts', alertsRouter);

// Mount Dashboard API (/api/v1/dashboard)
router.use('/dashboard', dashboardRouter);

export default router;



