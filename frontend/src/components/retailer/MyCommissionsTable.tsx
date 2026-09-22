import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RetailerCommissionRate, ServiceType } from '../../types';
import { 
  Percent, 
  Smartphone, 
  Tv, 
  Zap, 
  Search, 
  Sparkles, 
  Loader2, 
  ArrowUpRight, 
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
        setRates(res.data);
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

  // Filtering
  const filteredRates = rates.filter((item) => {
    const matchesService = selectedService === 'ALL' || item.service_type === selectedService;
    const matchesSearch = 
      item.operator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.operator_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesService && matchesSearch;
  });

  // Calculate quick stats
  const mobileRates = rates.filter(r => r.service_type === 'MOBILE');
  const maxMobile = mobileRates.length > 0 ? Math.max(...mobileRates.map(r => r.commission_rate)) : 0;
  
  const dthRates = rates.filter(r => r.service_type === 'DTH');
  const maxDth = dthRates.length > 0 ? Math.max(...dthRates.map(r => r.commission_rate)) : 0;

  const getServiceIcon = (type: ServiceType) => {
    switch (type) {
      case 'MOBILE': return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'DTH': return <Tv className="w-4 h-4 text-purple-500" />;
      case 'ELECTRICITY': return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  const getOperatorColor = (code: string) => {
    switch (code) {
      case 'JIO': return 'bg-blue-600 text-white';
      case 'AIRTEL': return 'bg-red-600 text-white';
      case 'VI': return 'bg-rose-700 text-white';
      case 'BSNL': return 'bg-sky-600 text-white';
      case 'TATAPLAY': return 'bg-fuchsia-700 text-white';
      case 'AIRTEL_DTH': return 'bg-red-500 text-white';
      case 'DISHTV': return 'bg-orange-600 text-white';
      case 'SUNDIRECT': return 'bg-amber-500 text-white';
      case 'TNEB': return 'bg-emerald-600 text-white';
      case 'BESCOM': return 'bg-indigo-600 text-white';
      default: return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header with Title and Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-brand-500" />
              <span>My Commission Structure</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your allocated earnings rate on every successful recharge and bill payment.
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

        {/* Category Filters */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedService('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedService === 'ALL'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Services ({rates.length})
          </button>
          <button
            onClick={() => setSelectedService('MOBILE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedService === 'MOBILE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Prepaid</span>
          </button>
          <button
            onClick={() => setSelectedService('DTH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedService === 'DTH'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>DTH Television</span>
          </button>
          <button
            onClick={() => setSelectedService('ELECTRICITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedService === 'ELECTRICITY'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Electricity Bills</span>
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

        {/* Commissions Table */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                  filteredRates.map((item) => (
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
                          {getServiceIcon(item.service_type)}
                          <span className="capitalize">{item.service_type.toLowerCase()}</span>
                        </div>
                      </td>

                      {/* Your Commission Rate */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                          <span>{Number(item.commission_rate).toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Earnings on ₹500 */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                        +₹{((500 * item.commission_rate) / 100).toFixed(2)}
                      </td>

                      {/* Earnings on ₹1,000 */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        +₹{((1000 * item.commission_rate) / 100).toFixed(2)}
                      </td>

                      {/* Payout Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Instant Credit</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
            <span>All commissions are automatically deducted upfront from your wallet upon order placement.</span>
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            {filteredRates.length} active operators
          </div>
        </div>
      </div>
    </div>
  );
};
