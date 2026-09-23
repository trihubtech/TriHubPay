import React, { useState, useEffect } from 'react';
import { api, getActiveAuthToken } from './services/api';
import { User, Transaction, DashboardKPIs, CommissionMatrixItem, ServiceType } from './types';

// Retailer components
import { HomeScreen } from './components/retailer/HomeScreen';
import { WalletStrip } from './components/retailer/WalletStrip';
import { UpiTopupModal } from './components/retailer/UpiTopupModal';
import { RechargeTabs } from './components/retailer/RechargeTabs';
import { LedgerTable } from './components/retailer/LedgerTable';
import { ThermalReceiptModal } from './components/retailer/ThermalReceiptModal';
import { PwaInstallBanner } from './components/retailer/PwaInstallBanner';
import { RetailerBottomNav } from './components/retailer/RetailerBottomNav';
import { ShopInfoModal } from './components/retailer/ShopInfoModal';
import { MyCommissionsTable } from './components/retailer/MyCommissionsTable';
import { RetailerInsightsCard } from './components/retailer/RetailerInsightsCard';

// Admin components
import { DashboardKPIs as DashboardKPIsComponent } from './components/admin/DashboardKPIs';
import { UserBalanceManager } from './components/admin/UserBalanceManager';
import { CommissionMatrixGrid } from './components/admin/CommissionMatrixGrid';
import { ShopCustomCommissionModal } from './components/admin/ShopCustomCommissionModal';
import { FailoverToggle } from './components/admin/FailoverToggle';
import { AllTransactionsTable } from './components/admin/AllTransactionsTable';
import { OnboardShopModal } from './components/admin/OnboardShopModal';
import { PendingDepositsTable } from './components/admin/PendingDepositsTable';
import { AdminReportsView } from './components/admin/AdminReportsView';

// Auth Screen
import { AuthPage } from './components/auth/AuthPage';
import { TriHubLogo } from './components/common/TriHubLogo';
import { ThemeToggle } from './components/common/ThemeToggle';
import { AppInstallPrompt } from './components/common/AppInstallPrompt';
import { SignOutConfirmModal } from './components/common/SignOutConfirmModal';

import { 
  Home,
  ShieldCheck, 
  RefreshCw, 
  Zap,
  LogOut,
  Sparkles,
  Layers,
  Store,
  Percent,
  BarChart3
} from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

