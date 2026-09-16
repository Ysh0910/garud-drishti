import { z } from 'zod';
import { AssetTypeEnum } from '../types/enums';
import { latitudeSchema, longitudeSchema, bboxSchema } from './common';

// ============================================================================
// Nearby Assets Query Schema (GET /api/v1/assets/nearby)
// ============================================================================

export const nearbyAssetsQuerySchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  radius_m: z.coerce.number().positive('radius_m must be a positive number').max(50000, 'radius_m cannot exceed 50000m (50km)').default(5000),
  asset_type: AssetTypeEnum.optional(),
});

export type NearbyAssetsQuery = z.infer<typeof nearbyAssetsQuerySchema>;

// ============================================================================
// Road Risk Query Schema (GET /api/v1/roads/risk)
// ============================================================================

export const roadRiskQuerySchema = z.object({
  bbox: bboxSchema.optional(),
  min_risk: z.coerce.number().min(0).max(100).optional(),
});

export type RoadRiskQuery = z.infer<typeof roadRiskQuerySchema>;

// ============================================================================
// Village Risk Query Schema (GET /api/v1/villages/risk)
// ============================================================================

export const villageRiskQuerySchema = z.object({
  bbox: bboxSchema.optional(),
  min_risk: z.coerce.number().min(0).max(100).optional(),
});

export type VillageRiskQuery = z.infer<typeof villageRiskQuerySchema>;
