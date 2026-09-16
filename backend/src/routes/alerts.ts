import { Router } from 'express';
import { alertController } from '../controllers/alertController';

const router = Router();

// GET /api/v1/alerts - List alerts with filters
router.get('/', (req, res, next) => alertController.listAlerts(req, res, next));

// POST /api/v1/alerts - Create manual alert (authority)
router.post('/', (req, res, next) => alertController.createAlert(req, res, next));

// GET /api/v1/alerts/:id - Get alert details by ID
router.get('/:id', (req, res, next) => alertController.getAlertById(req, res, next));

// POST /api/v1/alerts/:id/acknowledge - Approve/acknowledge alert (PENDING_APPROVAL -> ACTIVE)
router.post('/:id/acknowledge', (req, res, next) => alertController.acknowledgeAlert(req, res, next));

// POST /api/v1/alerts/:id/resolve - Resolve active or escalated alert (-> RESOLVED)
router.post('/:id/resolve', (req, res, next) => alertController.resolveAlert(req, res, next));

export default router;
