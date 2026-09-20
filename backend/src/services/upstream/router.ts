import { query } from '../../db';
import { A1TopupClient } from './a1topup';
import { NobleWebClient } from './nobleWeb';
import { UpstreamRequestPayload, UpstreamExecutionResult, UpstreamBillFetchResult, UpstreamPlanItem } from './types';

export class UpstreamRouter {
  private a1Client: A1TopupClient;
  private nobleClient: NobleWebClient;

  constructor() {
    this.a1Client = new A1TopupClient();
    this.nobleClient = new NobleWebClient();
  }

  /**
   * Route recharge through two-tier architecture:
   * 1. Check system settings for global override (e.g. FORCE_NOBLE_WEB)
   * 2. Attempt primary A1Topup (strict 8s timeout)
   * 3. On timeout or rejection, seamlessly failover to Noble Web Studio
   */
  async routeRecharge(payload: UpstreamRequestPayload): Promise<UpstreamExecutionResult> {
    const startTime = Date.now();

    // 1. Check current system failover override setting
    let failoverMode = 'AUTO';
    try {
      const settingRes = await query("SELECT value FROM system_settings WHERE key = 'failover_mode' LIMIT 1");
      if (settingRes.rows.length > 0) {
        failoverMode = settingRes.rows[0].value?.mode || 'AUTO';
      }
    } catch (e) {
      console.warn('[ROUTER] Could not read system_settings, defaulting to AUTO failover mode');
    }

    // Manual Admin Override: Force all traffic to Noble Web Studio
    if (failoverMode === 'FORCE_NOBLE_WEB') {
      console.log(`[ROUTER ${payload.internalTxId}] Admin override: Routing directly to Noble Web Studio`);
      const nobleRes = await this.nobleClient.executeRecharge(payload);
      return {
        success: nobleRes.status === 'SUCCESS',
        provider: 'NOBLE_WEB',
        status: nobleRes.status,
        upstreamOperatorRef: nobleRes.upstreamRef,
        message: nobleRes.message,
        latencyMs: Date.now() - startTime,
        rawResponse: nobleRes.rawResponse,
        didFailover: true,
        failoverReason: 'Admin forced traffic to Noble Web Studio'
      };
    }

    // Attempt 1: Route to Primary Upstream (A1Topup)
    try {
      console.log(`[ROUTER ${payload.internalTxId}] Dispatching to Primary Upstream: A1Topup (8s limit)...`);
      const a1Res = await this.a1Client.executeRecharge(payload);

      return {
        success: a1Res.status === 'SUCCESS',
        provider: 'A1TOPUP',
        status: a1Res.status,
        upstreamOperatorRef: a1Res.upstreamRef,
        message: a1Res.message,
        latencyMs: Date.now() - startTime,
        rawResponse: a1Res.rawResponse,
        didFailover: false
      };
    } catch (a1Error: any) {
      const a1FailMessage = a1Error?.message || 'A1Topup network exception';
      console.warn(`[ROUTER ${payload.internalTxId}] Primary A1Topup failed: ${a1FailMessage}. Initiating automated failover...`);

      // If admin explicitly forced only A1Topup, do not failover
      if (failoverMode === 'FORCE_A1TOPUP') {
        throw new Error(`Primary provider A1Topup failed and failover is disabled by Admin: ${a1FailMessage}`);
      }

      // Attempt 2: Automated Failover to Secondary Channel (Noble Web Studio)
      try {
        console.log(`[ROUTER ${payload.internalTxId}] Routing to Failover Upstream: Noble Web Studio...`);
        const nobleRes = await this.nobleClient.executeRecharge(payload);

        return {
          success: nobleRes.status === 'SUCCESS',
          provider: 'NOBLE_WEB',
          status: nobleRes.status,
          upstreamOperatorRef: nobleRes.upstreamRef,
          message: `${nobleRes.message} [Automatic Failover triggered from A1Topup]`,
          latencyMs: Date.now() - startTime,
          rawResponse: nobleRes.rawResponse,
          didFailover: true,
          failoverReason: a1FailMessage
        };
      } catch (nobleError: any) {
        const nobleFailMessage = nobleError?.message || 'Noble Web Studio network exception';
        console.error(`[ROUTER CRITICAL ${payload.internalTxId}] Both upstream providers failed! A1: ${a1FailMessage} | Noble: ${nobleFailMessage}`);
        
        throw new Error(`DUAL_UPSTREAM_FAILURE: Primary A1Topup (${a1FailMessage}) and Failover Noble Web (${nobleFailMessage}) both rejected the request.`);
      }
    }
  }

  /**
   * Route Electricity / BBPS Bill Fetch with dual failover:
   * 1. Try Primary A1Topup live bill fetch
   * 2. On failure/timeout, failover to Noble Web live bill fetch
   * 3. If both fail or in sandbox mode, return null to allow graceful fallback
   */
  async routeBillFetch(operatorCode: string, consumerNumber: string): Promise<UpstreamBillFetchResult | null> {
    try {
      console.log(`[ROUTER BILL_FETCH] Querying Primary A1Topup for ${operatorCode} ${consumerNumber}...`);
      const a1Bill = await this.a1Client.fetchBill(operatorCode, consumerNumber);
      if (a1Bill && a1Bill.success) {
        return a1Bill;
      }
    } catch (e: any) {
      console.warn(`[ROUTER BILL_FETCH] A1Topup bill fetch failed: ${e.message}`);
    }

    try {
      console.log(`[ROUTER BILL_FETCH] Failing over to Noble Web for ${operatorCode} ${consumerNumber}...`);
      const nobleBill = await this.nobleClient.fetchBill(operatorCode, consumerNumber);
      if (nobleBill && nobleBill.success) {
        return nobleBill;
      }
    } catch (e: any) {
      console.warn(`[ROUTER BILL_FETCH] Noble Web bill fetch failed: ${e.message}`);
    }

    return null;
  }

  /**
   * Route Plan Fetching from live upstream gateways
   */
  async routeFetchPlans(operatorCode: string, circle: string = 'ALL'): Promise<UpstreamPlanItem[] | null> {
    try {
      const a1Plans = await this.a1Client.fetchPlans(operatorCode, circle);
      if (a1Plans && a1Plans.length > 0) return a1Plans;
    } catch (e: any) {
      console.warn(`[ROUTER PLANS] A1Topup plans fetch failed: ${e.message}`);
    }

    try {
      const noblePlans = await this.nobleClient.fetchPlans(operatorCode, circle);
      if (noblePlans && noblePlans.length > 0) return noblePlans;
    } catch (e: any) {
      console.warn(`[ROUTER PLANS] Noble Web plans fetch failed: ${e.message}`);
    }

    return null;
  }
}

export const upstreamRouter = new UpstreamRouter();
