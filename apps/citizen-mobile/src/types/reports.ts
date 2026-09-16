/**
 * Citizen Report Data Contracts
 * Strictly synchronized with contracts/reports.md
 */

import { ReportCategory, ReportStatus, ReportSeverity } from './enums';

export interface PhotoAttachment {
  uri: string;
  name?: string;
  type?: string;
  sizeBytes?: number;
  capturedAt?: string;
}

export interface ReportCreateRequest {
  /** Client-generated idempotency UUID to prevent duplicate submissions on retry */
  client_report_id: string;
  category: ReportCategory;
  description?: string;
  latitude: number;
  longitude: number;
  location_accuracy_m?: number;
  /** ISO 8601 UTC timestamp of observation time (not upload time) */
  captured_at: string;
  /** Citizen-assessed severity (LOW, MEDIUM, HIGH) - NOT a model risk_level */
  severity?: ReportSeverity;
  photo?: PhotoAttachment;
}

export interface ReportResponse {
  report_id: string;
  client_report_id: string;
  status: ReportStatus;
  category: ReportCategory;
  description: string | null;
  latitude: number;
  longitude: number;
  location_accuracy_m: number | null;
  captured_at: string;
  submitted_at: string;
  severity: ReportSeverity | null;
  media_url: string | null;
  evidence_score: number | null;
  nearest_cell_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

export type QueueItemStatus = 'PENDING' | 'UPLOADING' | 'FAILED' | 'SYNCED';

export interface QueueItem {
  local_id: string;
  payload: ReportCreateRequest;
  photo_uri?: string;
  created_at: string;
  status: QueueItemStatus;
  retry_count: number;
  error_message?: string;
  server_report_id?: string;
  synced_at?: string;
}
