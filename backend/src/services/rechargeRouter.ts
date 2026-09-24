import { config } from '../config';
import { query } from '../db';
import { NeroPayClient } from './upstream/neropay';
import { 
  UpstreamRequestPayload, 
  UpstreamExecutionResult, 
  UpstreamBillFetchResult, 
  UpstreamPlanItem 
} from './upstream/types';

export type UpstreamProviderName = 'NEROPAY' | 'NOBLE';

export interface ProviderRoutingConfig {
  primary: UpstreamProviderName;
  fallback: UpstreamProviderName | null;
  isNobleActive: boolean;
  neropayMasterRate: number;
  nobleMasterRate: number;
}

/**
 * Direct Pure NeroPay Upstream Router Module
 * All traffic routed exclusively to NeroPay Gateway with zero unconfigured fallbacks.
 */
export class RechargeRouter {
  private neroClient: NeroPayClient;

  constructor() {
    this.neroClient = new NeroPayClient();
  }

  /**
   * Determine the routing configuration based on commission_matrix row
   */
  async determineRouting(operatorCode: string): Promise<ProviderRoutingConfig> {
    const normOp = operatorCode.trim().toUpperCase();

    // Step A: Read the 'commission_matrix' row for the target operator code
    const matrixRes = await query(
      `SELECT neropay_master_rate, noble_master_rate, is_noble_active 
       FROM commission_matrix 
       WHERE operator_code = $1 LIMIT 1`,
      [normOp]
    );

    let neropayRate = 1.00;
    let nobleRate = 1.00;
    let isNobleActive = false;

    if (matrixRes.rows.length > 0) {
      const row = matrixRes.rows[0];
      neropayRate = parseFloat(row.neropay_master_rate || '0');
      nobleRate = parseFloat(row.noble_master_rate || '0');
      isNobleActive = Boolean(row.is_noble_active);
    } else {
      console.warn(`[ROUTER] Operator ${operatorCode} not found in commission_matrix, defaulting to NeroPay primary`);
    }

    // Noble is NOT configured/purchased. Route 100% of traffic exclusively to NeroPay.
    return {
      primary: 'NEROPAY',
      fallback: null,
      isNobleActive: false,
      neropayMasterRate: neropayRate,
      nobleMasterRate: 0.00
    };
  }

  /**
   * Execute recharge through Dynamic Smart Router directly via NeroPay
   */
  async routeRecharge(payload: UpstreamRequestPayload): Promise<UpstreamExecutionResult> {
    const startTime = Date.now();
    const routing = await this.determineRouting(payload.operatorCode);

    console.log(
      `[ROUTER ${payload.internalTxId}] Operator: ${payload.operatorCode} | ` +
      `PRIMARY: NEROPAY (Direct Dispatch)`
    );

    const primaryRes = await this.neroClient.executeRecharge(payload);

    return {
      success: primaryRes.status === 'SUCCESS',
      provider: 'NEROPAY',
      status: primaryRes.status,
      upstreamOperatorRef: primaryRes.upstreamRef,
      message: primaryRes.message,
      latencyMs: Date.now() - startTime,
      rawResponse: primaryRes.rawResponse,
      didFailover: false,
      voucherCode: primaryRes.voucherCode,
      voucherPin: primaryRes.voucherPin
    };
  }

  /**
   * Helper executing specific provider client
   */
  private async executeProvider(
    provider: UpstreamProviderName, 
    payload: UpstreamRequestPayload
  ) {
    return this.neroClient.executeRecharge(payload);
  }

  /**
   * Fetch electricity bill directly via NeroPay
   */
  async fetchElectricityBill(consumerNumber: string, operatorCode: string, p2?: string, p3?: string): Promise<UpstreamBillFetchResult> {
    return await this.neroClient.fetchElectricityBill(consumerNumber, operatorCode, p2, p3);
  }

  /**
   * Fetch browse plans directly via NeroPay
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL_INDIA'): Promise<UpstreamPlanItem[]> {
    return await this.neroClient.fetchPlans(operatorCode, circle);
  }

  routeFetchPlans(operatorCode: string, circle: string = 'ALL_INDIA') {
    return this.fetchPlans(operatorCode, circle);
  }

  routeBillFetch(operatorCode: string, consumerNumber: string, p2?: string, p3?: string) {
    return this.fetchElectricityBill(consumerNumber, operatorCode, p2, p3);
  }
}

// Singleton Export
export const rechargeRouter = new RechargeRouter();
