import fs from 'fs';
import path from 'path';
import { query, transaction, closeDatabasePool, checkDatabaseHealth } from './client';

// ============================================================================
// Deterministic Migration Runner
// ============================================================================

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export async function runMigrations(migrationsDir?: string): Promise<MigrationResult> {
  const dir =
    migrationsDir ||
    path.resolve(
      __dirname,
      fs.existsSync(path.resolve(__dirname, 'migrations'))
        ? 'migrations'
        : '../../src/db/migrations',
    );

  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }

  // 1. Ensure migrations tracking table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Fetch already applied migrations
  const appliedRes = await query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY id ASC',
  );
  const appliedSet = new Set(appliedRes.rows.map((r) => r.name));

  // 3. Read and sort migration files
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const result: MigrationResult = {
    applied: [],
    skipped: [],
  };

  for (const file of files) {
    if (appliedSet.has(file)) {
      result.skipped.push(file);
      continue;
    }

    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[db:migrate] Applying ${file}...`);

    await transaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });

    console.log(`[db:migrate] Applied ${file} successfully.`);
    result.applied.push(file);
  }

  return result;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  (async () => {
    try {
      console.log('[db:migrate] Checking database connection...');
      const health = await checkDatabaseHealth();
      if (!health.connected) {
        console.error('[db:migrate] Database connection failed:', health.error);
        process.exit(1);
      }

      console.log('[db:migrate] Connected to PostgreSQL. Running migrations...');
      const result = await runMigrations();
      console.log('[db:migrate] Migration run complete:', {
        applied: result.applied.length,
        skipped: result.skipped.length,
      });
      await closeDatabasePool();
      process.exit(0);
    } catch (err) {
      console.error('[db:migrate] Migration failed:', err);
      await closeDatabasePool();
      process.exit(1);
    }
  })();
}
