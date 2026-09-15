// ============================================================================
// Controller Layer Boundary
// Controllers handle HTTP requests, extract parameters, invoke services,
// and return standardized responses according to contracts.
// ============================================================================

export type ControllerHandler = import('express').RequestHandler;
