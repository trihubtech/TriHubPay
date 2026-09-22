import React, { useState, useEffect } from 'react';
import { RetailerInsights, InsightsPeriod, Transaction, RetailerCommissionRate } from '../../types';
import { api } from '../../services/api';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Percent, 
  Calendar, 
  Lightbulb,
  RefreshCw, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Tv,
  Coins
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
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  // Collapsed by default
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Commission rates — loaded once when first opened
  const [rates, setRates] = useState<RetailerCommissionRate[]>([]);
  const [ratesLoaded, setRatesLoaded] = useState<boolean>(false);

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
      computeLocalInsights(selectedPeriod);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRates = async () => {
    if (ratesLoaded) return;
    try {
      const res = await api.getMyCommissions();
      if (res.success && res.data) {
        setRates(res.data);
        setRatesLoaded(true);
      }
    } catch {
      // ignore — we'll just show 0% if unavailable
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
    const serviceEarnings: Record<string, number> = {};

    for (const tx of filtered) {
      if (tx.status === 'SUCCESS') {
        const comm = Number(tx.retailer_commission || 0);
        const vol = Number(tx.face_value || 0);
        totalCommission += comm;
        totalVolume += vol;
        successCount++;
        const code = tx.operator_code;
        if (!opMap[code]) opMap[code] = { earnings: 0, volume: 0 };
        opMap[code].earnings += comm;
        opMap[code].volume += vol;
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

  // Only fetch when user opens the panel
  useEffect(() => {
    if (isOpen) {
      fetchInsights(period);
      fetchRates(); // fetch commission rates once for the margin highlights
    }
  }, [period, isOpen, transactions.length]);

  // Compute max rates from loaded commission data
  const getRateSafe = (r: any) => {
    const val = parseFloat(String(r.commission_rate ?? r.retailer_pass_down_rate ?? 0));
    return isNaN(val) ? 0 : val;
  };
  const mobileRates = rates.filter(r => r.service_type === 'MOBILE');
  const maxMobile = mobileRates.length > 0 ? Math.max(...mobileRates.map(getRateSafe)) : 0;
  const dthRates = rates.filter(r => r.service_type === 'DTH');
  const maxDth = dthRates.length > 0 ? Math.max(...dthRates.map(getRateSafe)) : 0;

  const periodLabels: Record<InsightsPeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'Last 7 Days',
    this_month: 'This Month',
    all: 'All Time'
  };

  // Quick summary numbers to show even when collapsed
  const todayEarnings = insights?.total_commission ?? 0;
  const todayOrders = insights?.successful_transactions ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-md overflow-hidden">

      {/* ─── Accordion Header: always visible, tap to open/close ─── */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
              Dashboard &amp; Insights
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isOpen
                ? 'Tap to hide your earnings dashboard'
                : 'Tap to see your margin rates & earnings summary'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mini summary badge — only meaningful after first load */}
          {isOpen === false && insights && insights.total_commission > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ₹{todayEarnings.toFixed(2)} today
            </span>
          )}
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* ─── Collapsible Body ─── */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800">

          {/* Period selector + refresh */}
          <div className="flex items-center justify-between gap-2 pt-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Showing data for:
            </div>
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as InsightsPeriod)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer appearance-none"
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
                title="Refresh"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* ── Margin Highlights (Up to X%) ── */}
              {(maxMobile > 0 || maxDth > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mobile Recharge</div>
                      <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                        Up to {maxMobile.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Instant cash discount</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DTH / Dish TV</div>
                      <div className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                        Up to {maxDth.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Tata Play, Sun Direct & more</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Instant Payout</div>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">100% Real-Time</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Deducted automatically</div>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI 4-Card Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                {/* Card 1: Commission Earned */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-200/80 dark:border-emerald-500/20 rounded-2xl p-3.5 sm:p-4">
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
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    Net profit added to your balance
                  </div>
                </div>

                {/* Card 2: Recharge Volume */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Recharge Done
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    ₹{insights ? insights.total_sales_volume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Total recharge amount processed
                  </div>
                </div>

                {/* Card 3: Orders */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Orders Done
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {insights ? insights.successful_transactions : 0}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ {insights ? insights.total_transactions : 0}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    {insights ? `${insights.success_rate}% orders successful` : '100% success'}
                  </div>
                </div>

                {/* Card 4: Avg Margin */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
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
                      <span>Best: <strong className="text-slate-700 dark:text-slate-300">{insights.top_operator.operator_code}</strong> (₹{insights.top_operator.earnings})</span>
                    ) : (
                      <span>Across all operators</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tip / Insight strip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-[11px]">
                    {insights && insights.total_commission > 0 ? (
                      <>
                        You earned <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{insights.total_commission.toFixed(2)}</strong> {periodLabels[period].toLowerCase()}.
                        {insights.top_operator && (
                          <span> Best operator: <strong>{insights.top_operator.operator_code}</strong>.</span>
                        )}
                      </>
                    ) : (
                      <>
                        <strong>Tip:</strong> Vi and BSNL recharges give up to 4% cashback. Try recommending 84-day unlimited plans for higher earnings!
                      </>
                    )}
                  </span>
                </div>

                {/* Quick links */}
                <div className="flex items-center gap-2 shrink-0">
                  {onNavigateToCommissions && (
                    <button
                      type="button"
                      onClick={onNavigateToCommissions}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>My Rates</span>
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
            </>
          )}
        </div>
      )}
    </div>
  );
};
