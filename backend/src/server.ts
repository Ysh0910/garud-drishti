import 'dotenv/config';
import { createApp } from './app';
import { config } from './config/index.js';

// ---------------------------------------------------------------------------
// HTTP server bootstrap
// Separated from app.ts so integration tests can import createApp() without
// starting a live server.
// ---------------------------------------------------------------------------

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(
    `[server] GARUD DRISHTI API listening on port ${config.PORT} (${config.NODE_ENV})`,
  );
});

// --- Graceful shutdown ---
function shutdown(signal: string): void {
  console.log(`[server] Received ${signal} — shutting down gracefully`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('[server] Forced exit after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
