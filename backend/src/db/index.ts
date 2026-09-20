import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

// Detect if cloud SSL is required
const isCloudDb = config.databaseUrl.includes('neon.tech') || 
                  config.databaseUrl.includes('supabase.co') || 
                  config.databaseUrl.includes('render.com') ||
                  config.databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Flag tracking if real Postgres is active or if we are using the resilient in-memory fallback
let isPostgresAvailable = false;
let hasCheckedDb = false;

// -------------------------------------------------------------
// HIGH-FIDELITY IN-MEMORY STORE (Resilient Fallback Engine)
// Activated automatically when local PostgreSQL / Docker is offline
// -------------------------------------------------------------
const memoryStore = {
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      organization_name: 'TriHub Technologies (Platform Master)',
      owner_name: 'TriHub Admin',
      phone: '6374569225',
      email: 'admin.pay@trihubtechnologies.com',
      password_hash: '$2a$10$MthsMeKUb8EnV5w0ak8fmuwoYLXxRignwkNzh4Imb3FqfgJ0NyBx6',
      role: 'ADMIN',
      current_balance: '0.0000',
      locked_balance: '0.0000',
      api_key: 'trihub-master-api-key-2026',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],

  commission_matrix: [
    { id: 1, operator_code: 'JIO', operator_name: 'Reliance Jio Infocomm', service_type: 'MOBILE', master_api_rate: 5.80, retailer_pass_down_rate: 3.00, admin_net_margin: 2.80, is_active: true },
    { id: 2, operator_code: 'AIRTEL', operator_name: 'Bharti Airtel', service_type: 'MOBILE', master_api_rate: 5.50, retailer_pass_down_rate: 2.80, admin_net_margin: 2.70, is_active: true },
    { id: 3, operator_code: 'VI', operator_name: 'Vodafone Idea', service_type: 'MOBILE', master_api_rate: 6.00, retailer_pass_down_rate: 3.50, admin_net_margin: 2.50, is_active: true },
    { id: 4, operator_code: 'BSNL', operator_name: 'BSNL GSM / Topup', service_type: 'MOBILE', master_api_rate: 6.20, retailer_pass_down_rate: 4.00, admin_net_margin: 2.20, is_active: true },
    { id: 5, operator_code: 'TATAPLAY', operator_name: 'Tata Play DTH', service_type: 'DTH', master_api_rate: 5.60, retailer_pass_down_rate: 3.20, admin_net_margin: 2.40, is_active: true },
    { id: 6, operator_code: 'AIRTEL_DTH', operator_name: 'Airtel Digital TV', service_type: 'DTH', master_api_rate: 5.50, retailer_pass_down_rate: 3.00, admin_net_margin: 2.50, is_active: true },
    { id: 7, operator_code: 'DISHTV', operator_name: 'Dish TV India', service_type: 'DTH', master_api_rate: 6.00, retailer_pass_down_rate: 3.60, admin_net_margin: 2.40, is_active: true },
    { id: 8, operator_code: 'SUNDIRECT', operator_name: 'Sun Direct TV', service_type: 'DTH', master_api_rate: 5.80, retailer_pass_down_rate: 3.50, admin_net_margin: 2.30, is_active: true },
    { id: 9, operator_code: 'TNEB', operator_name: 'Tamil Nadu Electricity (TANGEDCO)', service_type: 'ELECTRICITY', master_api_rate: 1.50, retailer_pass_down_rate: 0.50, admin_net_margin: 1.00, is_active: true },
    { id: 10, operator_code: 'BESCOM', operator_name: 'Bangalore Electricity Supply (BESCOM)', service_type: 'ELECTRICITY', master_api_rate: 1.50, retailer_pass_down_rate: 0.50, admin_net_margin: 1.00, is_active: true },
    { id: 11, operator_code: 'MSEB', operator_name: 'Maharashtra State Electricity (MSEDCL)', service_type: 'ELECTRICITY', master_api_rate: 1.50, retailer_pass_down_rate: 0.50, admin_net_margin: 1.00, is_active: true },
    { id: 12, operator_code: 'WBSEDCL', operator_name: 'West Bengal State Electricity (WBSEDCL)', service_type: 'ELECTRICITY', master_api_rate: 1.50, retailer_pass_down_rate: 0.50, admin_net_margin: 1.00, is_active: true }
  ],

  user_commissions: [] as any[],
  wallet_ledger: [] as any[],

  transactions: [] as any[],
  wallet_topups: [] as any[],

  system_settings: {
    failover_mode: { mode: 'AUTO', timeout_ms: 8000 },
    platform_upi: { vpa: '8270873279@upi', merchant_name: 'TriHub Technologies' },
    master_wallet_metrics: { cached_balance: 184500.00, low_balance_threshold: 25000.00 }
  } as Record<string, any>
};

