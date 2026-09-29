import React from 'react';
import { X, ShieldCheck, Scale, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
            <Scale className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Terms of Service &amp; Regulatory Disclaimers</h3>
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
          {/* Section 1 */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Entity Structure &amp; Regulatory Notice (RBI PPI &amp; PSS Act 2007)</span>
            </div>
            <p>
              TriHubPay is a digital technology distribution platform owned and operated as a proprietary business firm (&quot;TriHub Technologies&quot;). TriHubPay is <strong>NOT a bank, banking agent, deposit-taking institution, Non-Banking Financial Company (NBFC), or an RBI-licensed Prepaid Payment Instrument (PPI) issuer</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">1. Nature of User Balance (&quot;Commercial Trade Float&quot;)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Any balance maintained in your TriHubPay account represents an <strong>advance trade float / prepaid service credit</strong> exclusively earmarked to purchase telecom recharges, utility bill payments (electricity, gas, broadband), and digital vouchers.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li><strong>No Cash Withdrawals:</strong> Funds credited to your TriHubPay balance cannot be redeemed for cash or transferred back to personal bank accounts, preventing illegal money transmission and complying with PMLA 2002 guidelines.</li>
              <li><strong>No Peer-to-Peer (P2P) Transfers:</strong> Balances cannot be transferred to other users or external third parties.</li>
              <li><strong>Zero Interest:</strong> Account balances carry strictly 0% interest and do not constitute bank deposits, savings, or investments.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">2. Service Agency &amp; Trade Discount Model</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The operational model of TriHubPay adheres strictly to authorized Indian commercial trade and distribution principles:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li><strong>Trade Discounts &amp; Cashback:</strong> Retail margins and discounts earned by shops and users are genuine promotional trade discounts for facilitating telecom connectivity and utility bill settlements.</li>
              <li><strong>Transparent Pricing:</strong> All recharge plans and pricing are transparently quoted before execution with zero hidden costs.</li>
              <li><strong>Instant Refund Guarantee:</strong> Failed recharge amounts are returned 100% to the user&apos;s prepaid balance automatically.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">3. Payment Verification &amp; Anti-Fraud (PMLA 2002)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All balance loads via UPI require a valid 12-digit Unique Transaction Reference (UTR) generated by your bank app:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li>Submitting fake, falsified, or duplicate UTR numbers is a criminal offence under IPC Section 420 and IT Act Section 66D.</li>
              <li>TriHubPay employs automated cryptographic UTR locks; duplicate submissions are blocked immediately and accounts attempting fraud will be permanently suspended.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">4. Telecommunications &amp; Operator Routing</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              TriHubPay routes digital recharge requests to licensed telecom service providers (Airtel, Jio, Vi, BSNL, etc.) through authorized API gateways. While TriHubPay guarantees instantaneous execution from its platform, actual network provisioning remains dependent on the respective telecom operator&apos;s cellular towers and core billing systems.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">5. Governing Law &amp; Jurisdiction</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These terms are governed by the laws of India. Any disputes arising out of the use of this portal shall be subject to the exclusive jurisdiction of the competent courts in Tamil Nadu, India.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between rounded-b-3xl shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Last Updated: September 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
