/**
 * Ported verbatim from backend/src/services/prioritizationService.ts (same formula,
 * same reason strings) so MockApi and RealApi produce identical results for the same
 * input — swapping modes should never change what the UI shows for a given zone.
 *
 * If the backend formula changes, update both files together; there is currently no
 * shared package between the two workstreams to enforce this automatically.
 */
import type { PrioritizationInputDto, PrioritizationResultDto, PrioritizationWeightsDto } from './types';

export const DEFAULT_PRIORITIZATION_WEIGHTS: PrioritizationWeightsDto = {
  hazard_weight: 0.5,
  exposure_weight: 0.25,
  infrastructure_weight: 0.15,
  connectivity_weight: 0.1,
};

function scoreToResponsePriority(score: number): PrioritizationResultDto['response_priority'] {
  if (score >= 80) return 'IMMEDIATE';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export function calculateResponsePriority(
  input: PrioritizationInputDto,
  customWeights?: Partial<PrioritizationWeightsDto>,
): PrioritizationResultDto {
  const weights: PrioritizationWeightsDto = {
    hazard_weight: customWeights?.hazard_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.hazard_weight,
    exposure_weight: customWeights?.exposure_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.exposure_weight,
    infrastructure_weight: customWeights?.infrastructure_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.infrastructure_weight,
    connectivity_weight: customWeights?.connectivity_weight ?? DEFAULT_PRIORITIZATION_WEIGHTS.connectivity_weight,
  };

  let hazardSubscore = Math.max(0, Math.min(100, input.hazard_score));
  if (input.trend === 'INCREASING') hazardSubscore = Math.min(100, hazardSubscore + 5);
  else if (input.trend === 'DECREASING') hazardSubscore = Math.max(0, hazardSubscore - 5);

  let exposureSubscore = 0;
  if (input.population != null && input.population > 0) {
    if (input.population >= 5000) exposureSubscore = 95;
    else if (input.population >= 2000) exposureSubscore = 85;
    else if (input.population >= 500) exposureSubscore = 65;
    else exposureSubscore = 45;
  } else if ((input.nearby_villages_count ?? 0) > 0) {
    exposureSubscore = Math.min(85, (input.nearby_villages_count ?? 0) * 30);
  } else {
    exposureSubscore = 5;
  }
  if ((input.nearby_villages_count ?? 0) > 1) {
    exposureSubscore = Math.min(100, exposureSubscore + Math.min(20, (input.nearby_villages_count! - 1) * 10));
  }

  let infraSubscore = 0;
  if (input.has_hospital) infraSubscore += 60;
  if (input.has_power_or_comm) infraSubscore += 30;
  if (input.has_school_or_shelter) infraSubscore += 25;
  if ((input.critical_facilities_count ?? 0) > 0) {
    infraSubscore += Math.min(25, (input.critical_facilities_count ?? 0) * 15);
  }
  infraSubscore = Math.min(100, infraSubscore);

  let connSubscore = 0;
  if (input.has_national_highway) connSubscore += 65;
  else if (input.has_state_highway) connSubscore += 40;
  if ((input.verified_reports_count ?? 0) > 0) {
    connSubscore += Math.min(45, (input.verified_reports_count ?? 0) * 15);
  }
  connSubscore = Math.min(100, connSubscore);

  const rawScore =
    weights.hazard_weight * hazardSubscore +
    weights.exposure_weight * exposureSubscore +
    weights.infrastructure_weight * infraSubscore +
    weights.connectivity_weight * connSubscore;

  const priorityScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const responsePriority = scoreToResponsePriority(priorityScore);

  const reasons: string[] = [];
  if (input.hazard_score >= 81) reasons.push(`CRITICAL hazard risk level (${input.hazard_score}/100)`);
  else if (input.hazard_score >= 61) reasons.push(`HIGH hazard risk level (${input.hazard_score}/100)`);
  else if (input.hazard_score >= 41) reasons.push(`MODERATE hazard risk level (${input.hazard_score}/100)`);

  if (input.trend === 'INCREASING') reasons.push('Rapidly increasing dynamic risk trend');

  if (input.population != null && input.population >= 1000) {
    reasons.push(`High population density exposed (${input.population.toLocaleString()} residents)`);
  } else if ((input.nearby_villages_count ?? 0) > 0) {
    reasons.push(`${input.nearby_villages_count} vulnerable settlement(s) in zone radius`);
  }

  if (input.has_hospital) reasons.push('Critical healthcare/hospital facility within impact perimeter');

  if (input.has_national_highway) reasons.push('National Highway lifeline route vulnerable to disruption');
  else if (input.has_state_highway) reasons.push('State Highway transit corridor vulnerable to disruption');

  if (input.has_power_or_comm) reasons.push('Vital electrical substation or communications infrastructure exposed');

  if ((input.verified_reports_count ?? 0) > 0) {
    reasons.push(`${input.verified_reports_count} verified field report(s) corroborating ground displacement`);
  }

  if (reasons.length === 0) reasons.push('Low baseline hazard and minimal critical infrastructure exposure');

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
