import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Globe, 
  Smartphone, 
  CheckCircle2, 
  Share2, 
  X, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  MoreVertical
} from 'lucide-react';

export const AppInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showManualGuide, setShowManualGuide] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect if running inside standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        window.location.search.includes('source=pwa');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();

    // 2. Detect iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIos(isApple);

    // 3. Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // If user hasn't made a choice yet and not in standalone, open prompt
      const previousChoice = sessionStorage.getItem('trihubpay_pwa_choice');
      if (!previousChoice && !standalone) {
        setIsOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('trihubpay_pwa_choice', 'installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. If no beforeinstallprompt fired within 1.5 seconds (e.g., iOS or mobile HTTP test)
    // and user has never made a choice in this session, show prompt
    const timer = setTimeout(() => {
      const previousChoice = sessionStorage.getItem('trihubpay_pwa_choice');
      if (!previousChoice && !checkStandalone()) {
        setIsOpen(true);
      }
    }, 1200);

    // 6. Allow any button across the app to re-trigger the install prompt
    const handleCustomOpen = () => {
      setIsOpen(true);
      setShowManualGuide(false);
    };
    window.addEventListener('open-trihubpay-install', handleCustomOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-trihubpay-install', handleCustomOpen);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          sessionStorage.setItem('trihubpay_pwa_choice', 'installed');
          setIsOpen(false);
          setDeferredPrompt(null);
        } else {
          sessionStorage.setItem('trihubpay_pwa_choice', 'dismissed');
          setIsOpen(false);
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowManualGuide(true);
      }
    } else {
      // Browser didn't provide native prompt (e.g. iOS Safari, or Android Chrome over local HTTP)
      setShowManualGuide(true);
    }
  };

  const handleContinueInWeb = () => {
    sessionStorage.setItem('trihubpay_pwa_choice', 'web');
    setIsOpen(false);
  };

  // Do not render anything if already running as installed app or already installed
  if (isStandalone || isInstalled || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 transform transition-all animate-slideUp">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/icon-192.png" 
              alt="TriHubPay" 
              className="w-12 h-12 rounded-2xl object-cover shadow-md border border-slate-100 dark:border-slate-800"
            />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                TriHubPay
              </h3>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                Fast, 1-Tap Payments &amp; Recharges
              </p>
            </div>
          </div>
          <button 
            onClick={handleContinueInWeb}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showManualGuide ? (
          <>
            {/* Value Proposition Cards */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Choose how you want to use TriHubPay:
              </div>
              
              <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Full-Screen App Mode:</span> Launches instantly from your home screen without the browser search bar or extra tabs.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Instant &amp; Lightweight:</span> No Play Store / App Store download needed (<span className="font-bold text-emerald-600 dark:text-emerald-400">&lt; 2 MB</span>).
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download &amp; Use as App</span>
              </button>

              <button
                onClick={handleContinueInWeb}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Continue in Web Browser</span>
              </button>
            </div>
          </>
        ) : (
          /* Manual Step-by-Step Guide (if browser didn't fire automatic prompt) */
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 border border-brand-200 dark:border-brand-800">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                {isIos ? 'Install on iPhone / iPad' : 'Install on Android Phone'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Follow these 2 quick steps to add TriHubPay to your home screen:
              </p>
            </div>

            {isIos ? (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <span>Tap Safari&apos;s <strong className="text-brand-600 dark:text-brand-400">Share</strong> button <Share2 className="w-3.5 h-3.5 inline ml-1" /> at the bottom.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <span>Scroll down and tap <strong className="text-slate-900 dark:text-white">&quot;Add to Home Screen&quot;</strong>.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <span>Tap <strong className="text-emerald-600 dark:text-emerald-400">&quot;Add&quot;</strong> in the top-right corner. Done!</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <span>
                    Tap the <strong className="text-brand-600 dark:text-brand-400">⋮ (three dots)</strong> menu at the top right of Chrome.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <span>
                    Tap <strong className="text-slate-900 dark:text-white">&quot;Install app&quot;</strong> or <strong className="text-slate-900 dark:text-white">&quot;Add to Home screen&quot;</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <span>
                    Tap <strong className="text-emerald-600 dark:text-emerald-400">&quot;Install&quot;</strong>. The official app icon will appear directly on your phone!
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleContinueInWeb}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Got it, Continue
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
