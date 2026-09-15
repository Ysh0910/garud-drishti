import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { isProduction } from '../config/index.js';

// ============================================================================
// Structured Error Response Shape
// Matches TECH_STACK.md §41 & contracts error conventions:
//   { "error": { "code": "...", "message": "...", "request_id": "...", "details": ... } }
// ============================================================================

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

export function buildErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: unknown,
): ErrorResponseBody {
  const body: ErrorResponseBody = { error: { code, message } };
  if (requestId) body.error.request_id = requestId;
  if (details !== undefined) body.error.details = details;
  return body;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req.headers['x-request-id'] as string) || undefined;

  // --- Zod validation errors ---
  if (err instanceof ZodError) {
    const formatted = err.flatten();
    res.status(422).json(
      buildErrorResponse(
        'VALIDATION_ERROR',
        'Request validation failed.',
        requestId,
        {
          field_errors: formatted.fieldErrors,
          form_errors: formatted.formErrors,
        },
      ),
    );
    return;
  }

  // --- Operational application errors ---
  if (err instanceof AppError) {
    if (!isProduction && err.statusCode >= 500) {
      console.error(`[${err.code}] ${err.message}`, err.details ?? '');
    }
    res.status(err.statusCode).json(
      buildErrorResponse(err.code, err.message, requestId, err.details),
    );
    return;
  }

  // --- Unexpected / system errors ---
  console.error('[unhandled_error]', err);
  res.status(500).json(
    buildErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected internal server error occurred.',
      requestId,
      !isProduction && err instanceof Error ? { stack: err.stack } : undefined,
    ),
  );
}
