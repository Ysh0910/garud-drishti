import { Request, Response, NextFunction } from 'express';
import { prioritizationService, DEFAULT_PRIORITIZATION_WEIGHTS } from '../services/prioritizationService';
import { prioritizationInputSchema } from '../schemas/prioritization';

/**
 * Controller for Operational Response Prioritisation.
 */
export class PrioritizationController {
  /**
   * POST /api/v1/prioritization/evaluate
   * Evaluates response priority for a zone or custom operational scenario.
   */
  async evaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = prioritizationInputSchema.parse(req.body);
      const result = prioritizationService.evaluate(
        validatedInput,
        validatedInput.weights
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/prioritization/config
   * Returns default weights and criteria definitions for authority tuning.
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      default_weights: DEFAULT_PRIORITIZATION_WEIGHTS,
      bands: {
        IMMEDIATE: 'Score 85–100: Highest emergency response; preemptive evacuation & barricading',
        HIGH: 'Score 65–84: Immediate on-site inspection; prepare traffic diversions',
        MEDIUM: 'Score 40–64: Heightened awareness; alert local field teams',
        LOW: 'Score 0–39: Routine monitoring; standard patrol',
      },
      formula: 'Priority = (w_hazard * S_hazard) + (w_exposure * S_exposure) + (w_infra * S_infra) + (w_connectivity * S_connectivity)',
    });
  }
}

export const prioritizationController = new PrioritizationController();
