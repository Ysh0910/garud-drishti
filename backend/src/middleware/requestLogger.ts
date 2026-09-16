import morgan from 'morgan';
import { isProduction } from '../config/index.js';

// ---------------------------------------------------------------------------
// HTTP request logger
// Uses "combined" format (Apache-style) in production for structured log
// ingestion, and the more readable "dev" format locally.
// ---------------------------------------------------------------------------

export const requestLogger = morgan(isProduction ? 'combined' : 'dev');
