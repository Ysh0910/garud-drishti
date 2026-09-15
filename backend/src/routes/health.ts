import { Router, Request, Response } from 'express';

// ---------------------------------------------------------------------------
// GET /health
// Returns service identity and basic liveness status.
// Does NOT check database / ML connectivity — that is a separate readiness
// check that will be added in Phase 3 when the DB layer exists.
// ---------------------------------------------------------------------------

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'GARUD DRISHTI API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
