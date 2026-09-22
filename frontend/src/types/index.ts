export type Role = 'ADMIN' | 'DISTRIBUTOR' | 'RETAILER';
export type ServiceType = 'MOBILE' | 'DTH' | 'ELECTRICITY';
export type TxStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type UpstreamProvider = 'A1TOPUP' | 'NOBLE_WEB' | 'MANUAL' | 'NONE';

export interface User {
  id: string;
  organization_name: string;
  owner_name: string;
  phone: string;
  email: string;
  role: Role;
  current_balance: number;
  locked_balance?: number;
  api_key?: string;
  is_active: boolean;
  total_recharges?: number;
  total_recharged_volume?: number;
}

export interface Operator {
  operator_code: string;
  operator_name: string;
  service_type: ServiceType;
  retailer_pass_down_rate?: number;
  master_api_rate?: number;
  is_active: boolean;
}

export interface Plan {
  amount: number;
  validity: string;
  data: string;
  description: string;
  category?: string;
  tag?: string;
}

export interface ElectricityBillDetails {
  consumer_number: string;
  consumer_name: string;
  operator_code: string;
  board_name: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  bill_amount: number;
  status: string;
}

export interface CommissionPreview {
  operator_code: string;
  operator_name: string;
  face_value: number;
  retailer_rate_percent: number;
  retailer_commission: number;
  final_cost_billed: number;
  is_shop_customized: boolean;
}

export interface Transaction {
  id: string;
  internal_tx_id: string;
  service_type: ServiceType;
  operator_code: string;
  target_account_number: string;
  face_value: number;
  retailer_commission: number;
  admin_commission?: number;
  final_cost_billed: number;
  upstream_api_used: string;
  upstream_operator_ref?: string;
  status: TxStatus;
  failure_reason?: string;
  created_at: string;
  retailer_shop_name?: string;
  retailer_phone?: string;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  transaction_type: 'CREDIT' | 'DEBIT';
  balance_before: number;
  balance_after: number;
  reference_id: string;
  description: string;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  txn_ref: string;
  amount: number | string;
  utr_number?: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED';
  admin_remarks?: string;
  created_at: string;
  completed_at?: string;
}

export interface DashboardKPIs {
  network_volume: number;
  net_admin_profit: number;
  effective_admin_margin_percent: number;
  total_retailer_payout: number;
  total_transactions: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  success_rate_percent: number;
  primary_a1_count: number;
  failover_noble_count: number;
  total_retailers: number;
  active_retailers: number;
  retailer_float_liability: number;
  master_wallet: {
    balance: number;
    threshold: number;
    is_low_balance: boolean;
  };
  failover_mode: 'AUTO' | 'FORCE_A1TOPUP' | 'FORCE_NOBLE_WEB';
}

export interface CommissionMatrixItem {
  id: number;
  operator_code: string;
  operator_name: string;
  service_type: ServiceType;
  neropay_master_rate?: number;
  noble_master_rate?: number;
  master_api_rate?: number;
  retailer_pass_down_rate: number;
  admin_net_margin: number;
  is_noble_active?: boolean;
  is_active: boolean;
}

export interface ShopCustomCommission {
  id: number;
  user_id: string;
  operator_code: string;
  custom_pass_down_rate: number;
  operator_name: string;
  service_type: ServiceType;
  master_api_rate: number;
  default_rate: number;
}

export interface RetailerCommissionRate {
  operator_code: string;
  operator_name: string;
  service_type: ServiceType;
  commission_rate: number;
  is_custom: boolean;
  earnings_per_100: number;
  earnings_per_1000: number;
}

export type InsightsPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all';

export interface RetailerInsights {
  period: InsightsPeriod;
  total_commission: number;
  total_sales_volume: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  pending_transactions: number;
  success_rate: number;
  average_commission_rate: number;
  top_operator: {
    operator_code: string;
    earnings: number;
    volume: number;
  } | null;
  earnings_by_service: {
    MOBILE: number;
    DTH: number;
    ELECTRICITY: number;
  };
}

