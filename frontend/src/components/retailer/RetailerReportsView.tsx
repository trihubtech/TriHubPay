import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const RetailerReportsView: React.FC = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<string>('today');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  const periods: Array<{ id: string; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all', label: 'All Time' }
  ];

  const fetchReports = async (p: string) => {
    setLoading(true);
    try {
      const res = await api.getRetailerReports(p);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load retailer reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const summary = data;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>My Recharge Turnover &amp; Earnings Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time track of your sales volume, instant cashback, and operator margins.
          </p>
        </div>

        {/* Period Selector Pills */}
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

      {loading && !data ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Computing your earnings...</span>
        </div>
      ) : (
        <>
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Turnover Volume */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Total Recharge Volume</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                ₹{Number(summary?.total_sales_volume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                From successful orders
              </div>
            </div>

            {/* 2. Earned Cashback */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Earned Cashback</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +₹{Number(summary?.total_commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Credited directly to wallet
              </div>
            </div>

            {/* 3. Successful Recharges */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Successful Orders</span>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary?.successful_transactions || 0}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {summary?.failed_transactions ? `${summary.failed_transactions} failed` : 'Zero failures'}
              </div>
            </div>

            {/* 4. Success Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Success Rate</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary?.success_rate?.toFixed(1) || 100}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {summary?.total_transactions || 0} total requests
              </div>
            </div>
          </div>

          {/* Operator-Wise Breakdown Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Operator-Wise Recharge Breakdown</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {periods.find(p => p.id === period)?.label}
              </span>
            </div>

            {/* Mobile Card Layout (Zero table scroll on mobile) */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {(!summary?.operator_breakdown || summary.operator_breakdown.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No recharge activity recorded for this period.
                </div>
              ) : (
                summary.operator_breakdown.map((op: any) => (
                  <div key={op.operator_code} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <OperatorIcon operatorCode={op.operator_code} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatOperatorName(op.operator_code)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{op.operator_code}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {op.count} {op.count === 1 ? 'order' : 'orders'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center font-mono">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans font-medium">Turnover</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          ₹{Number(op.volume || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-emerald-500 font-sans font-semibold">Earned Cashback</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          +₹{Number(op.commission || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Turnover (GMV)</th>
                    <th className="py-3 px-4 text-right">Earned Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                  {(!summary?.operator_breakdown || summary.operator_breakdown.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-sans">
                        No recharge activity recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    summary.operator_breakdown.map((op: any) => (
                      <tr key={op.operator_code} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex items-center gap-2.5">
                            <OperatorIcon operatorCode={op.operator_code} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">
                                {formatOperatorName(op.operator_code)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{op.operator_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {op.count}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                          ₹{Number(op.volume || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{Number(op.commission || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
