// ============================================================================
// Structured Application Errors
// All errors that should reach the HTTP client extend AppError.
// The global error handler in middleware/errorHandler.ts catches these.
// ============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: unknown) {
    super(404, 'NOT_FOUND', `${resource} not found.`, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict.', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed.', details?: unknown) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super(500, 'INTERNAL_ERROR', message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable.') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}

// --- Convenience factory functions ---
export const notFound = (resource = 'Resource'): NotFoundError =>
  new NotFoundError(resource);

export const badRequest = (message: string, details?: unknown): BadRequestError =>
  new BadRequestError(message, details);

export const validationError = (message: string, details?: unknown): ValidationError =>
  new ValidationError(message, details);

export const internalError = (message = 'An unexpected error occurred.'): InternalError =>
  new InternalError(message);

export const serviceUnavailable = (message: string): ServiceUnavailableError =>
  new ServiceUnavailableError(message);
