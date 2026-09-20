import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Copy, RefreshCw, AlertCircle, ShieldCheck, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';

interface PendingDeposit {
  id: string;
  user_id: string;
  txn_ref: string;
  amount: string | number;
  utr_number: string;
  status: string;
  created_at: string;
  organization_name: string;
  owner_name: string;
  phone: string;
  current_wallet_balance: string | number;
}

interface PendingDepositsTableProps {
  onBalanceUpdated?: () => void;
}

export const PendingDepositsTable: React.FC<PendingDepositsTableProps> = ({ onBalanceUpdated }) => {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [approvingDeposit, setApprovingDeposit] = useState<PendingDeposit | null>(null);
  const [rejectingDeposit, setRejectingDeposit] = useState<PendingDeposit | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Bank transfer not received. Please verify with your bank.');

  const fetchPending = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.getPendingDeposits();
      if (res.success) {
        setDeposits(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load pending deposits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleOpenApproveModal = (deposit: PendingDeposit) => {
    setApprovingDeposit(deposit);
  };

  const handleConfirmApprove = async () => {
    if (!approvingDeposit) return;
    const target = approvingDeposit;

    setActionLoadingId(target.id);
    setStatusMsg(null);
    try {
      const res = await api.approveDeposit(target.id);
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message });
        setDeposits(prev => prev.filter(d => d.id !== target.id));
        setApprovingDeposit(null);
        if (onBalanceUpdated) onBalanceUpdated();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve deposit' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejectModal = (deposit: PendingDeposit) => {
    setRejectingDeposit(deposit);
    setRejectReason('Bank transfer not received. Please verify with your bank.');
  };

  const handleConfirmReject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rejectingDeposit) return;
    const target = rejectingDeposit;

    setActionLoadingId(target.id);
    setStatusMsg(null);
    try {
      const res = await api.rejectDeposit(target.id, rejectReason || 'Bank transfer not received');
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Deposit of ₹${target.amount} for ${target.organization_name} was rejected.` });
        setDeposits(prev => prev.filter(d => d.id !== target.id));
        setRejectingDeposit(null);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject deposit' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              UPI Deposit Verification & Approvals
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {deposits.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Retailers submit 12-digit UTR numbers after transferring funds. Verify your bank account, then approve to credit their wallet.
          </p>
        </div>

        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div className={`p-4 border-b text-xs flex items-center gap-2 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Table */}
      {loading && deposits.length === 0 ? (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          Loading deposit requests...
        </div>
      ) : deposits.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No pending UPI deposit requests awaiting verification.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">RETAILER / SHOP</th>
                <th className="py-3 px-4">DEPOSIT AMOUNT</th>
                <th className="py-3 px-4">UTR / REF NUMBER</th>
                <th className="py-3 px-4">SUBMITTED AT</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {d.organization_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {d.owner_name} • {d.phone}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Current Bal: ₹{Number(d.current_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-800 dark:text-slate-200">
                        {d.utr_number || 'N/A'}
                      </span>
                      {d.utr_number && (
                        <button
                          onClick={() => copyToClipboard(d.utr_number, d.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          title="Copy UTR"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {copiedId === d.id && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Copied!
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(d.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(d.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenApproveModal(d)}
                        disabled={actionLoadingId === d.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === d.id ? 'Crediting...' : 'Approve & Credit'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(d)}
                        disabled={actionLoadingId === d.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium text-xs transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Reject Deposit Request
                </h4>
              </div>
              <button
                onClick={() => setRejectingDeposit(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              {/* Deposit Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {rejectingDeposit.organization_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {rejectingDeposit.owner_name} • {rejectingDeposit.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                      ₹{Number(rejectingDeposit.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">UTR:</span>
                  <span className="font-bold">{rejectingDeposit.utr_number || 'N/A'}</span>
                </div>
              </div>

              {/* Rejection Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for rejection:
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Bank transfer not received, Please Pay"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                />
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Bank transfer not received, Please Pay',
                  'Incorrect 12-digit UTR number',
                  'Payment amount mismatch'
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRejectReason(tag)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingDeposit(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectingDeposit.id}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoadingId === rejectingDeposit.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Reject Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approvingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Confirm Deposit Approval
                </h4>
              </div>
              <button
                onClick={() => setApprovingDeposit(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Deposit Info Card */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-800/60 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {approvingDeposit.organization_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {approvingDeposit.owner_name} • {approvingDeposit.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{Number(approvingDeposit.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">UTR / Ref:</span>
                  <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {approvingDeposit.utr_number || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Warning/Verification Note */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Verify Bank Settlement First</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Make sure you have confirmed credit of ₹{approvingDeposit.amount} in your UPI bank account (<strong>8270873279@upi</strong>). Approving will instantly credit both the retailer's wallet and your Admin Master Vault.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingDeposit(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={actionLoadingId === approvingDeposit.id}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoadingId === approvingDeposit.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Credit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
