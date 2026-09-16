import 'dotenv/config';
import fs from 'fs';
import path from 'path';
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

  // --- Security headers (allowing cross-origin media embeds) ---
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // --- CORS ---
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all local dev ports or matching CORS_ORIGINS
        if (!origin || corsOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      credentials: true,
    }),
  );

  // --- Request parsing ---
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // --- Static Uploads (Media Evidence) ---
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

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
