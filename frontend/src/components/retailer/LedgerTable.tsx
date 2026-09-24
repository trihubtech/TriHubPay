import React, { useState, useEffect } from 'react';
import { Transaction, DepositRequest, LedgerEntry, User } from '../../types';
import { 
  Receipt, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RotateCcw, 
  History, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  Copy,
  Check,
  MessageCircle,
  Search
} from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';
import { api } from '../../services/api';

interface LedgerTableProps {
  transactions: Transaction[];
  onViewReceipt: (tx: Transaction) => void;
  currentUser?: User | null;
  onRefreshTransactions?: () => void;
  onOpenStatusChecker?: (txId?: string) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ 
  transactions, 
  onViewReceipt,
  currentUser,
  onRefreshTransactions,
  onOpenStatusChecker
}) => {
  const [activeTab, setActiveTab] = useState<'RECHARGES' | 'LEDGER' | 'DEPOSITS'>('RECHARGES');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState<boolean>(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ id: string; message: string; isSuccess: boolean } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCheckStatus = async (tx: Transaction) => {
    const txId = tx.id || tx.internal_tx_id;
    setCheckingStatusId(txId);
    try {
      const res = await api.checkRetailerTransactionStatus(txId);
      if (res.success) {
        setStatusToast({
          id: txId,
          message: res.message || `Status: ${res.status}`,
          isSuccess: res.status === 'SUCCESS'
        });
        if (onRefreshTransactions) {
          onRefreshTransactions();
        }
      }
    } catch (err: any) {
      setStatusToast({
        id: txId,
        message: err.message || 'Status check failed',
        isSuccess: false
      });
    } finally {
      setCheckingStatusId(null);
      setTimeout(() => setStatusToast(null), 6000);
    }
  };

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

  const fetchLedger = async () => {
    setLoadingLedger(true);
    try {
      const res = await api.getRetailerLedger();
      if (res.success) {
        setLedgerEntries(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load wallet ledger', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DEPOSITS') {
      fetchDeposits();
    } else if (activeTab === 'LEDGER') {
      fetchLedger();
    }
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle className="w-3 h-3" />
            <span>Success</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <RotateCcw className="w-3 h-3" />
            <span>Refunded</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const handleRemindAdmin = (dep: DepositRequest) => {
    const adminPhone = '916374569225';
    const msg = `*TriHubPay Deposit Approval Reminder*\n\n` +
      `Amount: ₹${dep.amount}\n` +
      `Txn Ref: ${dep.txn_ref}\n` +
      `UTR / Bank Ref: ${dep.utr_number || 'N/A'}\n` +
      `Date: ${new Date(dep.created_at).toLocaleString('en-IN')}\n\n` +
      `Please approve my wallet load request. Thank you!`;
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* ─── Responsive 3-Tab Switcher Header (All 3 tabs 100% visible on all phones) ─── */}
      <div className="px-2.5 sm:px-5 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 flex-1 min-w-0">
          {/* Tab 1: Recharges */}
          <button
            type="button"
            onClick={() => setActiveTab('RECHARGES')}
            className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
              activeTab === 'RECHARGES'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Recharges</span>
              <span className="hidden sm:inline">Recharge Passbook</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono shrink-0">
              {transactions.length}
            </span>
          </button>

          {/* Tab 2: Wallet Ledger */}
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
              activeTab === 'LEDGER'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Ledger</span>
              <span className="hidden sm:inline">Wallet Ledger</span>
            </span>
            {ledgerEntries.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono shrink-0">
                {ledgerEntries.length}
              </span>
            )}
          </button>

          {/* Tab 3: Deposit Requests */}
          <button
            type="button"
            onClick={() => setActiveTab('DEPOSITS')}
            className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
              activeTab === 'DEPOSITS'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Deposits</span>
              <span className="hidden sm:inline">Deposit Requests</span>
            </span>
            {deposits.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                {deposits.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons: Status Checker & Refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenStatusChecker && (
            <button
              type="button"
              onClick={() => onOpenStatusChecker()}
              title="Check Live Status from Telecom Gateway"
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Check Status</span>
            </button>
          )}

          {/* Refresh Action */}
          {(activeTab === 'DEPOSITS' || activeTab === 'LEDGER') ? (
            <button
              type="button"
              onClick={activeTab === 'DEPOSITS' ? fetchDeposits : fetchLedger}
              disabled={loadingDeposits || loadingLedger}
              title="Refresh List"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDeposits || loadingLedger ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          ) : (
            onRefreshTransactions && (
              <button
                type="button"
                onClick={onRefreshTransactions}
                title="Refresh Recharges"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === 'DEPOSITS' ? (
        /* ═════════ TAB: DEPOSIT REQUESTS ═════════ */
        <div className="max-h-[520px] overflow-y-auto">
          {loadingDeposits ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>Loading deposit status...</span>
            </div>
          ) : deposits.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No deposit requests submitted yet</p>
              <p className="text-[11px] text-slate-400">
                Top-up your wallet using UPI QR and track your verification status here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {deposits.map((dep) => {
                const isApproved = dep.status === 'COMPLETED';
                const isRejected = dep.status === 'REJECTED';
                const isPending = dep.status === 'PENDING' || dep.status === 'PENDING_APPROVAL';

                return (
                  <div key={dep.id} className="p-3.5 sm:p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                            ₹{Number(dep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            UTR: {dep.utr_number || 'N/A'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {new Date(dep.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pending</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemindAdmin(dep)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="Remind Admin on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          </div>
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
                            {dep.admin_remarks || 'Bank transfer not received. Please verify UTR.'}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'LEDGER' ? (
        /* ═════════ TAB: WALLET LEDGER (NO NaN, ACCURATE BADGES) ═════════ */
        <div className="max-h-[520px] overflow-y-auto">
          {loadingLedger ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>Loading ledger history...</span>
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Wallet className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No ledger movements yet</p>
              <p className="text-[11px] text-slate-400">
                All balance credits, debits, UPI approvals, and admin adjustments will record here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {ledgerEntries.map((entry, idx) => {
                // Defensive amount parser
                const rawAmt = parseFloat(String(entry.amount || 0));
                const amtNum = isNaN(rawAmt) ? 0 : Math.abs(rawAmt);

                // Defensive transaction type parser (guard against legacy corrupted records)
                let isCredit = entry.transaction_type === 'CREDIT';
                if (entry.transaction_type !== 'CREDIT' && entry.transaction_type !== 'DEBIT') {
                  const descLower = String(entry.description || '').toLowerCase();
                  isCredit = !descLower.includes('order') && (descLower.includes('credit') || descLower.includes('refund') || descLower.includes('topup') || descLower.includes('deposit'));
                }
                const displayType = isCredit ? 'CREDIT' : 'DEBIT';

                // Defensive balance parser (guarantees NO NaN ever renders!)
                const beforeRaw = parseFloat(String(entry.balance_before || 0));
                const beforeNum = isNaN(beforeRaw) ? 0 : beforeRaw;

                let afterRaw = parseFloat(String(entry.balance_after || 0));
                let afterNum = isNaN(afterRaw) 
                  ? (isCredit ? beforeNum + amtNum : Math.max(0, beforeNum - amtNum))
                  : afterRaw;

                const displayRef = entry.reference_id && !entry.reference_id.startsWith('Order ') ? entry.reference_id : null;
                const entryId = entry.id || `led-${idx}`;

                return (
                  <div key={entryId} className="p-3.5 sm:p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isCredit 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span>{displayType}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(entry.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                          {entry.description || 'Wallet Balance Movement'}
                        </div>

                        {displayRef && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span>Ref:</span>
                            <span className="truncate max-w-[200px] sm:max-w-none">{displayRef}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(displayRef, entryId)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                              title="Copy Reference"
                            >
                              {copiedId === entryId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right Amount & Balance */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className={`text-base font-black font-mono ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {isCredit ? '+' : '-'}₹{amtNum.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          Bal: ₹{beforeNum.toFixed(2)} ➔ <span className="font-bold text-slate-800 dark:text-slate-100">₹{afterNum.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : transactions.length === 0 ? (
        /* ═════════ TAB: PASSBOOK (EMPTY STATE) ═════════ */
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <Receipt className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium">No recharges executed yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Transaction history with earned cashback will appear here.
          </p>
        </div>
      ) : (
        /* ═════════ TAB: RECHARGE TRANSACTIONS (CLEAN MOBILE CARDS) ═════════ */
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[520px] overflow-y-auto">
          {transactions.map((tx) => {
            const txId = tx.id || tx.internal_tx_id;
            return (
              <div key={txId} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <OperatorIcon operatorCode={tx.operator_code} size="md" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Full Target Mobile / Account Number */}
                      <span className="font-bold text-slate-900 dark:text-white text-sm font-mono tracking-tight">
                        {tx.target_account_number}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {tx.operator_code}
                      </span>
                      {getStatusBadge(tx.status)}
                    </div>

                    {/* Full Timestamp & Copyable Transaction ID */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>{new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <span className="truncate max-w-[140px] sm:max-w-none">{tx.internal_tx_id}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tx.internal_tx_id, tx.internal_tx_id)}
                          className="hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                          title="Copy Transaction ID"
                        >
                          {copiedId === tx.internal_tx_id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Amount & Receipt Button */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      ₹{Number(tx.face_value).toFixed(2)}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +₹{Number(tx.retailer_commission).toFixed(2)} {currentUser?.account_type === 'CONSUMER' ? 'Cashback' : 'Margin'}
                    </div>
                  </div>

                  {onOpenStatusChecker ? (
                    <button
                      type="button"
                      onClick={() => onOpenStatusChecker(tx.internal_tx_id)}
                      className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        tx.status === 'PENDING'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : tx.status === 'FAILED'
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Verify Live Status from Telecom Gateway"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden sm:inline">Check</span>
                    </button>
                  ) : tx.status === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => handleCheckStatus(tx)}
                      disabled={checkingStatusId === txId}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Check live status from operator"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingStatusId === txId ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Check</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onViewReceipt(tx)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                    title="View & Print Receipt"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Check Toast / Banner */}
              {statusToast && statusToast.id === txId && (
                <div className={`mx-3 sm:mx-4 mb-2.5 p-2 rounded-xl text-xs flex items-center gap-1.5 border ${
                  statusToast.isSuccess 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                }`}>
                  {statusToast.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{statusToast.message}</span>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
