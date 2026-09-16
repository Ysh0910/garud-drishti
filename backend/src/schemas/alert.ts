import { z } from 'zod';
import { RiskLevelEnum, AlertStateEnum } from '../types';

/**
 * Schema for manual alert creation by authorities (POST /api/v1/alerts).
 */
export const createAlertSchema = z.object({
  cell_id: z.string().min(1, 'cell_id is required'),
  severity: RiskLevelEnum,
  trigger_reason: z.string().min(3, 'trigger_reason must be at least 3 characters'),
  zone_name: z.string().optional(),
});

export type CreateAlertDto = z.infer<typeof createAlertSchema>;

/**
 * Schema for querying alerts (GET /api/v1/alerts).
 */
export const listAlertsQuerySchema = z.object({
  state: AlertStateEnum.optional(),
  severity: RiskLevelEnum.optional(),
  cell_id: z.string().optional(),
  since: z.string().datetime({ message: 'since must be a valid ISO 8601 UTC string' }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAlertsQueryDto = z.infer<typeof listAlertsQuerySchema>;

/**
 * Schema for alert approval / acknowledgement (POST /api/v1/alerts/:alert_id/acknowledge).
 */
export const acknowledgeAlertSchema = z.object({
  approved_by: z.string().min(1).default('DISASTER_MGMT_OFFICER'),
  notes: z.string().optional(),
});

export type AcknowledgeAlertDto = z.infer<typeof acknowledgeAlertSchema>;

/**
 * Schema for alert resolution (POST /api/v1/alerts/:alert_id/resolve).
 */
export const resolveAlertSchema = z.object({
  resolution_reason: z.string().optional(),
  resolved_by: z.string().optional(),
});

export type ResolveAlertDto = z.infer<typeof resolveAlertSchema>;
