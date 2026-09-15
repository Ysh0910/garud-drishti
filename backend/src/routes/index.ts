import { Router } from 'express';
import healthRouter from './health.js';

// ---------------------------------------------------------------------------
// Root API router
// Mounts all versioned sub-routers.
// Phases 5–11 will add risk, reports, alerts, exposure, dashboard routers here.
// ---------------------------------------------------------------------------

const router = Router();

// Health check — mounted at the app level in app.ts, not under /api/v1,
// so it is accessible without the version prefix. Exported here for testing.
export { healthRouter };

// Future sub-routers (stubs — uncomment as phases are implemented):
// import riskRouter from './risk.js';
// import reportsRouter from './reports.js';
// import alertsRouter from './alerts.js';
// import exposureRouter from './exposure.js';
// import dashboardRouter from './dashboard.js';

// router.use('/risk', riskRouter);
// router.use('/reports', reportsRouter);
// router.use('/alerts', alertsRouter);
// router.use('/roads', exposureRouter);
// router.use('/villages', exposureRouter);
// router.use('/assets', exposureRouter);
// router.use('/dashboard', dashboardRouter);

export default router;
