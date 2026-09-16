import {
  ResponsePriority,
  Trend,
  DataQuality,
} from '../types';

export interface PrioritizationWeights {
  hazard_weight: number;
  exposure_weight: number;
  infrastructure_weight: number;
  connectivity_weight: number;
}

export const DEFAULT_PRIORITIZATION_WEIGHTS: PrioritizationWeights = {
  hazard_weight: 0.50,
  exposure_weight: 0.25,
  infrastructure_weight: 0.15,
  connectivity_weight: 0.10,
};

export interface PrioritizationInput {
  hazard_score: number; // 0-100
  trend?: Trend;
  population?: number | null;
  nearby_villages_count?: number;
  has_national_highway?: boolean;
  has_state_highway?: boolean;
  critical_facilities_count?: number;
  has_hospital?: boolean;
  has_school_or_shelter?: boolean;
  has_power_or_comm?: boolean;
  verified_reports_count?: number;
  data_quality?: DataQuality;
}

export interface PrioritizationBreakdown {
  hazard_subscore: number;
  exposure_subscore: number;
  infrastructure_subscore: number;
  connectivity_subscore: number;
  weights_applied: PrioritizationWeights;
}

export interface PrioritizationResult {
  priority_score: number; // 0-100
  response_priority: ResponsePriority; // 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE'
  priority_reasons: string[];
  breakdown: PrioritizationBreakdown;
}

/**
 * Maps composite priority score (0–100) to canonical ResponsePriority enum.
 */
export function scoreToResponsePriority(score: number): ResponsePriority {
  if (score >= 80) return 'IMMEDIATE';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

/**
 * Transparent, explainable response priority calculator.
 * Combines hazard risk, population exposure, infrastructure criticality, and connectivity/evidence.
 */
export function calculateResponsePriority(
  input: PrioritizationInput,
  customWeights?: Partial<PrioritizationWeights>
): PrioritizationResult {
  const weights: PrioritizationWeights = {
    hazard_weight: customWeights?.hazard_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.hazard_weight,
    exposure_weight: customWeights?.exposure_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.exposure_weight,
    infrastructure_weight: customWeights?.infrastructure_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.infrastructure_weight,
    connectivity_weight: customWeights?.connectivity_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.connectivity_weight,
  };

  // 1. Hazard Subscore (0–100)
  let hazardSubscore = Math.max(0, Math.min(100, input.hazard_score));
  if (input.trend === 'INCREASING') {
    hazardSubscore = Math.min(100, hazardSubscore + 5);
  } else if (input.trend === 'DECREASING') {
    hazardSubscore = Math.max(0, hazardSubscore - 5);
  }

  // 2. Exposure Subscore (0–100)
  let exposureSubscore = 0;
  if (input.population != null && input.population > 0) {
    if (input.population >= 5000) {
      exposureSubscore = 95;
    } else if (input.population >= 2000) {
      exposureSubscore = 85;
    } else if (input.population >= 500) {
      exposureSubscore = 65;
    } else {
      exposureSubscore = 45;
    }
  } else if ((input.nearby_villages_count ?? 0) > 0) {
    exposureSubscore = Math.min(85, (input.nearby_villages_count ?? 0) * 30);
  } else {
    exposureSubscore = 5;
  }

  if ((input.nearby_villages_count ?? 0) > 1) {
    exposureSubscore = Math.min(100, exposureSubscore + Math.min(20, (input.nearby_villages_count! - 1) * 10));
  }

  // 3. Infrastructure Criticality Subscore (0–100)
  let infraSubscore = 0;
  if (input.has_hospital) infraSubscore += 60;
  if (input.has_power_or_comm) infraSubscore += 30;
  if (input.has_school_or_shelter) infraSubscore += 25;
  if ((input.critical_facilities_count ?? 0) > 0) {
    infraSubscore += Math.min(25, (input.critical_facilities_count ?? 0) * 15);
  }
  infraSubscore = Math.min(100, infraSubscore);

  // 4. Connectivity & Evidence Subscore (0–100)
  let connSubscore = 0;
  if (input.has_national_highway) {
    connSubscore += 65;
  } else if (input.has_state_highway) {
    connSubscore += 40;
  }

  if ((input.verified_reports_count ?? 0) > 0) {
    connSubscore += Math.min(45, (input.verified_reports_count ?? 0) * 15);
  }
  connSubscore = Math.min(100, connSubscore);


  // Composite Priority Score
  const rawScore =
    weights.hazard_weight * hazardSubscore +
    weights.exposure_weight * exposureSubscore +
    weights.infrastructure_weight * infraSubscore +
    weights.connectivity_weight * connSubscore;

  const priorityScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const responsePriority = scoreToResponsePriority(priorityScore);

  // Build Transparent Explanations / Reasons
  const reasons: string[] = [];

  if (input.hazard_score >= 81) {
    reasons.push(`CRITICAL hazard risk level (${input.hazard_score}/100)`);
  } else if (input.hazard_score >= 61) {
    reasons.push(`HIGH hazard risk level (${input.hazard_score}/100)`);
  } else if (input.hazard_score >= 41) {
    reasons.push(`MODERATE hazard risk level (${input.hazard_score}/100)`);
  }

  if (input.trend === 'INCREASING') {
    reasons.push('Rapidly increasing dynamic risk trend');
  }

  if (input.population != null && input.population >= 1000) {
    reasons.push(`High population density exposed (${input.population.toLocaleString()} residents)`);
  } else if ((input.nearby_villages_count ?? 0) > 0) {
    reasons.push(`${input.nearby_villages_count} vulnerable settlement(s) in zone radius`);
  }

  if (input.has_hospital) {
    reasons.push('Critical healthcare/hospital facility within impact perimeter');
  }

  if (input.has_national_highway) {
    reasons.push('National Highway lifeline route vulnerable to disruption');
  } else if (input.has_state_highway) {
    reasons.push('State Highway transit corridor vulnerable to disruption');
  }

  if (input.has_power_or_comm) {
    reasons.push('Vital electrical substation or communications infrastructure exposed');
  }

  if ((input.verified_reports_count ?? 0) > 0) {
    reasons.push(`${input.verified_reports_count} verified field report(s) corroborating ground displacement`);
  }

  if (reasons.length === 0) {
    reasons.push('Low baseline hazard and minimal critical infrastructure exposure');
  }

  return {
    priority_score: priorityScore,
    response_priority: responsePriority,
    priority_reasons: reasons,
    breakdown: {
      hazard_subscore: hazardSubscore,
      exposure_subscore: exposureSubscore,
      infrastructure_subscore: infraSubscore,
      connectivity_subscore: connSubscore,
      weights_applied: weights,
    },
  };
}

export class PrioritizationService {
  /**
   * Evaluates response priority for a zone or custom operational scenario.
   */
  public evaluate(
    input: PrioritizationInput,
    customWeights?: Partial<PrioritizationWeights>
  ): PrioritizationResult {
    return calculateResponsePriority(input, customWeights);
  }
}

export const prioritizationService = new PrioritizationService();
