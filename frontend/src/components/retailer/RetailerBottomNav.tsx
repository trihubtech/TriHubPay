import React from 'react';
import { Smartphone, History, PlusCircle, Store } from 'lucide-react';

interface RetailerBottomNavProps {
  currentTab: 'RECHARGE' | 'PASSBOOK';
  onSelectTab: (tab: 'RECHARGE' | 'PASSBOOK') => void;
  onOpenTopup: () => void;
  onOpenShopInfo: () => void;
}

export const RetailerBottomNav: React.FC<RetailerBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenTopup,
  onOpenShopInfo
}) => {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg dark:shadow-2xl safe-area-bottom">
      {/* Tab 1: Recharge */}
      <button
        type="button"
        onClick={() => onSelectTab('RECHARGE')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
          currentTab === 'RECHARGE'
            ? 'text-blue-600 dark:text-brand-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${currentTab === 'RECHARGE' ? 'bg-blue-500/10 dark:bg-brand-500/10' : ''}`}>
          <Smartphone className="w-5 h-5" />
        </div>
        <span className="text-[10px]">Recharge</span>
      </button>

      {/* Tab 2: Passbook / Transactions */}
      <button
        type="button"
        onClick={() => onSelectTab('PASSBOOK')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
          currentTab === 'PASSBOOK'
            ? 'text-blue-600 dark:text-brand-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${currentTab === 'PASSBOOK' ? 'bg-blue-500/10 dark:bg-brand-500/10' : ''}`}>
          <History className="w-5 h-5" />
        </div>
        <span className="text-[10px]">Passbook</span>
      </button>

      {/* Action 3: Add Cash UPI */}
      <button
        type="button"
        onClick={onOpenTopup}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold active:scale-95 transition-all"
      >
        <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <PlusCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px]">Add Cash</span>
      </button>

      {/* Action 4: Account / Profile */}
      <button
        type="button"
        onClick={onOpenShopInfo}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
      >
        <div className="p-1 rounded-lg">
          <Store className="w-5 h-5" />
        </div>
        <span className="text-[10px]">My Profile</span>
      </button>
    </div>
  );
};
