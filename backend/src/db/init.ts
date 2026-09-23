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

    // Apply all safe database migrations automatically
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of migrationFiles) {
        try {
          const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
          await query(migrationSql);
          console.log(`✅ [DB INIT] Applied migration ${file}`);
        } catch (err: any) {
          console.warn(`ℹ️ [DB INIT MIGRATION NOTICE] ${file}:`, err.message);
        }
      }
    }

    console.log('✅ [DB INIT] PostgreSQL schema verified & updated successfully.');

    // Guarantee 50/50 wholesale commission split across all operators in PostgreSQL
    await query(`
      UPDATE commission_matrix SET neropay_master_rate = 1.00, retailer_pass_down_rate = 0.50, admin_net_margin = 0.50 WHERE operator_code = 'JIO';
      UPDATE commission_matrix SET neropay_master_rate = 1.00, retailer_pass_down_rate = 0.50, admin_net_margin = 0.50 WHERE operator_code = 'AIRTEL';
      UPDATE commission_matrix SET neropay_master_rate = 3.50, retailer_pass_down_rate = 1.75, admin_net_margin = 1.75 WHERE operator_code = 'VI';
      UPDATE commission_matrix SET neropay_master_rate = 3.00, retailer_pass_down_rate = 1.50, admin_net_margin = 1.50 WHERE operator_code = 'BSNL';
      UPDATE commission_matrix SET neropay_master_rate = 3.10, retailer_pass_down_rate = 1.55, admin_net_margin = 1.55 WHERE operator_code = 'TATAPLAY';
      UPDATE commission_matrix SET neropay_master_rate = 4.10, retailer_pass_down_rate = 2.05, admin_net_margin = 2.05 WHERE operator_code = 'AIRTEL_DTH';
      UPDATE commission_matrix SET neropay_master_rate = 3.20, retailer_pass_down_rate = 1.60, admin_net_margin = 1.60 WHERE operator_code = 'DISHTV';
      UPDATE commission_matrix SET neropay_master_rate = 2.80, retailer_pass_down_rate = 1.40, admin_net_margin = 1.40 WHERE operator_code = 'SUNDIRECT';
      UPDATE commission_matrix SET neropay_master_rate = 3.50, retailer_pass_down_rate = 1.75, admin_net_margin = 1.75 WHERE operator_code IN ('VIDEOCON', 'VIDEOCON_D2H');
    `).catch((err) => {
      console.warn('[DB INIT 50/50 NOTICE]:', err.message);
    });

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
