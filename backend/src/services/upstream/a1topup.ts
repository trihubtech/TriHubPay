import { config } from '../../config';
import { UpstreamRequestPayload, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

// Standard A1Topup Provider Operator Code Dictionary
const A1_OPERATOR_CODES: Record<string, string> = {
  'JIO': 'JIO',
  'AIRTEL': 'AT',
  'VI': 'VI',
  'BSNL': 'BSNL',
  'TATAPLAY': 'TS',
  'AIRTEL_DTH': 'AD',
  'DISHTV': 'DT',
  'SUNDIRECT': 'SD',
  'VIDEOCON': 'VD',
  'TNEB': 'TNEB',
  'BESCOM': 'BESCOM',
  'MSEB': 'MSEB',
  'WBSEDCL': 'WBSEDCL'
};

export class A1TopupClient {
  private apiUrl: string;
  private token: string;
  private distributorId: string;
  private timeoutMs: number;
  private isSandbox: boolean;

  constructor() {
    this.apiUrl = config.a1Topup.apiUrl;
    this.token = config.a1Topup.token;
    this.distributorId = config.a1Topup.distributorId;
    this.timeoutMs = config.a1Topup.timeoutMs; // Strict 8-second timeout
    this.isSandbox = config.a1Topup.isSandbox;
  }

  /**
   * Execute recharge via A1Topup Upstream API
   */
  async executeRecharge(payload: UpstreamRequestPayload): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
  }> {
    const startTime = Date.now();

    // 1. High-Fidelity Sandbox Simulator (Used when live API keys are not supplied yet)
    if (this.isSandbox) {
      return this.executeSandboxSimulation(payload);
    }

    // 2. Production API Call with strict 8-second AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const upstreamOp = A1_OPERATOR_CODES[payload.operatorCode] || payload.operatorCode;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'X-Distributor-Id': this.distributorId
        },
        body: JSON.stringify({
          client_ref_id: payload.internalTxId,
          operator: upstreamOp,
          account_number: payload.targetAccountNumber,
          amount: payload.faceValue,
          circle: payload.circleCode || 'ALL_INDIA'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`A1Topup HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;

      // Standard A1Topup response code mapping
      if (data.status === 'SUCCESS' || data.code === '00' || data.status_code === 200) {
        return {
          status: 'SUCCESS',
          upstreamRef: data.operator_ref || data.txn_id || `A1_${Date.now()}`,
          message: data.message || 'Recharge successful on primary A1Topup',
          rawResponse: data
        };
      } else if (data.status === 'PENDING' || data.code === '01') {
        return {
          status: 'PENDING',
          upstreamRef: data.operator_ref || data.txn_id || `A1_P_${Date.now()}`,
          message: 'Recharge queued in upstream processing',
          rawResponse: data
        };
      } else {
        throw new Error(`A1Topup System Reject Code: ${data.code || data.status} - ${data.message || 'Failed'}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error(`A1Topup primary timeout exceeded (${this.timeoutMs}ms limit)`);
      }
      throw err;
    }
  }

  /**
   * Sandbox simulation reproducing real-world conditions (timeouts, successes, failures)
   */
  private async executeSandboxSimulation(payload: UpstreamRequestPayload): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
  }> {
    // Special test triggers for developers and QA:
    // If target number ends in '9999', simulate an 8-second timeout to test automated failover
    if (payload.targetAccountNumber.endsWith('9999')) {
      console.log('[A1TOPUP SANDBOX] Simulating 8-second latency timeout for failover testing...');
      await new Promise(resolve => setTimeout(resolve, 8100));
      throw new Error(`A1Topup primary timeout exceeded (${this.timeoutMs}ms limit)`);
    }

    // If target number ends in '0000', simulate a telecom provider reject code
    if (payload.targetAccountNumber.endsWith('0000')) {
      console.log('[A1TOPUP SANDBOX] Simulating upstream reject code (OPERATOR_DOWN)...');
      await new Promise(resolve => setTimeout(resolve, 600));
      throw new Error('A1Topup System Reject Code: 53 - Operator Node Down for Scheduled Maintenance');
    }

    // Normal realistic flow: simulate ~600-1200ms telecom latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const simulatedOperatorRef = `BRN${Math.floor(100000000 + Math.random() * 900000000)}`;

    return {
      status: 'SUCCESS',
      upstreamRef: simulatedOperatorRef,
      message: 'Transaction successfully processed by A1Topup Gateway (Sandbox Mode)',
      rawResponse: {
        status: 'SUCCESS',
        code: '00',
        operator_ref: simulatedOperatorRef,
        amount: payload.faceValue,
        account: payload.targetAccountNumber,
        provider: 'A1Topup Primary Gateway',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Fetch Electricity / BBPS Bill details from A1Topup Live Gateway
   */
  async fetchBill(operatorCode: string, consumerNumber: string): Promise<UpstreamBillFetchResult | null> {
    if (this.isSandbox) {
      return null;
    }

    const upstreamOp = A1_OPERATOR_CODES[operatorCode] || operatorCode;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(config.a1Topup.billFetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'X-Distributor-Id': this.distributorId
        },
        body: JSON.stringify({
          operator: upstreamOp,
          account_number: consumerNumber
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`A1Topup Bill Fetch HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      if (data.status === 'SUCCESS' || data.status_code === 200 || data.code === '00') {
        return {
          success: true,
          provider: 'A1TOPUP',
          consumerNumber,
          consumerName: data.customer_name || data.name || data.consumer_name || 'CONSUMER ' + consumerNumber,
          operatorCode,
          boardName: data.operator_name || operatorCode,
          billNumber: data.bill_number || data.bill_no || `EB-${operatorCode}-${consumerNumber.slice(-6)}`,
          billDate: data.bill_date || new Date().toISOString().split('T')[0],
          dueDate: data.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          billAmount: Number(data.bill_amount || data.amount || 0),
          status: 'UNPAID',
          rawResponse: data,
          isSandbox: false
        };
      }
      return null;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[A1TOPUP BILL FETCH] Failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch Live Plans from A1Topup Plans API
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL'): Promise<UpstreamPlanItem[] | null> {
    if (this.isSandbox) {
      return null;
    }

    const upstreamOp = A1_OPERATOR_CODES[operatorCode] || operatorCode;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `${config.a1Topup.plansUrl}?operator=${encodeURIComponent(upstreamOp)}&circle=${encodeURIComponent(circle)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Distributor-Id': this.distributorId
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const data = await response.json() as any;
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        return data.plans.map((p: any) => ({
          amount: Number(p.amount || p.rs),
          validity: p.validity || '28 Days',
          data: p.data || p.desc || 'N/A',
          description: p.description || p.detail || p.desc || '',
          category: p.category || 'Popular',
          tag: p.tag
        }));
      }
      return null;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[A1TOPUP PLANS] Failed: ${err.message}`);
      return null;
    }
  }
}
