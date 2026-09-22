import React, { useState, useMemo } from 'react';
import { Plan } from '../../types';
import { X, Search, Sparkles, Zap, Check, ChevronRight, Info } from 'lucide-react';
import { PlanDetailsModal } from './PlanDetailsModal';
import { OperatorIcon } from '../common/OperatorIcon';

interface BrowsePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorName: string;
  operatorCode: string;
  plans: Plan[];
  onSelectPlan: (amount: number) => void;
  currentAmount?: string;
}

export const BrowsePlansModal: React.FC<BrowsePlansModalProps> = ({
  isOpen,
  onClose,
  operatorName,
  operatorCode,
  plans,
  onSelectPlan,
  currentAmount
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<Plan | null>(null);

  const isDth = /dth|sundirect|tataplay|dishtv|d2h/i.test(operatorCode) || /dth|tv|direct/i.test(operatorName.toLowerCase());

  // Extract all unique categories present in plans
  const categories = useMemo(() => {
    const cats = new Set<string>();
    plans.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['ALL', ...Array.from(cats)];
  }, [plans]);

  // Filter plans by category and search
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchCategory = activeCategory === 'ALL' || p.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        p.amount.toString().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.validity.toLowerCase().includes(q) ||
        p.data.toLowerCase().includes(q) ||
        (p.tag && p.tag.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [plans, activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 backdrop-blur-sm sm:p-4 animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col h-[92vh] sm:h-[85vh] max-h-[95vh] overflow-hidden">
          {/* Mobile Bottom Sheet Pull Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50 dark:bg-slate-950/60">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="px-4 py-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <OperatorIcon operatorCode={operatorCode} size="md" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Select a Recharge Plan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {operatorName} ({operatorCode})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-150 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar (Sticky) */}
          <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isDth ? "Search by amount, pack name, HD or language..." : "Search by amount, data (e.g. 1.5gb, 5G), validity or OTT..."}
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

          {/* Category Filter Pills (Horizontal Scroll - No Scrollbar) */}
          <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none touch-scroll shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat === 'ALL' ? `All Plans (${plans.length})` : cat}
              </button>
            ))}
          </div>

          {/* Plan Cards List (Smooth Independent Scroll) */}
          <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1 touch-scroll overscroll-contain">
            {filteredPlans.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
                No plans found matching &quot;{searchQuery}&quot;. Try a different keyword or category.
              </div>
            ) : (
              filteredPlans.map((p, idx) => {
                const isSelected = currentAmount === p.amount.toString();
                return (
                  <div
                    key={`${p.amount}-${idx}`}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-brand-500/10 border-blue-600 dark:border-brand-500 shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    {/* Top Offer Banner Pill if available */}
                    {p.tag && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-600 dark:bg-brand-500 text-white text-[10px] font-bold tracking-wide shadow-xs">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{p.tag}</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Big Price, Validity, Data */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-baseline gap-4 sm:gap-6 flex-wrap">
                          <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl font-mono">
                            ₹{p.amount}
                          </span>

                          <div className="flex items-center gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Validity</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{p.validity}</span>
                            </div>

                            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />

                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                {isDth ? 'Pack' : 'Data'}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{p.data}</span>
                            </div>
                          </div>
                        </div>

                        {/* Description snippet with clickable Details link */}
                        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                          <span className="truncate max-w-[240px] sm:max-w-md">
                            {p.description}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanForDetails(p);
                            }}
                            className="text-blue-600 dark:text-brand-400 hover:text-blue-700 dark:hover:text-brand-300 font-bold shrink-0 flex items-center gap-1 hover:underline ml-auto"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Select Plan Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPlan(p.amount);
                          onClose();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 self-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                            : 'bg-white hover:bg-blue-600 dark:bg-slate-900 dark:hover:bg-brand-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-700 shadow-xs'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <>
                            <span>Select</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer (Sticky Bottom) */}
          <div className="px-4 py-3 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
            <span className="font-medium">Showing {filteredPlans.length} plans</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Plan Details Modal (PhonePe / GPay Full Inspection Sheet) */}
      <PlanDetailsModal
        isOpen={Boolean(selectedPlanForDetails)}
        onClose={() => setSelectedPlanForDetails(null)}
        plan={selectedPlanForDetails}
        operatorName={operatorName}
        operatorCode={operatorCode}
        isDth={isDth}
        onProceed={(amount) => {
          setSelectedPlanForDetails(null);
          onSelectPlan(amount);
          onClose();
        }}
      />
    </>
  );
};