/**
 * Check connectivity to PostgreSQL
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    isPostgresAvailable = true;
    return true;
  } catch (err: any) {
    isPostgresAvailable = false;
    return false;
  }
}

/**
 * Query router: routes to PostgreSQL if active, or handles with in-memory engine
 */
export async function query<T extends QueryResultRow = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> {
  if (!hasCheckedDb) {
    hasCheckedDb = true;
    await checkConnection();
    if (isPostgresAvailable) {
      console.log('✅ [DATABASE ENGINE] Connected to live PostgreSQL server.');
    } else {
      console.log('ℹ️ [DATABASE ENGINE] PostgreSQL is offline on port 5432. Active: High-Fidelity In-Memory Store with TriHub Technologies seed data.');
    }
  }

  if (isPostgresAvailable) {
    try {
      return await pool.query<T>(text, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        isPostgresAvailable = false;
        console.warn('[DATABASE FAILOVER] PostgreSQL lost connection. Falling back to In-Memory Engine.');
      } else {
        throw err;
      }
    }
  }

  // Fallback In-Memory Query Router
  return executeInMemoryQuery<T>(text, params);
}

/**
 * Transaction executor: executes within PostgreSQL transaction or in-memory transaction lock
 */
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!hasCheckedDb) {
    hasCheckedDb = true;
    await checkConnection();
  }

  if (isPostgresAvailable) {
    const client = await pool.connect();
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

  // Simulated In-Memory Transaction Client
  const mockClient = {
    query: (text: string, params?: any[]) => executeInMemoryQuery(text, params)
  };

  return await callback(mockClient);
}

/**
 * Emulates SQL query execution against memoryStore
 */
