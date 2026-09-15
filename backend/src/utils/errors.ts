// ---------------------------------------------------------------------------
// Structured application errors
// All errors that should reach the HTTP client extend AppError.
// The global error handler in middleware/errorHandler.ts catches these.
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    // Maintain prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- Convenience factories ---

export const notFound = (resource = 'Resource'): AppError =>
  new AppError(404, 'NOT_FOUND', `${resource} not found.`);

export const badRequest = (message: string): AppError =>
  new AppError(400, 'BAD_REQUEST', message);

export const validationError = (message: string): AppError =>
  new AppError(422, 'VALIDATION_ERROR', message);

export const internalError = (message = 'An unexpected error occurred.'): AppError =>
  new AppError(500, 'INTERNAL_ERROR', message);

export const serviceUnavailable = (message: string): AppError =>
  new AppError(503, 'SERVICE_UNAVAILABLE', message);