export function App() {
  const { t } = useLanguage();
  // Current Authenticated User (null if logged out)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Retailer states
  const [retailerTransactions, setRetailerTransactions] = useState<Transaction[]>([]);
  const [isTopupOpen, setIsTopupOpen] = useState<boolean>(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isRefreshingRetailer, setIsRefreshingRetailer] = useState<boolean>(false);
  const [welcomeBanner, setWelcomeBanner] = useState<string>('');
  const [retailerTab, setRetailerTab] = useState<'HOME' | 'RECHARGE' | 'PASSBOOK' | 'COMMISSIONS'>('HOME');
  const [selectedRechargeService, setSelectedRechargeService] = useState<ServiceType>('MOBILE');
  const [isShopInfoOpen, setIsShopInfoOpen] = useState<boolean>(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState<boolean>(false);

  // Admin states
  const [adminKPIs, setAdminKPIs] = useState<DashboardKPIs | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matrixItems, setMatrixItems] = useState<CommissionMatrixItem[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedShopForOverrides, setSelectedShopForOverrides] = useState<User | null>(null);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [adminSubTab, setAdminSubTab] = useState<'OVERVIEW' | 'REPORTS' | 'SHOPS' | 'MATRIX' | 'FAILOVER' | 'TRANSACTIONS' | 'DEPOSITS'>('OVERVIEW');

  // Check saved session on load (route-aware token isolation)
  useEffect(() => {
    // 1. Listen for immediate account deactivation force-logout event
    const handleForceLogout = (e: any) => {
      const msg = e.detail?.message || 'Your account has been deactivated. Please contact TriHubPay administrator.';
      setCurrentUser(null);
      alert(msg);
    };
    window.addEventListener('trihub_force_logout', handleForceLogout);

    const token = getActiveAuthToken();
    const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.success) {
            // Strictly enforce role-route isolation
            if (isAdminRoute && res.data.role !== 'ADMIN') {
              // Retailer token attempting to browse /admin: do NOT log in as retailer!
              setCurrentUser(null);
            } else if (!isAdminRoute && res.data.role === 'ADMIN') {
              // Admin browsing /: check if retailer token exists
              const retailerToken = localStorage.getItem('trihub_retailer_token');
              if (retailerToken) {
                // Attempt to load retailer account
                api.getMe()
                  .then(rRes => {
                    if (rRes.success && rRes.data.role === 'RETAILER') {
                      setCurrentUser(rRes.data);
                      loadRetailerData();
                    } else {
                      setCurrentUser(res.data);
                      loadAdminData();
                    }
                  })
                  .catch(() => {
                    setCurrentUser(res.data);
                    loadAdminData();
                  });
                return;
              }
              setCurrentUser(res.data);
              loadAdminData();
            } else {
              setCurrentUser(res.data);
              if (res.data.role === 'ADMIN') {
                loadAdminData();
              } else {
                loadRetailerData();
              }
            }
          } else {
            if (isAdminRoute) localStorage.removeItem('trihub_admin_token');
            else localStorage.removeItem('trihub_retailer_token');
            localStorage.removeItem('trihub_token');
            setCurrentUser(null);
          }
        })
        .catch(() => {
          if (isAdminRoute) localStorage.removeItem('trihub_admin_token');
          else localStorage.removeItem('trihub_retailer_token');
          localStorage.removeItem('trihub_token');
          setCurrentUser(null);
        })
        .finally(() => setIsInitializing(false));
    } else {
      setCurrentUser(null);
      setIsInitializing(false);
    }

    // 2. Periodic background session validation heartbeat (ejects deactivated accounts within 20s)
    const heartbeatInterval = setInterval(() => {
      const activeToken = getActiveAuthToken();
      if (activeToken) {
        api.getMe().catch(() => {});
      }
    }, 20000);

    return () => {
      window.removeEventListener('trihub_force_logout', handleForceLogout);
      clearInterval(heartbeatInterval);
    };
  }, []);

  const loadRetailerData = async () => {
    setIsRefreshingRetailer(true);
    try {
      const [balRes, txRes] = await Promise.allSettled([
        api.getBalance(),
        api.getRetailerTransactions()
      ]);

      if (balRes.status === 'fulfilled' && balRes.value.success) {
        setCurrentUser(prev => prev ? { ...prev, current_balance: balRes.value.data.current_balance } : null);
      }
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        setRetailerTransactions(txRes.value.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingRetailer(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [kpiRes, userRes, matrixRes, txRes] = await Promise.allSettled([
        api.getDashboardKPIs(),
        api.getAllUsers(),
        api.getCommissionMatrix(),
        api.getAllTransactions()
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value.success) setAdminKPIs(kpiRes.value.data);
      if (userRes.status === 'fulfilled' && userRes.value.success) setAllUsers(userRes.value.data);
      if (matrixRes.status === 'fulfilled' && matrixRes.value.success) setMatrixItems(matrixRes.value.data);
      if (txRes.status === 'fulfilled' && txRes.value.success) setAllTransactions(txRes.value.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (user: User, token: string, isNewRegistration?: boolean) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      localStorage.setItem('trihub_admin_token', token);
      localStorage.setItem('trihub_token', token);
      loadAdminData();
    } else {
      localStorage.setItem('trihub_retailer_token', token);
      localStorage.setItem('trihub_token', token);
      loadRetailerData();
      if (isNewRegistration) {
        setWelcomeBanner(`🎉 Welcome ${user.organization_name}! Your store is onboarded. Load float via UPI QR to start recharging.`);
        setIsTopupOpen(true);
      }
    }
  };

  const handleLogout = () => {
    const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
    if (isAdminRoute || currentUser?.role === 'ADMIN') {
      localStorage.removeItem('trihub_admin_token');
    } else {
      localStorage.removeItem('trihub_retailer_token');
    }
    localStorage.removeItem('trihub_token');
    setCurrentUser(null);
    setWelcomeBanner('');
  };

  const handleRechargeSuccess = (txData: any, newBalance: number) => {
    setCurrentUser(prev => prev ? { ...prev, current_balance: newBalance } : null);
    setReceiptTx(txData);
    setIsReceiptOpen(true);
    loadRetailerData();
    if (currentUser?.role === 'ADMIN') loadAdminData();
  };

  const handleTopupSuccess = (newBalance: number) => {
    setCurrentUser(prev => prev ? { ...prev, current_balance: newBalance } : null);
    setWelcomeBanner('');
    loadRetailerData();
    if (currentUser?.role === 'ADMIN') loadAdminData();
  };

  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('trihub_user', JSON.stringify(updatedUser));
  };

  // 1. Initial Loading Screen (Branded White Background Splash)
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="w-24 h-24 mb-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-2 flex items-center justify-center animate-pulse">
          <img src="/icon-192.png" alt="TriHubPay Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          TriHub<span className="text-brand-600">Pay</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
          Instant Mobile &amp; DTH Recharges • 100% Reliable
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs font-mono text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
          <span>Starting Secure Engine...</span>
        </div>
      </div>
    );
  }

  // 2. If Not Logged In: Show Dedicated Login & Self-Onboarding Page
  if (!currentUser) {
    return (
      <>
        <AppInstallPrompt />
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  // 3. Authenticated View
  const isRetailer = currentUser.role === 'RETAILER';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Global App Choice / Install Prompt Modal */}
      <AppInstallPrompt />

      {/* Top Corporate Navigation Bar */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Official TriHubPay Logo */}
          <TriHubLogo
            size="sm"
            showSubtitle={false}
          />

          {/* Platform Admin Role Indicator & Switch to Retailer App */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Master Administrator Console</span>
              </div>
              <a
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-xl text-brand-700 dark:text-brand-300 text-xs font-semibold transition-all shadow-sm"
                title="Open Retailer Recharge App"
              >
                <span>🏪</span>
                <span className="hidden sm:inline">Retailer App</span>
              </a>
            </div>
          )}

          {/* User Profile Badge, Theme Toggle & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsShopInfoOpen(true)}
              className="text-right px-1.5 sm:px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group flex flex-col items-end max-w-[100px] sm:max-w-[160px] min-w-0"
              title="Click to view and edit profile"
            >
              <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate w-full">
                {currentUser.organization_name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate w-full">
                {isRetailer ? (currentUser.owner_name || t('profile')) : 'Master Platform Admin'}
              </div>
            </button>

            <ThemeToggle />

            <button
              onClick={() => setIsSignOutConfirmOpen(true)}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Banner for Newly Registered Shops */}
      {welcomeBanner && (
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-b border-brand-500/20 px-4 py-3 text-center text-xs text-brand-700 dark:text-brand-300 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
          <span>{welcomeBanner}</span>
          <button
            onClick={() => setIsTopupOpen(true)}
            className="underline font-bold text-brand-700 dark:text-white ml-2"
          >
            Add Balance Now
          </button>
        </div>
      )}

      {/* RETAILER VIEW: SHOP OWNER SEES ONLY THIS! ZERO ADMIN CONTROLS */}
      {isRetailer && (
        <main className="flex-1 w-full max-w-full pb-20 sm:pb-6 overflow-x-hidden">
          {/* PWA 1-Click Install Banner for Mobile Phones */}
          <PwaInstallBanner />

          {/* Top Wallet Balance Banner: shown on tabs OTHER than HOME to avoid duplicate balance */}
          {retailerTab !== 'HOME' && (
            <WalletStrip
              balance={currentUser.current_balance}
              shopName={currentUser.organization_name}
              onOpenTopup={() => setIsTopupOpen(true)}
              onRefresh={loadRetailerData}
              isRefreshing={isRefreshingRetailer}
            />
          )}

          <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-2.5 sm:pt-4 pb-6 space-y-3 sm:space-y-4">

            {/* Zero balance deposit reminder */}
            {currentUser.current_balance === 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-brand-500/30 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                    <span>Add cash to start recharging and earning</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your balance is ₹0.00. Add cash via UPI (no extra charges).
                  </div>
                </div>
                <button
                  onClick={() => setIsTopupOpen(true)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md shadow-brand-600/20"
                >
                  Add Cash via UPI
                </button>
              </div>
            )}

            {/* ── DESKTOP: Tab switcher ── */}
            <div className="hidden sm:flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRetailerTab('HOME')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    retailerTab === 'HOME'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  {t('home')}
                </button>
                <button
                  type="button"
                  onClick={() => setRetailerTab('RECHARGE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    retailerTab === 'RECHARGE'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {t('recharge')}
                </button>
                <button
                  type="button"
                  onClick={() => setRetailerTab('PASSBOOK')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    retailerTab === 'PASSBOOK'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {t('passbook')}
                </button>
                <button
                  type="button"
                  onClick={() => setRetailerTab('COMMISSIONS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    retailerTab === 'COMMISSIONS'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  {t('commission')}
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {retailerTab === 'HOME' && 'TriHubPay Portal • Fast & Reliable'}
                {retailerTab === 'RECHARGE' && 'Instant 0.8s Lapu / BBPS Dispatch'}
                {retailerTab === 'PASSBOOK' && `${retailerTransactions.length} Total Transactions`}
                {retailerTab === 'COMMISSIONS' && 'Your Allocated Commission Margins'}
              </div>
            </div>

            {/* ── DESKTOP: Tab content ── */}
            <div className="hidden sm:block space-y-6">
              {retailerTab === 'HOME' && (
                <HomeScreen
                  currentUser={currentUser}
                  transactions={retailerTransactions}
                  onOpenTopup={() => setIsTopupOpen(true)}
                  onSelectService={(service) => {
                    setSelectedRechargeService(service);
                    setRetailerTab('RECHARGE');
                  }}
                  onNavigateToTab={(tab) => setRetailerTab(tab)}
                  onRefreshData={loadRetailerData}
                  isRefreshing={isRefreshingRetailer}
                />
              )}
              {retailerTab === 'RECHARGE' && (
                <>
                  <RechargeTabs
                    initialService={selectedRechargeService}
                    onSuccess={handleRechargeSuccess}
                    walletBalance={currentUser.current_balance}
                    onBackToHome={() => setRetailerTab('HOME')}
                  />
                  <LedgerTable
                    transactions={retailerTransactions.slice(0, 8)}
                    onViewReceipt={(tx) => {
                      setReceiptTx(tx);
                      setIsReceiptOpen(true);
                    }}
                  />
                </>
              )}
              {retailerTab === 'PASSBOOK' && (
                <LedgerTable
                  transactions={retailerTransactions}
                  onViewReceipt={(tx) => {
                    setReceiptTx(tx);
                    setIsReceiptOpen(true);
                  }}
                />
              )}
              {retailerTab === 'COMMISSIONS' && (
                <>
                  <MyCommissionsTable />
                  {/* ── Dashboard & Insights accordion below commission structure (desktop) ── */}
                  <RetailerInsightsCard
                    transactions={retailerTransactions}
                    onNavigateToCommissions={() => setRetailerTab('COMMISSIONS')}
                    onNavigateToPassbook={() => setRetailerTab('PASSBOOK')}
                  />
                </>
              )}
            </div>

            {/* ── MOBILE: Tab content switched by bottom nav ── */}
            <div className="sm:hidden space-y-4">
              {retailerTab === 'HOME' && (
                <HomeScreen
                  currentUser={currentUser}
                  transactions={retailerTransactions}
                  onOpenTopup={() => setIsTopupOpen(true)}
                  onSelectService={(service) => {
                    setSelectedRechargeService(service);
                    setRetailerTab('RECHARGE');
                  }}
                  onNavigateToTab={(tab) => setRetailerTab(tab)}
                  onRefreshData={loadRetailerData}
                  isRefreshing={isRefreshingRetailer}
                />
              )}

              {retailerTab === 'RECHARGE' && (
                <>
                  <RechargeTabs
                    initialService={selectedRechargeService}
                    onSuccess={handleRechargeSuccess}
                    walletBalance={currentUser.current_balance}
                    onBackToHome={() => setRetailerTab('HOME')}
                  />
                  {retailerTransactions.length > 0 && (
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs shadow-sm">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                        Last: {retailerTransactions[0].operator_code} ₹{retailerTransactions[0].face_value} ({retailerTransactions[0].status})
                      </span>
                      <button
                        onClick={() => setRetailerTab('PASSBOOK')}
                        className="text-brand-600 dark:text-brand-400 font-bold hover:underline shrink-0"
                      >
                        View All →
                      </button>
                    </div>
                  )}
                </>
              )}
              {retailerTab === 'PASSBOOK' && (
                <LedgerTable
                  transactions={retailerTransactions}
                  onViewReceipt={(tx) => {
                    setReceiptTx(tx);
                    setIsReceiptOpen(true);
                  }}
                />
              )}
              {retailerTab === 'COMMISSIONS' && (
                <>
                  <MyCommissionsTable />
                  {/* ── Dashboard & Insights accordion below commission structure (mobile) ── */}
                  <RetailerInsightsCard
                    transactions={retailerTransactions}
                    onNavigateToCommissions={() => setRetailerTab('COMMISSIONS')}
                    onNavigateToPassbook={() => setRetailerTab('PASSBOOK')}
                  />
                </>
              )}
            </div>

          </div>

          {/* Instant UPI Float Deposit Modal */}
          <UpiTopupModal
            isOpen={isTopupOpen}
            onClose={() => setIsTopupOpen(false)}
            onSuccess={handleTopupSuccess}
          />

          {/* Thermal Receipt & WhatsApp Share Modal */}
          <ThermalReceiptModal
            isOpen={isReceiptOpen}
            onClose={() => setIsReceiptOpen(false)}
            transaction={receiptTx}
            shopName={currentUser.organization_name}
          />

          {/* Mobile PWA Bottom Navigation Bar */}
          <RetailerBottomNav
            currentTab={retailerTab}
            onSelectTab={setRetailerTab}
            onOpenShopInfo={() => setIsShopInfoOpen(true)}
          />
        </main>
      )}

      {/* ADMIN CONTROL PANEL: VISIBLE ONLY TO ADMIN */}
      {isAdmin && (
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 flex-1 w-full max-w-full overflow-x-hidden">
          {/* Admin Navigation Sub-Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
              <button
                onClick={() => setAdminSubTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'OVERVIEW'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setAdminSubTab('REPORTS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  adminSubTab === 'REPORTS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Reports &amp; Analytics</span>
              </button>
              <button
                onClick={() => setAdminSubTab('SHOPS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'SHOPS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Accounts &amp; Balances
              </button>
              <button
                onClick={() => setAdminSubTab('MATRIX')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'MATRIX'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Commission Matrix
              </button>
              <button
                onClick={() => setAdminSubTab('FAILOVER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'FAILOVER'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Failover Toggle
              </button>
              <button
                onClick={() => setAdminSubTab('TRANSACTIONS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'TRANSACTIONS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Live Audit Log
              </button>
              <button
                onClick={() => setAdminSubTab('DEPOSITS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  adminSubTab === 'DEPOSITS'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Deposits
              </button>
            </div>

            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>NeroPay: ₹{(adminKPIs?.master_wallet?.balance ?? 100).toFixed(2)}</span>
              </div>
              <button
                onClick={loadAdminData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: Overview KPIs */}
          {adminSubTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <DashboardKPIsComponent kpis={adminKPIs} onRefresh={loadAdminData} />
              <AllTransactionsTable transactions={allTransactions} onRefresh={loadAdminData} />
            </div>
          )}

          {/* Sub-Tab: Revenue & Performance Reports */}
          {adminSubTab === 'REPORTS' && (
            <AdminReportsView />
          )}

          {/* Sub-Tab 2: Shops & Balances (User Balance Manager) */}
          {adminSubTab === 'SHOPS' && (
            <UserBalanceManager
              users={allUsers}
              masterBalance={adminKPIs?.master_wallet?.balance ?? 100}
              onRefresh={loadAdminData}
              onOpenCustomCommissions={(shop) => setSelectedShopForOverrides(shop)}
              onOpenOnboardShop={() => setIsOnboardModalOpen(true)}
            />
          )}

          {/* Sub-Tab 3: Global Commission Matrix */}
          {adminSubTab === 'MATRIX' && (
            <div className="space-y-6">
              <CommissionMatrixGrid items={matrixItems} onRefresh={loadAdminData} />
            </div>
          )}

          {/* Sub-Tab 4: Upstream API Failover Toggle */}
          {adminSubTab === 'FAILOVER' && (
            <div className="space-y-6">
              <FailoverToggle
                currentMode={adminKPIs?.failover_mode || 'AUTO'}
                onUpdate={() => loadAdminData()}
              />
            </div>
          )}

          {/* Sub-Tab 5: All Transactions */}
          {adminSubTab === 'TRANSACTIONS' && (
            <AllTransactionsTable transactions={allTransactions} onRefresh={loadAdminData} />
          )}

          {/* Sub-Tab 6: UPI Deposit Approvals */}
          {adminSubTab === 'DEPOSITS' && (
            <div className="space-y-6">
              <PendingDepositsTable onBalanceUpdated={loadAdminData} />
            </div>
          )}

          {/* Shop-Specific Custom Commission Override Modal */}
          <ShopCustomCommissionModal
            isOpen={Boolean(selectedShopForOverrides)}
            onClose={() => setSelectedShopForOverrides(null)}
            shop={selectedShopForOverrides}
            matrixItems={matrixItems}
            onSaved={loadAdminData}
          />

          {/* Neat Corporate Modal for Onboarding New Mobile Shops */}
          <OnboardShopModal
            isOpen={isOnboardModalOpen}
            onClose={() => setIsOnboardModalOpen(false)}
            onSuccess={loadAdminData}
          />
        </main>
      )}

      {/* Global Account Profile & Edit Modal */}
      {currentUser && (
        <ShopInfoModal
          isOpen={isShopInfoOpen}
          onClose={() => setIsShopInfoOpen(false)}
          user={currentUser}
          onLogout={() => setIsSignOutConfirmOpen(true)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Global Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutConfirmOpen}
        onClose={() => setIsSignOutConfirmOpen(false)}
        onConfirm={handleLogout}
        userName={currentUser?.organization_name}
        userRole={currentUser?.role === 'ADMIN' ? 'Platform Master Admin' : 'Retailer Partner'}
      />
    </div>
  );
}

export default App;
