import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RetailerCommissionRate, ServiceType } from '../../types';
import { 
  Percent, 
  Smartphone, 
  Tv, 
  Search, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2,
  RefreshCw,
  Coins
} from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';
import { formatOperatorName } from '../../utils/formatters';

export const MyCommissionsTable: React.FC = () => {
  const [rates, setRates] = useState<RetailerCommissionRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedService, setSelectedService] = useState<ServiceType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMyCommissions();
      if (res.success) {
        // Strictly filter to active Mobile and DTH services
        const activeOnly = (res.data || []).filter(
          (r: RetailerCommissionRate) => r.service_type === 'MOBILE' || r.service_type === 'DTH'
        );
        setRates(activeOnly);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load commission rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const getRate = (item: any): number => {
    const val = parseFloat(String(item?.commission_rate ?? item?.retailer_pass_down_rate ?? 0));
    return isNaN(val) ? 0 : val;
  };

  // Filtering
  const filteredRates = rates.filter((item) => {
    const matchesService = selectedService === 'ALL' || item.service_type === selectedService;
    const matchesSearch = 
      item.operator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.operator_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesService && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header with Title and Search */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-brand-500" />
              <span>My Commission Structure</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your instant earnings rate on every successful recharge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search operator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={fetchRates}
              disabled={loading}
              title="Refresh Rates"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Filters: Only Active Services (All, Mobile, DTH) */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-3.5 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedService('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedService === 'ALL'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Active ({rates.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedService('MOBILE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedService === 'MOBILE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Prepaid</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedService('DTH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedService === 'DTH'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>DTH Television</span>
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Loading your live commission rates...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 text-center text-xs text-rose-500">
            {error}
          </div>
        )}

        {/* ─── 1. MOBILE RESPONSIVE CARD VIEW (block sm:hidden) - NO HORIZONTAL SCROLL ─── */}
        {!loading && !error && (
          <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[560px] overflow-y-auto">
            {filteredRates.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No operators found matching your search.
              </div>
            ) : (
              filteredRates.map((item) => {
                const rate = getRate(item);
                const earn500 = ((500 * rate) / 100).toFixed(2);
                const earn1000 = ((1000 * rate) / 100).toFixed(2);

                return (
                  <div key={item.operator_code} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors space-y-2.5">
                    {/* Top Row: Operator Info + Commission Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <OperatorIcon operatorCode={item.operator_code} size="sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{formatOperatorName(item.operator_code, item.operator_name)}</span>
                            {item.is_custom && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.operator_code} • {item.service_type}
                          </div>
                        </div>
                      </div>

                      {/* Your Rate Badge */}
                      <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono shrink-0">
                        <span>{rate.toFixed(2)}%</span>
                      </span>
                    </div>

                    {/* Bottom Row: Profit Calculation Cards */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">On ₹500</span>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          +₹{earn500}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">On ₹1,000</span>
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                          +₹{earn1000}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">Payout</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Instant</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 2. DESKTOP / TABLET TABLE VIEW (hidden sm:block) ─── */}
        {!loading && !error && (
          <div className="hidden sm:block overflow-x-auto max-h-[560px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Operator / Biller</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Your Commission Rate</th>
                  <th className="py-3 px-4 text-right">Earn on ₹500</th>
                  <th className="py-3 px-4 text-right">Earn on ₹1,000</th>
                  <th className="py-3 px-4 text-center">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No operators found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((item) => {
                    const rate = getRate(item);
                    return (
                      <tr
                        key={item.operator_code}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Operator Name with Badge */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <OperatorIcon operatorCode={item.operator_code} size="sm" />
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{formatOperatorName(item.operator_code, item.operator_name)}</span>
                                {item.is_custom && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Special Shop Rate</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.operator_code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Service Type */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                            {item.service_type === 'MOBILE' ? (
                              <Smartphone className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Tv className="w-4 h-4 text-purple-500" />
                            )}
                            <span className="capitalize">{item.service_type.toLowerCase()}</span>
                          </div>
                        </td>

                        {/* Your Commission Rate */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                            <span>{rate.toFixed(2)}%</span>
                          </span>
                        </td>

                        {/* Earnings on ₹500 */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                          +₹{((500 * rate) / 100).toFixed(2)}
                        </td>

                        {/* Earnings on ₹1,000 */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          +₹{((1000 * rate) / 100).toFixed(2)}
                        </td>

                        {/* Payout Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Instant Credit</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
            <span>All commissions are automatically credited upfront on every recharge.</span>
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            {filteredRates.length} active operators
          </div>
        </div>
      </div>
    </div>
  );
};
