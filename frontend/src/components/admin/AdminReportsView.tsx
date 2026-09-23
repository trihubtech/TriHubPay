import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminReportsData } from '../../types';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  Percent, 
  Calendar, 
  Store, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  ArrowUpRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const AdminReportsView: React.FC = () => {
  const [period, setPeriod] = useState<string>('today');
  const [reportsData, setReportsData] = useState<AdminReportsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'OPERATOR' | 'RETAILER'>('OPERATOR');

  const periods: Array<{ id: string; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all', label: 'All Time' }
  ];

  const fetchReports = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const res = await api.getAdminReports(selectedPeriod);
      if (res.success) {
        setReportsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const summary = reportsData?.summary;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Controls: Period Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-brand-500" />
            <span>Platform Revenue &amp; Performance Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-dimensional reports across recharge operators and retail partners.
          </p>
        </div>

        {/* Period Pills with horizontal overflow scroll for small mobile devices */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                period === p.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => fetchReports(period)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !reportsData ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Aggregating platform intelligence...</span>
        </div>
      ) : (
        <>
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Network Volume */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Total GMV Volume</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                ₹{Number(summary?.total_volume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {summary?.total_transactions || 0} orders processed
              </div>
            </div>

            {/* 2. Admin Net Margin */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Platform Net Profit</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +₹{Number(summary?.total_admin_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {summary?.admin_margin_percent?.toFixed(2)}% net margin
              </div>
            </div>

            {/* 3. Retailer Payout */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Retailer Commission</span>
                <Wallet className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-brand-400 font-mono">
                ₹{Number(summary?.total_retailer_payout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Cashback credited to shops
              </div>
            </div>

            {/* 4. Execution Health */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Success Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary?.success_rate?.toFixed(1) || 100}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {summary?.success_count || 0} ok • {summary?.failed_count || 0} fail • {summary?.pending_count || 0} pend
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Operator-Wise vs Retailer-Wise */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveSubTab('OPERATOR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'OPERATOR'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Operator-Wise Earnings</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('RETAILER')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'RETAILER'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>User / Shop-Wise Earnings</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 font-medium hidden sm:block">
                Showing data for: <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{periods.find(p => p.id === period)?.label}</span>
              </div>
            </div>

            {/* TAB 1: OPERATOR-WISE EARNINGS */}
            {activeSubTab === 'OPERATOR' && (
              <>
                {/* Mobile Cards (No horizontal scroll) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {(!reportsData?.operator_reports || reportsData.operator_reports.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No recharge activity recorded for this period.
                    </div>
                  ) : (
                    reportsData.operator_reports.map((op) => (
                      <div key={op.operator_code} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <OperatorIcon operatorCode={op.operator_code} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">
                                {formatOperatorName(op.operator_code, op.operator_name)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{op.service_type}</div>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {op.count} orders
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center font-mono">
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Volume</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                              ₹{op.volume.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-blue-500 font-sans font-semibold">Retailer Paid</div>
                            <div className="text-xs font-bold text-blue-600 dark:text-brand-400 mt-0.5">
                              ₹{op.retailer_commission.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-500 font-sans font-semibold">Admin Profit</div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              +₹{op.admin_commission.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Operator & Category</th>
                        <th className="py-3 px-4 text-center">Orders</th>
                        <th className="py-3 px-4 text-right">Total Volume</th>
                        <th className="py-3 px-4 text-right">Retailer Commission</th>
                        <th className="py-3 px-4 text-right">Admin Net Profit</th>
                        <th className="py-3 px-4 text-center">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                      {(!reportsData?.operator_reports || reportsData.operator_reports.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-sans">
                            No recharge activity recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        reportsData.operator_reports.map((op) => (
                          <tr key={op.operator_code} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="py-3.5 px-4 font-sans">
                              <div className="flex items-center gap-2.5">
                                <OperatorIcon operatorCode={op.operator_code} size="sm" />
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                                    {formatOperatorName(op.operator_code, op.operator_name)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">{op.service_type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {op.count}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                              ₹{op.volume.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-blue-600 dark:text-brand-400">
                              +₹{op.retailer_commission.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              +₹{op.admin_commission.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                {op.success_rate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB 2: RETAILER-WISE EARNINGS */}
            {activeSubTab === 'RETAILER' && (
              <>
                {/* Mobile Cards (No horizontal scroll) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {(!reportsData?.user_reports || reportsData.user_reports.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No retailer activity recorded for this period.
                    </div>
                  ) : (
                    reportsData.user_reports.map((u) => (
                      <div key={u.user_id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {u.organization_name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{u.owner_name} • {u.phone}</div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {u.count} orders
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center font-mono">
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Turnover</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                              ₹{u.volume.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-blue-500 font-sans font-semibold">Earned Cashback</div>
                            <div className="text-xs font-bold text-blue-600 dark:text-brand-400 mt-0.5">
                              ₹{u.retailer_commission.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-500 font-sans font-semibold">Admin Profit</div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              +₹{u.admin_commission.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Retail Shop &amp; Owner</th>
                        <th className="py-3 px-4">Contact Phone</th>
                        <th className="py-3 px-4 text-center">Orders</th>
                        <th className="py-3 px-4 text-right">Total Turnover</th>
                        <th className="py-3 px-4 text-right">Retailer Paid</th>
                        <th className="py-3 px-4 text-right">Admin Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                      {(!reportsData?.user_reports || reportsData.user_reports.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-sans">
                            No retailer activity recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        reportsData.user_reports.map((u) => (
                          <tr key={u.user_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{u.organization_name}</div>
                              <div className="text-[10px] text-slate-400">{u.owner_name}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                              {u.phone}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {u.count}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                              ₹{u.volume.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-blue-600 dark:text-brand-400">
                              +₹{u.retailer_commission.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              +₹{u.admin_commission.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
