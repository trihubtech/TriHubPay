import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Smartphone, 
  Tv, 
  Zap, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Gift, 
  Share2, 
  Check, 
  RefreshCw,
  Percent
} from 'lucide-react';
import { Transaction, RetailerCommissionRate, User, ServiceType } from '../../types';
import { api } from '../../services/api';
import { OperatorIcon } from '../common/OperatorIcon';
import { useLanguage } from '../../context/LanguageContext';

interface HomeScreenProps {
  currentUser: User;
  transactions: Transaction[];
  onOpenTopup: () => void;
  onSelectService: (service: ServiceType) => void;
  onNavigateToTab: (tab: 'RECHARGE' | 'PASSBOOK' | 'COMMISSIONS') => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  transactions,
  onOpenTopup,
  onSelectService,
  onNavigateToTab,
  onRefreshData,
  isRefreshing = false
}) => {
  const { t } = useLanguage();
  const [rates, setRates] = useState<RetailerCommissionRate[]>([]);
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  // Load commission rates for the bottom strip
  useEffect(() => {
    let isMounted = true;
    api.getMyCommissions()
      .then(res => {
        if (isMounted && res.success && res.data) {
          setRates(res.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Compute Today's Stats from transactions
  const todayStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    let rechargeCount = 0;
    let rechargeVolume = 0;
    let totalCommission = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;

    for (const tx of transactions) {
      const txTime = new Date(tx.created_at).getTime();
      const isToday = txTime >= startOfToday && txTime <= endOfToday;

      if (isToday) {
        if (tx.status === 'SUCCESS') {
          rechargeCount++;
          rechargeVolume += Number(tx.face_value || 0);
          totalCommission += Number(tx.retailer_commission || 0);
        } else if (tx.status === 'PENDING') {
          pendingCount++;
          pendingAmount += Number(tx.face_value || 0);
        } else if (tx.status === 'FAILED') {
          failedCount++;
          failedAmount += Number(tx.face_value || 0);
        }
      }
    }

    return {
      rechargeCount,
      rechargeVolume,
      totalCommission,
      pendingCount,
      pendingAmount,
      failedCount,
      failedAmount
    };
  }, [transactions]);

  const handleShareInvite = async () => {
    const inviteUrl = window.location.origin;
    const shareData = {
      title: 'Join TriHubPay Platform',
      text: '🏪 Join me on TriHubPay — Instant mobile & DTH recharges with highest commissions and instant dispatch! Sign up here:',
      url: inviteUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('Share dismissed or failed', err);
        }
      }
    }

    const fullText = `${shareData.text} ${shareData.url}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullText);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
    }
  };

  // Top operators to showcase in horizontal commission strip (50/50 split of wholesale rates)
  const showcaseOperators = [
    { code: 'JIO', defaultRate: 0.50 },
    { code: 'AIRTEL', defaultRate: 0.50 },
    { code: 'VI', defaultRate: 1.75 },
    { code: 'BSNL', defaultRate: 1.50 },
    { code: 'TATAPLAY', defaultRate: 1.55 },
    { code: 'DISHTV', defaultRate: 1.60 },
    { code: 'SUNDIRECT', defaultRate: 1.40 },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 pb-1 animate-in fade-in duration-200">
      {/* Coming Soon Toast Notification */}
      {comingSoonToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{comingSoonToast}</span>
        </div>
      )}

      {/* ─── 1. Primary Wallet Balance Card (Compact & Proportionate) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-teal-700 to-emerald-600 p-3.5 sm:p-5 text-white shadow-lg shadow-blue-900/10">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Wallet Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold">
                <span className="truncate">{t('walletBalance')}</span>
                {onRefreshData && (
                  <button
                    onClick={onRefreshData}
                    disabled={isRefreshing}
                    title="Refresh Balance"
                    className="p-0.5 hover:bg-white/10 rounded-full transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3 h-3 text-white/80 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <ChevronRight 
                  className="w-3.5 h-3.5 text-white/60 cursor-pointer hover:text-white shrink-0" 
                  onClick={() => onNavigateToTab('PASSBOOK')} 
                />
              </div>

              <div className="text-xl sm:text-3xl font-black tracking-tight font-mono text-white mt-0.5 truncate">
                ₹{Number(currentUser?.current_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/25">
                  <Check className="w-2.5 h-2.5 text-emerald-300" />
                  <span>{t('walletActive')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Add Money Button */}
          <button
            type="button"
            onClick={onOpenTopup}
            className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white text-blue-700 hover:bg-slate-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
            </div>
            <span>{t('addCash')}</span>
            <span className="text-emerald-600 font-extrabold ml-0.5 text-xs">▶</span>
          </button>
        </div>
      </div>

      {/* ─── 2. 4 Quick Stat Cards (Compact Height) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Stat 1: Today's Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xs transition-all flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {t('todayRecharge')}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
              {todayStats.rechargeCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
              ₹ {Number(todayStats?.rechargeVolume ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Stat 2: Today's Commission */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xs transition-all flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {t('todayCommission')}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono truncate">
              ₹ {Number(todayStats?.totalCommission ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
              {t('netProfitCredited')}
            </div>
          </div>
        </div>

        {/* Stat 3: Pending Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xs transition-all flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {t('pendingRecharge')}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
              {todayStats.pendingCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
              ₹ {Number(todayStats?.pendingAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Stat 4: Failed Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xs transition-all flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {t('failedRecharge')}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
              {todayStats.failedCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
              ₹ {Number(todayStats?.failedAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Active Live Services Grid (Mobile & DTH) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            {t('rechargeServices')}
          </h2>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
            ● {t('liveInstant')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Tile 1: Mobile Recharge */}
          <button
            type="button"
            onClick={() => onSelectService('MOBILE')}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 transition-all active:scale-95 group text-left min-w-0"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Smartphone className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {t('mobileRecharge')}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Jio, Airtel, Vi, BSNL
              </div>
            </div>
          </button>

          {/* Tile 2: DTH */}
          <button
            type="button"
            onClick={() => onSelectService('DTH')}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 transition-all active:scale-95 group text-left min-w-0"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Tv className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {t('dthTv')}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Tata Play, Sun, Dish
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── 4. Share TriHubPay App Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-3 sm:p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
              {t('shareApp')}
            </div>
            <div className="text-xs sm:text-base font-extrabold text-white truncate">
              {t('shareSubtitle')}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const url = window.location.origin;
                const text = encodeURIComponent(`🏪 Join TriHubPay — Instant mobile & DTH recharge with high commissions! Sign up here: ${url}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleShareInvite}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5. % Operator & Circle Commission Strip (Horizontal Scroll) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {t('commission')}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('COMMISSIONS')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal scroll cards */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none touch-scroll py-1 -mx-0.5 px-0.5">
          {showcaseOperators.map((item) => {
            const matchedRate = rates.find(r => r.operator_code === item.code);
            const rawRate = matchedRate ? (matchedRate.commission_rate ?? (matchedRate as any).retailer_pass_down_rate) : undefined;
            const parsedRate = rawRate !== undefined ? parseFloat(String(rawRate)) : NaN;
            const rateVal = !isNaN(parsedRate) ? parsedRate : item.defaultRate;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onNavigateToTab('COMMISSIONS')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 transition-all shrink-0 min-w-[76px] sm:min-w-[90px] active:scale-95"
              >
                <div className="mb-1">
                  <OperatorIcon operatorCode={item.code} size="sm" />
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {Number(rateVal).toFixed(2)}%
                </div>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Margin
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
