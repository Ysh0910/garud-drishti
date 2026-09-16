import { describe, it, expect } from '@jest/globals';
import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  ServiceUnavailableError,
} from '../src/utils/errors';
import { errorHandler } from '../src/middleware/errorHandler';

function createErrorTestApp() {
  const app = express();

  app.get('/err/bad-request', () => {
    throw new BadRequestError('Invalid filter combination');
  });

  app.get('/err/not-found', () => {
    throw new NotFoundError('RiskCell');
  });

  app.get('/err/unauthorized', () => {
    throw new UnauthorizedError('Token missing or expired');
  });

  app.get('/err/forbidden', () => {
    throw new ForbiddenError('Insufficient permissions');
  });

  app.get('/err/conflict', () => {
    throw new ConflictError('Duplicate report submitted');
  });

  app.get('/err/service-unavailable', () => {
    throw new ServiceUnavailableError('PostGIS database offline');
  });

  app.get('/err/unknown', () => {
    throw new Error('Unexpected catastrophic failure');
  });

  app.get('/err/custom-status', (_req: Request, _res: Response) => {
    throw new AppError(418, 'TEAPOT', "I'm a teapot");
  });

  app.use(errorHandler);
  return app;
}

describe('Error Handling Middleware & AppError Classes', () => {
  const app = createErrorTestApp();

  it('handles BadRequestError (400)', async () => {
    const res = await request(app).get('/err/bad-request');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Invalid filter combination');
  });

  it('handles NotFoundError (404)', async () => {
    const res = await request(app).get('/err/not-found');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('RiskCell not found.');
  });

  it('handles UnauthorizedError (401)', async () => {
    const res = await request(app).get('/err/unauthorized');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('handles ForbiddenError (403)', async () => {
    const res = await request(app).get('/err/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('handles ConflictError (409)', async () => {
    const res = await request(app).get('/err/conflict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('handles ServiceUnavailableError (503)', async () => {
    const res = await request(app).get('/err/service-unavailable');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('handles generic unhandled errors as 500 INTERNAL_ERROR', async () => {
    const res = await request(app).get('/err/unknown');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('An unexpected internal server error occurred.');
  });

  it('preserves custom AppError code and status', async () => {
    const res = await request(app).get('/err/custom-status');
    expect(res.status).toBe(418);
    expect(res.body.error.code).toBe('TEAPOT');
    expect(res.body.error.message).toBe("I'm a teapot");
  });

  it('echoes X-Request-Id in error response when present', async () => {
    const res = await request(app)
      .get('/err/not-found')
      .set('X-Request-Id', 'req-test-12345');
    expect(res.status).toBe(404);
    expect(res.body.error.request_id).toBe('req-test-12345');
  });
});
