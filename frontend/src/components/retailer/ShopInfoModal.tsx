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
  Building2 
} from 'lucide-react';

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
        if (onUserUpdated) {
          onUserUpdated(res.data);
        }
        setTimeout(() => {
          setIsEditing(false);
          setSuccessMsg('');
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile. Phone or email might already be in use.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEditing ? 'Edit Profile & Contact' : 'Account Profile'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEditing ? 'Update your business and unique contact details' : 'User Account & Wallet Details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isEditing ? (
            <>
              {/* Profile Readonly View */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Account / Business</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{user.organization_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{user.owner_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unique Mobile</span>
                  <span className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{user.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unique Email</span>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{user.email}</span>
                </div>
                {user.role === 'RETAILER' && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Cash Balance</span>
                    <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(user.current_balance).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Edit Details Action Button */}
              <button
                type="button"
                onClick={handleStartEdit}
                className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile &amp; Contact Information</span>
              </button>

              <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-brand-700 dark:text-brand-300">
                <Shield className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                <span>Mobile number and email are strictly unique to your account for security.</span>
              </div>

              {/* Sign out action */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            /* Profile Edit Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Organization / Shop Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Royal Telecom"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Full Name / Owner Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Unique Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be unique across the platform.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Unique Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Used for login and password recovery OTPs.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