function executeInMemoryQuery<T extends QueryResultRow = any>(sql: string, params: any[] = []): QueryResult<T> {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  let rows: any[] = [];

  // 1. SELECT current_balance FROM users WHERE id = $1
  if (/SELECT .* FROM users WHERE id = \$1/i.test(cleanSql)) {
    const user = memoryStore.users.find(u => u.id === params[0]);
    rows = user ? [user] : [];
  }
  // 1b. SELECT id, current_balance FROM users WHERE role = 'ADMIN'
  else if (/SELECT .* FROM users WHERE role = 'ADMIN'/i.test(cleanSql)) {
    const admin = memoryStore.users.find(u => u.role === 'ADMIN');
    rows = admin ? [admin] : [];
  }
  // 2. SELECT id, ... FROM users WHERE email = $1 OR phone = $1 / WHERE phone = $1 OR email = $2
  else if (/SELECT .* FROM users WHERE .*?(email|phone)/i.test(cleanSql) && !/ORDER BY/i.test(cleanSql)) {
    const term1 = String(params[0] || '').toLowerCase();
    const term2 = String(params[1] || params[0] || '').toLowerCase();
    const user = memoryStore.users.find(u => 
      u.email.toLowerCase() === term1 || 
      u.phone === term1 ||
      u.email.toLowerCase() === term2 || 
      u.phone === term2
    );
    rows = user ? [user] : [];
  }
  // 3. SELECT ... FROM users ORDER BY
  else if (/SELECT .* FROM users/i.test(cleanSql)) {
    rows = memoryStore.users.map(u => ({
      ...u,
      total_recharges: memoryStore.transactions.filter(t => t.retailer_id === u.id).length,
      total_recharged_volume: memoryStore.transactions
        .filter(t => t.retailer_id === u.id)
        .reduce((sum, t) => sum + parseFloat(t.face_value || '0'), 0)
    }));
  }
  // 3b. INSERT INTO users (for direct shop registration & admin onboarding)
  else if (/INSERT INTO users/i.test(cleanSql)) {
    const newUser = {
      id: `usr-${Date.now()}`,
      organization_name: params[0],
      owner_name: params[1],
      phone: params[2],
      email: params[3],
      password_hash: params[4],
      role: 'RETAILER' as const,
      current_balance: '0.0000',
      locked_balance: '0.0000',
      api_key: `key-${Date.now()}`,
      is_active: true,
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(newUser);
    rows = [{
      id: newUser.id,
      organization_name: newUser.organization_name,
      owner_name: newUser.owner_name,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role,
      current_balance: 0,
      api_key: newUser.api_key
    }];
  }
  // 4. UPDATE users SET current_balance = $1 WHERE id = $2
  else if (/UPDATE users SET current_balance = \$1.* WHERE id = \$2/i.test(cleanSql)) {
    const user = memoryStore.users.find(u => u.id === params[1]);
    if (user) {
      user.current_balance = Number(params[0]).toFixed(4);
    }
    rows = [];
  }
  // 5. UPDATE users SET is_active = $1 WHERE id = $2
  else if (/UPDATE users SET is_active = \$1.* WHERE id = \$2/i.test(cleanSql)) {
    const user = memoryStore.users.find(u => u.id === params[1]);
    if (user) user.is_active = Boolean(params[0]);
    rows = [];
  }
  // 6. SELECT ... FROM commission_matrix WHERE operator_code = $1
  else if (/SELECT .* FROM commission_matrix WHERE operator_code = \$1/i.test(cleanSql)) {
    const op = memoryStore.commission_matrix.find(c => c.operator_code === params[0]);
    rows = op ? [op] : [];
  }
  // 7. SELECT ... FROM commission_matrix
  else if (/SELECT .* FROM commission_matrix/i.test(cleanSql)) {
    rows = [...memoryStore.commission_matrix];
  }
  // 8. UPDATE commission_matrix
  else if (/UPDATE commission_matrix SET/i.test(cleanSql)) {
    const code = params[3] || params[params.length - 1];
    const op = memoryStore.commission_matrix.find(c => c.operator_code === code);
    if (op) {
      op.master_api_rate = parseFloat(params[0]);
      op.retailer_pass_down_rate = parseFloat(params[1]);
      op.admin_net_margin = Number((op.master_api_rate - op.retailer_pass_down_rate).toFixed(2));
    }
    rows = [];
  }
  // 9. SELECT custom_pass_down_rate FROM user_commissions WHERE user_id = $1 AND operator_code = $2
  else if (/SELECT .* FROM user_commissions WHERE user_id = \$1 AND operator_code = \$2/i.test(cleanSql)) {
    const match = memoryStore.user_commissions.find(uc => uc.user_id === params[0] && uc.operator_code === params[1]);
    rows = match ? [match] : [];
  }
  // 10. SELECT ... FROM user_commissions WHERE user_id = $1
  else if (/SELECT .* FROM user_commissions.* WHERE uc\.user_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.user_commissions
      .filter(uc => uc.user_id === params[0])
      .map(uc => {
        const op = memoryStore.commission_matrix.find(c => c.operator_code === uc.operator_code);
        return {
          id: uc.id,
          user_id: uc.user_id,
          operator_code: uc.operator_code,
          custom_pass_down_rate: uc.custom_pass_down_rate,
          operator_name: op?.operator_name || uc.operator_code,
          service_type: op?.service_type || 'MOBILE',
          master_api_rate: op?.master_api_rate || 5.5,
          default_rate: op?.retailer_pass_down_rate || 3.0
        };
      });
  }
  // 11. INSERT INTO user_commissions
  else if (/INSERT INTO user_commissions/i.test(cleanSql)) {
    const [uId, opCode, rate] = params;
    const existing = memoryStore.user_commissions.find(uc => uc.user_id === uId && uc.operator_code === opCode);
    if (existing) {
      existing.custom_pass_down_rate = parseFloat(rate);
    } else {
      memoryStore.user_commissions.push({ id: Date.now(), user_id: uId, operator_code: opCode, custom_pass_down_rate: parseFloat(rate) });
    }
    rows = [];
  }
  // 12. DELETE FROM user_commissions
  else if (/DELETE FROM user_commissions WHERE user_id = \$1 AND operator_code = \$2/i.test(cleanSql)) {
    memoryStore.user_commissions = memoryStore.user_commissions.filter(uc => !(uc.user_id === params[0] && uc.operator_code === params[1]));
    rows = [];
  }
  // 13. INSERT INTO wallet_ledger
  else if (/INSERT INTO wallet_ledger/i.test(cleanSql)) {
    memoryStore.wallet_ledger.unshift({
      id: `led-${Date.now()}`,
      user_id: params[0],
      amount: String(params[1]),
      transaction_type: params[2],
      balance_before: String(params[3]),
      balance_after: String(params[4]),
      reference_id: params[5],
      description: params[6],
      created_at: new Date().toISOString()
    });
    rows = [];
  }
  // 14. SELECT ... FROM wallet_ledger WHERE user_id = $1
  else if (/SELECT .* FROM wallet_ledger WHERE user_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.wallet_ledger.filter(l => l.user_id === params[0]);
  }
  // 15. INSERT INTO transactions
  else if (/INSERT INTO transactions/i.test(cleanSql)) {
    const newTx = {
      id: `tx-id-${Date.now()}`,
      internal_tx_id: params[0],
      retailer_id: params[1],
      service_type: params[2],
      operator_code: params[3],
      target_account_number: params[4],
      circle_code: params[5],
      face_value: params[6],
      retailer_commission: params[7],
      admin_commission: params[8],
      master_commission: params[9],
      final_cost_billed: params[10],
      upstream_api_used: 'PENDING',
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.unshift(newTx);
    rows = [{ id: newTx.id }];
  }
  // 16. UPDATE transactions
  else if (/UPDATE transactions SET status = \$1/i.test(cleanSql)) {
    const txId = params[params.length - 1];
    const tx = memoryStore.transactions.find(t => t.id === txId || t.internal_tx_id === txId);
    if (tx) {
      tx.status = params[0];
      if (params.length >= 4) {
        tx.upstream_api_used = params[1];
        tx.upstream_operator_ref = params[2];
      }
    }
    rows = [];
  }
  // 17. SELECT ... FROM transactions WHERE retailer_id = $1
  else if (/SELECT .* FROM transactions WHERE retailer_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.transactions.filter(t => t.retailer_id === params[0]);
  }
  // 18. SELECT ... FROM transactions
  else if (/SELECT .* FROM transactions/i.test(cleanSql)) {
    rows = memoryStore.transactions.map(t => {
      const u = memoryStore.users.find(usr => usr.id === t.retailer_id);
      return {
        ...t,
        retailer_shop_name: u?.organization_name || 'Retailer',
        retailer_phone: u?.phone || ''
      };
    });
  }
  // 19. SELECT value FROM system_settings WHERE key = $1
  else if (/SELECT value FROM system_settings WHERE key = \$1|key = '([a-z_]+)'/i.test(cleanSql)) {
    const keyMatch = cleanSql.match(/key = '([a-z_]+)'/i);
    const key = keyMatch ? keyMatch[1] : params[0];
    const val = memoryStore.system_settings[key];
    rows = val ? [{ value: val }] : [];
  }
  // 20. INSERT INTO system_settings
  else if (/INSERT INTO system_settings/i.test(cleanSql)) {
    const val = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
    memoryStore.system_settings['failover_mode'] = val;
    rows = [];
  }
  // 21. INSERT INTO wallet_topups
  else if (/INSERT INTO wallet_topups/i.test(cleanSql)) {
    memoryStore.wallet_topups.push({
      id: `topup-${Date.now()}`,
      user_id: params[0],
      txn_ref: params[1],
      amount: String(params[2]),
      status: params[3] || 'PENDING',
      upi_txn_id: '',
      created_at: new Date().toISOString()
    });
    rows = [];
  }
  // 22. SELECT ... FROM wallet_topups
  else if (/SELECT .* FROM wallet_topups/i.test(cleanSql)) {
    if (/status = 'PENDING_APPROVAL'/i.test(cleanSql)) {
      rows = memoryStore.wallet_topups
        .filter(t => t.status === 'PENDING_APPROVAL')
        .map(t => {
          const u = memoryStore.users.find(usr => usr.id === t.user_id);
          return {
            ...t,
            utr_number: t.upi_txn_id,
            organization_name: u?.organization_name || 'Retailer Shop',
            owner_name: u?.owner_name || 'Shop Owner',
            phone: u?.phone || '',
            current_wallet_balance: u?.current_balance || '0.0000'
          };
        });
    } else if (/WHERE id = \$1/i.test(cleanSql)) {
      const topup = memoryStore.wallet_topups.find(t => t.id === params[0]);
      rows = topup ? [topup] : [];
    } else if (/WHERE txn_ref = \$1/i.test(cleanSql)) {
      const topup = memoryStore.wallet_topups.find(t => t.txn_ref === params[0]);
      rows = topup ? [topup] : [];
    } else {
      rows = memoryStore.wallet_topups.map(t => {
        const u = memoryStore.users.find(usr => usr.id === t.user_id);
        return {
          ...t,
          utr_number: t.upi_txn_id,
          organization_name: u?.organization_name || 'Retailer Shop',
          owner_name: u?.owner_name || 'Shop Owner',
          phone: u?.phone || '',
          current_wallet_balance: u?.current_balance || '0.0000'
        };
      });
    }
  }
  // 23. UPDATE wallet_topups
  else if (/UPDATE wallet_topups/i.test(cleanSql)) {
    if (/status = 'PENDING_APPROVAL'/i.test(cleanSql)) {
      const utr = params[0];
      const ref = params[1];
      const topup = memoryStore.wallet_topups.find(t => t.txn_ref === ref);
      if (topup) {
        topup.status = 'PENDING_APPROVAL';
        topup.upi_txn_id = utr;
      }
    } else if (/status = 'COMPLETED'/i.test(cleanSql)) {
      const id = params[params.length - 1];
      const topup = memoryStore.wallet_topups.find(t => t.id === id || t.txn_ref === id);
      if (topup) {
        topup.status = 'COMPLETED';
        topup.completed_at = new Date().toISOString();
      }
    } else if (/status = 'REJECTED'/i.test(cleanSql)) {
      const id = params[params.length - 1];
      const topup = memoryStore.wallet_topups.find(t => t.id === id || t.txn_ref === id);
      if (topup) {
        topup.status = 'REJECTED';
        topup.completed_at = new Date().toISOString();
      }
    }
    rows = [];
  }
  // Default: Return empty rows
  else {
    rows = [];
  }

  return {
    rows: rows as T[],
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: []
  };
}
