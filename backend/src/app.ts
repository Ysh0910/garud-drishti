import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import healthRouter from './routes/health.js';
import apiRouter from './routes/index.js';

// ---------------------------------------------------------------------------
// Express application factory
// Keeps app creation separate from server startup so the app can be imported
// cleanly in tests without binding to a port.
// ---------------------------------------------------------------------------

export function createApp(): Express {
  const app = express();

  // --- Security headers ---
  app.use(helmet());

  // --- CORS ---
  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      credentials: true,
    }),
  );

  // --- Request parsing ---
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- HTTP logging ---
  app.use(requestLogger);

  // --- Routes ---
  // Health check at root — accessible without the /api/v1 prefix
  app.use('/health', healthRouter);

  // All versioned API routes
  app.use('/api/v1', apiRouter);

  // --- 404 handler — must come after all routes ---
  app.use(notFoundHandler);

  // --- Global error handler — must be last (4-argument signature) ---
  app.use(errorHandler);

  return app;
}
