import React, { useState, useEffect } from 'react';
import { Transaction, DepositRequest } from '../../types';
import { Receipt, CheckCircle, Clock, XCircle, RotateCcw, History, RefreshCw, AlertCircle, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';
import { api } from '../../services/api';

interface LedgerTableProps {
  transactions: Transaction[];
  onViewReceipt: (tx: Transaction) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onViewReceipt }) => {
  const [activeTab, setActiveTab] = useState<'RECHARGES' | 'DEPOSITS'>('RECHARGES');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState<boolean>(false);

  const fetchDeposits = async () => {
    setLoadingDeposits(true);
    try {
      const res = await api.getMyDeposits();
      if (res.success) {
        setDeposits(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load deposit history', err);
    } finally {
      setLoadingDeposits(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DEPOSITS') {
      fetchDeposits();
    }
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>Success</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <RotateCcw className="w-3 h-3" />
            <span>Refunded</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Tab Switcher Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-850/70">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('RECHARGES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'RECHARGES'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-brand-500" />
            <span>Recharge Passbook</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'DEPOSITS'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-500" />
            <span>Deposit Requests</span>
            {deposits.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                {deposits.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'DEPOSITS' && (
          <button
            onClick={fetchDeposits}
            disabled={loadingDeposits}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline p-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDeposits ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>

      {activeTab === 'DEPOSITS' ? (
        /* Tab 2: Deposit Requests & Approval/Rejection Details */
        <div className="max-h-[480px] overflow-y-auto">
          {loadingDeposits ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading deposit status...</span>
            </div>
          ) : deposits.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No deposit requests submitted yet</p>
              <p className="text-[11px] text-slate-400">
                Top-up your wallet using UPI QR and track your bank verification status here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {deposits.map((dep) => {
                const isApproved = dep.status === 'COMPLETED';
                const isRejected = dep.status === 'REJECTED';
                const isPending = dep.status === 'PENDING' || dep.status === 'PENDING_APPROVAL';

                return (
                  <div key={dep.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                            ₹{Number(dep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            UTR: {dep.utr_number || 'N/A'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {new Date(dep.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved & Credited</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rejection Reason Callout */}
                    {isRejected && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[11px] text-rose-800 dark:text-rose-200 block">
                            Rejection Reason:
                          </span>
                          <span className="text-[11px] leading-tight block mt-0.5">
                            {dep.admin_remarks || 'Bank transfer not received, Please Pay'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Approved Note */}
                    {isApproved && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{dep.admin_remarks || 'Deposit Approved & Credited to Wallet'}</span>
                      </div>
                    )}

                    {/* Pending Note */}
                    {isPending && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting bank credit confirmation from Admin</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <Receipt className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium">No recharges executed yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Transaction history with earned cashback will appear here.
          </p>
        </div>
      ) : (
        /* Tab 1: Recharge Transactions */

      <div className="divide-y divide-slate-200 dark:divide-slate-800/60 max-h-[480px] overflow-y-auto">
        {transactions.map((tx) => (
          <div key={tx.id || tx.internal_tx_id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <OperatorIcon operatorCode={tx.operator_code} size="md" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate font-mono">
                    {tx.target_account_number}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    {tx.operator_code}
                  </span>
                  {getStatusBadge(tx.status)}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">{tx.internal_tx_id}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  ₹{Number(tx.face_value).toFixed(2)}
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +₹{Number(tx.retailer_commission).toFixed(2)} Cash
                </div>
              </div>

              <button
                onClick={() => onViewReceipt(tx)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                title="View & Print Receipt / Share on WhatsApp"
              >
                <Receipt className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
