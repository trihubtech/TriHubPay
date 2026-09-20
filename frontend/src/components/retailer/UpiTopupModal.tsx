import React, { useState } from 'react';
import { X, QrCode, ArrowRight, CheckCircle2, ShieldCheck, Copy, ExternalLink, Clock } from 'lucide-react';
import { api } from '../../services/api';

interface UpiTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const UpiTopupModal: React.FC<UpiTopupModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrData, setQrData] = useState<{
    txn_ref: string;
    amount: number;
    upi_vpa: string;
    merchant_name?: string;
    upi_string: string;
    qr_code_data_url: string;
  } | null>(null);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerateQr = async () => {
    if (!amount || amount < 100) {
      setErrorMsg('Minimum top-up amount is ₹100');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setSubmitted(false);
    setUtrNumber('');
    try {
      const res = await api.generateUpiTopup(amount);
      if (res.success) {
        setQrData(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate UPI QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!qrData) return;
    if (!utrNumber || utrNumber.trim().length < 6) {
      setErrorMsg('Please enter valid 12-digit UPI UTR / Reference number from your payment app (Google Pay / PhonePe / Paytm)');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.submitUpiDeposit(qrData.txn_ref, utrNumber.trim());
      if (res.success) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit deposit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyVpa = () => {
    if (qrData?.upi_vpa) {
      navigator.clipboard.writeText(qrData.upi_vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setQrData(null);
    setSubmitted(false);
    setUtrNumber('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Prepaid Wallet UPI Deposit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {submitted ? (
            /* Submission Success & Verification Pending View */
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Payment Submitted for Verification!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your deposit of <span className="font-bold font-mono text-slate-900 dark:text-white">₹{qrData?.amount}</span> with UTR <span className="font-bold font-mono text-brand-600 dark:text-brand-400">{utrNumber}</span> has been sent to TriHub Admin.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verification Policy</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Admin verifies bank credit against your UTR. Your wallet balance will update automatically once verified (usually within 5-10 minutes).
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : !qrData ? (
            /* Amount Input Step */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ENTER CASH AMOUNT (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="100"
                    max="200000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl py-3 pl-8 pr-4 text-2xl font-bold text-slate-900 dark:text-white font-mono focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      amount === amt
                        ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    +₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span>Direct Bank Verification (0% Fee)</span>
                </div>
                <p>
                  Pay via any UPI app. Admin verifies bank credit and updates your balance immediately.
                </p>
              </div>

              <button
                onClick={handleGenerateQr}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-brand-600/20"
              >
                {loading ? 'Generating Dynamic QR...' : 'Generate Dynamic UPI QR'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* QR & UTR Submission Step */
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto border border-slate-200 dark:border-none">
                <img
                  src={qrData.qr_code_data_url}
                  alt="Dynamic UPI QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  ₹{qrData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Scan using Google Pay, PhonePe, Paytm, or BHIM
                </div>
              </div>

              {/* VPA Details */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-400 font-mono truncate">{qrData.upi_vpa}</span>
                <button
                  onClick={handleCopyVpa}
                  className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold flex items-center gap-1 ml-2 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Direct UPI App Intent Trigger on Mobile */}
              <a
                href={qrData.upi_string}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Installed UPI App</span>
              </a>

              {/* Step 2: Enter 12-digit UTR */}
              <div className="text-left space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ENTER 12-DIGIT UPI REF / UTR NUMBER:
                </label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="e.g. 426381920381"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-center"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  After paying in your UPI app, enter the 12-digit UTR/UPI Ref ID found on your payment receipt so admin can verify and credit your wallet.
                </p>
              </div>

              {/* Submit for Admin Verification */}
              <button
                onClick={handleSubmitDeposit}
                disabled={submitting || utrNumber.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Submitting to Admin...' : 'Submit Payment for Verification'}</span>
              </button>

              <button
                onClick={handleReset}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline block mx-auto"
              >
                Change Amount
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
