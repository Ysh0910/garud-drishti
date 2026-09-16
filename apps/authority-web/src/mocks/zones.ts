/**
 * SYNTHETIC DEMO DATA — not real observations. Matches contracts/examples/risk-zone.json shape
 * (risk_score is 0-100 per contracts/risk.md; the console displays it as score/100 to two
 * decimals, matching the approved design's "0.87 · 0-1 scale" presentation).
 */
import type { ZoneDetail, ZoneSummary } from '../types/zone';
import { NER_DISTRICTS } from './districts';

export const ZONE_SUMMARIES: ZoneSummary[] = [
  {
    cell_id: 'NER-ML-042',
    label: 'Sohra',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    risk_score: 87,
    risk_level: 'CRITICAL',
    confidence: null,
    trend: 'INCREASING',
    trend_delta: 0.12,
    population_exposed: 4820,
    exposureFactors: {
      nearby_villages_count: 3,
      has_national_highway: true,
      has_state_highway: true,
      critical_facilities_count: 2,
      has_hospital: false,
      has_school_or_shelter: true,
      has_power_or_comm: false,
    },
  },
  {
    cell_id: 'NER-ML-051',
    label: 'Mawsynram',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    risk_score: 81,
    risk_level: 'CRITICAL',
    confidence: 0.68,
    trend: 'INCREASING',
    trend_delta: 0.09,
    population_exposed: 3110,
    exposureFactors: {
      nearby_villages_count: 2,
      has_national_highway: false,
      has_state_highway: true,
      critical_facilities_count: 1,
      has_hospital: true,
      has_school_or_shelter: false,
      has_power_or_comm: true,
    },
  },
  {
    cell_id: 'NER-MZ-118',
    label: 'Serchhip',
    district: 'Serchhip',
    state: 'Mizoram',
    risk_score: 74,
    risk_level: 'HIGH',
    confidence: 0.72,
    trend: 'INCREASING',
    trend_delta: 0.05,
    population_exposed: 1340,
    exposureFactors: {
      nearby_villages_count: 1,
      has_national_highway: false,
      has_state_highway: true,
      critical_facilities_count: 0,
      has_hospital: false,
      has_school_or_shelter: true,
      has_power_or_comm: false,
    },
  },
  {
    cell_id: 'NER-AR-007',
    label: 'Dibang Valley',
    district: 'Dibang Valley',
    state: 'Arunachal Pradesh',
    risk_score: 69,
    risk_level: 'HIGH',
    confidence: 0.61,
    trend: 'STABLE',
    trend_delta: 0.0,
    population_exposed: 610,
    exposureFactors: {
      nearby_villages_count: 1,
      has_national_highway: false,
      has_state_highway: false,
      critical_facilities_count: 0,
      has_hospital: false,
      has_school_or_shelter: false,
      has_power_or_comm: false,
    },
  },
  {
    cell_id: 'NER-SK-023',
    label: 'Mangan',
    district: 'Mangan',
    state: 'Sikkim',
    risk_score: 52,
    risk_level: 'MODERATE',
    confidence: 0.77,
    trend: 'DECREASING',
    trend_delta: -0.04,
    population_exposed: 2100,
    exposureFactors: {
      nearby_villages_count: 2,
      has_national_highway: true,
      has_state_highway: false,
      critical_facilities_count: 1,
      has_hospital: false,
      has_school_or_shelter: true,
      has_power_or_comm: true,
    },
  },
  {
    cell_id: 'NER-MN-064',
    label: 'Tamenglong',
    district: 'Tamenglong',
    state: 'Manipur',
    risk_score: 44,
    risk_level: 'MODERATE',
    confidence: null,
    trend: 'DECREASING',
    trend_delta: -0.02,
    population_exposed: 890,
    exposureFactors: {
      nearby_villages_count: 1,
      has_national_highway: false,
      has_state_highway: false,
      critical_facilities_count: 0,
      has_hospital: false,
      has_school_or_shelter: false,
      has_power_or_comm: false,
    },
  },
  {
    cell_id: 'NER-NL-031',
    label: 'Phek',
    district: 'Phek',
    state: 'Nagaland',
    risk_score: 28,
    risk_level: 'LOW',
    confidence: null,
    trend: 'STABLE',
    trend_delta: 0.01,
    population_exposed: 1020,
    exposureFactors: {
      nearby_villages_count: 1,
      has_national_highway: false,
      has_state_highway: false,
      critical_facilities_count: 0,
      has_hospital: false,
      has_school_or_shelter: false,
      has_power_or_comm: false,
    },
  },
];

export const TOTAL_MONITORED_ZONES = 412;

/** All real districts for a state (see mocks/districts.ts) — not just ones with a monitored zone. */
export function districtsForState(state: string): string[] {
  return [...(NER_DISTRICTS[state] ?? [])].sort((a, b) => a.localeCompare(b));
}

/** Whether any mocked zone actually exists in this district (used to keep the triage list honest). */
export function hasMonitoredZones(state: string, district: string): boolean {
  return ZONE_SUMMARIES.some((z) => z.state === state && (district === 'All districts' || z.district === district));
}

export const SELECTED_ZONE_DETAIL: ZoneDetail = {
  ...ZONE_SUMMARIES[0],
  confidence: null,
  data_quality: 'DEGRADED',
  updated_at_label: '14:32 IST · 8 min ago',
  model_version: 'dynamic_xgb_v1 · v2.4',
  topFactors: [
    { feature: 'Rainfall, 72 h cum.', impact: 0.31 },
    { feature: 'Slope angle > 35°', impact: 0.18 },
    { feature: 'Soil saturation index', impact: 0.14 },
    { feature: 'Road-cut proximity', impact: 0.09 },
    { feature: 'Forest cover loss, 5 y', impact: 0.06 },
    { feature: 'Lithology (resistant)', impact: -0.04 },
  ],
  whyNow: [
    { feature: 'Rainfall, 72 h cum.', impact: 0.09, sincePreviousRun: 0.09 },
    { feature: 'Soil saturation index', impact: 0.06, sincePreviousRun: 0.06 },
    { feature: 'New citizen evidence', impact: 0.03, sincePreviousRun: 0.03 },
    { feature: 'Slope angle > 35°', impact: 0, sincePreviousRun: 0 },
    { feature: 'Antecedent dry spell', impact: -0.02, sincePreviousRun: -0.02 },
  ],
  // validated flags must match store/dashboardStore.ts HORIZON_VALIDATED — only
  // current + 24h are trained/evaluated at hackathon scope, per contracts/risk.md §5.
  forecasts: [
    { horizon: 'current', risk_score: 87, risk_level: 'CRITICAL', validated: true },
    { horizon: '6h', risk_score: 91, risk_level: 'CRITICAL', validated: false },
    { horizon: '24h', risk_score: 94, risk_level: 'CRITICAL', validated: true },
    { horizon: '48h', risk_score: 89, risk_level: 'CRITICAL', validated: false },
    { horizon: '72h', risk_score: 79, risk_level: 'HIGH', validated: false },
  ],
  exposure: {
    population: 4820,
    households: 960,
    road_segments: '2 · NH-6, SH-12',
    critical_facilities: '1 school · 1 PHC',
  },
  recentEvidence: [
    { report_id: 'CR-2291', time_label: '14:18', status: 'PENDING' },
    { report_id: 'CR-2288', time_label: '13:02', status: 'PENDING' },
    { report_id: 'CR-2280', time_label: '11:47', status: 'VERIFIED' },
  ],
};
