import React from 'react';
import { Home, History, Percent, User } from 'lucide-react';

export type RetailerNavTab = 'HOME' | 'RECHARGE' | 'PASSBOOK' | 'COMMISSIONS';

interface RetailerBottomNavProps {
  currentTab: RetailerNavTab;
  onSelectTab: (tab: RetailerNavTab) => void;
  onOpenShopInfo: () => void;
}

export const RetailerBottomNav: React.FC<RetailerBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenShopInfo
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around shadow-lg dark:shadow-2xl safe-area-bottom">
      {/* Tab 1: Home */}
      <button
        type="button"
        onClick={() => onSelectTab('HOME')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          currentTab === 'HOME'
            ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${currentTab === 'HOME' ? 'bg-blue-500/15 dark:bg-blue-500/20' : ''}`}>
          <Home className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Home</span>
      </button>

      {/* Tab 2: Passbook / Transactions */}
      <button
        type="button"
        onClick={() => onSelectTab('PASSBOOK')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          currentTab === 'PASSBOOK'
            ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${currentTab === 'PASSBOOK' ? 'bg-blue-500/15 dark:bg-blue-500/20' : ''}`}>
          <History className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Passbook</span>
      </button>

      {/* Tab 3: My Commission Rates */}
      <button
        type="button"
        onClick={() => onSelectTab('COMMISSIONS')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          currentTab === 'COMMISSIONS'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${currentTab === 'COMMISSIONS' ? 'bg-emerald-500/15 dark:bg-emerald-500/20' : ''}`}>
          <Percent className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Commission</span>
      </button>

      {/* Tab 4: Account / Profile */}
      <button
        type="button"
        onClick={onOpenShopInfo}
        className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
      >
        <div className="p-1 rounded-xl">
          <User className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Profile</span>
      </button>
    </nav>
  );
};
