import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone app mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa');
    setIsStandalone(isStandaloneMode);
  }, []);

  const handleOpenInstallPrompt = () => {
    window.dispatchEvent(new CustomEvent('open-trihubpay-install'));
  };

  // Do not render if already running as installed standalone app or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-brand-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 border-b border-brand-200/80 dark:border-brand-500/20 px-4 py-2 text-slate-800 dark:text-slate-100 shadow-sm transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Install TriHubPay</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800/50 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                Fast App
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Get the standalone app for 1-tap recharges &amp; full-screen view
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenInstallPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-600/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
