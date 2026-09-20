import React from 'react';
import { Wallet, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface WalletStripProps {
  balance: number;
  shopName: string;
  onOpenTopup: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const WalletStrip: React.FC<WalletStripProps> = ({
  balance,
  shopName,
  onOpenTopup,
  onRefresh,
  isRefreshing = false
}) => {
  const isLowBalance = balance < 500;

  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm dark:shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Shop Name & Status */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600/10 to-emerald-500/10 border border-blue-500/20 flex items-center justify-center p-1.5 shrink-0 shadow-sm">
            <img src="/logo.png?v=2" alt="TriHub" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{shopName || 'My Account'}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Wallet Cash
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                onClick={onRefresh}
                title="Refresh Balance"
                disabled={isRefreshing}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Low balance alert & Top-up action */}
        <div className="flex items-center gap-2">
          {isLowBalance && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Low Balance</span>
            </div>
          )}

          <button
            onClick={onOpenTopup}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Cash (UPI)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
