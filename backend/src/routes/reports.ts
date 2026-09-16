import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { validate } from '../middleware/validate';
import { reportPhotoUpload } from '../middleware/upload';
import {
  createReportSchema,
  listReportsQuerySchema,
  verifyReportSchema,
  reportParamsSchema,
} from '../schemas/report';

const router = Router();

/**
 * POST /api/v1/reports
 * Submit a citizen hazard report (multipart/form-data with optional photo, or application/json)
 */
router.post(
  '/',
  reportPhotoUpload.single('photo'),
  validate({ body: createReportSchema }),
  (req, res, next) => reportController.createReport(req, res, next),
);

/**
 * GET /api/v1/reports
 * List citizen hazard reports with query filtering and pagination
 */
router.get(
  '/',
  validate({ query: listReportsQuerySchema }),
  (req, res, next) => reportController.listReports(req, res, next),
);

/**
 * GET /api/v1/reports/:report_id
 * Retrieve a specific hazard report by UUID
 */
router.get(
  '/:report_id',
  validate({ params: reportParamsSchema }),
  (req, res, next) => reportController.getReportById(req, res, next),
);

/**
 * POST /api/v1/reports/:report_id/verify
 * Authority action to verify, reject, or mark a report probable
 */
router.post(
  '/:report_id/verify',
  validate({ params: reportParamsSchema, body: verifyReportSchema }),
  (req, res, next) => reportController.verifyReport(req, res, next),
);

export default router;
