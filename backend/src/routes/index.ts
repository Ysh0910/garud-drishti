import { Router } from 'express';
import healthRouter from './health';
import riskRouter from './risk';

// ---------------------------------------------------------------------------
// Root API router (/api/v1)
// Mounts all versioned sub-routers.
// ---------------------------------------------------------------------------

const router = Router();

export { healthRouter };

// Mount Risk API (/api/v1/risk)
router.use('/risk', riskRouter);

// Future sub-routers (uncomment as phases are implemented):
// import reportsRouter from './reports';
// import alertsRouter from './alerts';
// import exposureRouter from './exposure';
// import dashboardRouter from './dashboard';

// router.use('/reports', reportsRouter);
// router.use('/alerts', alertsRouter);
// router.use('/roads', exposureRouter);
// router.use('/villages', exposureRouter);
// router.use('/assets', exposureRouter);
// router.use('/dashboard', dashboardRouter);

export default router;
