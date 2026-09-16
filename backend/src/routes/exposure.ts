import { Router } from 'express';
import { exposureController } from '../controllers/exposureController';
import { validate } from '../middleware/validate';
import {
  nearbyAssetsQuerySchema,
  roadRiskQuerySchema,
  villageRiskQuerySchema,
} from '../schemas/exposure';

// Assets router (/api/v1/assets)
export const assetsRouter = Router();

/**
 * GET /api/v1/assets/nearby
 * Find critical infrastructure and settlement assets within radius
 */
assetsRouter.get(
  '/nearby',
  validate({ query: nearbyAssetsQuerySchema }),
  (req, res, next) => exposureController.getNearbyAssets(req, res, next),
);

// Roads router (/api/v1/roads)
export const roadsRouter = Router();

/**
 * GET /api/v1/roads/risk
 * Road segments with intersecting landslide risk context (GeoJSON)
 */
roadsRouter.get(
  '/risk',
  validate({ query: roadRiskQuerySchema }),
  (req, res, next) => exposureController.getRoadsWithRisk(req, res, next),
);

// Villages router (/api/v1/villages)
export const villagesRouter = Router();

/**
 * GET /api/v1/villages/risk
 * Villages and population exposure with landslide risk
 */
villagesRouter.get(
  '/risk',
  validate({ query: villageRiskQuerySchema }),
  (req, res, next) => exposureController.getVillagesWithRisk(req, res, next),
);
