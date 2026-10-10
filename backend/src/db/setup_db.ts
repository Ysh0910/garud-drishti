import pg from 'pg';

const { Pool } = pg;

async function main() {
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);

  const adminPool = new Pool({
    user,
    password,
    host,
    port,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });

  try {
    const versionRes = await adminPool.query<{ version: string }>('SELECT version()');
    console.log('[PostgreSQL Connected]:', versionRes.rows[0].version);

    const dbRes = await adminPool.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname = 'garud_drishti'",
    );
    if (dbRes.rows.length === 0) {
      await adminPool.query('CREATE DATABASE garud_drishti');
      console.log('[Database]: Created database "garud_drishti"');
    } else {
      console.log('[Database]: Database "garud_drishti" already exists');
    }
  } catch (err: any) {
    console.error('[Error connecting to Postgres]:', err.message);
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // Connect to garud_drishti and check/enable PostGIS
  const appPool = new Pool({
    user,
    password,
    host,
    port,
    database: 'garud_drishti',
    connectionTimeoutMillis: 5000,
  });

  try {
    try {
      await appPool.query('CREATE EXTENSION IF NOT EXISTS postgis');
      console.log('[PostGIS Extension]: Enabled successfully in "garud_drishti"');
    } catch (e: any) {
      console.warn('[PostGIS Note]: Could not create postgis extension:', e.message);
    }
    const res = await appPool.query('SELECT current_database(), current_user');
    console.log('[App DB Verified]:', res.rows[0]);
  } finally {
    await appPool.end();
  }
}

main();
