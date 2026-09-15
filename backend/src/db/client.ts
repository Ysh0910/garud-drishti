import pg from 'pg';
import { config, isTest } from '../config/index.js';

const { Pool } = pg;

// ============================================================================
// Database Connection Pool (PostgreSQL / PostGIS)
// ============================================================================

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString =
      config.DATABASE_URL || 'postgresql://netra:netra_pass@localhost:5432/netra_gis';

    pool = new Pool({
      connectionString,
      max: isTest ? 5 : 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[db] Unexpected error on idle database client', err);
    });
  }

  return pool;
}

/**
 * Execute a parameterized SQL query on the pool.
 */
export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<R>> {
  const start = Date.now();
  const client = getPool();
  try {
    const res = await client.query<R>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('[db:query]', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('[db:error]', { text, error });
    throw error;
  }
}

/**
 * Acquire a dedicated client from the pool for transactions.
 */
export async function getClient(): Promise<pg.PoolClient> {
  const p = getPool();
  return p.connect();
}

/**
 * Run a unit of work inside a single transaction.
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify database connectivity and PostGIS extension status.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  postgis_installed: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const res = await query<{ version: string; postgis_version?: string }>(`
      SELECT 
        version(),
        (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis_version
    `);

    const row = res.rows[0];
    return {
      connected: true,
      postgis_installed: Boolean(row?.postgis_version),
      version: row?.version,
    };
  } catch (err) {
    return {
      connected: false,
      postgis_installed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Close pool during graceful shutdown.
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
