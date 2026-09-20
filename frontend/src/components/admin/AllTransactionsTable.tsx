import React, { useState } from 'react';
import { Transaction } from '../../types';
import { Layers, Search, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';

interface AllTransactionsTableProps {
  transactions: Transaction[];
}

export const AllTransactionsTable: React.FC<AllTransactionsTableProps> = ({ transactions }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

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
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
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
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Txn ID or Account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 w-44"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px]">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 text-xs font-sans">
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

                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    +₹{Number(t.retailer_commission).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-bold">
                    +₹{Number(t.admin_commission || 0).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.upstream_api_used === 'NOBLE_WEB'
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
                    }`}>
                      {t.upstream_api_used}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(t.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
