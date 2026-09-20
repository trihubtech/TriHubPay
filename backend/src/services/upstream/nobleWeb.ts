import { config } from '../../config';
import { UpstreamRequestPayload, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

// Noble Web Studio / E2E Networks Provider Operator Code Dictionary
const NOBLE_OPERATOR_CODES: Record<string, string> = {
  'JIO': 'JIO',
  'AIRTEL': 'AIRTEL',
  'VI': 'VI',
  'BSNL': 'BSNL',
  'TATAPLAY': 'TATA_SKY',
  'AIRTEL_DTH': 'AIRTEL_DTH',
  'DISHTV': 'DISH_TV',
  'SUNDIRECT': 'SUN_DIRECT',
  'VIDEOCON': 'VIDEOCON',
  'TNEB': 'TNEB',
  'BESCOM': 'BESCOM',
  'MSEB': 'MSEB',
  'WBSEDCL': 'WBSEDCL'
};

export class NobleWebClient {
  private apiUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private isSandbox: boolean;

  constructor() {
    this.apiUrl = config.nobleWeb.apiUrl;
    this.apiKey = config.nobleWeb.apiKey;
    this.timeoutMs = config.nobleWeb.timeoutMs;
    this.isSandbox = config.nobleWeb.isSandbox;
  }

  /**
   * Execute recharge via Noble Web Studio / E2E Networks Fast REST Endpoint
   */
  async executeRecharge(payload: UpstreamRequestPayload): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
  }> {
    // 1. High-Fidelity Sandbox Simulator
    if (this.isSandbox) {
      return this.executeSandboxSimulation(payload);
    }

    // 2. Production REST JSON call with sub-400ms target
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const upstreamOp = NOBLE_OPERATOR_CODES[payload.operatorCode] || payload.operatorCode;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: payload.internalTxId,
          operator_code: upstreamOp,
          service_number: payload.targetAccountNumber,
          recharge_amount: payload.faceValue,
          circle: payload.circleCode || 'ALL'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Noble Web HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json() as any;

      if (json.status === 'SUCCESS' || json.code === 200 || json.result === 'success') {
        return {
          status: 'SUCCESS',
          upstreamRef: json.operator_id || json.rrn || `NW_${Date.now()}`,
          message: json.message || 'Processed through Noble Web Studio failover channel',
          rawResponse: json
        };
      } else if (json.status === 'PENDING') {
        return {
          status: 'PENDING',
          upstreamRef: json.operator_id || `NW_P_${Date.now()}`,
          message: 'Processing through Noble Web failover',
          rawResponse: json
        };
      } else {
        throw new Error(`Noble Web API Reject: ${json.error || json.message || 'Transaction rejected'}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Noble Web request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  private async executeSandboxSimulation(payload: UpstreamRequestPayload): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
  }> {
    // If target number ends with '6666', simulate Noble also failing (to test dual failure rollback)
    if (payload.targetAccountNumber.endsWith('6666')) {
      console.log('[NOBLE WEB SANDBOX] Simulating secondary failover rejection to test atomic rollback...');
      await new Promise(resolve => setTimeout(resolve, 300));
      throw new Error('Noble Web API Reject: Upstream circle gateway congestion (Simulated)');
    }

    // Noble Web is tuned for sub-400ms speed
    await new Promise(resolve => setTimeout(resolve, 250));

    const simulatedRef = `E2E${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return {
      status: 'SUCCESS',
      upstreamRef: simulatedRef,
      message: 'Transaction successfully processed by Noble Web Studio Fallback Gateway (Sandbox Mode)',
      rawResponse: {
        status: 'SUCCESS',
        result: 'success',
        operator_id: simulatedRef,
        amount: payload.faceValue,
        account: payload.targetAccountNumber,
        latency_ms: 248,
        provider: 'Noble Web Studio / E2E REST Channel',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Fetch Electricity / BBPS Bill details from Noble Web Gateway
   */
  async fetchBill(operatorCode: string, consumerNumber: string): Promise<UpstreamBillFetchResult | null> {
    if (this.isSandbox) {
      return null;
    }

    const upstreamOp = NOBLE_OPERATOR_CODES[operatorCode] || operatorCode;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(config.nobleWeb.billFetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          operator_code: upstreamOp,
          service_number: consumerNumber
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Noble Web Bill Fetch HTTP ${response.status}`);
      }

      const json = await response.json() as any;
      if (json.status === 'SUCCESS' || json.code === 200 || json.result === 'success') {
        return {
          success: true,
          provider: 'NOBLE_WEB',
          consumerNumber,
          consumerName: json.customer_name || json.name || json.consumer_name || 'CONSUMER ' + consumerNumber,
          operatorCode,
          boardName: json.board_name || json.operator_name || operatorCode,
          billNumber: json.bill_number || json.bill_id || `EB-${operatorCode}-${consumerNumber.slice(-6)}`,
          billDate: json.bill_date || new Date().toISOString().split('T')[0],
          dueDate: json.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          billAmount: Number(json.bill_amount || json.amount || 0),
          status: 'UNPAID',
          rawResponse: json,
          isSandbox: false
        };
      }
      return null;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[NOBLE WEB BILL FETCH] Failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch Live Plans from Noble Web Plans API
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL'): Promise<UpstreamPlanItem[] | null> {
    if (this.isSandbox) {
      return null;
    }

    const upstreamOp = NOBLE_OPERATOR_CODES[operatorCode] || operatorCode;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const url = `${config.nobleWeb.plansUrl}?operator=${encodeURIComponent(upstreamOp)}&circle=${encodeURIComponent(circle)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `ApiKey ${this.apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const json = await response.json() as any;
      const plansList = json.plans || json.data || [];
      if (Array.isArray(plansList) && plansList.length > 0) {
        return plansList.map((p: any) => ({
          amount: Number(p.amount || p.rs || p.price),
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
      console.warn(`[NOBLE WEB PLANS] Failed: ${err.message}`);
      return null;
    }
  }
}
