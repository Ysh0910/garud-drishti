import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';

// ---------------------------------------------------------------------------
// Health endpoint — Phase 1 acceptance test
// ---------------------------------------------------------------------------

const app = createApp();

describe('GET /health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('GARUD DRISHTI API');
    expect(res.body.version).toBe('1.0.0');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('Unmatched route', () => {
  it('returns 404 with structured error body', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });
});
