import React from 'react';
import { Transaction } from '../../types';
import { Receipt, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';

interface LedgerTableProps {
  transactions: Transaction[];
  onViewReceipt: (tx: Transaction) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onViewReceipt }) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm">
        <Receipt className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
        <p className="text-sm font-medium">No recharges executed yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Transaction history with earned cashback will appear here.</p>
      </div>
    );
  }

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
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-500" />
          <span>Recent Transactions &amp; Cashback</span>
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{transactions.length} transactions</span>
      </div>

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
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                title="View & Print Receipt / Share on WhatsApp"
              >
                <Receipt className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
