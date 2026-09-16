import { z } from 'zod';
import { ReportCategoryEnum, ReportStatusEnum } from '../types/enums';
import { latitudeSchema, longitudeSchema, bboxSchema, uuidSchema } from './common';

// ============================================================================
// Create Report Request Schema (POST /api/v1/reports)
// ============================================================================

export const createReportSchema = z.object({
  client_report_id: z.string().uuid('client_report_id must be a valid UUID'),
  category: ReportCategoryEnum,
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  location_accuracy_m: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(z.number().positive('location_accuracy_m must be positive'))
    .optional()
    .nullable(),
  captured_at: z.string().datetime({ message: 'captured_at must be an ISO 8601 UTC timestamp' }),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  media_url: z.string().optional().nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// ============================================================================
// List Reports Query Schema (GET /api/v1/reports)
// ============================================================================

export const listReportsQuerySchema = z.object({
  status: ReportStatusEnum.optional(),
  category: ReportCategoryEnum.optional(),
  bbox: bboxSchema.optional(),
  since: z.string().datetime({ message: 'since must be an ISO 8601 UTC timestamp' }).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  format: z.enum(['json', 'geojson']).default('json'),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

// ============================================================================
// Verify Report Request Schema (POST /api/v1/reports/:report_id/verify)
// ============================================================================

export const verifyReportSchema = z
  .object({
    action: z.enum(['VERIFY', 'REJECT', 'MARK_PROBABLE']),
    rejection_reason: z.string().max(500, 'rejection_reason cannot exceed 500 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.action === 'REJECT') {
        return !!data.rejection_reason && data.rejection_reason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'rejection_reason is required when action is REJECT',
      path: ['rejection_reason'],
    },
  );

export type VerifyReportInput = z.infer<typeof verifyReportSchema>;

// ============================================================================
// Report ID Route Parameter Schema
// ============================================================================

export const reportParamsSchema = z.object({
  report_id: uuidSchema,
});
