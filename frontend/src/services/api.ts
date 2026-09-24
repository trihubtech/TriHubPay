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
  ElectricityBillDetails,
  DepositRequest,
  RetailerCommissionRate,
  RetailerInsights,
  InsightsPeriod,
  AdminReportsData
} from '../types';

const API_BASE = '/api';

export const TRIHUB_SUPPORT = {
  phone: '+91 63745 69225',
  email: 'trihubtechnologies@gmail.com',
  company: 'TriHub Technologies',
  brand: 'TriHubPay',
  domain: 'pay.trihubtechnologies.com',
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

  // Clean custom message from backend if already human-readable
  if (msg && !msg.startsWith('HTTP') && !msg.includes('SyntaxError') && !msg.includes('<!DOCTYPE')) {
    return msg;
  }

  // Server error 500/502/503/504 fallback
  if (status && status >= 500) {
    return `The TriHubPay platform is momentarily busy processing live bank orders. Please try again shortly or contact TriHubPay Support (${TRIHUB_SUPPORT.phone}).`;
  }

  return `We encountered an issue processing your request. Please try again or reach TriHubPay Support (${TRIHUB_SUPPORT.phone} / ${TRIHUB_SUPPORT.email}).`;
}

export function getActiveAuthToken(): string | null {
  const isAdminRoute = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin');
  
  if (isAdminRoute) {
    // Strictly isolate admin token. NEVER fall back to retailer token!
    return localStorage.getItem('trihub_admin_token');
  }
  return localStorage.getItem('trihub_retailer_token') || localStorage.getItem('trihub_token');
}

