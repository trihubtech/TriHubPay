import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User, Transaction, DashboardKPIs, CommissionMatrixItem } from './types';

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
  Percent
} from 'lucide-react';

export function App() {
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
  const [selectedRechargeService, setSelectedRechargeService] = useState<'MOBILE' | 'DTH' | 'ELECTRICITY'>('MOBILE');
  const [isShopInfoOpen, setIsShopInfoOpen] = useState<boolean>(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState<boolean>(false);

  // Admin states
  const [adminKPIs, setAdminKPIs] = useState<DashboardKPIs | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matrixItems, setMatrixItems] = useState<CommissionMatrixItem[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedShopForOverrides, setSelectedShopForOverrides] = useState<User | null>(null);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [adminSubTab, setAdminSubTab] = useState<'OVERVIEW' | 'SHOPS' | 'MATRIX' | 'FAILOVER' | 'TRANSACTIONS' | 'DEPOSITS'>('OVERVIEW');

  // Check saved session on load
  useEffect(() => {
    const token = localStorage.getItem('trihub_token');
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.success) {
            setCurrentUser(res.data);
            if (res.data.role === 'ADMIN') {
              loadAdminData();
            } else {
              loadRetailerData();
            }
          } else {
            localStorage.removeItem('trihub_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('trihub_token');
        })
        .finally(() => setIsInitializing(false));
    } else {
      setIsInitializing(false);
    }
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
      loadAdminData();
    } else {
      loadRetailerData();
      if (isNewRegistration) {
        setWelcomeBanner(`🎉 Welcome ${user.organization_name}! Your store is onboarded. Load float via UPI QR to start recharging.`);
        setIsTopupOpen(true);
      }
    }
  };

  const handleLogout = () => {
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

  // 1. Initial Loading Screen
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-800 dark:text-white text-xs font-mono">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-500 animate-pulse" />
          <span>Starting TriHubPay Engine...</span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white pb-12">
      {/* Global App Choice / Install Prompt Modal */}
      <AppInstallPrompt />

      {/* Top Corporate Navigation Bar */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Official TriHubPay Logo */}
          <TriHubLogo
            size="sm"
            showSubtitle={false}
          />

          {/* Platform Admin Role Indicator */}
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Master Administrator Console</span>
            </div>
          )}

          {/* User Profile Badge, Theme Toggle & Logout */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsShopInfoOpen(true)}
              className="text-right px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group flex flex-col items-end"
              title="Click to view and edit profile"
            >
              <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {currentUser.organization_name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {isRetailer ? (currentUser.owner_name || 'Retailer Partner') : 'Master Platform Admin'}
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
        <main className="flex-1 pb-20 sm:pb-6">
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

          <div className="max-w-4xl mx-auto px-4 pt-4 pb-6 space-y-4">

            {/* Zero balance deposit reminder */}
            {currentUser.current_balance === 0 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-brand-500/30 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-4">
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
                  Home
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
                  Recharge &amp; Bill Pay
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
                  Passbook &amp; Ledger
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
                  My Commission Rates
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {retailerTab === 'HOME' && 'Retailer Partner Portal • Fast & Reliable'}
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
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 flex-1 w-full">
          {/* Admin Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setAdminSubTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'OVERVIEW'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Operations Dashboard
              </button>
              <button
                onClick={() => setAdminSubTab('SHOPS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'SHOPS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Accounts & Balances
              </button>
              <button
                onClick={() => setAdminSubTab('MATRIX')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'MATRIX'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Commission Matrix
              </button>
              <button
                onClick={() => setAdminSubTab('FAILOVER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'FAILOVER'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Upstream Failover Toggle
              </button>
              <button
                onClick={() => setAdminSubTab('TRANSACTIONS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'TRANSACTIONS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Live Transaction Log
              </button>
              <button
                onClick={() => setAdminSubTab('DEPOSITS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'DEPOSITS'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Deposit Approvals
              </button>
            </div>

            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* Sub-Tab 1: Overview KPIs */}
          {adminSubTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <DashboardKPIsComponent kpis={adminKPIs} onRefresh={loadAdminData} />
              <AllTransactionsTable transactions={allTransactions} />
            </div>
          )}

          {/* Sub-Tab 2: Shops & Balances (User Balance Manager) */}
          {adminSubTab === 'SHOPS' && (
            <UserBalanceManager
              users={allUsers}
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
            <AllTransactionsTable transactions={allTransactions} />
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
