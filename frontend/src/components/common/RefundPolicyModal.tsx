import React from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface RefundPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RefundPolicyModal: React.FC<RefundPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Refund &amp; Cancellation Policy</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          {/* Highlight Box */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>100% Instant Refund Guarantee on Recharge Failures</span>
            </div>
            <p>
              At TriHubPay, your money is completely safe. If any mobile, DTH, or utility payment fails at the telecom operator level, 100% of the deducted amount is refunded back to your account immediately.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">1. Failed Recharge Transactions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When a recharge request is rejected by the operator (e.g. invalid plan, wrong number, circle mismatch, or operator system outage):
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li><strong>Automated Instant Refund:</strong> The TriHubPay ACID database engine automatically reverses the debit and restores your balance instantly within milliseconds.</li>
              <li><strong>Ledger Tracking:</strong> Every refund generates an immutable entry in your account ledger visible in your Reports &amp; History section.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">2. Pending Transactions &amp; Upstream Reconciliations</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Occasionally, telecom network switches experience delays in sending back confirmation receipts:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li>Transactions marked <strong>PENDING</strong> are monitored by automated background workers that poll the operator gateway every few minutes.</li>
              <li>If the operator ultimately confirms failure, the transaction is immediately marked <strong>FAILED</strong> and the full amount is credited back to your balance.</li>
              <li>Retailers can also trigger an instant live status check directly by tapping the &quot;Check Live Status&quot; button in their transaction history.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">3. Incorrect Customer Number Input</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please double check the recipient&apos;s 10-digit mobile number, DTH subscriber ID, or electricity consumer number before authorizing the transaction:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li>Once a recharge is confirmed <strong>SUCCESSFUL</strong> by the telecom operator (Airtel, Jio, Vi, BSNL), telecom regulations do not permit cancellation or reversal.</li>
              <li>TriHubPay cannot recall or refund funds delivered to a wrong number provided by the user.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">4. UPI Top-Up Submissions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If a retailer submits a UPI deposit that is not reflected in the admin bank account:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li>Admin provides a clear rejection reason viewable under the Deposit History tab.</li>
              <li>If your bank debited the amount but failed to transmit it to our VPA, the amount will be reversed to your originating bank account within 3 to 5 banking days per RBI/NPCI guidelines.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between rounded-b-3xl shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>SLA: Instant Automated Refunds</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
