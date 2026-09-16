import { Router } from 'express';
import { riskController } from '../controllers/riskController';
import { validateParams, validateQuery } from '../middleware/validate';
import {
  riskPointParamsSchema,
  riskPointQuerySchema,
  riskGridQuerySchema,
  riskCellParamsSchema,
} from '../schemas/risk';

const router = Router();

// ============================================================================
// Risk API Routes (/api/v1/risk)
// Contract: contracts/risk.md
// ============================================================================

// 1. Grid heatmap FeatureCollection (must precede :cell_id param route)
router.get(
  '/grid',
  validateQuery(riskGridQuerySchema),
  riskController.getRiskGrid.bind(riskController),
);

// 2. Point query via query params (/api/v1/risk/point?lat=...&lon=...)
router.get(
  '/point',
  validateQuery(riskPointQuerySchema),
  riskController.getPointRisk.bind(riskController),
);

// 3. Zone SHAP explanation (/api/v1/risk/:cell_id/explain)
router.get(
  '/:cell_id/explain',
  validateParams(riskCellParamsSchema),
  riskController.getZoneExplanation.bind(riskController),
);

// 4. Zone detail by cell ID (/api/v1/risk/:cell_id)
router.get(
  '/:cell_id',
  validateParams(riskCellParamsSchema),
  riskController.getZoneDetail.bind(riskController),
);

// 5. Point risk query by path params (/api/v1/risk/:latitude/:longitude)
router.get(
  '/:latitude/:longitude',
  validateParams(riskPointParamsSchema),
  riskController.getPointRisk.bind(riskController),
);

export default router;
