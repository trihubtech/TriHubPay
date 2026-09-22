import React, { useState, useMemo } from 'react';
import { Operator, ServiceType } from '../../types';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';
import { X, Search, Check, Zap, Sparkles, ChevronRight } from 'lucide-react';

interface OperatorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: Operator[];
  selectedOperatorCode: string;
  onSelectOperator: (op: Operator) => void;
  serviceType: ServiceType;
}

export const OperatorSelectModal: React.FC<OperatorSelectModalProps> = ({
  isOpen,
  onClose,
  operators,
  selectedOperatorCode,
  onSelectOperator,
  serviceType
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getModalTitle = (type: ServiceType) => {
    switch (type) {
      case 'MOBILE': return 'Select Mobile Prepaid Operator';
      case 'DTH': return 'Select DTH TV Provider';
      case 'ELECTRICITY': return 'Select Electricity Board (BBPS)';
      case 'GOOGLE_PLAY': return 'Select Play Store Package';
      case 'OTT_APPS': return 'Select OTT Streaming Service';
      case 'FASTAG': return 'Select FASTag Issuer Bank';
      case 'LPG_GAS': return 'Select LPG Gas Provider';
      case 'BROADBAND': return 'Select Broadband Provider';
      default: return 'Select Service Provider';
    }
  };

  const title = getModalTitle(serviceType);

  const filteredOperators = useMemo(() => {
    // Only display operators belonging to the active service category (Mobile, DTH, or Electricity)
    const scopedOperators = operators.filter(op => !op.service_type || op.service_type === serviceType);
    const q = searchQuery.toLowerCase().trim();
    if (!q) return scopedOperators;
    return scopedOperators.filter(op => 
      op.operator_name.toLowerCase().includes(q) ||
      op.operator_code.toLowerCase().includes(q)
    );
  }, [operators, searchQuery, serviceType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slideUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official Indian telecom &amp; utility providers
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by operator name (e.g. Jio, Airtel, Sun Direct, TNEB)..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Operators Grid / List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredOperators.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400">
              No operators found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredOperators.map((op) => {
              const isSelected = selectedOperatorCode === op.operator_code;
              return (
                <div
                  key={op.operator_code}
                  onClick={() => {
                    onSelectOperator(op);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-brand-500/10 border-blue-600 dark:border-brand-500 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <OperatorIcon operatorCode={op.operator_code} size="lg" />
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {formatOperatorName(op.operator_code, op.operator_name)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>{op.operator_code}</span>
                        {op.retailer_pass_down_rate !== undefined && op.retailer_pass_down_rate > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">
                            <Sparkles className="w-2.5 h-2.5" />
                            {op.retailer_pass_down_rate}% Cashback
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-center">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>{filteredOperators.length} operators available</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
