import React, { useState } from 'react';
import { CommissionMatrixItem } from '../../types';
import { api } from '../../services/api';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';
import { Sliders, Save, CheckCircle, AlertCircle, Percent } from 'lucide-react';

interface CommissionMatrixGridProps {
  items: CommissionMatrixItem[];
  onRefresh: () => void;
}

export const CommissionMatrixGrid: React.FC<CommissionMatrixGridProps> = ({ items, onRefresh }) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editMasterRate, setEditMasterRate] = useState<number>(0);
  const [editRetailerRate, setEditRetailerRate] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const startEdit = (item: CommissionMatrixItem) => {
    setEditingCode(item.operator_code);
    setEditMasterRate(Number(item.neropay_master_rate ?? item.master_api_rate ?? 1.0));
    setEditRetailerRate(Number(item.retailer_pass_down_rate ?? 0.58));
    setStatusMsg('');
    setErrorMsg('');
  };

  const handleSave = async (item: CommissionMatrixItem) => {
    setErrorMsg('');
    if (editRetailerRate > editMasterRate) {
      setErrorMsg('Retailer pass-down rate cannot exceed Master API payout! Platform would lose money.');
      return;
    }

    setSaving(true);
    setStatusMsg('');
    try {
      const res = await api.updateCommissionMatrix(item.operator_code, editMasterRate, editRetailerRate, item.is_active);
      if (res.success) {
        setStatusMsg(`Updated ${item.operator_code} successfully`);
        setEditingCode(null);
        onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update commission rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-brand-500" />
            <span>Global Dynamic Commission Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Orchestrate baseline payout splits so Platform Admin retains a 5.0% net average margin.
          </p>
        </div>

        {statusMsg && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </span>
        )}

        {errorMsg && (
          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Operator Code & Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-center">NeroPay Upstream Rate</th>
              <th className="py-3 px-4 text-center">Retailer Pass-Down (58%)</th>
              <th className="py-3 px-4 text-center">Admin Net Margin (42%)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {items.map((it) => {
              const isEditing = editingCode === it.operator_code;
              const masterRate = Number(it.neropay_master_rate ?? it.master_api_rate ?? 1.0);
              const retailerRate = Number(it.retailer_pass_down_rate ?? 0.58);
              const projectedMargin = isEditing
                ? Number((editMasterRate - editRetailerRate).toFixed(2))
                : Number(it.admin_net_margin ?? (masterRate - retailerRate).toFixed(2));

              return (
                <tr key={it.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <OperatorIcon operatorCode={it.operator_code} size="sm" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {formatOperatorName(it.operator_code, it.operator_name)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{it.operator_code}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                      {it.service_type}
                    </span>
                  </td>

                  {/* Master Rate (NeroPay) */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editMasterRate}
                        onChange={(e) => setEditMasterRate(parseFloat(e.target.value))}
                        className="w-16 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-center text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                      />
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{masterRate.toFixed(2)}%</span>
                    )}
                  </td>

                  {/* Retailer Rate */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editRetailerRate}
                        onChange={(e) => setEditRetailerRate(parseFloat(e.target.value))}
                        className="w-16 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-center text-blue-600 dark:text-brand-400 font-bold focus:outline-none focus:border-brand-500"
                      />
                    ) : (
                      <span className="text-blue-600 dark:text-brand-400 font-bold">{retailerRate.toFixed(2)}%</span>
                    )}
                  </td>

                  {/* Admin Net Margin */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      projectedMargin >= 0.4
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                    }`}>
                      <span>+{projectedMargin.toFixed(2)}%</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSave(it)}
                          disabled={saving}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingCode(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(it)}
                        className="text-xs text-blue-600 dark:text-brand-400 hover:text-blue-700 dark:hover:text-brand-300 font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-750 transition-colors"
                      >
                        Adjust Rates
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
