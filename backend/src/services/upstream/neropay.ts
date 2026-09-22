import { config } from '../../config';
import { UpstreamRequestPayload, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

// NeroPay Operator Code Normalizer
const NEROPAY_OPERATOR_CODES: Record<string, string> = {
  'JIO': 'JIO',
  'AIRTEL': 'AIRTEL',
  'VI': 'VI',
  'BSNL': 'BSNL',
  'TATAPLAY': 'TATASKY',
  'TATA_PLAY': 'TATASKY',
  'AIRTEL_DTH': 'AIRTEL_DTH',
  'DISHTV': 'DISHTV',
  'SUNDIRECT': 'SUNDIRECT',
  'SUN_DIRECT': 'SUNDIRECT',
  'VIDEOCON': 'VIDEOCON_D2H',
  'VIDEOCON_D2H': 'VIDEOCON_D2H',
  'TNEB': 'TNEB_EB',
  'BESCOM': 'BESCOM_EB',
  'MSEB': 'MSEB_EB',
  'WBSEDCL': 'WBSEDCL_EB',
  'GOOGLE_PLAY': 'GOOGLE_PLAY_CODE',
  'OTT_APPS': 'OTT_VOUCHER',
  'FASTAG': 'FASTAG_NETC',
  'LPG_GAS': 'LPG_CYLINDER',
  'BROADBAND': 'BROADBAND_FIBER'
};

export class NeroPayClient {
  private apiUrl: string;
  private voucherUrl: string;
  private billFetchUrl: string;
  private plansUrl: string;
  private apiKey: string;
  private merchantId: string;
  private timeoutMs: number;
  private isSandbox: boolean;

  constructor() {
    this.apiUrl = config.neroPay.apiUrl;
    this.voucherUrl = config.neroPay.voucherUrl;
    this.billFetchUrl = config.neroPay.billFetchUrl;
    this.plansUrl = config.neroPay.plansUrl;
    this.apiKey = config.neroPay.apiKey;
    this.merchantId = config.neroPay.merchantId;
    this.timeoutMs = config.neroPay.timeoutMs || 8000; // Strict 8-second timeout
    this.isSandbox = config.neroPay.isSandbox;
  }

  /**
   * Execute recharge or voucher generation via NeroPay Gateway
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

    // 2. Production HTTP Request with strict 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const isVoucher = payload.serviceType === 'GOOGLE_PLAY' || payload.serviceType === 'OTT_APPS';
      const endpoint = isVoucher ? this.voucherUrl : this.apiUrl;
      const opCode = NEROPAY_OPERATOR_CODES[payload.operatorCode] || payload.operatorCode;

      const requestBody = {
        merchant_id: this.merchantId,
        client_ref_id: payload.internalTxId,
        operator_code: opCode,
        service_type: payload.serviceType,
        account_number: payload.targetAccountNumber,
        amount: payload.faceValue,
        circle: payload.circleCode || 'ALL_INDIA',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Merchant-ID': this.merchantId,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NeroPay HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json() as any;

      // Parse structural response
      const isSuccess = json.status === 'SUCCESS' || json.code === '00' || json.result === 'success';
      const isPending = json.status === 'PENDING' || json.code === '01';

      // Parse digital voucher code / pin if available
      let voucherCode: string | undefined = undefined;
      let voucherPin: string | undefined = undefined;

      if (json.voucher || json.data?.voucher || json.pin || json.data?.pin) {
        voucherCode = json.voucher?.code || json.data?.voucher_code || json.voucher_code || json.code_pin;
        voucherPin = json.voucher?.pin || json.data?.voucher_pin || json.pin || json.voucher_pin;
      }

      if (isSuccess) {
        return {
          status: 'SUCCESS',
          upstreamRef: json.operator_ref || json.txn_id || json.rrn || `NERO_${Date.now()}`,
          message: json.message || 'Transaction executed successfully by NeroPay Primary',
          rawResponse: json,
          voucherCode,
          voucherPin
        };
      } else if (isPending) {
        return {
          status: 'PENDING',
          upstreamRef: json.operator_ref || json.txn_id || `NERO_P_${Date.now()}`,
          message: json.message || 'Transaction accepted in PENDING status by NeroPay',
          rawResponse: json,
          voucherCode,
          voucherPin
        };
      } else {
        throw new Error(`NeroPay Rejected: ${json.message || json.error_description || 'Execution failed'}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`NEROPAY_TIMEOUT: Request timed out after ${this.timeoutMs}ms strict threshold`);
      }
      throw err;
    }
  }

  /**
   * Fetch live BBPS electricity/utility bill details
   */
  async fetchElectricityBill(consumerNumber: string, operatorCode: string): Promise<UpstreamBillFetchResult> {
    if (this.isSandbox) {
      return this.simulateBillFetch(consumerNumber, operatorCode);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.billFetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          consumer_number: consumerNumber,
          operator_code: NEROPAY_OPERATOR_CODES[operatorCode] || operatorCode
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NeroPay Bill Fetch HTTP ${response.status}`);
      }

      const json = await response.json() as any;
      return {
        success: true,
        provider: 'NEROPAY',
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
   * Fetch browse plans from NeroPay
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL_INDIA'): Promise<UpstreamPlanItem[]> {
    if (this.isSandbox) {
      return this.simulatePlans(operatorCode);
    }

    try {
      const url = `${this.plansUrl}?operator=${encodeURIComponent(operatorCode)}&circle=${encodeURIComponent(circle)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (!response.ok) return this.simulatePlans(operatorCode);
      const json = await response.json() as any;
      return json.plans || [];
    } catch {
      return this.simulatePlans(operatorCode);
    }
  }

  // -------------------------------------------------------------
  // HIGH-FIDELITY SANDBOX SIMULATORS (For seamless local/test execution)
  // -------------------------------------------------------------
  private async executeSandboxSimulation(payload: UpstreamRequestPayload) {
    // Simulate real network latency (250ms - 450ms)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 150));

    // Support digital voucher code generation for Google Play and OTT
    let voucherCode: string | undefined = undefined;
    let voucherPin: string | undefined = undefined;

    if (payload.serviceType === 'GOOGLE_PLAY') {
      const randomAlphanumeric = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase();
      voucherCode = `GPLAY-${randomAlphanumeric}`;
      voucherPin = Math.floor(100000 + Math.random() * 900000).toString();
    } else if (payload.serviceType === 'OTT_APPS') {
      const randomAlphanumeric = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                 Math.random().toString(36).substring(2, 6).toUpperCase();
      voucherCode = `OTT-${randomAlphanumeric}`;
      voucherPin = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const simRef = `NERO_SBX_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      status: 'SUCCESS' as const,
      upstreamRef: simRef,
      message: `Processed successfully via NeroPay Primary Gateway [Sandbox Simulation]`,
      rawResponse: {
        gateway: 'NEROPAY',
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
      provider: 'NEROPAY',
      consumerNumber,
      consumerName: 'Verified Consumer (NeroPay BBPS)',
      operatorCode,
      boardName: operatorCode === 'TNEB' ? 'TANGEDCO Tamil Nadu' : operatorCode,
      billNumber: `BILL-${today.getFullYear()}-${hash}`,
      billDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      billAmount: mockAmount,
      status: 'UNPAID',
      rawResponse: { simulated: true, gateway: 'NEROPAY' },
      isSandbox: true,
      message: 'Active bill fetched successfully via NeroPay BBPS Sandbox'
    };
  }

  private simulatePlans(operatorCode: string): UpstreamPlanItem[] {
    return [
      { amount: 299, validity: '28 Days', data: '1.5 GB/Day', description: 'Unlimited Voice Calls + 100 SMS/Day', category: 'Popular', tag: 'Best Seller' },
      { amount: 349, validity: '28 Days', data: '2.0 GB/Day', description: 'Unlimited 5G Data + Unlimited Calls', category: 'Truly Unlimited', tag: 'Trending 5G' },
      { amount: 719, validity: '84 Days', data: '1.5 GB/Day', description: 'Unlimited Voice + 100 SMS/Day + High Value', category: 'Validity Plans', tag: 'Value Pack' },
      { amount: 2999, validity: '365 Days', data: '2.5 GB/Day', description: 'Annual 365 Days Plan + 5G Unlimited', category: 'Annual Plans', tag: 'Long Term' }
    ];
  }
}
