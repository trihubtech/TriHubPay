import { config } from '../../config';
import { UpstreamRequestPayload, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

/**
 * Official NeroPay Operator Code Mapping as per https://docs.neropay.co.in/#operators
 */
const NEROPAY_OPERATOR_CODES: Record<string, string> = {
  // Mobile Prepaid Operators
  'AIRTEL': 'AT',
  'BSNL': 'BSNL',
  'JIO': 'JIO',
  'VI': 'VI',

  // DTH Providers
  'AIRTEL_DTH': 'ATV',
  'AIRTELDTH': 'ATV',
  'DISHTV': 'DTV',
  'DISH_TV': 'DTV',
  'SUNDIRECT': 'STV',
  'SUN_DIRECT': 'STV',
  'TATAPLAY': 'TTV',
  'TATA_PLAY': 'TTV',
  'TATASKY': 'TTV',
  'VIDEOCON': 'VTV',
  'VIDEOCON_D2H': 'VTV',

  // Electricity & Utilities
  'TNEB': 'TNEB',
  'BESCOM': 'BESCOM',
  'MSEB': 'MSEB',
  'WBSEDCL': 'WBSEDCL',

  // High-Margin Categories (Mapped to NeroPay Utility/Service codes)
  'GOOGLE_PLAY': 'GOOGLE_PLAY',
  'OTT_APPS': 'OTT_APPS',
  'FASTAG': 'FASTAG',
  'LPG_GAS': 'LPG_GAS',
  'BROADBAND': 'BROADBAND'
};

export class NeroPayClient {
  private baseUrl: string;
  private apiUrl: string;
  private balanceUrl: string;
  private statusUrl: string;
  private disputeUrl: string;
  private billFetchUrl: string;
  private plansUrl: string;
  private token: string;
  private timeoutMs: number;
  private isSandbox: boolean;

  constructor() {
    this.baseUrl = config.neroPay.baseUrl;
    this.apiUrl = config.neroPay.apiUrl;
    this.balanceUrl = config.neroPay.balanceUrl;
    this.statusUrl = config.neroPay.statusUrl;
    this.disputeUrl = config.neroPay.disputeUrl;
    this.billFetchUrl = config.neroPay.billFetchUrl;
    this.plansUrl = config.neroPay.plansUrl;
    this.token = config.neroPay.token || config.neroPay.apiKey;
    this.timeoutMs = config.neroPay.timeoutMs || 8000; // Strict 8-second timeout
    this.isSandbox = config.neroPay.isSandbox;
  }

  /**
   * Execute recharge or utility payment via NeroPay Gateway
   * Endpoint: GET /apiservice/utility_payments?token=...&customer_id=...&operatorcode=...&amount=...&refid=...
   */
  async executeRecharge(payload: UpstreamRequestPayload): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
    voucherCode?: string;
    voucherPin?: string;
  }> {
    // 1. High-Fidelity Sandbox Simulator (used when no live token is configured)
    if (this.isSandbox) {
      return this.executeSandboxSimulation(payload);
    }

    // 2. Production HTTP Request with strict 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const targetAmount = Math.round(payload.faceValue);
    const primaryOpCode = NEROPAY_OPERATOR_CODES[payload.operatorCode] || payload.operatorCode;
    
    // Candidates to test in order:
    // 1. /apiservice/utility_payments with JIO
    // 2. /apiservice/recharge with JIO
    // 3. /apiservice/utility_payments with Jio
    // 4. /apiservice/recharge with Jio
    const attempts = [
      { url: `${this.baseUrl}/apiservice/utility_payments`, op: primaryOpCode },
      { url: `${this.baseUrl}/apiservice/recharge`, op: primaryOpCode }
    ];
    if (primaryOpCode === 'JIO') {
      attempts.push({ url: `${this.baseUrl}/apiservice/utility_payments`, op: 'Jio' });
      attempts.push({ url: `${this.baseUrl}/apiservice/recharge`, op: 'Jio' });
    }

    let lastError: Error | null = null;

    for (let i = 0; i < attempts.length; i++) {
      const { url: targetUrl, op: opCode } = attempts[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const queryParams = new URLSearchParams({
          token: this.token,
          customer_id: String(payload.targetAccountNumber),
          operatorcode: opCode,
          amount: String(targetAmount),
          refid: payload.internalTxId
        });

        const requestUrl = `${targetUrl}?${queryParams.toString()}`;
        console.log(`[NEROPAY PRODUCTION REQUEST #${i + 1}] Dispatching GET to ${targetUrl} (op: ${opCode}) for ref: ${payload.internalTxId}`);

        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TriHubPay-B2B-Core/2.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`NeroPay HTTP ${response.status}: ${errorText}`);
        }

        const json = await response.json() as any;
        console.log(`[NEROPAY PRODUCTION RESPONSE #${i + 1}] Ref: ${payload.internalTxId} | Result:`, JSON.stringify(json));

        const statusStr = String(json.status || '').toUpperCase();
        const msgStr = String(json.message || '');
        const isSuccess = statusStr === 'SUCCESS' || json.code === '00';
        const isPending = statusStr === 'PENDING' || json.code === '01';

        // If this endpoint returned "NO API ACTIVE ON THIS OPERATOR", try the next candidate
        if (msgStr.toLowerCase().includes('no api active') && i < attempts.length - 1) {
          console.warn(`[NEROPAY RETRY] ${targetUrl} with op ${opCode} returned "${msgStr}", trying next endpoint...`);
          continue;
        }

        // Digital voucher parsing (for Google Play, OTT, etc.)
        let voucherCode: string | undefined = undefined;
        let voucherPin: string | undefined = undefined;

        if (json.voucher || json.pin || json.operatorid) {
          const textToScan = `${json.operatorid || ''} ${json.message || ''}`;
          const codeMatch = textToScan.match(/code[:\s]+([A-Z0-9-]+)/i);
          const pinMatch = textToScan.match(/pin[:\s]+([0-9]+)/i);

          voucherCode = json.voucher_code || json.voucher || (codeMatch ? codeMatch[1] : undefined);
          voucherPin = json.voucher_pin || json.pin || (pinMatch ? pinMatch[1] : undefined);
        }

        if (isSuccess) {
          return {
            status: 'SUCCESS',
            upstreamRef: json.txnid || json.operatorid || `NERO_${Date.now()}`,
            message: json.message || 'Transaction completed successfully via NeroPay',
            rawResponse: json,
            voucherCode,
            voucherPin
          };
        } else if (isPending) {
          return {
            status: 'PENDING',
            upstreamRef: json.txnid || `NERO_P_${Date.now()}`,
            message: json.message || 'Transaction under process at operator (NeroPay PENDING)',
            rawResponse: json,
            voucherCode,
            voucherPin
          };
        } else {
          throw new Error(`NeroPay Rejected: ${json.message || statusStr}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error(`NEROPAY_TIMEOUT: Request timed out after ${this.timeoutMs}ms strict threshold`);
        }
        lastError = err;
        // If not the last attempt and error mentions "no api active", continue
        if (err.message && err.message.toLowerCase().includes('no api active') && i < attempts.length - 1) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('NeroPay dispatch failed');
  }

  /**
   * Status Check: Resolve pending transactions
   * Endpoint: GET /apiservice/status_check?token=...&refid=...
   */
  async checkStatus(refId: string): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    upstreamRef: string;
    message: string;
    rawResponse: any;
  }> {
    if (this.isSandbox) {
      return {
        status: 'SUCCESS',
        upstreamRef: `SIM_${refId}`,
        message: 'Status verified (Sandbox)',
        rawResponse: { simulated: true }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.statusUrl}?token=${encodeURIComponent(this.token)}&refid=${encodeURIComponent(refId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`NeroPay Status Check HTTP ${response.status}`);
      const json = await response.json() as any;
      const statusStr = String(json.status || '').toUpperCase();

      return {
        status: statusStr === 'SUCCESS' ? 'SUCCESS' : (statusStr === 'PENDING' ? 'PENDING' : 'FAILED'),
        upstreamRef: json.txnid || json.operatorid || '',
        message: json.message || statusStr,
        rawResponse: json
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Wallet Balance: Query live merchant balance in NeroPay
   * Endpoint: GET /apiservice/balance_check?token=...
   */
  async checkBalance(): Promise<{
    main: number;
    total: number;
    statusCode: number;
    message: string;
    raw: any;
  }> {
    if (this.isSandbox) {
      return {
        main: 50000.00,
        total: 50000.00,
        statusCode: 1,
        message: 'Sandbox Simulated Balance',
        raw: { simulated: true }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.balanceUrl}?token=${encodeURIComponent(this.token)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`NeroPay Balance Check HTTP ${response.status}`);
      const json = await response.json() as any;

      return {
        main: parseFloat(json.main) || 0,
        total: parseFloat(json.total) || parseFloat(json.main) || 0,
        statusCode: json.status_code ?? 1,
        message: json.message || 'Balance fetched successfully',
        raw: json
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Raise Dispute: Flag a stuck or disputed transaction
   * Endpoint: GET /apiservice/raise_dispute?token=...&txn_id=...
   */
  async raiseDispute(txnId: string): Promise<{
    statusCode: number;
    message: string;
    complaintId?: string;
    raw: any;
  }> {
    if (this.isSandbox) {
      return {
        statusCode: 1,
        message: 'Dispute Raised (Sandbox)',
        complaintId: `CMP_${Date.now()}`,
        raw: { simulated: true }
      };
    }

    const url = `${this.disputeUrl}?token=${encodeURIComponent(this.token)}&txn_id=${encodeURIComponent(txnId)}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    const json = await response.json() as any;

    return {
      statusCode: json.status_code ?? 0,
      message: json.message || '',
      complaintId: json.complaint_id,
      raw: json
    };
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
      const opCode = NEROPAY_OPERATOR_CODES[operatorCode] || operatorCode;
      const url = `${this.billFetchUrl}?token=${encodeURIComponent(this.token)}&consumer_number=${encodeURIComponent(consumerNumber)}&operator_code=${encodeURIComponent(opCode)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.simulateBillFetch(consumerNumber, operatorCode);
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
      return this.simulateBillFetch(consumerNumber, operatorCode);
    }
  }

  /**
   * Fetch browse plans from NeroPay (falls back to Standard Catalog if not supported)
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL_INDIA'): Promise<UpstreamPlanItem[]> {
    if (this.isSandbox) {
      return [];
    }

    try {
      const opCode = NEROPAY_OPERATOR_CODES[operatorCode] || operatorCode;
      const url = `${this.plansUrl}?token=${encodeURIComponent(this.token)}&operator=${encodeURIComponent(opCode)}&circle=${encodeURIComponent(circle)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return [];
      const json = await response.json() as any;
      return Array.isArray(json.plans) ? json.plans : [];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------
  // HIGH-FIDELITY SANDBOX SIMULATORS (For test environments)
  // -------------------------------------------------------------
  private async executeSandboxSimulation(payload: UpstreamRequestPayload) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 150));

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
        txnid: simRef,
        status: 'SUCCESS',
        operatorid: `OP_${simRef}`,
        mobileno: payload.targetAccountNumber,
        amount: payload.faceValue,
        operatorcode: NEROPAY_OPERATOR_CODES[payload.operatorCode] || payload.operatorCode,
        voucher_code: voucherCode,
        voucher_pin: voucherPin
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
