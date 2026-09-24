import React, { useState } from 'react';
import { api } from '../../services/api';
import { 
  Search, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ArrowRight,
  Phone,
  FileText,
  Loader2
} from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';

interface TransactionStatusCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
  prefilledTxId?: string;
}

export const TransactionStatusCheckModal: React.FC<TransactionStatusCheckModalProps> = ({
  isOpen,
  onClose,
  onStatusUpdated,
  prefilledTxId = ''
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(prefilledTxId);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isCheckingLive, setIsCheckingLive] = useState<boolean>(false);
  const [liveResult, setLiveResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      if (prefilledTxId) {
        setSearchQuery(prefilledTxId);
        executeSearch(prefilledTxId);
      } else {
        setSearchResults([]);
        setSelectedTx(null);
        setLiveResult(null);
        setErrorMsg('');
      }
    }
  }, [isOpen, prefilledTxId]);

  if (!isOpen) return null;

  const executeSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setErrorMsg('');
    setLiveResult(null);
    try {
      const res = await api.searchTransactionsLive(q);
      if (res.success) {
        setSearchResults(res.data);
        if (res.data.length === 1) {
          setSelectedTx(res.data[0]);
        } else if (res.data.length === 0) {
          setSelectedTx(null);
          setErrorMsg(`No transactions found matching "${q}". Try full internal Txn ID or 10-digit mobile number.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLiveStatusCheck = async (txId: string) => {
    setIsCheckingLive(true);
    setErrorMsg('');
    try {
      const res = await api.checkTransactionStatus(txId);
      if (res.success) {
        setLiveResult(res);
        if (selectedTx) {
          setSelectedTx({
            ...selectedTx,
            status: res.status,
            upstream_operator_ref: res.upstream_ref || selectedTx.upstream_operator_ref
          });
        }
        if (onStatusUpdated) onStatusUpdated();
      } else {
        setErrorMsg(res.message || 'Live check completed with issues');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to query telecom gateway');
    } finally {
      setIsCheckingLive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                On-Demand Upstream Status Checker
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live telecom gateway status verification &amp; instant refund sync
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search Box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(searchQuery);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Internal Txn ID, Mobile number, or Operator Ref..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Search Results Picker if multiple matches */}
          {searchResults.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select matching transaction ({searchResults.length})
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {searchResults.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      setSelectedTx(tx);
                      setLiveResult(null);
                    }}
                    className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      selectedTx?.id === tx.id
                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <OperatorIcon operatorCode={tx.operator_code} size="sm" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white font-mono">{tx.target_account_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tx.internal_tx_id}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">₹{parseFloat(tx.face_value).toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${
                        tx.status === 'SUCCESS' ? 'text-emerald-600' : tx.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Transaction Card */}
          {selectedTx && (
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <OperatorIcon operatorCode={selectedTx.operator_code} size="md" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatOperatorName(selectedTx.operator_code)} • ₹{parseFloat(selectedTx.face_value).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Target: <strong className="text-slate-900 dark:text-white">{selectedTx.target_account_number}</strong>
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase ${
                  selectedTx.status === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : selectedTx.status === 'FAILED' || selectedTx.status === 'REFUNDED'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {selectedTx.status}
                </span>
              </div>

              {/* Tx Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Internal ID</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">{selectedTx.internal_tx_id}</span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Operator Ref / UTR</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedTx.upstream_operator_ref || 'None Assigned'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Retailer User</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedTx.owner_name || selectedTx.organization_name || 'Retailer'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Retailer Cashback</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 block">
                    +₹{parseFloat(selectedTx.retailer_commission || '0').toFixed(2)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Admin Profit</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                    +₹{parseFloat(selectedTx.admin_commission || '0').toFixed(2)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans block">Gateway Route</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">{selectedTx.upstream_api_used}</span>
                </div>
              </div>

              {/* Action Button: Check Live Upstream Gateway */}
              <button
                type="button"
                onClick={() => handleLiveStatusCheck(selectedTx.id)}
                disabled={isCheckingLive}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isCheckingLive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Querying Telecom Gateway Live (NeroPay Status API)...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Check Live Status from Telecom Gateway</span>
                  </>
                )}
              </button>

              {/* Live Status Response Card */}
              {liveResult && (
                <div className={`p-3.5 rounded-xl border space-y-2 animate-in fade-in text-xs font-mono ${
                  liveResult.status === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : liveResult.status === 'FAILED'
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 font-sans">
                      {liveResult.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {liveResult.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-500" />}
                      <span>Live Result: {liveResult.status}</span>
                    </span>
                    {liveResult.refunded && (
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-sans">
                        Auto-Refunded
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-sans font-medium">{liveResult.message}</p>
                  {liveResult.upstream_ref && (
                    <div className="text-[11px]">Operator Ref: <strong>{liveResult.upstream_ref}</strong></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
