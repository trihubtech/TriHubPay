import {
  User,
  Operator,
  Plan,
  CommissionPreview,
  Transaction,
  LedgerEntry,
  DashboardKPIs,
  CommissionMatrixItem,
  ShopCustomCommission,
  ElectricityBillDetails
} from '../types';

const API_BASE = '/api';

export const TRIHUB_SUPPORT = {
  phone: '+91 98765 43210',
  email: 'support@trihubpay.in',
  hours: '24/7 Priority Support'
};

export function humanizeErrorMessage(rawError: any, status?: number): string {
  const msg = typeof rawError === 'string' ? rawError : (rawError?.message || '');
  const lower = msg.toLowerCase();

  // Role or credential mismatch errors
  if (
    lower.includes('access denied') ||
    lower.includes('invalid phone/email or password') ||
    lower.includes('invalid credentials')
  ) {
    return `Invalid mobile number, email, or password. Please verify your credentials or contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  // Network / Connection / JSON syntax issues
  if (
    lower.includes('unexpected end of json') ||
    lower.includes('failed to execute') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('econnrefused') ||
    lower.includes('syntaxerror')
  ) {
    return `Unable to connect to the TriHubPay network. Please check your internet connection or contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  // Authentication & credentials
  if (lower.includes('invalid credentials') || lower.includes('invalid phone') || lower.includes('invalid password') || status === 401) {
    return `Incorrect Mobile Number, Email, or Password. If you need help accessing your account, please contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  // Deactivated / inactive account
  if (lower.includes('deactivated') || lower.includes('inactive') || lower.includes('suspended') || status === 403) {
    return `Your account is currently inactive. Please contact TriHubPay Support (${TRIHUB_SUPPORT.phone}) to activate your account.`;
  }

  // User not found
  if (lower.includes('user not found') || (lower.includes('not found') && lower.includes('user'))) {
    return `No account found with these details. Please register or contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  // Insufficient balance
  if (lower.includes('insufficient') && lower.includes('balance')) {
    return `Insufficient wallet cash. Please add cash via UPI QR or contact TriHubPay Support.`;
  }

  // Server error 500/502/503/504
  if (status && status >= 500) {
    return `The TriHubPay platform is momentarily busy processing live bank orders. Please try again shortly or contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  // Clean custom message from backend if already human-readable
  if (msg && !msg.startsWith('HTTP') && !msg.includes('{') && !msg.includes('JSON')) {
    return msg;
  }

  return `We encountered an issue processing your request. Please try again or reach TriHubPay Support (${TRIHUB_SUPPORT.phone} / ${TRIHUB_SUPPORT.email}).`;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('trihub_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      const humanMsg = humanizeErrorMessage(data?.message || data?.error || `HTTP ${res.status}`, res.status);
      throw new Error(humanMsg);
    }
    return data;
  } catch (err: any) {
    const humanMsg = humanizeErrorMessage(err);
    console.warn(`[API NOTICE ${endpoint}]:`, humanMsg);
    throw new Error(humanMsg);
  }
}


export const api = {
  // Auth
  async login(identifier: string, password: string) {
    return request<{ success: boolean; data: { token: string; user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  },

  async register(data: any) {
    return request<{ success: boolean; message: string; data: { token: string; user: User } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMe() {
    return request<{ success: boolean; data: User }>('/auth/me');
  },

  // Directory
  async getOperators(serviceType?: string) {
    const q = serviceType ? `?service_type=${serviceType}` : '';
    return request<{ success: boolean; data: Operator[] }>(`/operators${q}`);
  },

  async getPlans(operatorCode: string) {
    return request<{ success: boolean; plans: Plan[] }>(`/operators/${operatorCode}/plans`);
  },

  async fetchElectricityBill(operatorCode: string, consumerNumber: string) {
    return request<{ success: boolean; data: ElectricityBillDetails }>('/bill/fetch', {
      method: 'POST',
      body: JSON.stringify({ operator_code: operatorCode, consumer_number: consumerNumber })
    });
  },

  // Retailer Actions
  async getBalance() {
    return request<{ success: boolean; data: { current_balance: number; locked_balance: number; organization_name: string; owner_name: string } }>('/wallet/balance');
  },

  async getCommissionPreview(operatorCode: string, faceValue: number) {
    return request<{ success: boolean; data: CommissionPreview }>(`/recharge/preview?operator_code=${operatorCode}&face_value=${faceValue}`);
  },

  async executeRecharge(payload: {
    operator_code: string;
    service_type: string;
    target_account_number: string;
    face_value: number;
    circle_code?: string;
  }) {
    return request<{
      success: boolean;
      message: string;
      data: {
        transaction_id: string;
        status: string;
        operator_name: string;
        target_account: string;
        face_value: number;
        retailer_commission_earned: number;
        final_cost_debited: number;
        upstream_api_used: string;
        upstream_operator_ref: string;
        remaining_wallet_balance: number;
        did_failover: boolean;
        timestamp: string;
      }
    }>('/recharge/execute', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async generateUpiTopup(amount: number) {
    return request<{
      success: boolean;
      data: {
        txn_ref: string;
        amount: number;
        upi_vpa: string;
        merchant_name: string;
        upi_string: string;
        qr_code_data_url: string;
        expires_in_minutes: number;
      }
    }>('/wallet/topup/upi', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  },

  async submitUpiDeposit(txn_ref: string, utr_number: string) {
    return request<{ success: boolean; message: string }>('/wallet/topup/submit', {
      method: 'POST',
      body: JSON.stringify({ txn_ref, utr_number })
    });
  },

  async confirmUpiTopup(txn_ref: string, upi_txn_id?: string) {
    return request<{ success: boolean; message: string; data: { txn_ref: string; new_balance: number } }>('/wallet/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({ txn_ref, upi_txn_id })
    });
  },

  async getRetailerTransactions() {
    return request<{ success: boolean; data: Transaction[] }>('/recharge/transactions');
  },

  async getRetailerLedger() {
    return request<{ success: boolean; data: LedgerEntry[] }>('/wallet/ledger');
  },

  // Admin Actions
  async getDashboardKPIs() {
    return request<{ success: boolean; data: DashboardKPIs }>('/admin/dashboard');
  },

  async getAllUsers() {
    return request<{ success: boolean; data: User[] }>('/admin/users');
  },

  async adjustUserBalance(userId: string, amount: number, actionType: 'CREDIT' | 'DEBIT', reason: string) {
    return request<{ success: boolean; message: string; data: { user_id: string; new_balance: number } }>('/admin/users/balance', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount, action_type: actionType, reason })
    });
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    return request<{ success: boolean; message: string }>('/admin/users/status', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, is_active: isActive })
    });
  },

  async resetUserPassword(userId: string, newPassword: string) {
    return request<{ success: boolean; message: string; data: { shop_name: string; phone: string; email: string } }>('/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, new_password: newPassword })
    });
  },

  async getUserLedger(userId: string) {
    return request<{ success: boolean; data: LedgerEntry[] }>(`/admin/users/${userId}/ledger`);
  },

  async getCommissionMatrix() {
    return request<{ success: boolean; data: CommissionMatrixItem[] }>('/admin/commission-matrix');
  },

  async updateCommissionMatrix(operatorCode: string, masterRate: number, retailerRate: number, isActive?: boolean) {
    return request<{ success: boolean; message: string }>('/admin/commission-matrix/update', {
      method: 'POST',
      body: JSON.stringify({
        operator_code: operatorCode,
        master_api_rate: masterRate,
        retailer_pass_down_rate: retailerRate,
        is_active: isActive
      })
    });
  },

  async getShopCustomCommissions(userId: string) {
    return request<{ success: boolean; data: ShopCustomCommission[] }>(`/admin/users/${userId}/commissions`);
  },

  async setShopCustomCommission(userId: string, operatorCode: string, customRate: number) {
    return request<{ success: boolean; message: string }>('/admin/users/custom-commission', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, operator_code: operatorCode, custom_pass_down_rate: customRate })
    });
  },

  async deleteShopCustomCommission(userId: string, operatorCode: string) {
    return request<{ success: boolean; message: string }>('/admin/users/custom-commission/delete', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, operator_code: operatorCode })
    });
  },

  async getFailoverSettings() {
    return request<{ success: boolean; data: { mode: 'AUTO' | 'FORCE_A1TOPUP' | 'FORCE_NOBLE_WEB'; timeout_ms: number } }>('/admin/failover');
  },

  async updateFailoverSettings(mode: string, timeoutMs: number = 8000) {
    return request<{ success: boolean; message: string; data: any }>('/admin/failover', {
      method: 'POST',
      body: JSON.stringify({ mode, timeout_ms: timeoutMs })
    });
  },

  async getAllTransactions() {
    return request<{ success: boolean; data: Transaction[] }>('/admin/transactions');
  },

  async getPendingDeposits() {
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        user_id: string;
        txn_ref: string;
        amount: string;
        utr_number: string;
        status: string;
        created_at: string;
        organization_name: string;
        owner_name: string;
        phone: string;
        current_wallet_balance: string;
      }>;
    }>('/admin/deposits/pending');
  },

  async approveDeposit(id: string) {
    return request<{ success: boolean; message: string; data: { new_balance: number; amount: number } }>(`/admin/deposits/${id}/approve`, {
      method: 'POST'
    });
  },

  async rejectDeposit(id: string, reason?: string) {
    return request<{ success: boolean; message: string }>(`/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
};
