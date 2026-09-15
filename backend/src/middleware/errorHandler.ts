import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { isProduction } from '../config/index.js';

// ---------------------------------------------------------------------------
// Structured error response shape
// Matches TECH_STACK.md §41 error contract:
//   { "error": { "code": "...", "message": "...", "request_id": "..." } }
// ---------------------------------------------------------------------------

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

function buildErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: unknown,
): ErrorResponse {
  const body: ErrorResponse = { error: { code, message } };
  if (requestId) body.error.request_id = requestId;
  if (details !== undefined && !isProduction) body.error.details = details;
  return body;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  // --- Zod validation errors (schema parse failures) ---
  if (err instanceof ZodError) {
    res.status(422).json(
      buildErrorResponse(
        'VALIDATION_ERROR',
        'Request validation failed.',
        requestId,
        err.flatten(),
      ),
    );
    return;
  }

  // --- Operational application errors ---
  if (err instanceof AppError) {
    if (!isProduction) {
      console.error(`[${err.code}] ${err.message}`);
    }
    res.status(err.statusCode).json(
      buildErrorResponse(err.code, err.message, requestId),
    );
    return;
  }

  // --- Unknown / unexpected errors ---
  // Log in full server-side; expose minimal info to the client.
  console.error('[unhandled error]', err);
  res.status(500).json(
    buildErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred.',
      requestId,
    ),
  );
}
