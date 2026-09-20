import React, { useState } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { Store, ShieldCheck, UserPlus, LogIn, Sparkles, X, ArrowRight, Loader2, Lock } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string, isNewRegistration?: boolean) => void;
  initialTab?: 'LOGIN' | 'REGISTER' | 'ADMIN';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'LOGIN'
}) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'ADMIN'>(initialTab);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState<string>('9876543220');
  const [loginPassword, setLoginPassword] = useState<string>('Password@123');

  // Register form (Shop Owner Direct Self-Onboarding)
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('Password@123');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.login(loginIdentifier, loginPassword);
      if (res.success) {
        localStorage.setItem('trihub_token', res.data.token);
        onAuthSuccess(res.data.user, res.data.token, false);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Verify mobile/email and password.');
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
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick One-Click Demo Logins
  const handleQuickLogin = async (identifier: string, pass: string = 'Password@123') => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.login(identifier, pass);
      if (res.success) {
        localStorage.setItem('trihub_token', res.data.token);
        onAuthSuccess(res.data.user, res.data.token, false);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header Tabs */}
        <div className="bg-slate-950/80 p-1.5 border-b border-slate-800 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => { setTab('LOGIN'); setLoginIdentifier('9876543220'); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'LOGIN' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Retailer Login</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('REGISTER')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'REGISTER' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Shop SignUp</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('ADMIN'); setLoginIdentifier('admin@trihubpay.in'); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'ADMIN' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-white">
                {tab === 'LOGIN' && 'Retailer Shop Login'}
                {tab === 'REGISTER' && 'Onboard New Mobile Shop'}
                {tab === 'ADMIN' && 'TriHubPay Admin Login'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {tab === 'LOGIN' && 'Access prepaid float wallet and execute recharges.'}
                {tab === 'REGISTER' && 'Direct self-service onboarding for shopkeepers with instant UPI load.'}
                {tab === 'ADMIN' && 'Platform owner portal for 5% margin control and shop float manager.'}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Quick Demo Login Chips */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span>1-Click Instant Demo Login:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('9876543220')}
                className="text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs text-slate-200 transition-colors"
              >
                <div className="font-bold text-white text-[11px] truncate">Sri Balaji Telecom</div>
                <div className="text-[10px] text-emerald-400 font-mono">₹15,420.50 Float</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@trihubpay.in')}
                className="text-left p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800 text-xs text-blue-200 transition-colors"
              >
                <div className="font-bold text-white text-[11px] truncate">TriHubPay Admin</div>
                <div className="text-[10px] text-blue-400">Master Operations</div>
              </button>
            </div>
          </div>

          {/* TAB 1: RETAILER LOGIN / TAB 3: ADMIN LOGIN */}
          {(tab === 'LOGIN' || tab === 'ADMIN') && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {tab === 'ADMIN' ? 'ADMIN EMAIL OR PHONE' : 'REGISTERED MOBILE OR EMAIL'}
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. 9876543220 or admin@trihubpay.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">PASSWORD</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <div className="text-[10px] text-slate-500 mt-1">Default Demo Password: Password@123</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  tab === 'ADMIN' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-brand-600 hover:bg-brand-500'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Sign In to {tab === 'ADMIN' ? 'Admin Panel' : 'Shop PWA'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: NEW SHOP DIRECT SELF-ONBOARDING */}
          {tab === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">MOBILE SHOP / BUSINESS NAME</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sai Krishna Telecom"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">OWNER NAME</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">PHONE NUMBER (10 DIGITS)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shop@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">CREATE PASSWORD</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                ✅ Instant activation with 0% setup fee. Load float anytime via UPI QR code.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Complete Registration & Open Wallet</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