function getAuthHeader(): Record<string, string> {
  const token = getActiveAuthToken();
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
      if (res.status === 403 && (data?.code === 'ACCOUNT_DEACTIVATED' || String(data?.message || '').toLowerCase().includes('deactivated'))) {
        localStorage.removeItem('trihub_retailer_token');
        localStorage.removeItem('trihub_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('trihub_force_logout', {
            detail: { message: data?.message || 'Your account has been deactivated. Please contact administrator.' }
          }));
        }
      }
      const humanMsg = humanizeErrorMessage(data?.message || data?.error || `HTTP ${res.status}`, res.status);
      const apiErr: any = new Error(humanMsg);
      if (data?.details) apiErr.details = data.details;
      throw apiErr;
    }
    return data;
  } catch (err: any) {
    const humanMsg = humanizeErrorMessage(err);
    console.warn(`[API NOTICE ${endpoint}]:`, humanMsg);
    const rethrowErr: any = new Error(humanMsg);
    if (err.details) rethrowErr.details = err.details;
    throw rethrowErr;
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

  async updateProfile(payload: {
    organization_name: string;
    owner_name: string;
    phone: string;
    email: string;
  }) {
    return request<{ success: boolean; message: string; data: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  async sendMobileOtp(data: { phone: string; email?: string; purpose?: string }) {
    return request<{ success: boolean; message: string; phone: string; demo_otp?: string }>('/auth/send-mobile-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async verifyMobileOtp(data: { phone: string; otp: string }) {
    return request<{ success: boolean; message: string }>('/auth/verify-mobile-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async sendForgotPasswordOtp(identifier: string) {
    return request<{ success: boolean; message: string; masked_email: string; phone?: string }>('/auth/forgot-password/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  async resetPasswordWithOtp(data: { identifier: string; otp: string; new_password: string }) {
    return request<{ success: boolean; message: string }>('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Directory
  async getOperators(serviceType?: string) {
    const q = serviceType ? `?service_type=${serviceType}` : '';
    return request<{ success: boolean; data: Operator[] }>(`/operators${q}`);
  },

  async getPlans(operatorCode: string) {
    return request<{ success: boolean; plans: Plan[] }>(`/operators/${operatorCode}/plans`);
  },

  async fetchElectricityBill(operatorCode: string, consumerNumber: string, p2?: string, p3?: string) {
    return request<{ success: boolean; data: ElectricityBillDetails }>('/bill/fetch', {
      method: 'POST',
      body: JSON.stringify({ operator_code: operatorCode, consumer_number: consumerNumber, p2, p3 })
    });
  },

  // Retailer Actions
  async getBalance() {
    return request<{ success: boolean; data: { current_balance: number; locked_balance: number; organization_name: string; owner_name: string } }>('/wallet/balance');
  },

  async getCommissionPreview(operatorCode: string, faceValue: number) {
    return request<{ success: boolean; data: CommissionPreview }>(`/recharge/preview?operator_code=${operatorCode}&face_value=${faceValue}`);
  },

  async getMyCommissions() {
    return request<{ success: boolean; data: RetailerCommissionRate[] }>('/recharge/my-commissions');
  },

  async getMyInsights(period: InsightsPeriod = 'today') {
    return request<{ success: boolean; data: RetailerInsights }>(`/recharge/my-insights?period=${period}`);
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
      details?: string;
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

  async submitUpiDeposit(txn_ref: string, utr_number: string, amount?: number) {
    return request<{ success: boolean; message: string }>('/wallet/topup/submit', {
      method: 'POST',
      body: JSON.stringify({ txn_ref, utr_number, amount })
    });
  },

  async getMyDeposits() {
    return request<{ success: boolean; data: DepositRequest[] }>('/wallet/deposits');
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

  async checkRetailerTransactionStatus(id: string) {
    return request<{ success: boolean; status: string; message: string; upstream_ref?: string; refunded: boolean }>(`/recharge/transactions/${id}/check-status`, {
      method: 'POST'
    });
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

  async adjustUserBalance(userId: string, amount: number, actionType: 'CREDIT' | 'DEBIT' | 'SET', reason: string) {
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

  async resetAllRetailerBalances() {
    return request<{ success: boolean; message: string }>('/admin/users/reset-all-balances', {
      method: 'POST'
    });
  },

  async resetSingleRetailerBalance(userId: string) {
    return request<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-balance`, {
      method: 'POST'
    });
  },

  async getUserLedger(userId: string) {
    return request<{ success: boolean; data: LedgerEntry[] }>(`/admin/users/${userId}/ledger`);
  },

  async adminUpdateUserProfile(userId: string, payload: {
    organization_name: string;
    owner_name: string;
    phone: string;
    email: string;
  }) {
    return request<{ success: boolean; message: string; data: User }>(`/admin/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getCommissionMatrix() {
    return request<{ success: boolean; data: CommissionMatrixItem[] }>('/admin/commission-matrix');
  },

  async updateCommissionMatrix(operatorCode: string, masterRate: number, retailerRate: number, isActive?: boolean) {
    return request<{ success: boolean; message: string }>('/admin/commission-matrix/update', {
      method: 'POST',
      body: JSON.stringify({
        operator_code: operatorCode,
        neropay_master_rate: masterRate,
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

  async getPendingDeposits(status?: string) {
    const q = status ? `?status=${status}` : '';
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        user_id: string;
        txn_ref: string;
        amount: string | number;
        utr_number: string;
        status: string;
        admin_remarks?: string;
        created_at: string;
        completed_at?: string;
        organization_name: string;
        owner_name: string;
        phone: string;
        current_wallet_balance: string | number;
      }>;
    }>(`/admin/deposits/pending${q}`);
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
  },

  async checkTransactionStatus(id: string) {
    return request<{
      success: boolean;
      status: 'SUCCESS' | 'PENDING' | 'FAILED';
      message: string;
      upstream_ref?: string;
      refunded?: boolean;
      data?: any;
    }>(`/admin/transactions/${id}/check-status`, {
      method: 'POST'
    });
  },

  async getAdminReports(period: string = 'today') {
    return request<{
      success: boolean;
      data: AdminReportsData;
    }>(`/admin/reports?period=${period}`);
  },

  // Retailer Reports & Insights
  async getRetailerReports(period: string = 'today') {
    return request<{
      success: boolean;
      data: {
        period: string;
        total_commission: number;
        total_sales_volume: number;
        total_transactions: number;
        successful_transactions: number;
        failed_transactions: number;
        pending_transactions: number;
        success_rate: number;
        average_commission_rate: number;
        top_operator?: { operator_code: string; earnings: number; volume: number };
        earnings_by_service: Record<string, number>;
        operator_breakdown: Array<{ operator_code: string; count: number; volume: number; commission: number }>;
      };
    }>(`/recharge/reports?period=${period}`);
  },

  // Retailer Notifications
  async getRetailerNotifications() {
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        title: string;
        message: string;
        type: 'OFFER' | 'UPDATE' | 'FEATURE' | 'ALERT';
        target_type: string;
        created_by: string;
        created_at: string;
      }>;
    }>('/recharge/notifications');
  },

  // Retailer Feedback
  async submitFeedback(data: { category: string; rating: number; message: string; contact_phone?: string }) {
    return request<{ success: boolean; message: string; data: { id: string } }>('/recharge/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Admin Notifications Management
  async getAdminNotifications() {
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        title: string;
        message: string;
        type: 'OFFER' | 'UPDATE' | 'FEATURE' | 'ALERT';
        target_type: 'ALL' | 'SELECTED';
        target_user_ids: string[];
        created_by: string;
        created_at: string;
      }>;
    }>('/admin/notifications');
  },

  async createAdminNotification(data: {
    title: string;
    message: string;
    type: string;
    target_type: string;
    target_user_ids?: string[];
  }) {
    return request<{ success: boolean; message: string; data: any }>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminNotification(id: string) {
    return request<{ success: boolean; message: string }>(`/admin/notifications/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Feedback Management
  async getAdminFeedbacks() {
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        user_id: string;
        user_name: string;
        user_phone: string;
        organization_name: string;
        category: string;
        rating: number;
        message: string;
        status: 'NEW' | 'REVIEWED' | 'RESOLVED';
        admin_response?: string;
        created_at: string;
        updated_at: string;
      }>;
    }>('/admin/feedbacks');
  },

  async updateFeedbackStatus(id: string, status: string, admin_response?: string) {
    return request<{ success: boolean; message: string }>(`/admin/feedbacks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_response })
    });
  },

  // On-Demand Transaction Status Lookup (Admin & User)
  async searchTransactionsLive(q: string, isUserMode: boolean = false) {
    const endpoint = isUserMode ? `/recharge/transactions/lookup` : `/admin/transactions/lookup`;
    return request<{
      success: boolean;
      data: any[];
    }>(`${endpoint}?q=${encodeURIComponent(q)}`);
  }
};
