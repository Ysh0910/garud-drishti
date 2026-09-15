// ============================================================================
// Service Layer Boundary
// Services contain business logic, coordinate across repositories,
// evaluate state transitions, and invoke ML / external adapters.
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
