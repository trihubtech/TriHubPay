import { config } from '../config';
import { query } from '../db';
import { NeroPayClient } from './upstream/neropay';
import { NobleWebClient } from './upstream/nobleWeb';
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
 * Dynamic Smart Upstream Router Module
 * Enforces dynamic multi-provider selection, operator-specific margin evaluation,
 * strict 8-second timeout thresholds, and automated zero-loss failover.
 */
export class RechargeRouter {
  private neroClient: NeroPayClient;
  private nobleClient: NobleWebClient;

  constructor() {
    this.neroClient = new NeroPayClient();
    this.nobleClient = new NobleWebClient();
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

    // Dynamic Provider Overrides from config / .env (Swappable with 0 code changes)
    const configuredPrimary = (config.primaryProvider === 'NOBLE' ? 'NOBLE' : 'NEROPAY') as UpstreamProviderName;
    const fallbackEnabled = config.providerFallbackEnabled;

    // Step B (Phase 1 Logic): If is_noble_active is FALSE, bypass Noble entirely. Direct 100% of traffic to configured primary.
    if (!isNobleActive) {
      return {
        primary: configuredPrimary,
        fallback: null,
        isNobleActive: false,
        neropayMasterRate: neropayRate,
        nobleMasterRate: nobleRate
      };
    }

    // Step C (Phase 2 Logic): If is_noble_active is TRUE, dynamically evaluate master rates.
    // The provider with the HIGHER master rate is PRIMARY; the other is FALLBACK.
    if (nobleRate > neropayRate) {
      return {
        primary: 'NOBLE',
        fallback: fallbackEnabled ? 'NEROPAY' : null,
        isNobleActive: true,
        neropayMasterRate: neropayRate,
        nobleMasterRate: nobleRate
      };
    } else {
      // In case of equal rates or NeroPay higher, NeroPay is Primary and Noble is Fallback
      return {
        primary: 'NEROPAY',
        fallback: fallbackEnabled ? 'NOBLE' : null,
        isNobleActive: true,
        neropayMasterRate: neropayRate,
        nobleMasterRate: nobleRate
      };
    }
  }

  /**
   * Execute recharge through Dynamic Smart Router with strict 8s timeout and automated failover
   */
  async routeRecharge(payload: UpstreamRequestPayload): Promise<UpstreamExecutionResult> {
    const startTime = Date.now();
    const routing = await this.determineRouting(payload.operatorCode);

    console.log(
      `[ROUTER ${payload.internalTxId}] Operator: ${payload.operatorCode} | ` +
      `is_noble_active: ${routing.isNobleActive} | NeroRate: ${routing.neropayMasterRate}% | ` +
      `NobleRate: ${routing.nobleMasterRate}% => PRIMARY: ${routing.primary}` +
      (routing.fallback ? ` | FALLBACK: ${routing.fallback}` : ' | NO FALLBACK (Phase 1)')
    );

    // Step D: Execute request against PRIMARY provider with strict 8-second HTTP timeout
    try {
      const primaryRes = await this.executeProvider(routing.primary, payload);

      return {
        success: primaryRes.status === 'SUCCESS',
        provider: routing.primary,
        status: primaryRes.status,
        upstreamOperatorRef: primaryRes.upstreamRef,
        message: primaryRes.message,
        latencyMs: Date.now() - startTime,
        rawResponse: primaryRes.rawResponse,
        didFailover: false,
        voucherCode: primaryRes.voucherCode,
        voucherPin: primaryRes.voucherPin
      };
    } catch (primaryError: any) {
      const primaryErrMsg = primaryError?.message || 'Primary upstream error';
      console.warn(
        `[ROUTER ${payload.internalTxId}] PRIMARY ${routing.primary} failed: ${primaryErrMsg}. ` +
        `Checking failover eligibility...`
      );

      // If no fallback is configured (Phase 1 or single provider mode), fail immediately
      if (!routing.fallback) {
        throw new Error(`PRIMARY_PROVIDER_FAILED: ${routing.primary} failed (${primaryErrMsg}) and fallback is inactive.`);
      }

      // Step D (Fault Tolerance): Immediately catch exception, log failover event,
      // and route identical transaction parameters to FALLBACK provider
      try {
        console.log(`[ROUTER ${payload.internalTxId}] Dispatching identical payload to FALLBACK: ${routing.fallback}...`);
        const fallbackRes = await this.executeProvider(routing.fallback, payload);

        return {
          success: fallbackRes.status === 'SUCCESS',
          provider: routing.fallback,
          status: fallbackRes.status,
          upstreamOperatorRef: fallbackRes.upstreamRef,
          message: `${fallbackRes.message} [Automatic Smart Failover from ${routing.primary}]`,
          latencyMs: Date.now() - startTime,
          rawResponse: fallbackRes.rawResponse,
          didFailover: true,
          failoverReason: primaryErrMsg,
          voucherCode: fallbackRes.voucherCode,
          voucherPin: fallbackRes.voucherPin
        };
      } catch (fallbackError: any) {
        const fallbackErrMsg = fallbackError?.message || 'Fallback upstream error';
        console.error(
          `[ROUTER CRITICAL ${payload.internalTxId}] DUAL UPSTREAM FAILURE! ` +
          `Primary ${routing.primary}: ${primaryErrMsg} | Fallback ${routing.fallback}: ${fallbackErrMsg}`
        );

        throw new Error(
          `DUAL_UPSTREAM_FAILURE: Both upstream channels rejected the transaction. ` +
          `[${routing.primary}: ${primaryErrMsg}] | [${routing.fallback}: ${fallbackErrMsg}]`
        );
      }
    }
  }

  /**
   * Helper executing specific provider client
   */
  private async executeProvider(
    provider: UpstreamProviderName, 
    payload: UpstreamRequestPayload
  ) {
    if (provider === 'NEROPAY') {
      return this.neroClient.executeRecharge(payload);
    } else {
      return this.nobleClient.executeRecharge(payload);
    }
  }

  /**
   * Fetch electricity bill with primary -> fallback routing
   */
  async fetchElectricityBill(consumerNumber: string, operatorCode: string): Promise<UpstreamBillFetchResult> {
    const routing = await this.determineRouting(operatorCode);

    try {
      if (routing.primary === 'NEROPAY') {
        return await this.neroClient.fetchElectricityBill(consumerNumber, operatorCode);
      } else {
        return await this.nobleClient.fetchElectricityBill(consumerNumber, operatorCode);
      }
    } catch (primaryErr: any) {
      if (routing.fallback) {
        console.warn(`[ROUTER BILL FETCH] Primary failed, attempting fallback ${routing.fallback}...`);
        if (routing.fallback === 'NEROPAY') {
          return await this.neroClient.fetchElectricityBill(consumerNumber, operatorCode);
        } else {
          return await this.nobleClient.fetchElectricityBill(consumerNumber, operatorCode);
        }
      }
      throw primaryErr;
    }
  }

  /**
   * Fetch browse plans
   */
  async fetchPlans(operatorCode: string, circle: string = 'ALL_INDIA'): Promise<UpstreamPlanItem[]> {
    try {
      return await this.neroClient.fetchPlans(operatorCode, circle);
    } catch {
      return await this.nobleClient.fetchPlans(operatorCode);
    }
  }

  routeFetchPlans(operatorCode: string, circle: string = 'ALL_INDIA') {
    return this.fetchPlans(operatorCode, circle);
  }

  routeBillFetch(operatorCode: string, consumerNumber: string) {
    return this.fetchElectricityBill(consumerNumber, operatorCode);
  }
}

// Singleton Export
export const rechargeRouter = new RechargeRouter();
