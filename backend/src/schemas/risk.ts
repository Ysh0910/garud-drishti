import { z } from 'zod';
import { bboxSchema, latitudeSchema, longitudeSchema } from './common';

// ============================================================================
// Risk API Request Schemas
// ============================================================================

export const riskPointParamsSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const riskPointQuerySchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
});

export const riskGridQuerySchema = z.object({
  bbox: bboxSchema,
  horizon: z.enum(['current', '6h', '24h', '48h', '72h']).optional().default('current'),
  min_risk: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().min(0).max(100).optional()),
});

export const riskCellParamsSchema = z.object({
  cell_id: z.string().min(1, 'cell_id is required'),
});
