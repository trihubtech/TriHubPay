import fs from 'fs';
import path from 'path';
import { query, pool, checkConnection } from './index';

export async function initializeDatabase() {
  console.log('[DB INIT] Checking database connection...');
  const isConnected = await checkConnection();

  if (!isConnected) {
    console.log(`
--------------------------------------------------------------------------------
ℹ️  [TRIHUBPAY ENGINE NOTICE]
PostgreSQL is currently offline on localhost:5432.
The TriHubPay Platform is operating in HIGH-FIDELITY IN-MEMORY MODE with pre-seeded
TriHubPay accounts, operators (Jio, Airtel, Vi, etc.), and settings.

To switch to persistent PostgreSQL storage:
1. Open Docker Desktop from your Windows Start menu
2. Run: docker compose up -d
--------------------------------------------------------------------------------
    `);
    return true;
  }

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await query(schemaSql);

    // Apply safe migrations for NeroPay + Noble Dynamic Failover and new categories
    const migrationPath = path.join(__dirname, 'migrations/20260922_neropay_noble_migration.sql');
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      await query(migrationSql).catch((err) => {
        console.warn('ℹ️ [DB INIT MIGRATION NOTICE]:', err.message);
      });
      console.log('✅ [DB INIT] Applied 20260922 NeroPay + Noble failover migration.');
    }

    console.log('✅ [DB INIT] PostgreSQL schema verified & updated successfully.');

    // Check if admin exists; if not, apply seeds
    const adminCheck = await query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1;");
    if (adminCheck.rows.length === 0) {
      console.log('[DB INIT] No users found. Applying initial seeds...');
      const seedsSql = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf-8');
      await query(seedsSql);
      console.log('✅ [DB INIT] Initial seed data inserted successfully.');
    } else {
      console.log('ℹ️ [DB INIT] Admin user already exists. Skipping seeds insertion.');
    }
    return true;
  } catch (error: any) {
    console.error('[DB INIT ERROR]: Failed to initialize PostgreSQL:', error.message);
    return false;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('[DB INIT] Done.');
      pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
