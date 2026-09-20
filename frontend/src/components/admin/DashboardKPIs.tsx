import React from 'react';
import { DashboardKPIs as IKPIData } from '../../types';
import { Activity, DollarSign, TrendingUp, AlertTriangle, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';

interface DashboardKPIsProps {
  kpis: IKPIData | null;
  onRefresh: () => void;
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ kpis, onRefresh }) => {
  if (!kpis) return null;

  return (
    <div className="space-y-4">
      {/* Low Balance Alert Banner if Master Wallet is low */}
      {kpis.master_wallet.is_low_balance && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-sm">Master Upstream Wallet Low Balance Warning</div>
              <div className="text-xs text-amber-400/80">
                Current float is ₹{kpis.master_wallet.balance.toFixed(2)} (Alert Threshold: ₹{kpis.master_wallet.threshold.toFixed(2)}). Please top up your master distributor wallet to prevent recharge drops.
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200">
            Action Required
          </span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Live Network Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Network Volume</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{kpis.network_volume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kpis.total_transactions} txs</span>
            <span>across {kpis.total_retailers} active accounts</span>
          </div>
        </div>

        {/* 2. Net Admin Profit (from 5% margin spread) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Admin Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{kpis.net_admin_profit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/15 text-brand-700 dark:text-brand-300">
              {kpis.effective_admin_margin_percent}% Net Margin
            </span>
            <span>Target: 5.0%</span>
          </div>
        </div>

        {/* 3. Upstream Success Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Upstream SLA Rate</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpis.success_rate_percent}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">{kpis.success_count} OK</span>
            <span>•</span>
            <span className="text-rose-600 dark:text-rose-400">{kpis.failed_count} Fail</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">{kpis.pending_count} Pend</span>
          </div>
        </div>

        {/* 4. Master Upstream Wallet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Master API Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              kpis.master_wallet.is_low_balance
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400'
                : 'bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{kpis.master_wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>Wallet liability: ₹{kpis.retailer_float_liability.toFixed(0)}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">A1+Noble Pool</span>
          </div>
        </div>
      </div>

      {/* Failover Routing Performance Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Cpu className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-300">Two-Tier Dynamic Route Distribution</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Primary A1Topup (8s Timeout) ➔ Automated Failover to Noble Web Studio / E2E
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">A1Topup:</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{kpis.primary_a1_count}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Noble Web Failover:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{kpis.failover_noble_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
