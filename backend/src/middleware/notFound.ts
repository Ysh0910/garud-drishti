import { Request, Response, NextFunction } from 'express';
import { notFound } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// 404 handler — must be registered after all routes.
// Returns the same structured error shape as errorHandler.
// ---------------------------------------------------------------------------

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(notFound(`Route ${req.method} ${req.path}`));
}
