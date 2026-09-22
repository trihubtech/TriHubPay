import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Smartphone, 
  Tv, 
  Zap, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';
import { Plan, ServiceType } from '../../types';

interface RechargeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  operatorCode: string;
  operatorName: string;
  accountNumber: string;
  serviceType: ServiceType;
  faceValue: number;
  cashbackEarned: number;
  finalCostBilled: number;
  walletBalance: number;
  planDetails?: Plan | null;
}

export const RechargeConfirmModal: React.FC<RechargeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  operatorCode,
  operatorName,
  accountNumber,
  serviceType,
  faceValue,
  cashbackEarned,
  finalCostBilled,
  walletBalance,
  planDetails
}) => {
  if (!isOpen) return null;

  const remainingBalance = walletBalance - finalCostBilled;
  const isBalanceSufficient = remainingBalance >= 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              {serviceType === 'MOBILE' ? (
                <Smartphone className="w-4 h-4" />
              ) : serviceType === 'DTH' ? (
                <Tv className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Confirm {serviceType === 'MOBILE' ? 'Mobile Recharge' : serviceType === 'DTH' ? 'DTH Recharge' : 'Electricity Payment'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Please review transaction details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Target Account & Operator Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OperatorIcon operatorCode={operatorCode} size="md" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{operatorName}</span>
                </div>
                <div className="text-base font-black font-mono text-blue-600 dark:text-brand-400 tracking-wider mt-0.5">
                  {accountNumber}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-full">
              {serviceType}
            </span>
          </div>

          {/* Plan Details (If matched) */}
          {planDetails && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 dark:text-blue-200">
                  Plan Details
                </span>
                <span className="font-bold text-blue-600 dark:text-brand-400 font-mono">
                  Validity: {planDetails.validity}
                </span>
              </div>
              {planDetails.data && (
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Data: {planDetails.data}
                </div>
              )}
              {planDetails.description && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {planDetails.description}
                </div>
              )}
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Recharge Face Value</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                ₹{faceValue.toFixed(2)}
              </span>
            </div>

            {cashbackEarned > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retailer Commission (Instant Off)</span>
                </span>
                <span className="font-mono font-bold">
                  - ₹{cashbackEarned.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-800 font-black">
              <span className="text-slate-900 dark:text-white">Net Debit from Wallet</span>
              <span className="font-mono text-blue-600 dark:text-brand-400 text-base">
                ₹{finalCostBilled.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Current Balance: ₹{walletBalance.toFixed(2)}</span>
              <span>
                Remaining: <strong className={remainingBalance >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}>
                  ₹{remainingBalance.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          {!isBalanceSufficient && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Insufficient balance. Please add funds to your wallet.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !isBalanceSufficient}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Pay ₹{finalCostBilled.toFixed(2)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
