import { z } from 'zod';

// ============================================================================
// Common Reusable Request Schemas & Transformers
// ============================================================================

/**
 * Validates WGS84 Latitude (-90 to +90 degrees)
 */
export const latitudeSchema = z
  .string()
  .or(z.number())
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .pipe(
    z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
  );

/**
 * Validates WGS84 Longitude (-180 to +180 degrees)
 */
export const longitudeSchema = z
  .string()
  .or(z.number())
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .pipe(
    z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  );

/**
 * Validates Bounding Box query parameter: "west,south,east,north" in WGS84
 */
export const bboxSchema = z
  .string()
  .transform((val, ctx) => {
    const parts = val.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bbox must be 4 comma-separated floats: west,south,east,north',
      });
      return z.NEVER;
    }
    const [west, south, east, north] = parts;
    if (west < -180 || west > 180 || east < -180 || east > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'west and east longitudes must be between -180 and 180',
      });
      return z.NEVER;
    }
    if (south < -90 || south > 90 || north < -90 || north > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'south and north latitudes must be between -90 and 90',
      });
      return z.NEVER;
    }
    if (south > north) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'south latitude cannot be greater than north latitude',
      });
      return z.NEVER;
    }
    return { west, south, east, north };
  });

/**
 * Validates standard pagination query params
 */
export const paginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(z.number().min(1).max(200)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .pipe(z.number().min(0)),
});

/**
 * Validates UUID
 */
export const uuidSchema = z.string().uuid('Invalid UUID identifier');

/**
 * Validates UUID param
 */
export const uuidParamSchema = z.object({
  id: uuidSchema,
});

