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
  Headphones,
  KeyRound,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Check
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
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);

  // Register Fields
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Free Email OTP Password Reset State (Option 3: ₹0.00 Cost)
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState<boolean>(false);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string>('');
  const [forgotCountdown, setForgotCountdown] = useState<number>(0);

  React.useEffect(() => {
    let timer: any;
    if (forgotCountdown > 0) {
      timer = setInterval(() => {
        setForgotCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [forgotCountdown]);

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError('');
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered mobile number or email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.sendForgotPasswordOtp(forgotIdentifier.trim());
      if (res.success) {
        setMaskedEmail(res.masked_email);
        setForgotStep(2);
        setForgotCountdown(60);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Unable to send verification code. Please check your details.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the complete 6-digit OTP sent to your email.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-check your confirm password.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.resetPasswordWithOtp({
        identifier: forgotIdentifier.trim(),
        otp: forgotOtp.trim(),
        new_password: forgotNewPassword
      });

      if (res.success) {
        setShowForgotPassword(false);
        setIdentifier(forgotIdentifier.trim());
        setPassword('');
        setSuccessMsg('Password reset successfully! Please sign in with your new password.');
        setErrorMsg('');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password. Please verify the OTP code.');
    } finally {
      setForgotLoading(false);
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-500 font-extrabold tracking-tight">TriHub</span>
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-black">Pay</span>
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
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                {successMsg}
              </div>
            </div>
          )}

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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-500" />
                    <span>PASSWORD</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotStep(1);
                      setForgotIdentifier(identifier);
                      setForgotError('');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline transition-all"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-4 pr-11 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
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
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-4 pr-11 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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

      {/* ========================================================= */}
      {/* FREE EMAIL OTP FORGOT PASSWORD MODAL (₹0.00 Cost)         */}
      {/* ========================================================= */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative my-6">
            
            {/* Top Accent Gradient */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Reset Password</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Email Verification
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step {forgotStep} of 2 • Secure verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotError('');
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Tracker */}
            <div className="bg-slate-50 dark:bg-slate-950/50 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-2 font-medium ${forgotStep === 1 ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 1 ? 'bg-brand-600 text-white font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  1
                </div>
                <span>Enter Account</span>
              </div>
              <div className={`flex items-center gap-2 font-medium ${forgotStep === 2 ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 2 ? 'bg-brand-600 text-white font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  2
                </div>
                <span>Verify OTP & Reset</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-600 dark:text-rose-300 font-medium leading-relaxed">
                    {forgotError}
                  </div>
                </div>
              )}

              {/* STEP 1: Enter Phone or Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand-500" />
                      <span>REGISTERED MOBILE NUMBER OR EMAIL</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210 or shop@gmail.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1 leading-relaxed">
                    <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-200">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Security Verification</span>
                    </p>
                    <p className="text-[11px] text-blue-600/90 dark:text-blue-300/80">
                      A 6-digit verification code will be sent to your account's registered email address. Code is valid for 10 minutes.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Help Support Footer */}
                  <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    Need instant help? Call TriHub Support:{' '}
                    <a
                      href={`tel:${TRIHUB_SUPPORT.phone}`}
                      className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {TRIHUB_SUPPORT.phone}
                    </a>
                  </div>
                </form>
              )}

              {/* STEP 2: Verify OTP and Set New Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Masked Email Notice */}
                  <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Code sent to: <strong>{maskedEmail}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {/* 6-Digit OTP */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                      <span>6-DIGIT EMAIL VERIFICATION CODE (OTP)</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-bold font-mono tracking-[0.35em] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-brand-500" />
                      <span>NEW PASSWORD (MIN. 6 CHARACTERS)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-brand-500" />
                      <span>CONFIRM NEW PASSWORD</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Resend OTP Timer Row */}
                  <div className="flex items-center justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
                    <span>Didn't receive email?</span>
                    {forgotCountdown > 0 ? (
                      <span className="font-mono text-slate-400 dark:text-slate-500">
                        Resend in {forgotCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={forgotLoading}
                        className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 hover:underline"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend OTP Code</span>
                      </button>
                    )}
                  </div>

                  {/* Submit Reset */}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Reset Password & Proceed to Login</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
