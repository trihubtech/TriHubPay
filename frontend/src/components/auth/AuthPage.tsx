import React, { useState } from 'react';
import { api, TRIHUB_SUPPORT } from '../../services/api';
import { User } from '../../types';
import { 
  Store, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Zap, 
  Phone, 
  Lock, 
  Mail, 
  Building2,
  AlertCircle,
  Headphones
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

interface AuthPageProps {
  onAuthSuccess: (user: User, token: string, isNewRegistration?: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(() => {
    return window.location.hash === '#admin' || window.location.pathname.startsWith('/admin');
  });
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  // Form Fields
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Register Fields
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  React.useEffect(() => {
    const handleHash = () => {
      setIsAdminPortal(window.location.hash === '#admin' || window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.login(identifier, password);
      if (res.success) {
        // Enforce role isolation without leaking account roles or admin existence
        if (!isAdminPortal && res.data.user.role !== 'RETAILER') {
          throw new Error(`Invalid mobile number, email, or password. Please verify your credentials or contact TriHub Support (${TRIHUB_SUPPORT.phone}).`);
        }
        if (isAdminPortal && res.data.user.role !== 'ADMIN') {
          throw new Error(`Invalid credentials. Please verify your administrator login or contact TriHub Support (${TRIHUB_SUPPORT.phone}).`);
        }

        localStorage.setItem('trihub_token', res.data.token);
        onAuthSuccess(res.data.user, res.data.token, false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Unable to log in. Please verify your credentials or reach TriHub Support (${TRIHUB_SUPPORT.phone}).`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        organization_name: shopName,
        owner_name: ownerName,
        phone: phone,
        email: email,
        password: regPassword
      });

      if (res.success) {
        localStorage.setItem('trihub_token', res.data.token);
        onAuthSuccess(res.data.user, res.data.token, true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-brand-500 selection:text-white relative">
      {/* Floating Theme Toggle in Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Brand Header with Official TriHubPay Logo */}
      <div className="text-center mb-6 space-y-3 flex flex-col items-center">
        <div className="relative w-24 h-24 mb-1 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-emerald-500/20 rounded-3xl blur-xl" />
          <img
            src="/logo.png?v=2"
            alt="TriHubPay"
            className="relative w-20 h-20 object-contain drop-shadow-md"
          />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <span className="text-blue-600 dark:text-blue-500 font-extrabold tracking-wider">TRIHUB</span>
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">PAY</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {isAdminPortal 
              ? 'Platform Control & Operations Console by TriHubPay'
              : 'Recharge & Bill Payment Platform by TriHubPay'
            }
          </p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className={`bg-white dark:bg-slate-900 border rounded-3xl w-full max-w-md overflow-hidden shadow-xl shadow-slate-200/70 dark:shadow-blue-900/10 transition-all ${
        isAdminPortal ? 'border-blue-300 dark:border-blue-800/60 dark:shadow-blue-900/20' : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Retailer Tab Switcher: Sign In vs Register (ZERO ADMIN TAB VISIBLE TO SHOPS) */}
        {!isAdminPortal ? (
          <div className="bg-slate-100 dark:bg-slate-950/80 p-1.5 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
                !isRegisterMode
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
                isRegisterMode
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-950/40 p-3 border-b border-blue-200 dark:border-blue-800/40 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Authorized Master Admin Login Only</span>
            </span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-600 dark:text-rose-300 font-medium leading-relaxed">
                  {errorMsg}
                </div>
              </div>

              {/* Direct Helpdesk Support Contact Info */}
              <div className="pt-2.5 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <Headphones className="w-3.5 h-3.5 text-brand-500" />
                  <span>Contact TriHubPay Support:</span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${TRIHUB_SUPPORT.phone}`}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{TRIHUB_SUPPORT.phone}</span>
                  </a>
                  <a
                    href={`mailto:${TRIHUB_SUPPORT.email}`}
                    className="font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{TRIHUB_SUPPORT.email}</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* RETAILER LOGIN */}
          {!isAdminPortal && !isRegisterMode && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-500" />
                  <span>REGISTERED MOBILE NUMBER OR EMAIL</span>
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="9876543220"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand-500" />
                  <span>PASSWORD</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Sign In</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold"
                >
                  New here? <strong>Register Now</strong>
                </button>
              </div>
            </form>
          )}

          {/* SELF-REGISTRATION */}
          {!isAdminPortal && isRegisterMode && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                <UserPlus className="w-4 h-4 text-brand-500" />
                <span>Create Account</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">BUSINESS / FULL NAME</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sai Krishna Enterprises"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OWNER NAME</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner Name"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">PHONE (10 DIGITS)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@gmail.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">PASSWORD</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-[11px] text-brand-700 dark:text-brand-300">
                ⚡ Instant activation. Once registered, load balance via UPI QR and start transactions immediately.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Create Account & Open Wallet</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Already have an account? <strong>Sign In</strong>
                </button>
              </div>
            </form>
          )}

          {/* ADMIN LOGIN */}
          {isAdminPortal && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>MASTER ADMIN EMAIL</span>
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@trihubpay.in"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>PASSWORD</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Sign In to Admin Panel</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 flex items-center justify-center gap-3">
        <span>© 2026 TriHubPay. All rights reserved.</span>
        {isAdminPortal && (
          <>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setIsAdminPortal(false);
                window.location.hash = '';
                setErrorMsg('');
                setIdentifier('');
                setPassword('');
              }}
              className="text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              ← User Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
