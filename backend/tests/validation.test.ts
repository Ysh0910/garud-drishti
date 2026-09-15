import { describe, it, expect } from '@jest/globals';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams } from '../src/middleware/validate';
import { errorHandler } from '../src/middleware/errorHandler';
import { bboxSchema, latitudeSchema, longitudeSchema } from '../src/schemas/common';
import { RiskLevelEnum } from '../src/types/enums';

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Test route for body validation
  const testBodySchema = z.object({
    category: z.string().min(3),
    severity: RiskLevelEnum,
    score: z.number().min(0).max(100),
  });

  app.post('/test/body', validateBody(testBodySchema), (req: Request, res: Response) => {
    res.status(200).json({ received: req.body });
  });

  // Test route for query validation with transformations
  const testQuerySchema = z.object({
    lat: latitudeSchema,
    lon: longitudeSchema,
  });

  app.get('/test/query', validateQuery(testQuerySchema), (req: Request, res: Response) => {
    res.status(200).json({ query: req.query });
  });

  // Test route for bbox validation
  const testBboxSchema = z.object({
    bbox: bboxSchema,
  });

  app.get('/test/bbox', validateQuery(testBboxSchema), (req: Request, res: Response) => {
    res.status(200).json({ bbox: req.query.bbox });
  });

  // Test route for params validation
  const testParamsSchema = z.object({
    id: z.string().uuid(),
  });

  app.get('/test/params/:id', validateParams(testParamsSchema), (req: Request, res: Response) => {
    res.status(200).json({ id: req.params.id });
  });

  // Test composite validation (body + query + params)
  app.post(
    '/test/composite/:id',
    validate({
      params: testParamsSchema,
      body: z.object({ name: z.string() }),
      query: z.object({ active: z.enum(['true', 'false']) }),
    }),
    (req: Request, res: Response) => {
      res.status(200).json({ params: req.params, body: req.body, query: req.query });
    },
  );

  app.use(errorHandler);
  return app;
}

describe('Validation Middleware & Schemas', () => {
  const app = createTestApp();

  describe('Body Validation', () => {
    it('accepts valid body payload', async () => {
      const payload = {
        category: 'LANDSLIDE',
        severity: 'HIGH',
        score: 85,
      };

      const res = await request(app).post('/test/body').send(payload);
      expect(res.status).toBe(200);
      expect(res.body.received).toEqual(payload);
    });

    it('returns structured 422 error on invalid body payload', async () => {
      const invalidPayload = {
        category: 'NO', // too short (< 3)
        severity: 'INVALID_SEVERITY',
        score: 150, // exceeds max 100
      };

      const res = await request(app).post('/test/body').send(invalidPayload);
      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('Request validation failed.');
      expect(res.body.error.details.field_errors).toHaveProperty('category');
      expect(res.body.error.details.field_errors).toHaveProperty('severity');
      expect(res.body.error.details.field_errors).toHaveProperty('score');
    });
  });

  describe('Query Validation & Transformation', () => {
    it('parses and transforms string coordinates to numbers', async () => {
      const res = await request(app).get('/test/query?lat=27.33&lon=88.61');
      expect(res.status).toBe(200);
      expect(res.body.query.lat).toBe(27.33);
      expect(res.body.query.lon).toBe(88.61);
    });

    it('rejects out-of-range coordinates with 422', async () => {
      const res = await request(app).get('/test/query?lat=95.0&lon=200.0');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.field_errors).toHaveProperty('lat');
      expect(res.body.error.details.field_errors).toHaveProperty('lon');
    });

    it('parses valid bounding box string into { west, south, east, north }', async () => {
      const res = await request(app).get('/test/bbox?bbox=88.0,26.0,90.0,28.0');
      expect(res.status).toBe(200);
      expect(res.body.bbox).toEqual({
        west: 88,
        south: 26,
        east: 90,
        north: 28,
      });
    });

    it('rejects invalid bbox format with 422', async () => {
      const res = await request(app).get('/test/bbox?bbox=invalid,bbox');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.field_errors).toHaveProperty('bbox');
    });
  });

  describe('Params Validation', () => {
    it('accepts valid UUID param', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app).get(`/test/params/${validUuid}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(validUuid);
    });

    it('rejects non-UUID param with 422', async () => {
      const res = await request(app).get('/test/params/not-a-uuid');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.field_errors).toHaveProperty('id');
    });
  });
});
