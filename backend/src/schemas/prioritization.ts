import { z } from 'zod';
import { TrendEnum, DataQualityEnum } from '../types';

/**
 * Custom weights schema for operational prioritisation tuning.
 */
export const prioritizationWeightsSchema = z.object({
  hazard_weight: z.number().min(0).max(1).default(0.50),
  exposure_weight: z.number().min(0).max(1).default(0.25),
  infrastructure_weight: z.number().min(0).max(1).default(0.15),
  connectivity_weight: z.number().min(0).max(1).default(0.10),
}).refine(
  (weights) => {
    const sum =
      weights.hazard_weight +
      weights.exposure_weight +
      weights.infrastructure_weight +
      weights.connectivity_weight;
    return Math.abs(sum - 1.0) < 0.01;
  },
  {
    message: 'Weights must sum to 1.0 (hazard + exposure + infrastructure + connectivity)',
  }
);

export type PrioritizationWeightsInput = z.infer<typeof prioritizationWeightsSchema>;

/**
 * Input schema for evaluating zone or location response priority.
 */
export const prioritizationInputSchema = z.object({
  hazard_score: z.number().min(0).max(100),
  trend: TrendEnum.default('STABLE'),
  population: z.number().min(0).nullable().optional(),
  nearby_villages_count: z.number().min(0).default(0),
  has_national_highway: z.boolean().default(false),
  has_state_highway: z.boolean().default(false),
  critical_facilities_count: z.number().min(0).default(0),
  has_hospital: z.boolean().default(false),
  has_school_or_shelter: z.boolean().default(false),
  has_power_or_comm: z.boolean().default(false),
  verified_reports_count: z.number().min(0).default(0),
  data_quality: DataQualityEnum.default('GOOD'),
  weights: prioritizationWeightsSchema.optional(),
});

export type PrioritizationInputDto = z.infer<typeof prioritizationInputSchema>;
