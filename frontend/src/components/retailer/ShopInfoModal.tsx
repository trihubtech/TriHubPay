import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { 
  Store, 
  Phone, 
  Mail, 
  User as UserIcon, 
  X, 
  LogOut, 
  Shield, 
  Edit3, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  Globe,
  Languages,
  Check,
  ShieldAlert
} from 'lucide-react';
import { useLanguage, Language } from '../../context/LanguageContext';

interface ShopInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export const ShopInfoModal: React.FC<ShopInfoModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onUserUpdated
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [modalTab, setModalTab] = useState<'PROFILE' | 'LANGUAGE' | 'SECURITY'>('PROFILE');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [orgName, setOrgName] = useState<string>(user.organization_name || '');
  const [ownerName, setOwnerName] = useState<string>(user.owner_name || '');
  const [phone, setPhone] = useState<string>(user.phone || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setOrgName(user.organization_name || '');
      setOwnerName(user.owner_name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setIsEditing(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleStartEdit = () => {
    setOrgName(user.organization_name || '');
    setOwnerName(user.owner_name || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrg = orgName.trim();
    const cleanOwner = ownerName.trim();

    if (!cleanOrg || !cleanOwner) {
      setErrorMsg('Business and owner names cannot be empty.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        organization_name: cleanOrg,
        owner_name: cleanOwner,
        phone: cleanPhone,
        email: cleanEmail
      });

      if (res.success && res.data) {
        setSuccessMsg('Profile updated successfully!');
        setIsEditing(false);
        if (onUserUpdated) {
          onUserUpdated(res.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  const languageOptions: { code: Language; name: string; nativeName: string; region: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English', region: 'Default • Universal' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'தமிழ்நாடு • இலங்கை' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'भारत • संपूर्ण देश' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {user.organization_name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {user.phone ? `+91 ${user.phone}` : 'Active Account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs Header */}
        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-1.5 gap-1 shrink-0 text-center">
          <button
            type="button"
            onClick={() => setModalTab('PROFILE')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              modalTab === 'PROFILE'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('LANGUAGE')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              modalTab === 'LANGUAGE'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Language</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('SECURITY')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              modalTab === 'SECURITY'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ─── TAB 1: PROFILE DETAILS ─── */}
          {modalTab === 'PROFILE' && (
            <>
              {!isEditing ? (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Business / Store Name
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                        {user.organization_name}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Account Owner
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                        {user.owner_name || 'Retailer Partner'}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Mobile Number
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                        {user.phone ? `+91 ${user.phone}` : 'Not provided'}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Email Address
                      </span>
                      <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-100 block mt-0.5">
                        {user.email || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile Details</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Business / Store Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Owner Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Mobile Number (10 Digits)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-1/2 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ─── TAB 2: LANGUAGE OPTIONS ─── */}
          {modalTab === 'LANGUAGE' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose your preferred display language for buttons, balance tags, and navigation:
              </p>

              <div className="space-y-2">
                {languageOptions.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-brand-50/70 dark:bg-brand-500/10 border-brand-500 shadow-sm ring-1 ring-brand-500/30'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {lang.nativeName}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({lang.name})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {lang.region}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Language preference is saved instantly on this device.</span>
              </div>
            </div>
          )}

          {/* ─── TAB 3: SECURITY & PORTAL ─── */}
          {modalTab === 'SECURITY' && (
            <div className="space-y-3.5">
              {/* Go to Admin Portal Link */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-bold text-xs text-blue-900 dark:text-blue-200">Admin Control Center</span>
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  Platform owners and administrators can log into the Master Admin Console at <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">/admin</code>.
                </p>
                <a
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-sm"
                >
                  <span>Open Admin Portal</span>
                  <span>➔</span>
                </a>
              </div>

              {/* Sign out action */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out from TriHubPay</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
