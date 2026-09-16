/**
 * Canonical string enums — mirrored from contracts/enums.md.
 * Do not introduce alternative spellings/casings.
 */

export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type RiskState = 'NORMAL' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type Trend = 'INCREASING' | 'DECREASING' | 'STABLE';

export type DataQuality = 'GOOD' | 'DEGRADED' | 'STALE' | 'MISSING';

export type ReportCategory =
  | 'CRACK'
  | 'ROCKFALL'
  | 'ROAD_BLOCKAGE'
  | 'SOIL_MOVEMENT'
  | 'SEEPAGE'
  | 'FLOODING'
  | 'LANDSLIDE'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'REVIEW' | 'PROBABLE' | 'VERIFIED' | 'REJECTED';

export type AlertState = 'CREATED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ESCALATED' | 'RESOLVED';

export type ResponsePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';

/** Reported severity is citizen-assessed and is explicitly NOT a RiskLevel — see CONTRACT_DECISIONS.md CD-009. */
export type ReportedSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  VERY_LOW: 'VERY LOW',
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const RISK_BAND_RANGE: Record<RiskLevel, string> = {
  CRITICAL: '0.78–1.00',
  HIGH: '0.55–0.78',
  MODERATE: '0.34–0.55',
  LOW: '0.17–0.34',
  VERY_LOW: '0.00–0.17',
};
