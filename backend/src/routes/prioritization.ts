import { Router } from 'express';
import { prioritizationController } from '../controllers/prioritizationController';

const router = Router();

// POST /api/v1/prioritization/evaluate - Calculate transparent response priority
router.post('/evaluate', (req, res, next) => prioritizationController.evaluate(req, res, next));

// GET /api/v1/prioritization/config - Fetch default weights and prioritization configuration
router.get('/config', (req, res) => prioritizationController.getConfig(req, res));

export default router;
