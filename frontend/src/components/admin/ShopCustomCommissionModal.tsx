import React, { useState, useEffect } from 'react';
import { User, ShopCustomCommission, CommissionMatrixItem } from '../../types';
import { api } from '../../services/api';
import { formatOperatorName } from '../../utils/formatters';
import { X, Settings2, Plus, Trash2, CheckCircle2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface ShopCustomCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: User | null;
  matrixItems: CommissionMatrixItem[];
  onSaved: () => void;
}

export const ShopCustomCommissionModal: React.FC<ShopCustomCommissionModalProps> = ({
  isOpen,
  onClose,
  shop,
  matrixItems,
  onSaved
}) => {
  const [customRates, setCustomRates] = useState<ShopCustomCommission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedOp, setSelectedOp] = useState<string>('JIO');
  const [inputRate, setInputRate] = useState<string>('3.00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen && shop) {
      loadCustomRates();
      setFeedback('');
      setErrorMsg('');
    }
  }, [isOpen, shop]);

  // Synchronize inputRate whenever selectedOp, customRates, or matrixItems changes
  useEffect(() => {
    if (!isOpen) return;
    const existing = customRates.find(cr => cr.operator_code === selectedOp);
    if (existing) {
      setInputRate(existing.custom_pass_down_rate.toString());
    } else {
      const opMeta = matrixItems.find(m => m.operator_code === selectedOp);
      if (opMeta) {
        setInputRate(opMeta.retailer_pass_down_rate.toString());
      } else {
        setInputRate('3.00');
      }
    }
  }, [selectedOp, customRates, matrixItems, isOpen]);

  const loadCustomRates = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const res = await api.getShopCustomCommissions(shop.id);
      if (res.success) {
        setCustomRates(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !shop) return null;

  // Filter to only active Mobile and DTH operators (hiding inactive electricity, broadband, FASTag, etc.)
  const activeMatrixItems = matrixItems.filter(m => m.is_active && (m.service_type === 'MOBILE' || m.service_type === 'DTH'));
  const currentOpMeta = activeMatrixItems.find(m => m.operator_code === selectedOp) || matrixItems.find(m => m.operator_code === selectedOp);
  const existingOverride = customRates.find(cr => cr.operator_code === selectedOp);

  const handleSaveCustomRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setErrorMsg('');
    setFeedback('');

    const rate = parseFloat(inputRate);
    if (isNaN(rate) || rate < 0) {
      setErrorMsg('Please enter a valid rate percentage');
      return;
    }

    const masterRate = currentOpMeta ? (currentOpMeta.neropay_master_rate ?? currentOpMeta.master_api_rate ?? 1.0) : 1.0;
    if (currentOpMeta && rate > masterRate) {
      setErrorMsg(`Cannot set shop rate (${rate}%) higher than master API payout (${masterRate}%). Platform cannot operate at a loss!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultRate = currentOpMeta ? currentOpMeta.retailer_pass_down_rate : null;
      if (defaultRate !== null && Math.abs(rate - defaultRate) < 0.001) {
        // If the rate matches the global matrix default, delete any custom override
        await api.deleteShopCustomCommission(shop.id, selectedOp);
        setFeedback(`Rate matches global default (${rate}%). Reset to standard matrix!`);
      } else {
        const res = await api.setShopCustomCommission(shop.id, selectedOp, rate);
        if (res.success) {
          setFeedback(`Custom rate for ${selectedOp} saved at ${rate}%!`);
        }
      }
      await loadCustomRates();
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save custom rate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOverride = async (opCode: string) => {
    if (!shop) return;
    setErrorMsg('');
    setFeedback('');
    try {
      const res = await api.deleteShopCustomCommission(shop.id, opCode);
      if (res.success) {
        setFeedback(`Deleted override for ${opCode}`);
        await loadCustomRates();
        onSaved();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete override');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Shop-Specific Custom Commissions</h4>
              <div className="text-xs text-slate-500 dark:text-slate-400">{shop.organization_name} ({shop.owner_name})</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Information banner */}
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              Rates configured here <strong>override</strong> the global matrix exclusively for this shop. You can assign higher rates to reward high-volume retailers.
            </span>
          </div>

          {/* Form to add/update custom commission */}
          <form onSubmit={handleSaveCustomRate} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Assign or Modify Operator Rate</span>
              {existingOverride ? (
                <span className="text-[10px] normal-case px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                  Saved Rate: {existingOverride.custom_pass_down_rate}%
                </span>
              ) : currentOpMeta ? (
                <span className="text-[10px] normal-case px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  Default Rate: {currentOpMeta.retailer_pass_down_rate}%
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">OPERATOR</label>
                <select
                  value={selectedOp}
                  onChange={(e) => setSelectedOp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 font-medium"
                >
                  {activeMatrixItems.map((m) => (
                    <option key={m.operator_code} value={m.operator_code}>
                      {m.operator_code} - {formatOperatorName(m.operator_code, m.operator_name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  CUSTOM PASS-DOWN RATE (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max={currentOpMeta ? currentOpMeta.master_api_rate : 10}
                    value={inputRate}
                    onChange={(e) => setInputRate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-blue-600 dark:text-brand-400 pr-7 focus:outline-none focus:border-brand-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </div>
            </div>

            {currentOpMeta && (() => {
              const masterRate = currentOpMeta.neropay_master_rate ?? currentOpMeta.master_api_rate ?? 1.0;
              return (
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60">
                  <span>Upstream Rate: <strong className="text-slate-900 dark:text-white">{masterRate}%</strong></span>
                  <span>Default Retailer Rate: <strong className="text-slate-900 dark:text-white">{currentOpMeta.retailer_pass_down_rate}%</strong></span>
                  <span>Your Retained Margin: <strong className="text-emerald-600 dark:text-emerald-400">{(masterRate - parseFloat(inputRate || '0')).toFixed(2)}%</strong></span>
                </div>
              );
            })()}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>
                {existingOverride
                  ? `Update ${selectedOp} Custom Rate (${inputRate || '0'}%)`
                  : `Save Custom Rate for ${selectedOp} (${inputRate || '0'}%)`}
              </span>
            </button>
          </form>

          {feedback && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Custom Overrides List */}
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Active Overrides for this Shop ({customRates.length})
            </div>

            {loading ? (
              <div className="text-center py-4 text-xs text-slate-500">Loading custom overrides...</div>
            ) : customRates.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                No custom overrides yet. Shop uses default global rates.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {customRates.map((cr) => {
                  const diff = cr.custom_pass_down_rate - cr.default_rate;
                  const isCurrentlySelected = selectedOp === cr.operator_code;
                  return (
                    <div
                      key={cr.id}
                      onClick={() => {
                        setSelectedOp(cr.operator_code);
                        setInputRate(cr.custom_pass_down_rate.toString());
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCurrentlySelected
                          ? 'bg-blue-50/80 dark:bg-blue-500/10 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{cr.operator_code}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({formatOperatorName(cr.operator_code, cr.operator_name)})</span>
                          {isCurrentlySelected && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Default: {cr.default_rate}% ➔ <span className="text-blue-600 dark:text-brand-400 font-bold">Custom: {cr.custom_pass_down_rate}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {diff > 0 ? (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            +{diff.toFixed(2)}% Bonus
                          </span>
                        ) : diff < 0 ? (
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                            {diff.toFixed(2)}% Custom
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-slate-500 text-xs">
                            0.00% Standard
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteOverride(cr.operator_code)}
                          title="Revert to default matrix"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
