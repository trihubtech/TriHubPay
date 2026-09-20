import React, { useState } from 'react';
import { X, QrCode, ArrowRight, CheckCircle2, ShieldCheck, Copy, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

interface UpiTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const UpiTopupModal: React.FC<UpiTopupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrData, setQrData] = useState<{
    txn_ref: string;
    amount: number;
    upi_vpa: string;
    upi_string: string;
    qr_code_data_url: string;
  } | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);
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

  const handleSimulatePayment = async () => {
    if (!qrData) return;
    setConfirming(true);
    setErrorMsg('');
    try {
      const res = await api.confirmUpiTopup(qrData.txn_ref, `UPI_SIM_${Date.now()}`);
      if (res.success) {
        onSuccess(res.data.new_balance);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to confirm UPI deposit');
    } finally {
      setConfirming(false);
    }
  };

  const handleCopyVpa = () => {
    if (qrData?.upi_vpa) {
      navigator.clipboard.writeText(qrData.upi_vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Instant UPI Cash Deposit</h3>
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

          {!qrData ? (
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
                  <span>Closed-Loop Prepaid Wallet Rules</span>
                </div>
                <p>
                  Cash is credited to your wallet balance instantly with 0% gateway fee. Non-withdrawable to personal bank accounts.
                </p>
              </div>

              <button
                onClick={handleGenerateQr}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-brand-600/20"
              >
                {loading ? 'Generating Dynamic QR...' : 'Generate Instant Dynamic UPI QR'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto border border-slate-200 dark:border-none">
                <img
                  src={qrData.qr_code_data_url}
                  alt="Dynamic UPI QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  ₹{qrData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI App
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

              {/* Confirmation Simulation */}
              <button
                onClick={handleSimulatePayment}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirming ? 'Verifying NPCI Callback...' : 'Simulate / Confirm Instant Credit'}</span>
              </button>

              <button
                onClick={() => setQrData(null)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
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
