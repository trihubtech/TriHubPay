export interface UpstreamRequestPayload {
  internalTxId: string;
  serviceType: 'MOBILE' | 'DTH' | 'ELECTRICITY';
  operatorCode: string;
  targetAccountNumber: string;
  circleCode?: string;
  faceValue: number;
}

export interface UpstreamExecutionResult {
  success: boolean;
  provider: 'A1TOPUP' | 'NOBLE_WEB';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  upstreamOperatorRef: string;
  message: string;
  latencyMs: number;
  rawResponse: any;
  didFailover: boolean;
  failoverReason?: string;
}

export interface UpstreamBillFetchResult {
  success: boolean;
  provider: 'A1TOPUP' | 'NOBLE_WEB' | 'SANDBOX';
  consumerNumber: string;
  consumerName: string;
  operatorCode: string;
  boardName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  billAmount: number;
  status: 'UNPAID' | 'PAID';
  rawResponse?: any;
  isSandbox: boolean;
  message?: string;
}

export interface UpstreamPlanItem {
  amount: number;
  validity: string;
  data: string;
  description: string;
  category: string;
  tag?: string;
}
