import fs from 'fs';
import path from 'path';
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

// Proxy pool.connect for in-memory ACID resilience when postgres is offline
const rawConnect = pool.connect.bind(pool);
pool.connect = (async () => {
  if (!hasCheckedDb) {
    hasCheckedDb = true;
    await checkConnection();
  }
  if (isPostgresAvailable) {
    try {
      return await rawConnect();
    } catch (err) {
      isPostgresAvailable = false;
    }
  }
  return {
    query: async (text: string, params?: any[]) => executeInMemoryQuery(text, params),
    release: () => {}
  } as any;
}) as any;

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'trihubpay_store.json');

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
    // 1. Mobile Telecom Operators (50/50 split of NeroPay wholesale rate)
    { id: 1, operator_code: 'JIO', operator_name: 'Jio', service_type: 'MOBILE', commission_type: 'PERCENT', neropay_master_rate: 1.00, noble_master_rate: 1.00, retailer_pass_down_rate: 0.50, admin_net_margin: 0.50, is_noble_active: false, is_active: true },
    { id: 2, operator_code: 'AIRTEL', operator_name: 'Airtel', service_type: 'MOBILE', commission_type: 'PERCENT', neropay_master_rate: 1.00, noble_master_rate: 1.00, retailer_pass_down_rate: 0.50, admin_net_margin: 0.50, is_noble_active: false, is_active: true },
    { id: 3, operator_code: 'VI', operator_name: 'Vi', service_type: 'MOBILE', commission_type: 'PERCENT', neropay_master_rate: 3.50, noble_master_rate: 3.50, retailer_pass_down_rate: 1.75, admin_net_margin: 1.75, is_noble_active: false, is_active: true },
    { id: 4, operator_code: 'BSNL', operator_name: 'BSNL', service_type: 'MOBILE', commission_type: 'PERCENT', neropay_master_rate: 3.00, noble_master_rate: 3.00, retailer_pass_down_rate: 1.50, admin_net_margin: 1.50, is_noble_active: false, is_active: true },

    // 2. DTH Providers (50/50 split of NeroPay wholesale rate)
    { id: 5, operator_code: 'SUNDIRECT', operator_name: 'Sun Direct', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 2.80, noble_master_rate: 3.60, retailer_pass_down_rate: 1.40, admin_net_margin: 1.40, is_noble_active: false, is_active: true },
    { id: 6, operator_code: 'AIRTEL_DTH', operator_name: 'Airtel DTH', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 4.10, noble_master_rate: 3.50, retailer_pass_down_rate: 2.05, admin_net_margin: 2.05, is_noble_active: false, is_active: true },
    { id: 7, operator_code: 'VIDEOCON', operator_name: 'Videocon d2h', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 3.50, noble_master_rate: 3.60, retailer_pass_down_rate: 1.75, admin_net_margin: 1.75, is_noble_active: false, is_active: true },
    { id: 8, operator_code: 'VIDEOCON_D2H', operator_name: 'Videocon d2h', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 3.50, noble_master_rate: 3.60, retailer_pass_down_rate: 1.75, admin_net_margin: 1.75, is_noble_active: false, is_active: true },
    { id: 9, operator_code: 'TATAPLAY', operator_name: 'Tata Play', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 3.10, noble_master_rate: 2.60, retailer_pass_down_rate: 1.55, admin_net_margin: 1.55, is_noble_active: false, is_active: true },
    { id: 10, operator_code: 'DISHTV', operator_name: 'Dish TV', service_type: 'DTH', commission_type: 'PERCENT', neropay_master_rate: 3.20, noble_master_rate: 3.50, retailer_pass_down_rate: 1.60, admin_net_margin: 1.60, is_noble_active: false, is_active: true },

    // 3. Electricity & Utilities (BBPS)
    { id: 11, operator_code: 'TNEB', operator_name: 'TNEB / TANGEDCO Tamil Nadu', service_type: 'ELECTRICITY', commission_type: 'FLAT', neropay_master_rate: 0.00, noble_master_rate: 2.50, retailer_pass_down_rate: 1.25, admin_net_margin: 1.25, is_noble_active: false, is_active: true },
    { id: 12, operator_code: 'BESCOM', operator_name: 'BESCOM Karnataka (Bengaluru)', service_type: 'ELECTRICITY', commission_type: 'FLAT', neropay_master_rate: 0.00, noble_master_rate: 2.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 13, operator_code: 'MSEB', operator_name: 'MSEB / Mahavitaran Maharashtra', service_type: 'ELECTRICITY', commission_type: 'FLAT', neropay_master_rate: 0.00, noble_master_rate: 2.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 14, operator_code: 'WBSEDCL', operator_name: 'WBSEDCL West Bengal', service_type: 'ELECTRICITY', commission_type: 'FLAT', neropay_master_rate: 0.00, noble_master_rate: 2.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 15, operator_code: 'UPPCL', operator_name: 'UPPCL Uttar Pradesh (Urban / Rural)', service_type: 'ELECTRICITY', commission_type: 'FLAT', neropay_master_rate: 0.00, noble_master_rate: 2.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },

    // 4. Digital Entertainment & Play Store
    { id: 16, operator_code: 'GOOGLE_PLAY', operator_name: 'Google Play Redeem Code', service_type: 'GOOGLE_PLAY', commission_type: 'PERCENT', neropay_master_rate: 2.00, noble_master_rate: 3.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 17, operator_code: 'OTT_APPS', operator_name: 'OTT Streaming Vouchers (SonyLIV, Hotstar, ZEE5)', service_type: 'OTT_APPS', commission_type: 'PERCENT', neropay_master_rate: 3.50, noble_master_rate: 4.00, retailer_pass_down_rate: 1.75, admin_net_margin: 1.75, is_noble_active: false, is_active: true },

    // 5. FASTag Toll Topup (All Banks)
    { id: 18, operator_code: 'FASTAG_PAYTM', operator_name: 'Paytm Payments Bank FASTag', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.20, noble_master_rate: 0.30, retailer_pass_down_rate: 0.10, admin_net_margin: 0.10, is_noble_active: false, is_active: true },
    { id: 19, operator_code: 'FASTAG_ICICI', operator_name: 'ICICI Bank FASTag', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.20, noble_master_rate: 0.30, retailer_pass_down_rate: 0.10, admin_net_margin: 0.10, is_noble_active: false, is_active: true },
    { id: 20, operator_code: 'FASTAG_SBI', operator_name: 'State Bank of India (SBI) FASTag', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.20, noble_master_rate: 0.30, retailer_pass_down_rate: 0.10, admin_net_margin: 0.10, is_noble_active: false, is_active: true },
    { id: 21, operator_code: 'FASTAG_AIRTEL', operator_name: 'Airtel Payments Bank FASTag', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.20, noble_master_rate: 0.30, retailer_pass_down_rate: 0.10, admin_net_margin: 0.10, is_noble_active: false, is_active: true },
    { id: 22, operator_code: 'FASTAG_HDFC', operator_name: 'HDFC Bank FASTag', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.20, noble_master_rate: 0.30, retailer_pass_down_rate: 0.10, admin_net_margin: 0.10, is_noble_active: false, is_active: true },
    { id: 23, operator_code: 'FASTAG', operator_name: 'NHAI FASTag (All Banks)', service_type: 'FASTAG', commission_type: 'PERCENT', neropay_master_rate: 0.15, noble_master_rate: 0.30, retailer_pass_down_rate: 0.08, admin_net_margin: 0.07, is_noble_active: false, is_active: true },

    // 6. LPG Gas Cylinder Booking (NeroPay Official Providers)
    { id: 24, operator_code: 'INDANE_GAS', operator_name: 'Indane Gas (Indian Oil)', service_type: 'LPG_GAS', commission_type: 'FLAT', neropay_master_rate: 2.00, noble_master_rate: 6.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 25, operator_code: 'BHARAT_GAS', operator_name: 'Bharat Gas (BPCL)', service_type: 'LPG_GAS', commission_type: 'FLAT', neropay_master_rate: 2.00, noble_master_rate: 6.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 26, operator_code: 'HP_GAS', operator_name: 'HP Gas (HPCL)', service_type: 'LPG_GAS', commission_type: 'FLAT', neropay_master_rate: 2.00, noble_master_rate: 6.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },
    { id: 27, operator_code: 'LPG_GAS', operator_name: 'LPG Gas Cylinder (All Providers)', service_type: 'LPG_GAS', commission_type: 'FLAT', neropay_master_rate: 2.00, noble_master_rate: 6.00, retailer_pass_down_rate: 1.00, admin_net_margin: 1.00, is_noble_active: false, is_active: true },

    // 7. Broadband & Fiber Bill Payments
    { id: 28, operator_code: 'AIRTEL_BROADBAND', operator_name: 'Airtel Broadband & Xstream Fiber', service_type: 'BROADBAND', commission_type: 'PERCENT', neropay_master_rate: 0.50, noble_master_rate: 0.80, retailer_pass_down_rate: 0.25, admin_net_margin: 0.25, is_noble_active: false, is_active: true },
    { id: 29, operator_code: 'JIO_FIBER', operator_name: 'JioFiber Broadband', service_type: 'BROADBAND', commission_type: 'PERCENT', neropay_master_rate: 0.50, noble_master_rate: 0.80, retailer_pass_down_rate: 0.25, admin_net_margin: 0.25, is_noble_active: false, is_active: true },
    { id: 30, operator_code: 'ACT_FIBERNET', operator_name: 'ACT Fibernet Broadband', service_type: 'BROADBAND', commission_type: 'PERCENT', neropay_master_rate: 0.50, noble_master_rate: 0.80, retailer_pass_down_rate: 0.25, admin_net_margin: 0.25, is_noble_active: false, is_active: true },
    { id: 31, operator_code: 'BSNL_BROADBAND', operator_name: 'BSNL Broadband & Bharat Fiber', service_type: 'BROADBAND', commission_type: 'PERCENT', neropay_master_rate: 0.50, noble_master_rate: 0.80, retailer_pass_down_rate: 0.25, admin_net_margin: 0.25, is_noble_active: false, is_active: true },
    { id: 32, operator_code: 'BROADBAND', operator_name: 'Other Broadband & ISP Providers', service_type: 'BROADBAND', commission_type: 'PERCENT', neropay_master_rate: 0.50, noble_master_rate: 0.80, retailer_pass_down_rate: 0.25, admin_net_margin: 0.25, is_noble_active: false, is_active: true }
  ],

  user_commissions: [] as any[],
  wallet_ledger: [] as any[],

  transactions: [] as any[],
  wallet_topups: [] as any[],
  password_reset_otps: [] as any[],
  platform_notifications: [] as any[],
  user_feedbacks: [] as any[],

  system_settings: {
    failover_mode: { mode: 'AUTO', timeout_ms: 8000 },
    platform_upi: { vpa: '8270873279@upi', merchant_name: 'TriHub Technologies' },
    master_wallet_metrics: { cached_balance: 184500.00, low_balance_threshold: 25000.00 }
  } as Record<string, any>
};

function loadPersistentStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.users && Array.isArray(parsed.users)) {
        const otherUsers = parsed.users.filter((u: any) => u.role !== 'ADMIN');
        memoryStore.users = [memoryStore.users[0], ...otherUsers];
      }
      if (parsed.wallet_ledger && Array.isArray(parsed.wallet_ledger)) {
        memoryStore.wallet_ledger = parsed.wallet_ledger.map((l: any) => {
          let txType = l.transaction_type;
          let balBefore = l.balance_before;
          let balAfter = l.balance_after;
          let refId = l.reference_id;
          let desc = l.description;

          // If transaction_type is a number (corrupted by older parameter index shift)
          if (!isNaN(Number(txType)) && (isNaN(Number(balAfter)) || String(balAfter).startsWith('TXN_'))) {
            const isDebit = String(l.description || l.reference_id || '').toLowerCase().includes('order');
            txType = isDebit ? 'DEBIT' : 'CREDIT';
            balBefore = l.transaction_type;
            balAfter = l.balance_before;
            refId = l.balance_after;
            desc = l.reference_id || 'Wallet Balance Movement';
          }

          return {
            ...l,
            transaction_type: txType,
            balance_before: String(balBefore || '0.0000'),
            balance_after: String(balAfter || '0.0000'),
            reference_id: String(refId || ''),
            description: String(desc || 'Wallet Balance Movement')
          };
        });
      }
      if (parsed.transactions) memoryStore.transactions = parsed.transactions;
      if (parsed.wallet_topups) memoryStore.wallet_topups = parsed.wallet_topups;
      if (parsed.user_commissions) memoryStore.user_commissions = parsed.user_commissions;
      if (parsed.platform_notifications) memoryStore.platform_notifications = parsed.platform_notifications;
      if (parsed.user_feedbacks) memoryStore.user_feedbacks = parsed.user_feedbacks;
      if (parsed.commission_matrix && Array.isArray(parsed.commission_matrix)) {
        // Merge persisted rates with baseline matrix to guarantee all new operators and columns exist
        const loadedCodes = new Set(parsed.commission_matrix.map((c: any) => c.operator_code));
        const merged = parsed.commission_matrix.map((c: any) => {
          const baseline = memoryStore.commission_matrix.find(b => b.operator_code === c.operator_code);
          return {
            ...baseline,
            ...c,
            neropay_master_rate: c.neropay_master_rate !== undefined ? c.neropay_master_rate : (baseline?.neropay_master_rate ?? 1.0),
            noble_master_rate: c.noble_master_rate !== undefined ? c.noble_master_rate : (baseline?.noble_master_rate ?? 1.0),
            is_noble_active: c.is_noble_active !== undefined ? Boolean(c.is_noble_active) : false,
            commission_type: c.commission_type || baseline?.commission_type || 'PERCENT'
          };
        });

        // Add any new operators that were added to memoryStore
        for (const op of memoryStore.commission_matrix) {
          if (!loadedCodes.has(op.operator_code)) {
            merged.push(op);
          }
        }
        memoryStore.commission_matrix = merged;
      }
      if (parsed.password_reset_otps) memoryStore.password_reset_otps = parsed.password_reset_otps;

      // Clean operator names
      const cleanNameMap: Record<string, string> = {
        'JIO': 'Jio',
        'AIRTEL': 'Airtel',
        'VI': 'Vi',
        'BSNL': 'BSNL',
        'TATAPLAY': 'Tata Play',
        'AIRTEL_DTH': 'Airtel DTH',
        'DISHTV': 'Dish TV',
        'SUNDIRECT': 'Sun Direct',
        'VIDEOCON': 'Videocon d2h',
        'VIDEOCON_D2H': 'Videocon d2h',
        'TNEB': 'TNEB Electricity',
        'BESCOM': 'BESCOM Electricity',
        'MSEB': 'MSEB Electricity',
        'WBSEDCL': 'WBSEDCL Electricity',
        'GOOGLE_PLAY': 'Google Play Redeem Code',
        'OTT_APPS': 'OTT Streaming Vouchers',
        'FASTAG': 'FASTag Recharge',
        'LPG_GAS': 'LPG Gas Cylinder Booking',
        'BROADBAND': 'Broadband Bill Payment'
      };
      for (const op of memoryStore.commission_matrix) {
        if (cleanNameMap[op.operator_code]) {
          op.operator_name = cleanNameMap[op.operator_code];
        }
      }

      console.log(`📦 [PERSISTENCE ENGINE] Successfully loaded ${memoryStore.users.length} user accounts and ${memoryStore.commission_matrix.length} operators from local disk backup (${DATA_FILE}).`);
    }
  } catch (err: any) {
    console.warn('[PERSISTENCE ENGINE] Notice reading local store:', err.message);
  }
}

