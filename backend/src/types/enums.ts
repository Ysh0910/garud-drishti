import { z } from 'zod';

// ============================================================================
// GARUD DRISHTI Canonical Enumerations & Schemas
// Source of truth: contracts/enums.md & contracts/CONTRACT_DECISIONS.md
// ============================================================================

/**
 * RiskLevel — Hazard scoring band (0–100).
 * Ascending severity: VERY_LOW < LOW < MODERATE < HIGH < CRITICAL
 */
export const RiskLevelEnum = z.enum([
  'VERY_LOW',
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL',
]);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

/**
 * RiskState — Operational state machine of a zone.
 * Ascending severity: NORMAL < WATCH < ELEVATED < HIGH < CRITICAL
 */
export const RiskStateEnum = z.enum([
  'NORMAL',
  'WATCH',
  'ELEVATED',
  'HIGH',
  'CRITICAL',
]);
export type RiskState = z.infer<typeof RiskStateEnum>;

/**
 * Trend — Direction of recent risk change.
 */
export const TrendEnum = z.enum(['INCREASING', 'DECREASING', 'STABLE']);
export type Trend = z.infer<typeof TrendEnum>;

/**
 * DataQuality — Freshness and completeness indicator.
 */
export const DataQualityEnum = z.enum([
  'GOOD',
  'DEGRADED',
  'STALE',
  'MISSING',
]);
export type DataQuality = z.infer<typeof DataQualityEnum>;

/**
 * ReportCategory — Canonical citizen report categories.
 */
export const ReportCategoryEnum = z.enum([
  'CRACK',
  'ROCKFALL',
  'ROAD_BLOCKAGE',
  'SOIL_MOVEMENT',
  'SEEPAGE',
  'FLOODING',
  'LANDSLIDE',
  'OTHER',
]);
export type ReportCategory = z.infer<typeof ReportCategoryEnum>;

/**
 * ReportStatus — Lifecycle state of a citizen report.
 */
export const ReportStatusEnum = z.enum([
  'PENDING',
  'REVIEW',
  'PROBABLE',
  'VERIFIED',
  'REJECTED',
]);
export type ReportStatus = z.infer<typeof ReportStatusEnum>;

/**
 * AlertState — Lifecycle state of an alert.
 */
export const AlertStateEnum = z.enum([
  'CREATED',
  'PENDING_APPROVAL',
  'ACTIVE',
  'ESCALATED',
  'RESOLVED',
]);
export type AlertState = z.infer<typeof AlertStateEnum>;

/**
 * ResponsePriority — Operational response urgency combining hazard + exposure.
 * Ascending urgency: LOW < MEDIUM < HIGH < IMMEDIATE
 */
export const ResponsePriorityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'IMMEDIATE',
]);
export type ResponsePriority = z.infer<typeof ResponsePriorityEnum>;

/**
 * AssetType — Infrastructure / settlement asset classifications.
 */
export const AssetTypeEnum = z.enum([
  'ROAD',
  'VILLAGE',
  'HOSPITAL',
  'SCHOOL',
  'BRIDGE',
  'POWER_INFRASTRUCTURE',
  'CRITICAL_INFRASTRUCTURE',
]);
export type AssetType = z.infer<typeof AssetTypeEnum>;

/**
 * ForecastHorizon — Canonical prediction horizons.
 */
export const ForecastHorizonEnum = z.enum(['6h', '24h', '48h', '72h']);
export type ForecastHorizon = z.infer<typeof ForecastHorizonEnum>;
