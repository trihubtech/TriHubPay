import React from 'react';
import { User } from '../../types';
import { Store, Phone, Mail, Award, X, LogOut, CheckCircle2, Shield } from 'lucide-react';

interface ShopInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export const ShopInfoModal: React.FC<ShopInfoModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Account Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">User Account &amp; Wallet Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Account / Business</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user.organization_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Name</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user.owner_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Phone</span>
              <span className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{user.phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Email</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Cash Balance</span>
              <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{Number(user.current_balance).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-brand-700 dark:text-brand-300">
            <Shield className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
            <span>Verified Account: 100% Instant Delivery Guarantee &amp; Zero Fee UPI Cash Top-up.</span>
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
        </div>
      </div>
    </div>
  );
};