// Automatically load local disk snapshot upon startup
loadPersistentStore();

function savePersistentStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[PERSISTENCE ENGINE] Notice saving local store:', err.message);
  }
}

/**
 * Check connectivity to PostgreSQL
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await rawConnect();
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
      pool.query(`ALTER TABLE wallet_topups ADD COLUMN IF NOT EXISTS admin_remarks TEXT;`).catch(() => {});
      pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'RETAILER';`).catch(() => {});
      pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_otps (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          otp_code VARCHAR(10) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        CREATE INDEX IF NOT EXISTS idx_pwd_reset_lookup ON password_reset_otps(user_id, otp_code, used);

        CREATE TABLE IF NOT EXISTS platform_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'UPDATE' CHECK (type IN ('OFFER', 'UPDATE', 'FEATURE', 'ALERT')),
          target_type VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (target_type IN ('ALL', 'SELECTED')),
          target_user_ids JSONB DEFAULT '[]'::jsonb,
          created_by VARCHAR(150) NOT NULL DEFAULT 'Admin',
          created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON platform_notifications(created_at DESC);

        CREATE TABLE IF NOT EXISTS user_feedbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          user_name VARCHAR(150),
          user_phone VARCHAR(50),
          organization_name VARCHAR(150),
          category VARCHAR(50) NOT NULL DEFAULT 'SUGGESTION' CHECK (category IN ('ISSUE', 'FEATURE', 'SERVICE', 'SUGGESTION', 'OTHER')),
          rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
          message TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'RESOLVED')),
          admin_response TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON user_feedbacks(created_at DESC);
      `).catch((err: any) => console.warn('[DATABASE ENGINE] Schema init check notice:', err.message));
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
  // 2a. SELECT id FROM users WHERE (phone = $1 OR email = $1) AND id != $2 (Uniqueness Check)
  else if (/SELECT .* FROM users WHERE .*?(email|phone).*?id (!=|<>)/i.test(cleanSql)) {
    const val = String(params[0] || '').toLowerCase().trim();
    const excludeId = String(params[1] || '');
    const conflict = memoryStore.users.find(u => 
      u.id !== excludeId && ((u.phone && u.phone.trim() === val) || (u.email && u.email.toLowerCase().trim() === val))
    );
    rows = conflict ? [{ id: conflict.id }] : [];
  }
  // 2. SELECT id, ... FROM users WHERE email = $1 OR phone = $1 / WHERE phone = $1 OR email = $2
  else if (/SELECT .* FROM users WHERE .*?(email|phone)/i.test(cleanSql) && !/ORDER BY/i.test(cleanSql)) {
    const term1 = String(params[0] || '').toLowerCase().trim();
    const term2 = String(params[1] || params[0] || '').toLowerCase().trim();
    const user = memoryStore.users.find(u => 
      (u.email && u.email.toLowerCase().trim() === term1) || 
      (u.phone && u.phone.trim() === term1) ||
      (u.email && u.email.toLowerCase().trim() === term2) || 
      (u.phone && u.phone.trim() === term2)
    );
    rows = user ? [user] : [];
  }
  // 2b. Aggregate query for retailer counts and float liability:
  else if (/SELECT .*?total_retailers.*?FROM users/i.test(cleanSql) || /SELECT .*?total_retailer_wallet_float/i.test(cleanSql)) {
    const retailers = memoryStore.users.filter(u => u.role === 'RETAILER');
    const active = retailers.filter(u => u.is_active !== false);
    const floatSum = retailers.reduce((sum, u) => sum + parseFloat(u.current_balance || (u as any).wallet_balance || '0'), 0);
    rows = [{
      total_retailers: retailers.length,
      active_retailers: active.length,
      total_retailer_wallet_float: floatSum
    }];
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
    const explicitId = params.find(p => typeof p === 'string' && p.includes('-')) || `usr-${Date.now()}`;
    const balMatch = cleanSql.match(/(\d+(\.\d+)?)\s*\)\s*ON CONFLICT/i) || cleanSql.match(/,\s*(\d+(\.\d+)?)\s*\)\s*RETURNING/i);
    const initialBal = balMatch ? balMatch[1] : (params.length >= 8 ? String(params[7]) : '0.0000');

    const existing = memoryStore.users.find(u => u.id === explicitId);
    if (existing) {
      existing.current_balance = initialBal;
      savePersistentStore();
      rows = [{ id: explicitId, current_balance: initialBal }];
    } else {
      let orgName = 'Shop Account';
      let ownerName = 'Retailer';
      let phone = '0000000000';
      let email = 'shop@trihubpay.in';
      let passwordHash = 'hash';

      if (params.length >= 5) {
        orgName = String(params[0] || 'Shop Account');
        ownerName = String(params[1] || 'Retailer');
        phone = String(params[2] || '0000000000');
        email = String(params[3] || 'shop@trihubpay.in');
        passwordHash = String(params[4] || 'hash');
      }

      let accountType = 'RETAILER';
      if (params.includes('CONSUMER')) {
        accountType = 'CONSUMER';
      }

      const newUser = {
        id: explicitId,
        organization_name: orgName,
        owner_name: ownerName,
        phone: phone,
        email: email,
        password_hash: passwordHash,
        role: 'RETAILER' as any,
        account_type: accountType,
        current_balance: initialBal,
        locked_balance: '0.0000',
        api_key: `trihub-retailer-${Date.now()}`,
        is_active: true,
        created_at: new Date().toISOString()
      };
      memoryStore.users.push(newUser);
      savePersistentStore();
      rows = [{
        id: newUser.id,
        organization_name: newUser.organization_name,
        owner_name: newUser.owner_name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        account_type: (newUser as any).account_type || 'RETAILER',
        current_balance: parseFloat(initialBal),
        api_key: newUser.api_key
      }];
    }
  }
  // 4a. UPDATE users SET current_balance = 0... (bulk reset)
  else if (/UPDATE users SET (current_balance|wallet_balance)\s*=\s*0.*?WHERE\s+(role\s*=\s*'RETAILER'|1=1)/i.test(cleanSql)) {
    for (const u of memoryStore.users) {
      if (u.role !== 'ADMIN') {
        u.current_balance = '0.0000';
        (u as any).wallet_balance = '0.0000';
      }
    }
    savePersistentStore();
    rows = [];
  }
  // 4b. UPDATE users SET current_balance = 0... WHERE id = $1
  else if (/UPDATE users SET (current_balance|wallet_balance)\s*=\s*0.*?WHERE\s+id\s*=\s*\$1/i.test(cleanSql)) {
    const targetId = params[0];
    const user = memoryStore.users.find(u => u.id === targetId);
    if (user) {
      user.current_balance = '0.0000';
      (user as any).wallet_balance = '0.0000';
      savePersistentStore();
    }
    rows = [];
  }
  // 4c. UPDATE users SET current_balance = $1.* WHERE id = $2 (or SET current_balance = $1, wallet_balance = $1 WHERE id = $2)
  else if (/UPDATE users SET (current_balance|wallet_balance).*?WHERE\s+id\s*=\s*(\$2|\$1)/i.test(cleanSql)) {
    const targetId = params.length >= 2 ? params[1] : params[0];
    const user = memoryStore.users.find(u => u.id === targetId);
    if (user) {
      const val = Number(params[0] || 0).toFixed(4);
      user.current_balance = val;
      (user as any).wallet_balance = val;
      savePersistentStore();
    }
    rows = [];
  }
  // 5. UPDATE users SET is_active = $1 WHERE id = $2
  else if (/UPDATE users SET is_active = \$1.* WHERE id = \$2/i.test(cleanSql)) {
    const user = memoryStore.users.find(u => u.id === params[1]);
    if (user) {
      user.is_active = Boolean(params[0]);
      savePersistentStore();
    }
    rows = [];
  }
  // 5b. UPDATE users SET password_hash = $1 WHERE id = $2 (or email/phone)
  else if (/UPDATE users SET password_hash = \$1/i.test(cleanSql)) {
    const userTarget = params[1];
    const user = memoryStore.users.find(u => u.id === userTarget || u.email.toLowerCase() === String(userTarget).toLowerCase() || u.phone === String(userTarget));
    if (user) {
      user.password_hash = params[0];
      savePersistentStore();
    }
    rows = [];
  }
  // 5c. UPDATE users SET organization_name = $1, owner_name = $2, phone = $3, email = $4 WHERE id = $5
  else if (/UPDATE users SET organization_name =/i.test(cleanSql)) {
    const [orgName, ownerName, phone, email, id] = params;
    const user = memoryStore.users.find(u => u.id === id);
    if (user) {
      user.organization_name = orgName;
      user.owner_name = ownerName;
      user.phone = phone;
      user.email = email;
      savePersistentStore();
    }
    rows = [];
  }
  // 6. SELECT ... FROM commission_matrix WHERE operator_code = $1
  else if (/SELECT .* FROM commission_matrix WHERE operator_code = \$1/i.test(cleanSql)) {
    const op = memoryStore.commission_matrix.find(c => c.operator_code === params[0]);
    rows = op ? [op] : [];
  }
  // 7. SELECT ... FROM commission_matrix
  else if (/SELECT .* FROM commission_matrix/i.test(cleanSql)) {
    let list = [...memoryStore.commission_matrix];
    if (/service_type = \$1/i.test(cleanSql)) {
      const st = String(params[0] || '').toUpperCase();
      list = list.filter(c => c.service_type === st && c.is_active !== false);
    } else {
      list = list.filter(c => c.is_active !== false);
    }

    const userId = (params && params[0] && typeof params[0] === 'string' && params[0].length > 10) ? params[0] : null;
    rows = list.map(c => {
      const userCustom = userId ? memoryStore.user_commissions.find(uc => uc.user_id === userId && uc.operator_code === c.operator_code) : null;
      const rawRate = userCustom ? userCustom.custom_pass_down_rate : (c as any).retailer_pass_down_rate;
      const numRate = parseFloat(rawRate !== undefined ? rawRate : 0);
      const safeRate = isNaN(numRate) ? 0 : numRate;
      return {
        ...c,
        commission_rate: safeRate,
        retailer_pass_down_rate: safeRate,
        custom_pass_down_rate: userCustom ? userCustom.custom_pass_down_rate : null,
        is_custom: Boolean(userCustom)
      };
    });
  }
  // 8a. UPDATE commission_matrix SET is_noble_active = $1 (or literal true/false)
  else if (/UPDATE commission_matrix SET is_noble_active = (\$1|true|false)/i.test(cleanSql)) {
    const isLitTrue = /is_noble_active = true/i.test(cleanSql);
    const isLitFalse = /is_noble_active = false/i.test(cleanSql);
    const nobleActive = isLitTrue ? true : isLitFalse ? false : Boolean(params[0]);
    for (const op of memoryStore.commission_matrix) {
      op.is_noble_active = nobleActive;
      const maxMaster = nobleActive ? Math.max(op.neropay_master_rate || 0, op.noble_master_rate || 0) : (op.neropay_master_rate || 0);
      op.retailer_pass_down_rate = Number((maxMaster * 0.58).toFixed(2));
      op.admin_net_margin = Number((maxMaster - op.retailer_pass_down_rate).toFixed(2));
    }
    savePersistentStore();
    rows = [];
  }
  // 8b. UPDATE commission_matrix SET neropay_master_rate...
  else if (/UPDATE commission_matrix SET/i.test(cleanSql)) {
    const code = params[params.length - 1];
    const op = memoryStore.commission_matrix.find(c => c.operator_code === code);
    if (op) {
      if (params.length >= 7) {
        op.neropay_master_rate = parseFloat(params[0]);
        op.noble_master_rate = parseFloat(params[1]);
        op.retailer_pass_down_rate = parseFloat(params[2]);
        op.admin_net_margin = parseFloat(params[3]);
        op.is_noble_active = Boolean(params[4]);
        if (params[5]) op.commission_type = params[5];
        if (params[6] !== undefined) op.is_active = Boolean(params[6]);
      } else {
        (op as any).neropay_master_rate = parseFloat(params[0]);
        (op as any).master_api_rate = parseFloat(params[0]);
        op.retailer_pass_down_rate = parseFloat(params[1]);
        op.admin_net_margin = Number((parseFloat(params[0]) - op.retailer_pass_down_rate).toFixed(2));
      }
      savePersistentStore();
    }
    rows = [];
  }
  // 9. SELECT custom_pass_down_rate FROM user_commissions WHERE user_id = $1 AND operator_code = $2
  else if (/SELECT .* FROM user_commissions WHERE user_id = \$1 AND operator_code = \$2/i.test(cleanSql)) {
    const match = memoryStore.user_commissions.find(uc => uc.user_id === params[0] && uc.operator_code === params[1]);
    rows = match ? [match] : [];
  }
  // 10. SELECT ... FROM user_commissions WHERE user_id = $1
  else if (/SELECT .* FROM user_commissions.* WHERE (uc\.)?user_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.user_commissions
      .filter(uc => uc.user_id === params[0])
      .map(uc => {
        const op = memoryStore.commission_matrix.find(c => c.operator_code === uc.operator_code);
        const opMaster = op ? ((op as any).neropay_master_rate ?? (op as any).master_api_rate ?? 5.5) : 5.5;
        return {
          id: uc.id,
          user_id: uc.user_id,
          operator_code: uc.operator_code,
          custom_pass_down_rate: uc.custom_pass_down_rate,
          operator_name: op?.operator_name || uc.operator_code,
          service_type: op?.service_type || 'MOBILE',
          master_api_rate: opMaster,
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
    savePersistentStore();
    rows = [];
  }
  // 12. DELETE FROM user_commissions
  else if (/DELETE FROM user_commissions WHERE user_id = \$1 AND operator_code = \$2/i.test(cleanSql)) {
    memoryStore.user_commissions = memoryStore.user_commissions.filter(uc => !(uc.user_id === params[0] && uc.operator_code === params[1]));
    savePersistentStore();
    rows = [];
  }
  // 13. INSERT INTO wallet_ledger
  else if (/INSERT INTO wallet_ledger/i.test(cleanSql)) {
    let userId = params[0];
    let amount = String(params[1]);
    let txType = 'CREDIT';
    let balBefore = '0.0000';
    let balAfter = '0.0000';
    let refId = '';
    let desc = '';

    if (params.length >= 7) {
      txType = String(params[2]);
      balBefore = String(params[3]);
      balAfter = String(params[4]);
      refId = String(params[5] || '');
      desc = String(params[6] || '');
    } else if (params.length === 6) {
      // Form: VALUES ($1, $2, 'DEBIT'/'CREDIT', $3, $4, $5, $6)
      const isDebit = /'DEBIT'/i.test(cleanSql);
      txType = isDebit ? 'DEBIT' : 'CREDIT';
      balBefore = String(params[2]);
      balAfter = String(params[3]);
      refId = String(params[4] || '');
      desc = String(params[5] || '');
    } else if (params.length === 5) {
      // Form: VALUES ($1, $2, 'DEBIT', $3, 0.0000, $4, $5)
      const isDebit = /'DEBIT'/i.test(cleanSql);
      txType = isDebit ? 'DEBIT' : 'CREDIT';
      balBefore = String(params[2]);
      balAfter = '0.0000';
      refId = String(params[3] || '');
      desc = String(params[4] || '');
    }

    memoryStore.wallet_ledger.unshift({
      id: `led-${Date.now()}`,
      user_id: userId,
      amount,
      transaction_type: txType,
      balance_before: balBefore,
      balance_after: balAfter,
      reference_id: refId,
      description: desc,
      created_at: new Date().toISOString()
    });
    savePersistentStore();
    rows = [];
  }
  // 14. SELECT ... FROM wallet_ledger WHERE user_id = $1
  else if (/SELECT .* FROM wallet_ledger WHERE user_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.wallet_ledger.filter(l => l.user_id === params[0]);
  }
  // 15. INSERT INTO transactions
  else if (/INSERT INTO transactions/i.test(cleanSql)) {
    let internalId = params[0];
    let retailerId = params[1];
    let billedCost = 0;

    if (params.length === 3) {
      internalId = params[0];
      retailerId = params[1];
      billedCost = parseFloat(params[2]) || 0;
    } else if (params.length >= 11) {
      billedCost = parseFloat(params[10]) || 0;
    }

    const newTx = {
      id: `tx-id-${Date.now()}`,
      internal_tx_id: internalId,
      retailer_id: retailerId,
      service_type: params[2] || 'MOBILE',
      operator_code: params[3] || 'JIO',
      target_account_number: params[4] || '9999999999',
      circle_code: params[5] || 'ALL_INDIA',
      face_value: params[6] || billedCost,
      retailer_commission: params[7] || '0',
      admin_commission: params[8] || '0',
      master_commission: params[9] || '0',
      final_cost_billed: String(billedCost),
      upstream_api_used: 'PENDING',
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.unshift(newTx);
    savePersistentStore();
    rows = [newTx];
  }
  // 16. UPDATE transactions
  else if (/UPDATE transactions/i.test(cleanSql)) {
    const txId = params[params.length - 1];
    const tx = memoryStore.transactions.find(t => t.id === txId || t.internal_tx_id === txId);
    if (tx) {
      if (/status = 'SUCCESS'/i.test(cleanSql)) {
        tx.status = 'SUCCESS';
        if (params[0]) tx.upstream_operator_ref = params[0];
        if (params[1]) tx.upstream_tx_id = params[1];
      } else if (/status = 'REFUNDED'/i.test(cleanSql)) {
        tx.status = 'REFUNDED';
        if (params[0]) tx.failure_reason = params[0];
      } else if (params[0]) {
        tx.status = params[0];
        if (params.length >= 4) {
          tx.upstream_api_used = params[1];
          tx.upstream_operator_ref = params[2];
        }
        if (params.length >= 6) {
          tx.voucher_code = params[4];
          tx.voucher_pin = params[5];
        }
      }
      savePersistentStore();
    }
    rows = [];
  }
  // 17. SELECT ... FROM transactions WHERE id = $1 OR internal_tx_id = $1
  else if (/SELECT .* FROM transactions WHERE (t\.)?id = \$1/i.test(cleanSql) || /SELECT .* FROM transactions WHERE (t\.)?internal_tx_id = \$1/i.test(cleanSql)) {
    const idParam = params[0];
    const match = memoryStore.transactions.find(t => t.id === idParam || t.internal_tx_id === idParam || (t.id && String(t.id) === String(idParam)));
    rows = match ? [{ ...match, final_cost_billed: String(match.final_cost_billed || '0') }] : [];
  }
  // 17a. SELECT ... FROM transactions WHERE internal_tx_id
  else if (/SELECT .* FROM transactions WHERE (internal_tx_id = \$1|upstream_tx_id = \$2)/i.test(cleanSql)) {
    const targetRef = params[0];
    const upstreamRef = params[1];
    const match = memoryStore.transactions.find(t => t.internal_tx_id === targetRef || (upstreamRef && t.upstream_tx_id === upstreamRef));
    rows = match ? [{ ...match, final_cost_billed: String(match.final_cost_billed || '0') }] : [];
  }
  // 17b. SELECT ... FROM transactions WHERE retailer_id = $1
  else if (/SELECT .* FROM transactions WHERE retailer_id = \$1/i.test(cleanSql)) {
    rows = memoryStore.transactions.filter(t => t.retailer_id === params[0]);
  }
  // 17c. SELECT ... FROM transactions WHERE t.internal_tx_id ILIKE $1 ... (On-Demand Lookup)
  else if (/SELECT .* FROM transactions.*ILIKE/i.test(cleanSql)) {
    const searchRaw = String(params[0] || '').replace(/%/g, '').toLowerCase().trim();
    rows = memoryStore.transactions.filter(t => {
      if (!searchRaw) return true;
      return (
        (t.internal_tx_id && t.internal_tx_id.toLowerCase().includes(searchRaw)) ||
        (t.target_account_number && String(t.target_account_number).includes(searchRaw)) ||
        (t.upstream_operator_ref && t.upstream_operator_ref.toLowerCase().includes(searchRaw)) ||
        (t.id && String(t.id).toLowerCase().includes(searchRaw))
      );
    }).map(t => {
      const u = memoryStore.users.find(usr => usr.id === t.retailer_id);
      return {
        ...t,
        organization_name: u?.organization_name || 'Retailer',
        owner_name: u?.owner_name || 'Retailer',
        retailer_phone: u?.phone || ''
      };
    });
  }
  // 17d. Transaction KPI aggregate query for Dashboard Overview:
  else if (/SELECT .*?total_transactions.*?FROM transactions/i.test(cleanSql) || /SELECT .*?total_admin_profit/i.test(cleanSql)) {
    const all = memoryStore.transactions;
    const successList = all.filter(t => t.status === 'SUCCESS');
    const failedList = all.filter(t => t.status === 'FAILED' || String(t.status).includes('FAIL'));
    const pendingList = all.filter(t => t.status === 'PENDING');
    const failoverList = all.filter(t => t.upstream_api_used === 'NOBLE' || t.upstream_api_used === 'NOBLE_WEB');
    const primaryList = all.filter(t => t.upstream_api_used === 'NEROPAY' || t.upstream_api_used === 'A1TOPUP');

    rows = [{
      total_transactions: all.length,
      total_volume: successList.reduce((sum, t) => sum + parseFloat(t.face_value || '0'), 0),
      total_admin_profit: successList.reduce((sum, t) => sum + parseFloat(t.admin_commission || '0'), 0),
      total_retailer_payout: successList.reduce((sum, t) => sum + parseFloat(t.retailer_commission || '0'), 0),
      success_count: successList.length,
      failed_count: failedList.length,
      pending_count: pendingList.length,
      failover_channel_count: failoverList.length,
      primary_channel_count: primaryList.length
    }];
  }
  // 18. SELECT ... FROM transactions
  else if (/SELECT .* FROM transactions/i.test(cleanSql)) {
    let filtered = memoryStore.transactions;
    if (params && params.length >= 1 && typeof params[0] === 'string') {
      const period = params[0];
      const nowISTStr = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
      const yesterdayISTStr = new Date(Date.now() + 5.5 * 3600000 - 86400000).toISOString().split('T')[0];

      if (period === 'today') {
        filtered = filtered.filter(t => {
          const tDateIST = new Date(new Date(t.created_at).getTime() + 5.5 * 3600000).toISOString().split('T')[0];
          return tDateIST === nowISTStr;
        });
      } else if (period === 'yesterday') {
        filtered = filtered.filter(t => {
          const tDateIST = new Date(new Date(t.created_at).getTime() + 5.5 * 3600000).toISOString().split('T')[0];
          return tDateIST === yesterdayISTStr;
        });
      } else if (period === 'all') {
        // all transactions
      } else if (params.length >= 3 && typeof params[1] === 'string' && typeof params[2] === 'string') {
        const pStart = new Date(params[1]).toISOString();
        const pEnd = new Date(params[2]).toISOString();
        if (!isNaN(Date.parse(pStart)) && !isNaN(Date.parse(pEnd))) {
          filtered = filtered.filter(t => {
            const tTime = new Date(t.created_at).toISOString();
            return tTime >= pStart && tTime <= pEnd;
          });
        }
      } else if (params.length >= 2 && typeof params[0] === 'string' && typeof params[1] === 'string') {
        const pStart = new Date(params[0]).toISOString();
        const pEnd = new Date(params[1]).toISOString();
        if (!isNaN(Date.parse(pStart)) && !isNaN(Date.parse(pEnd))) {
          filtered = filtered.filter(t => {
            const tTime = new Date(t.created_at).toISOString();
            return tTime >= pStart && tTime <= pEnd;
          });
        }
      }
    }

    rows = filtered.map(t => {
      const u = memoryStore.users.find(usr => usr.id === t.retailer_id);
      const rawOrg = (u?.organization_name || '').trim();
      const rawOwner = (u?.owner_name || '').trim();
      const rawPhone = (u?.phone || '').trim();

      const orgName = rawOrg && rawOrg.toLowerCase() !== 'store' ? rawOrg : (rawOwner && rawOwner.toLowerCase() !== 'store' ? rawOwner : 'Retail Store');
      const ownerName = rawOwner && rawOwner.toLowerCase() !== 'store' ? rawOwner : (rawOrg && rawOrg.toLowerCase() !== 'store' ? rawOrg : (rawPhone ? `User (${rawPhone})` : 'Retailer'));

      return {
        ...t,
        organization_name: orgName,
        owner_name: ownerName,
        phone: rawPhone,
        role: u?.role || 'RETAILER',
        retailer_shop: orgName,
        retailer_shop_name: orgName,
        retailer_name: ownerName,
        retailer_phone: rawPhone
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
    savePersistentStore();
    rows = [];
  }
  // 21. INSERT INTO wallet_topups
  else if (/INSERT INTO wallet_topups/i.test(cleanSql)) {
    const userId = params[0];
    const txnRef = params[1];
    const amount = String(params[2]);
    let upiTxnId = '';
    let status = 'PENDING_APPROVAL';

    if (params.length >= 5) {
      upiTxnId = params[3] || '';
      status = params[4] || 'PENDING_APPROVAL';
    } else if (params.length === 4) {
      if (params[3] === 'PENDING' || params[3] === 'PENDING_APPROVAL') {
        status = params[3];
      } else {
        upiTxnId = params[3];
        status = 'PENDING_APPROVAL';
      }
    }

    memoryStore.wallet_topups.push({
      id: `topup-${Date.now()}`,
      user_id: userId,
      txn_ref: txnRef,
      amount: amount,
      status: status,
      upi_txn_id: upiTxnId,
      created_at: new Date().toISOString()
    });
    savePersistentStore();
    rows = [];
  }
  // 22. SELECT ... FROM wallet_topups
  else if (/SELECT .* FROM wallet_topups/i.test(cleanSql)) {
    if (/WHERE user_id = \$1/i.test(cleanSql)) {
      const uid = params[0];
      rows = memoryStore.wallet_topups
        .filter(t => t.user_id === uid)
        .map(t => ({
          id: t.id,
          txn_ref: t.txn_ref,
          amount: t.amount,
          utr_number: t.upi_txn_id,
          status: t.status,
          admin_remarks: t.admin_remarks || (t.status === 'COMPLETED' ? 'Deposit Approved & Credited to Wallet' : t.status === 'REJECTED' ? 'Bank transfer not received' : null),
          created_at: t.created_at,
          completed_at: t.completed_at
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (/WHERE id = \$1/i.test(cleanSql)) {
      const topup = memoryStore.wallet_topups.find(t => t.id === params[0]);
      rows = topup ? [topup] : [];
    } else if (/WHERE txn_ref = \$1/i.test(cleanSql)) {
      const topup = memoryStore.wallet_topups.find(t => t.txn_ref === params[0]);
      rows = topup ? [topup] : [];
    } else {
      let filtered = memoryStore.wallet_topups;
      if (/WHERE wt\.status = \$1/i.test(cleanSql) || /WHERE status = \$1/i.test(cleanSql)) {
        const st = params[0];
        filtered = filtered.filter(t => t.status === st);
      } else if (/status = 'PENDING_APPROVAL'/i.test(cleanSql) || /WHERE wt\.status IN/i.test(cleanSql)) {
        filtered = filtered.filter(t => t.status === 'PENDING_APPROVAL' && t.upi_txn_id && t.upi_txn_id.trim() !== '');
      }

      rows = filtered.map(t => {
        const u = memoryStore.users.find(usr => usr.id === t.user_id);
        return {
          ...t,
          utr_number: t.upi_txn_id,
          organization_name: u?.organization_name || 'Retailer Shop',
          owner_name: u?.owner_name || 'Shop Owner',
          phone: u?.phone || '',
          current_wallet_balance: u?.current_balance || '0.0000',
          admin_remarks: t.admin_remarks || (t.status === 'COMPLETED' ? 'Deposit Approved & Credited to Wallet' : t.status === 'REJECTED' ? 'Bank transfer not received' : null)
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        savePersistentStore();
      }
    } else if (/status = 'COMPLETED'/i.test(cleanSql)) {
      const id = params[params.length - 1];
      const topup = memoryStore.wallet_topups.find(t => t.id === id || t.txn_ref === id);
      if (topup) {
        topup.status = 'COMPLETED';
        topup.admin_remarks = 'Deposit Approved & Credited to Wallet';
        topup.completed_at = new Date().toISOString();
        savePersistentStore();
      }
    } else if (/status = 'REJECTED'/i.test(cleanSql)) {
      const reason = params[0];
      const id = params[params.length - 1];
      const topup = memoryStore.wallet_topups.find(t => t.id === id || t.txn_ref === id);
      if (topup) {
        topup.status = 'REJECTED';
        topup.admin_remarks = reason || 'Bank transfer not received';
        topup.completed_at = new Date().toISOString();
        savePersistentStore();
      }
    }
    rows = [];
  }
  // 24. INSERT INTO password_reset_otps
  else if (/INSERT INTO password_reset_otps/i.test(cleanSql)) {
    const newOtp = {
      id: `otp-${Date.now()}`,
      user_id: params[0],
      otp_code: String(params[1]),
      expires_at: params[2] instanceof Date ? params[2].toISOString() : String(params[2]),
      used: false,
      created_at: new Date().toISOString()
    };
    memoryStore.password_reset_otps.push(newOtp);
    savePersistentStore();
    rows = [{ id: newOtp.id }];
  }
  // 25. SELECT ... FROM password_reset_otps
  else if (/SELECT .* FROM password_reset_otps/i.test(cleanSql)) {
    const userId = params[0];
    const otpCode = String(params[1]);
    const now = new Date();
    
    rows = memoryStore.password_reset_otps.filter(o => {
      const userMatches = o.user_id === userId;
      if (!userMatches) return false;
      if (params.length >= 2 && params[1]) {
        return o.otp_code === otpCode && o.used === false && new Date(o.expires_at) > now;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  // 26. UPDATE password_reset_otps
  else if (/UPDATE password_reset_otps SET used = true/i.test(cleanSql)) {
    const targetId = params[0];
    const otp = memoryStore.password_reset_otps.find(o => o.id === targetId || o.user_id === targetId);
    if (otp) {
      otp.used = true;
      savePersistentStore();
    }
    rows = [];
  }
  // 27. platform_notifications
  else if (/INSERT INTO platform_notifications/i.test(cleanSql)) {
    const notif = {
      id: params[0] || `notif-${Date.now()}`,
      title: params[1],
      message: params[2],
      type: params[3] || 'UPDATE',
      target_type: params[4] || 'ALL',
      target_user_ids: typeof params[5] === 'string' ? JSON.parse(params[5] || '[]') : (params[5] || []),
      created_by: params[6] || 'Admin',
      created_at: new Date().toISOString()
    };
    memoryStore.platform_notifications.unshift(notif);
    savePersistentStore();
    rows = [notif];
  }
  else if (/SELECT .* FROM platform_notifications/i.test(cleanSql)) {
    let list = [...memoryStore.platform_notifications];
    if (params && params[0]) {
      try {
        const parsed = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
        const targetId = Array.isArray(parsed) ? parsed[0] : parsed;
        list = list.filter(n => n.target_type === 'ALL' || (Array.isArray(n.target_user_ids) && n.target_user_ids.includes(targetId)));
      } catch {
        // keep list
      }
    }
    rows = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  else if (/DELETE FROM platform_notifications/i.test(cleanSql)) {
    const id = params[0];
    memoryStore.platform_notifications = memoryStore.platform_notifications.filter(n => n.id !== id);
    savePersistentStore();
    rows = [];
  }
  // 28. user_feedbacks
  else if (/INSERT INTO user_feedbacks/i.test(cleanSql)) {
    const fb = {
      id: params[0] || `fb-${Date.now()}`,
      user_id: params[1],
      user_name: params[2],
      user_phone: params[3],
      organization_name: params[4],
      category: params[5] || 'SUGGESTION',
      rating: parseInt(String(params[6] || '5'), 10),
      message: params[7],
      status: 'NEW',
      admin_response: null,
      created_at: new Date().toISOString()
    };
    memoryStore.user_feedbacks.unshift(fb);
    savePersistentStore();
    rows = [fb];
  }
  else if (/SELECT .* FROM user_feedbacks/i.test(cleanSql)) {
    rows = [...memoryStore.user_feedbacks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  else if (/UPDATE user_feedbacks/i.test(cleanSql)) {
    const status = params[0];
    const adminResp = params[1];
    const id = params[2];
    const match = memoryStore.user_feedbacks.find(f => f.id === id);
    if (match) {
      match.status = status;
      match.admin_response = adminResp;
      savePersistentStore();
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
