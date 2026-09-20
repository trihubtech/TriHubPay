import React, { useState } from 'react';
import { api } from '../../services/api';
import { 
  Store, 
  X, 
  UserPlus, 
  Phone, 
  Mail, 
  Lock, 
  Wallet, 
  User, 
  Building2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Loader2, 
  Eye, 
  EyeOff,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface OnboardShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OnboardShopModal: React.FC<OnboardShopModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('Password@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [role, setRole] = useState<'RETAILER' | 'DISTRIBUTOR'>('RETAILER');
  const [initialFloat, setInitialFloat] = useState<string>('0');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Success summary state once user is created
  const [createdShop, setCreatedShop] = useState<{
    id: string;
    organization_name: string;
    owner_name: string;
    phone: string;
    email: string;
    role: string;
    initial_balance: number;
    password: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setShopName('');
    setOwnerName('');
    setPhone('');
    setEmail('');
    setPassword('Password@123');
    setRole('RETAILER');
    setInitialFloat('0');
    setErrorMessage('');
    setCreatedShop(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = phone.trim();
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please provide a valid 10-digit Indian mobile number.');
      return;
    }

    if (!shopName.trim()) {
      setErrorMessage('Shop/Store name is required.');
      return;
    }

    if (!ownerName.trim()) {
      setErrorMessage('Owner full name is required.');
      return;
    }

    const finalEmail = email.trim() || `${cleanPhone}@trihubpay.in`;
    const floatAmount = parseFloat(initialFloat) || 0;

    setLoading(true);
    try {
      // 1. Register the shop partner
      const regRes = await api.register({
        organization_name: shopName.trim(),
        owner_name: ownerName.trim(),
        phone: cleanPhone,
        email: finalEmail,
        password: password.trim() || 'Password@123'
      });

      if (!regRes.success) {
        throw new Error(regRes.message || 'Failed to onboard shop');
      }

      const newUser = regRes.data.user;

      // 2. If initial float deposit was entered > 0, credit it immediately
      if (floatAmount > 0) {
        await api.adjustUserBalance(
          newUser.id,
          floatAmount,
          'CREDIT',
          'Initial opening float allocation on onboarding'
        );
      }

      setCreatedShop({
        id: newUser.id,
        organization_name: shopName.trim(),
        owner_name: ownerName.trim(),
        phone: cleanPhone,
        email: finalEmail,
        role: role,
        initial_balance: floatAmount,
        password: password.trim() || 'Password@123'
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error onboarding shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentialsText = () => {
    if (!createdShop) return;
    const text = `🎉 Welcome to TriHubPay!\n\nStore: ${createdShop.organization_name}\nOwner: ${createdShop.owner_name}\nLogin Mobile: ${createdShop.phone}\nPassword: ${createdShop.password}\nOpening Float: ₹${createdShop.initial_balance.toFixed(2)}\n\nLogin portal: https://pay.trihubpay.in\nPowered by TriHubPay`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-brand-500/10 border border-blue-200 dark:border-brand-500/20 flex items-center justify-center text-blue-600 dark:text-brand-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {createdShop ? 'Account Onboarded Successfully' : 'Onboard New Partner Account'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {createdShop 
                  ? 'Account wallet provisioned & ready for live transactions' 
                  : 'Register a partner account & provision their cash balance wallet'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Success Screen vs Form Screen */}
        {createdShop ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  {createdShop.organization_name} is Live!
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  The account has been created with instant wallet access. You can share login credentials with them below.
                </div>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-850">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Account Name</span>
                <span className="text-slate-900 dark:text-white font-semibold font-sans">{createdShop.organization_name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-850">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Name</span>
                <span className="text-slate-900 dark:text-white font-sans">{createdShop.owner_name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-850">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Login Phone</span>
                <span className="text-blue-600 dark:text-brand-400 font-bold">{createdShop.phone}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-850">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Password</span>
                <span className="text-amber-600 dark:text-amber-300 font-bold">{createdShop.password}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Opening Cash</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{createdShop.initial_balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentialsText}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-white text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-300" />}
                <span>{copied ? 'Credentials Copied!' : 'Copy for WhatsApp / SMS'}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
              >
                Done & View in Directory
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            {/* Shop Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                  <span>BUSINESS / ACCOUNT NAME *</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sri Balaji Enterprises"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                  <span>FULL NAME *</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. R. Subramanian"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                  <span>10-DIGIT MOBILE NUMBER *</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Used to login</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                  <span>EMAIL ADDRESS</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional (defaults to phone@trihubpay.in)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Password & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                    <span>LOGIN PASSWORD</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-blue-600 dark:text-brand-400 hover:underline font-semibold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password@123"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-brand-400" />
                  <span>PARTNER ROLE</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                >
                  <option value="RETAILER">Standard Partner</option>
                  <option value="DISTRIBUTOR">Sub-Distributor (Wholesale)</option>
                </select>
              </div>
            </div>

            {/* Initial Cash Deposit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>INITIAL CASH BALANCE ALLOCATION (₹)</span>
                </span>
                <span className="text-[11px] text-slate-500">Optional (e.g. ₹1000 if paid upfront)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initialFloat}
                  onChange={(e) => setInitialFloat(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[0, 500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInitialFloat(amt.toString())}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      parseFloat(initialFloat) === amt
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Provision Account &amp; Open Wallet</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
