import React, { useState } from 'react';
import { Transaction } from '../../types';
import { api } from '../../services/api';
import { Layers, Search, CheckCircle, Clock, XCircle, RotateCcw, Copy, Check, RefreshCw, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface AllTransactionsTableProps {
  transactions: Transaction[];
  onRefresh?: () => void;
}

export const AllTransactionsTable: React.FC<AllTransactionsTableProps> = ({ transactions, onRefresh }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<{
    txId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    message: string;
    upstream_ref?: string;
    refunded?: boolean;
  } | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCheckStatus = async (t: Transaction) => {
    if (!t.id) return;
    setCheckingId(t.id);
    try {
      const res = await api.checkTransactionStatus(t.id);
      setStatusResult({
        txId: t.internal_tx_id,
        status: res.status,
        message: res.message,
        upstream_ref: res.upstream_ref,
        refunded: res.refunded
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusResult({
        txId: t.internal_tx_id,
        status: 'FAILED',
        message: err.message || 'Failed to check status with upstream gateway.'
      });
    } finally {
      setCheckingId(null);
    }
  };

  const filtered = transactions.filter((t) => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const matchesSearch =
      t.internal_tx_id.toLowerCase().includes(search.toLowerCase()) ||
      t.target_account_number.includes(search) ||
      (t.retailer_shop_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <RotateCcw className="w-3 h-3" />
            <span>REFUNDED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-brand-500" />
            <span>Live Platform Transaction Audit Log</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit trail of upstream routes, split commissions, and reconciliation status.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Txn ID or Account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* ─── 1. MOBILE RESPONSIVE CARDS (No horizontal scroll) ─── */}
      <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No matching transactions found.
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id || t.internal_tx_id} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <span>{t.target_account_number}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans font-semibold">
                      {t.operator_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {t.retailer_shop_name || 'Retailer Shop'} ({t.retailer_phone || 'N/A'})
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    ₹{Number(t.face_value).toFixed(2)}
                  </div>
                  <div className="mt-0.5">
                    {getStatusBadge(t.status)}
                  </div>
                </div>
              </div>

              {/* Splits and Txn ID */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-[9px] uppercase font-sans text-slate-400 block">Retailer Comm</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+₹{Number(t.retailer_commission).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-sans text-slate-400 block">Admin Margin</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">+₹{Number(t.admin_commission).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-sans text-slate-400 block">Channel</span>
                  <span className="font-bold">{t.upstream_api_used || 'NEROPAY'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="truncate max-w-[140px]">{t.internal_tx_id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(t.internal_tx_id)}
                    className="p-0.5 hover:text-slate-600"
                    title="Copy Txn ID"
                  >
                    {copiedId === t.internal_tx_id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                
                <button
                  onClick={() => handleCheckStatus(t)}
                  disabled={checkingId === t.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-sans font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${checkingId === t.id ? 'animate-spin' : ''}`} />
                  <span>{checkingId === t.id ? 'Checking...' : 'Check Status'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── 2. DESKTOP TABLE VIEW ─── */}
      <div className="hidden sm:block overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Txn ID & Date</th>
              <th className="py-3 px-4">Retailer Shop</th>
              <th className="py-3 px-4">Target / Operator</th>
              <th className="py-3 px-4 text-right">Face Value</th>
              <th className="py-3 px-4 text-right">Retailer Comm</th>
              <th className="py-3 px-4 text-right">Admin Margin</th>
              <th className="py-3 px-4 text-center">Channel</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Live Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 text-xs font-sans">
                  No matching platform transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id || t.internal_tx_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white text-[11px] truncate max-w-[140px]">{t.internal_tx_id}</div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-sans">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{t.retailer_shop_name || 'Retailer'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{t.retailer_phone}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{t.target_account_number}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{t.operator_code}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    ₹{Number(t.face_value).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    +₹{Number(t.retailer_commission).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                    +₹{Number(t.admin_commission).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-sans font-bold">
                      {t.upstream_api_used || 'NEROPAY'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(t.status)}
                  </td>

                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => handleCheckStatus(t)}
                      disabled={checkingId === t.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 transition-colors"
                      title="Query live operator status"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingId === t.id ? 'animate-spin' : ''}`} />
                      <span>{checkingId === t.id ? 'Checking...' : 'Check Status'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── LIVE STATUS RESULT MODAL ─── */}
      {statusResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusResult.status === 'SUCCESS' && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                {statusResult.status === 'PENDING' && <Clock className="w-6 h-6 text-amber-500" />}
                {statusResult.status === 'FAILED' && <XCircle className="w-6 h-6 text-rose-500" />}
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Upstream Live Status Check
                </h3>
              </div>
              <button
                onClick={() => setStatusResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{statusResult.txId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Live Status:</span>
                {getStatusBadge(statusResult.status)}
              </div>
              {statusResult.upstream_ref && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Operator Ref:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{statusResult.upstream_ref}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {statusResult.message}
            </div>

            {statusResult.refunded && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Order cost was automatically refunded to the retailer cash float wallet.</span>
              </div>
            )}

            <button
              onClick={() => setStatusResult(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
