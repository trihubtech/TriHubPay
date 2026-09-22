import { config } from '../../config';
import { UpstreamRequestPayload, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

// Noble Web Studio / E2E Networks Provider Operator Code Dictionary
const NOBLE_OPERATOR_CODES: Record<string, string> = {
  'JIO': 'JIO',
  'AIRTEL': 'AIRTEL',
  'VI': 'VI',
  'BSNL': 'BSNL',
  'TATAPLAY': 'TATA_SKY',
  'TATA_PLAY': 'TATA_SKY',
  'AIRTEL_DTH': 'AIRTEL_DTH',
  'DISHTV': 'DISH_TV',
  'SUNDIRECT': 'SUN_DIRECT',
  'SUN_DIRECT': 'SUN_DIRECT',
  'VIDEOCON': 'VIDEOCON',
  'VIDEOCON_D2H': 'VIDEOCON',
  'TNEB': 'TNEB',
  'BESCOM': 'BESCOM',
  'MSEB': 'MSEB',
  'WBSEDCL': 'WBSEDCL',
  'GOOGLE_PLAY': 'GOOGLE_PLAY',
  'OTT_APPS': 'OTT_APPS',
  'FASTAG': 'FASTAG',
  'LPG_GAS': 'LPG_GAS',
  'BROADBAND': 'BROADBAND'
};

export class NobleWebClient {
  private apiUrl: string;
  private billFetchUrl: string;
  private plansUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private isSandbox: boolean;

  constructor() {
    this.apiUrl = config.nobleWeb.apiUrl;
    this.billFetchUrl = config.nobleWeb.billFetchUrl;
    this.plansUrl = config.nobleWeb.plansUrl;
    this.apiKey = config.nobleWeb.apiKey;
    this.timeoutMs = config.nobleWeb.timeoutMs || 8000; // Strict 8-second timeout
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
    voucherCode?: string;
    voucherPin?: string;
  }> {
    // 1. High-Fidelity Sandbox Simulator
    if (this.isSandbox) {
      return this.executeSandboxSimulation(payload);
    }

    // 2. Production REST JSON call with strict 8-second timeout
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
          service_type: payload.serviceType,
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

      let voucherCode: string | undefined = undefined;
      let voucherPin: string | undefined = undefined;
      if (json.voucher || json.pin) {
        voucherCode = json.voucher?.code || json.voucher_code || json.code;
        voucherPin = json.voucher?.pin || json.pin || json.voucher_pin;
      }

      if (json.status === 'SUCCESS' || json.code === 200 || json.result === 'success') {
        return {
          status: 'SUCCESS',
          upstreamRef: json.operator_id || json.rrn || `NOBLE_${Date.now()}`,
          message: json.message || 'Processed through Noble Web Studio failover channel',
          rawResponse: json,
          voucherCode,
          voucherPin
        };
      } else if (json.status === 'PENDING') {
        return {
          status: 'PENDING',
          upstreamRef: json.operator_id || `NOBLE_P_${Date.now()}`,
          message: 'Processing through Noble Web failover channel',
          rawResponse: json,
          voucherCode,
          voucherPin
        };
      } else {
        throw new Error(`Noble Web API Reject: ${json.error || json.message || 'Transaction rejected'}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`NOBLE_TIMEOUT: Request timed out after ${this.timeoutMs}ms strict threshold`);
      }
      throw err;
    }
  }

  /**
   * Fast Electricity / BBPS Bill Fetch via Noble Web Studio
   */
  async fetchElectricityBill(consumerNumber: string, operatorCode: string): Promise<UpstreamBillFetchResult> {
    if (this.isSandbox) {
      return this.simulateBillFetch(consumerNumber, operatorCode);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const upstreamOp = NOBLE_OPERATOR_CODES[operatorCode] || operatorCode;
      const response = await fetch(this.billFetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`
        },
        body: JSON.stringify({
          consumer_number: consumerNumber,
          operator_code: upstreamOp
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Noble Web Bill Fetch HTTP ${response.status}`);
      }

      const json = await response.json() as any;
      return {
        success: true,
        provider: 'NOBLE_WEB',
        consumerNumber,
        consumerName: json.consumer_name || 'Consumer',
        operatorCode,
        boardName: json.board_name || operatorCode,
        billNumber: json.bill_number || `BILL_${Date.now()}`,
        billDate: json.bill_date || new Date().toISOString().split('T')[0],
        dueDate: json.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        billAmount: parseFloat(json.bill_amount) || 0,
        status: json.status === 'PAID' ? 'PAID' : 'UNPAID',
        rawResponse: json,
        isSandbox: false
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Fetch operator plans
   */
  async fetchPlans(operatorCode: string): Promise<UpstreamPlanItem[]> {
    if (this.isSandbox) {
      return [];
    }

    try {
      const upstreamOp = NOBLE_OPERATOR_CODES[operatorCode] || operatorCode;
      const response = await fetch(`${this.plansUrl}?operator=${upstreamOp}`, {
        headers: { 'Authorization': `ApiKey ${this.apiKey}` }
      });
      if (!response.ok) return [];
      const json = await response.json() as any;
      return Array.isArray(json.plans) ? json.plans : [];
    } catch {
      return [];
    }
  }

  private async executeSandboxSimulation(payload: UpstreamRequestPayload) {
    // Ultra-fast sub-400ms target simulation
    await new Promise(r => setTimeout(r, 220 + Math.random() * 80));

    let voucherCode: string | undefined = undefined;
    let voucherPin: string | undefined = undefined;

    if (payload.serviceType === 'GOOGLE_PLAY') {
      const randomAlphanumeric = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase();
      voucherCode = `GPLAY-NW-${randomAlphanumeric}`;
      voucherPin = Math.floor(100000 + Math.random() * 900000).toString();
    } else if (payload.serviceType === 'OTT_APPS') {
      const randomAlphanumeric = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase();
      voucherCode = `OTT-NW-${randomAlphanumeric}`;
      voucherPin = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const simRef = `NOBLE_SBX_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      status: 'SUCCESS' as const,
      upstreamRef: simRef,
      message: 'Processed through Noble Web Studio failover channel [Sandbox Simulation]',
      rawResponse: {
        gateway: 'NOBLE_WEB',
        mode: 'SIMULATION',
        operator_ref: simRef,
        amount: payload.faceValue,
        account: payload.targetAccountNumber,
        voucher_code: voucherCode,
        voucher_pin: voucherPin,
        timestamp: new Date().toISOString()
      },
      voucherCode,
      voucherPin
    };
  }

  private simulateBillFetch(consumerNumber: string, operatorCode: string): UpstreamBillFetchResult {
    const hash = consumerNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockAmount = 250 + (hash % 1750);
    const today = new Date();
    const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      provider: 'NOBLE_WEB',
      consumerNumber,
      consumerName: 'Verified Consumer (Noble Web BBPS)',
      operatorCode,
      boardName: operatorCode === 'TNEB' ? 'TANGEDCO Tamil Nadu' : operatorCode,
      billNumber: `BILL-${today.getFullYear()}-${hash}`,
      billDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      billAmount: mockAmount,
      status: 'UNPAID',
      rawResponse: { simulated: true, provider: 'NOBLE_WEB' },
      isSandbox: true,
      message: 'Active bill fetched successfully via Noble Web Studio BBPS'
    };
  }

  private simulatePlans(operatorCode: string): UpstreamPlanItem[] {
    return [
      { amount: 299, validity: '28 Days', data: '1.5 GB/Day', description: 'Unlimited Voice Calls + 100 SMS/Day', category: 'Popular', tag: 'Best Seller' },
      { amount: 349, validity: '28 Days', data: '2.0 GB/Day', description: 'Unlimited 5G Data + Unlimited Calls', category: 'Truly Unlimited', tag: 'Trending 5G' },
      { amount: 719, validity: '84 Days', data: '1.5 GB/Day', description: 'Unlimited Voice + 100 SMS/Day + High Value', category: 'Validity Plans', tag: 'Value Pack' }
    ];
  }
}
