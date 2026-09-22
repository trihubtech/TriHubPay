import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Smartphone, 
  Tv, 
  Zap, 
  Car, 
  Play, 
  ShieldCheck, 
  CreditCard, 
  Grid, 
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
import { Transaction, RetailerCommissionRate, User } from '../../types';
import { api } from '../../services/api';
import { OperatorIcon } from '../common/OperatorIcon';

interface HomeScreenProps {
  currentUser: User;
  transactions: Transaction[];
  onOpenTopup: () => void;
  onSelectService: (service: 'MOBILE' | 'DTH' | 'ELECTRICITY') => void;
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

  const handleComingSoon = (serviceName: string) => {
    setComingSoonToast(`${serviceName} is coming soon in the next update!`);
    setTimeout(() => {
      setComingSoonToast(null);
    }, 2800);
  };

  const handleShareInvite = () => {
    const inviteText = `Join me on TriHubPay for instant mobile, DTH & electricity recharges with highest commissions! ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, '_blank');
    }
  };

  // Top operators to showcase in horizontal commission strip
  const showcaseOperators = [
    { code: 'JIO', defaultRate: 3.00 },
    { code: 'AIRTEL', defaultRate: 2.80 },
    { code: 'VI', defaultRate: 3.50 },
    { code: 'BSNL', defaultRate: 3.00 },
    { code: 'TATAPLAY', defaultRate: 3.20 },
    { code: 'DISHTV', defaultRate: 3.20 },
    { code: 'SUNDIRECT', defaultRate: 3.20 },
  ];

  return (
    <div className="space-y-4 pb-2 animate-in fade-in duration-200">
      {/* Coming Soon Toast Notification */}
      {comingSoonToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{comingSoonToast}</span>
        </div>
      )}

      {/* ─── 1. Primary Wallet Balance Card (Gold Standard Gradient) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-teal-700 to-emerald-600 p-5 sm:p-6 text-white shadow-xl shadow-blue-900/10">
        {/* Subtle Decorative Background Circles */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Wallet Info */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Wallet className="w-7 h-7 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold">
                <span>Wallet Balance</span>
                {onRefreshData && (
                  <button
                    onClick={onRefreshData}
                    disabled={isRefreshing}
                    title="Refresh Balance"
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-white/80 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <ChevronRight 
                  className="w-4 h-4 text-white/60 cursor-pointer hover:text-white" 
                  onClick={() => onNavigateToTab('PASSBOOK')} 
                />
              </div>

              <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-white mt-0.5">
                ₹{Number(currentUser?.current_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/25">
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>Wallet Active</span>
                </span>
                <span className="text-[10px] text-white/70 font-medium hidden sm:inline">
                  • 0.8s Lapu / BBPS Dispatch
                </span>
              </div>
            </div>
          </div>

          {/* Right: Add Money Button */}
          <button
            type="button"
            onClick={onOpenTopup}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-slate-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all shrink-0"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>Add Money (UPI)</span>
            <span className="text-emerald-600 font-extrabold ml-0.5">▶</span>
          </button>
        </div>
      </div>

      {/* ─── 2. 4 Quick Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Stat 1: Today's Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Today's Recharge
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {todayStats.rechargeCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ₹ {Number(todayStats?.rechargeVolume ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Stat 2: Today's Commission */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-purple-300 dark:hover:border-purple-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Today's Commission
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              ₹ {Number(todayStats?.totalCommission ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Net Profit Credited
            </div>
          </div>
        </div>

        {/* Stat 3: Pending Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-amber-300 dark:hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Pending Recharge
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {todayStats.pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ₹ {Number(todayStats?.pendingAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Stat 4: Failed Recharge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-rose-300 dark:hover:border-rose-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Failed Recharge
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {todayStats.failedCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ₹ {Number(todayStats?.failedAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. All Services Grid (PhonePe & Gold Standard Reference) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            All Services
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('RECHARGE')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
          {/* Tile 1: Mobile Recharge */}
          <button
            type="button"
            onClick={() => onSelectService('MOBILE')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Mobile Recharge
            </span>
          </button>

          {/* Tile 2: DTH */}
          <button
            type="button"
            onClick={() => onSelectService('DTH')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Tv className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              DTH TV
            </span>
          </button>

          {/* Tile 3: Electricity Bill */}
          <button
            type="button"
            onClick={() => onSelectService('ELECTRICITY')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Electricity Bill
            </span>
          </button>

          {/* Tile 4: FASTag (Coming Soon) */}
          <button
            type="button"
            onClick={() => handleComingSoon('FASTag Recharge')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group relative"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Car className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              FASTag
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-full mt-0.5 border border-blue-200 dark:border-blue-900">
              Soon
            </span>
          </button>

          {/* Tile 5: Google Play */}
          <button
            type="button"
            onClick={() => handleComingSoon('Google Play Recharge')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group relative"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Google Play
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-full mt-0.5 border border-blue-200 dark:border-blue-900">
              Soon
            </span>
          </button>

          {/* Tile 6: Insurance */}
          <button
            type="button"
            onClick={() => handleComingSoon('Insurance Premium Payment')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group relative"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Insurance
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-full mt-0.5 border border-blue-200 dark:border-blue-900">
              Soon
            </span>
          </button>

          {/* Tile 7: EMI / Loan */}
          <button
            type="button"
            onClick={() => handleComingSoon('EMI & Loan Repayments')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group relative"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              EMI / Loan
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-full mt-0.5 border border-blue-200 dark:border-blue-900">
              Soon
            </span>
          </button>

          {/* Tile 8: More Services */}
          <button
            type="button"
            onClick={() => handleComingSoon('Additional BBPS & Retailer Services')}
            className="flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 group relative"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Grid className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              More Services
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-full mt-0.5 border border-blue-200 dark:border-blue-900">
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* ─── 4. Invite Friends / Growth Banner (Matching Reference) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Invite Retailers & Earn
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-amber-300">
              Get up to ₹15 Cashback
            </div>
            <p className="text-xs text-blue-100 max-w-sm">
              When your retailer friend signs up and adds ₹100 or more to their TriHubPay wallet.
            </p>
          </div>

          <button
            type="button"
            onClick={handleShareInvite}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs flex items-center gap-2 shadow-md shrink-0 active:scale-95 transition-all"
          >
            {copiedInvite ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Invite Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 5. % Operator & Circle Commission Strip (Horizontal Scroll) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              Operator & Circle Commission
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
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scrollbar-none touch-scroll py-1 -mx-1 px-1">
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
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 transition-all shrink-0 w-24 sm:w-28 active:scale-95"
              >
                <div className="mb-2">
                  <OperatorIcon operatorCode={item.code} size="md" />
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {Number(rateVal).toFixed(2)}%
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Margin
                </div>
              </button>
            );
          })}

          {/* View More Card */}
          <button
            type="button"
            onClick={() => onNavigateToTab('COMMISSIONS')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 transition-all shrink-0 w-24 sm:w-28 active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 text-slate-600 dark:text-slate-400 font-bold text-sm">
              ···
            </div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
              View All
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              12+ Rates
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
