/**
 * Canonical Enumerations for GARUD DRISHTI (SIH 2026)
 * Strictly synchronized with contracts/enums.md and contracts/CONTRACT_DECISIONS.md
 */

export type ReportCategory =
  | 'CRACK'
  | 'ROCKFALL'
  | 'ROAD_BLOCKAGE'
  | 'SOIL_MOVEMENT'
  | 'SEEPAGE'
  | 'FLOODING'
  | 'LANDSLIDE'
  | 'OTHER';

export const REPORT_CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
  { id: 'CRACK', label: 'Crack', description: 'New or widening cracks in soil or foundation' },
  { id: 'ROCKFALL', label: 'Rockfall', description: 'Falling rocks, boulders or debris' },
  { id: 'ROAD_BLOCKAGE', label: 'Road Blockage', description: 'Road blocked or obstructed by debris/slide' },
  { id: 'SOIL_MOVEMENT', label: 'Soil Movement', description: 'Visible slope creep or displacement' },
  { id: 'SEEPAGE', label: 'Water Seepage', description: 'Sudden water emerging from slope' },
  { id: 'FLOODING', label: 'Flooding', description: 'Flash pooling or mudflow accumulation' },
  { id: 'LANDSLIDE', label: 'Active Landslide', description: 'Active slide or major collapse event' },
  { id: 'OTHER', label: 'Other Hazard', description: 'Other observed slope/terrain hazards' },
];

export type ReportStatus =
  | 'PENDING'
  | 'REVIEW'
  | 'PROBABLE'
  | 'VERIFIED'
  | 'REJECTED';

export type ReportSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskLevel =
  | 'VERY_LOW'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'CRITICAL';

export type RiskState =
  | 'NORMAL'
  | 'WATCH'
  | 'ELEVATED'
  | 'HIGH'
  | 'CRITICAL';

export type Trend = 'INCREASING' | 'DECREASING' | 'STABLE';

export type DataQuality = 'GOOD' | 'DEGRADED' | 'STALE' | 'MISSING';
