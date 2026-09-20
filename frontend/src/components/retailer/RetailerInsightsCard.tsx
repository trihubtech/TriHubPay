import React, { useState, useEffect } from 'react';
import { RetailerInsights, InsightsPeriod, Transaction } from '../../types';
import { api } from '../../services/api';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Percent, 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  ArrowUpRight,
  Smartphone,
  Tv,
  Lightbulb
} from 'lucide-react';

interface RetailerInsightsCardProps {
  transactions?: Transaction[];
  onNavigateToCommissions?: () => void;
  onNavigateToPassbook?: () => void;
}

export const RetailerInsightsCard: React.FC<RetailerInsightsCardProps> = ({
  transactions = [],
  onNavigateToCommissions,
  onNavigateToPassbook
}) => {
  const [period, setPeriod] = useState<InsightsPeriod>('today');
  const [insights, setInsights] = useState<RetailerInsights | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchInsights = async (selectedPeriod: InsightsPeriod, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getMyInsights(selectedPeriod);
      if (res.success && res.data) {
        setInsights(res.data);
      }
    } catch (err) {
      console.warn('Backend insights fetch failed, computing client fallback from transactions', err);
      // Fallback: Compute insights locally from transactions
      computeLocalInsights(selectedPeriod);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const computeLocalInsights = (selectedPeriod: InsightsPeriod) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (selectedPeriod === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (selectedPeriod === 'this_week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (selectedPeriod === 'all') {
      startDate = new Date(0);
    } else {
      // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    const filtered = transactions.filter(tx => {
      const txTime = new Date(tx.created_at).getTime();
      return txTime >= startDate.getTime() && txTime <= endDate.getTime();
    });

    let totalCommission = 0;
    let totalVolume = 0;
    let successCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    const opMap: Record<string, { earnings: number; volume: number }> = {};
    const serviceEarnings: Record<string, number> = { MOBILE: 0, DTH: 0, ELECTRICITY: 0 };

    for (const tx of filtered) {
      if (tx.status === 'SUCCESS') {
        const comm = Number(tx.retailer_commission || 0);
        const val = Number(tx.face_value || 0);
        totalCommission += comm;
        totalVolume += val;
        successCount++;

        const op = tx.operator_code || 'OTHER';
        if (!opMap[op]) opMap[op] = { earnings: 0, volume: 0 };
        opMap[op].earnings += comm;
        opMap[op].volume += val;

        const sType = tx.service_type || 'MOBILE';
        serviceEarnings[sType] = (serviceEarnings[sType] || 0) + comm;
      } else if (tx.status === 'FAILED') {
        failedCount++;
      } else {
        pendingCount++;
      }
    }

    let topOp: { operator_code: string; earnings: number; volume: number } | null = null;
    for (const [code, stats] of Object.entries(opMap)) {
      if (!topOp || stats.earnings > topOp.earnings) {
        topOp = { operator_code: code, earnings: Number(stats.earnings.toFixed(2)), volume: Number(stats.volume.toFixed(2)) };
      }
    }

    const totalTxs = filtered.length;
    const successRate = totalTxs > 0 ? Number(((successCount / totalTxs) * 100).toFixed(1)) : 100;
    const avgCommissionRate = totalVolume > 0 ? Number(((totalCommission / totalVolume) * 100).toFixed(2)) : 0;

    setInsights({
      period: selectedPeriod,
      total_commission: Number(totalCommission.toFixed(2)),
      total_sales_volume: Number(totalVolume.toFixed(2)),
      total_transactions: totalTxs,
      successful_transactions: successCount,
      failed_transactions: failedCount,
      pending_transactions: pendingCount,
      success_rate: successRate,
      average_commission_rate: avgCommissionRate,
      top_operator: topOp,
      earnings_by_service: serviceEarnings as any
    });
  };

  useEffect(() => {
    fetchInsights(period);
  }, [period, transactions.length]);

  const periodLabels: Record<InsightsPeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'Last 7 Days',
    this_month: 'This Month',
    all: 'All Time'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-md space-y-4">
      {/* Top Header: Title, Period Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <span>Commission & Business Insights</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Live Earnings
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Track your daily retailer earnings, recharge sales volume, and operator margins
            </p>
          </div>
        </div>

        {/* Date Filter Selector + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative inline-flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as InsightsPeriod)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer shadow-xs appearance-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>

          <button
            type="button"
            onClick={() => fetchInsights(period, true)}
            title="Refresh Insights"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI 4-Card Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Commission Earned */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-200/80 dark:border-emerald-500/20 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              {periodLabels[period]} Earnings
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{insights ? insights.total_commission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Net profit added to float</span>
          </div>
        </div>

        {/* Card 2: Total Sales Volume */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Recharge Volume
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{insights ? insights.total_sales_volume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Face value billed to users</span>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Orders
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {insights ? insights.successful_transactions : 0}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {insights ? insights.total_transactions : 0}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <span>{insights ? `${insights.success_rate}% success rate` : '100% success'}</span>
          </div>
        </div>

        {/* Card 4: Average Commission Rate */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Avg Margin
            </span>
            <div className="w-6 h-6 rounded-lg bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {insights ? `${insights.average_commission_rate.toFixed(2)}%` : '0.00%'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {insights?.top_operator ? (
              <span>Top: <strong className="text-slate-700 dark:text-slate-300">{insights.top_operator.operator_code}</strong> (₹{insights.top_operator.earnings})</span>
            ) : (
              <span>Across all operators</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Intelligence & Category Breakdown Strip */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-[11px]">
            {insights && insights.total_commission > 0 ? (
              <>
                You've earned <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">₹{insights.total_commission.toFixed(2)}</strong> {periodLabels[period].toLowerCase()}.
                {insights.top_operator && (
                  <span> Highest profits driven by <strong>{insights.top_operator.operator_code}</strong>.</span>
                )}
              </>
            ) : (
              <>
                💡 <strong>Maximize Your Profit:</strong> Recharges for Vi and BSNL earn up to 4.0% instant cashback. Recommend unlimited 84-day packs for max margin!
              </>
            )}
          </span>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToCommissions && (
            <button
              type="button"
              onClick={onNavigateToCommissions}
              className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
            >
              <span>View Rates</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {onNavigateToPassbook && (
            <button
              type="button"
              onClick={onNavigateToPassbook}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5"
            >
              <span>Passbook</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
