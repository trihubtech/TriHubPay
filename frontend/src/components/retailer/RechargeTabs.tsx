import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Tv, 
  Zap, 
  Check, 
  Loader2, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Building2,
  Search,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { Operator, Plan, CommissionPreview, ElectricityBillDetails } from '../../types';
import { BrowsePlansModal } from './BrowsePlansModal';
import { PlanDetailsModal } from './PlanDetailsModal';
import { OperatorIcon } from '../common/OperatorIcon';
import { OperatorSelectModal } from './OperatorSelectModal';

interface RechargeTabsProps {
  onSuccess: (txData: any, newBalance: number) => void;
  walletBalance: number;
}

export const RechargeTabs: React.FC<RechargeTabsProps> = ({ onSuccess, walletBalance }) => {
  const [activeTab, setActiveTab] = useState<'MOBILE' | 'DTH' | 'ELECTRICITY'>('MOBILE');

  // Form states - clean and un-hardcoded
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('JIO');
  const [faceValue, setFaceValue] = useState<string>('');
  const [circleCode, setCircleCode] = useState<string>('ALL_INDIA');
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<Plan | null>(null);

  // Data states
  const [operators, setOperators] = useState<Operator[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [commissionPreview, setCommissionPreview] = useState<CommissionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Browse Plans Modal state (Mobile & DTH)
  const [isBrowsePlansOpen, setIsBrowsePlansOpen] = useState<boolean>(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState<boolean>(false);

  // Electricity BBPS Bill Fetch state
  const [fetchedBill, setFetchedBill] = useState<ElectricityBillDetails | null>(null);
  const [fetchingBill, setFetchingBill] = useState<boolean>(false);

  // Load operators on tab change
  useEffect(() => {
    setFetchedBill(null);
    setErrorMsg('');

    api.getOperators(activeTab).then((res) => {
      if (res.success && res.data.length > 0) {
        setOperators(res.data);
        setSelectedOperator(res.data[0].operator_code);
      }
    }).catch(console.error);

    // Start inputs completely empty for live customer entry
    setAccountNumber('');
    setFaceValue('');
  }, [activeTab]);

  // Load plans when operator changes (for Mobile/DTH)
  useEffect(() => {
    setFetchedBill(null);
    if (selectedOperator) {
      if (activeTab !== 'ELECTRICITY') {
        api.getPlans(selectedOperator).then((res) => {
          if (res.success) {
            setPlans(res.plans || []);
          }
        }).catch(console.error);
      } else {
        setPlans([]);
      }
    }
  }, [selectedOperator, activeTab]);

  // Debounced commission preview calculation
  useEffect(() => {
    const val = parseFloat(faceValue);
    if (selectedOperator && !isNaN(val) && val > 0) {
      setLoadingPreview(true);
      const timer = setTimeout(() => {
        api.getCommissionPreview(selectedOperator, val)
          .then((res) => {
            if (res.success) setCommissionPreview(res.data);
          })
          .catch(() => setCommissionPreview(null))
          .finally(() => setLoadingPreview(false));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCommissionPreview(null);
    }
  }, [selectedOperator, faceValue]);

  // Auto-detect mobile operator prefix
  const handlePhoneChange = (val: string) => {
    setAccountNumber(val);
    setFetchedBill(null);
    if (activeTab === 'MOBILE') {
      const clean = val.replace(/\D/g, '');
      if (clean.startsWith('98') || clean.startsWith('99') || clean.startsWith('94')) {
        if (clean.startsWith('98')) setSelectedOperator('AIRTEL');
        else if (clean.startsWith('99')) setSelectedOperator('JIO');
        else if (clean.startsWith('94')) setSelectedOperator('BSNL');
      }
    }
  };

  // BBPS Electricity Bill Fetch handler
  const handleFetchBill = async () => {
    const clean = accountNumber.trim();
    if (!clean || clean.length < 5) {
      setErrorMsg('Please enter a valid Consumer Account / Service Number (at least 5 digits)');
      return;
    }

    setFetchingBill(true);
    setErrorMsg('');
    try {
      const res = await api.fetchElectricityBill(selectedOperator, clean);
      if (res.success && res.data) {
        setFetchedBill(res.data);
        setFaceValue(String(res.data.bill_amount));
      } else {
        setErrorMsg('Could not fetch bill from electricity board. Please check consumer number.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'BBPS Server could not retrieve bill for this consumer number.');
      setFetchedBill(null);
    } finally {
      setFetchingBill(false);
    }
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // If electricity tab and bill is not fetched yet, force fetch first
    if (activeTab === 'ELECTRICITY' && !fetchedBill) {
      await handleFetchBill();
      return;
    }

    const val = parseFloat(faceValue);
    if (!accountNumber || accountNumber.length < 4) {
      setErrorMsg('Please enter a valid account or consumer number');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid recharge or bill payment amount');
      return;
    }

    if (commissionPreview && walletBalance < commissionPreview.final_cost_billed) {
      setErrorMsg(`Insufficient wallet balance. Required: ₹${commissionPreview.final_cost_billed.toFixed(2)}, Available: ₹${walletBalance.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.executeRecharge({
        operator_code: selectedOperator,
        service_type: activeTab,
        target_account_number: accountNumber,
        face_value: val,
        circle_code: circleCode
      });

      if (res.success) {
        onSuccess(res.data, res.data.remaining_wallet_balance);
        if (activeTab === 'ELECTRICITY') {
          setFetchedBill(null);
          setFaceValue('');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentOp = operators.find(o => o.operator_code === selectedOperator);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Service Type Tab Switcher */}
      <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('MOBILE')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'MOBILE'
              ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Mobile Prepaid</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DTH')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'DTH'
              ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>DTH TV</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ELECTRICITY')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'ELECTRICITY'
              ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Electricity EB</span>
        </button>
      </div>

      <div className="p-6">
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRechargeSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account / Mobile input with in-input Operator Icon */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {activeTab === 'MOBILE' 
                  ? 'MOBILE NUMBER (10 DIGITS)' 
                  : activeTab === 'DTH' 
                  ? 'SUBSCRIBER ID / SMARTCARD / VC NUMBER' 
                  : 'CONSUMER SERVICE NUMBER (EB NUMBER)'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={
                    activeTab === 'MOBILE' 
                      ? 'e.g. 9876543210' 
                      : activeTab === 'DTH' 
                      ? 'e.g. 3012948192' 
                      : 'e.g. 041209384910'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl pl-4 pr-14 py-3 text-slate-900 dark:text-white font-mono font-bold focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors shadow-xs"
                />
                {/* Dynamic Operator Brand Logo inside Input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <OperatorIcon operatorCode={selectedOperator} size="sm" />
                </div>
              </div>
            </div>

            {/* Operator Selection Card (PhonePe & Google Pay Style) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {activeTab === 'ELECTRICITY' ? 'ELECTRICITY BOARD (BBPS)' : 'OPERATOR & CIRCLE'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsOperatorModalOpen(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>Change</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div
                onClick={() => setIsOperatorModalOpen(true)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 rounded-2xl p-2.5 sm:p-3 cursor-pointer flex items-center justify-between gap-3 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <OperatorIcon operatorCode={selectedOperator} size="md" />
                  <div className="truncate text-left">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {currentOp?.operator_name || selectedOperator}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{selectedOperator}</span>
                      {currentOp?.retailer_pass_down_rate !== undefined && currentOp.retailer_pass_down_rate > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">
                          <Sparkles className="w-2.5 h-2.5" />
                          {currentOp.retailer_pass_down_rate}% Cashback
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-blue-600 dark:text-brand-400 shrink-0 shadow-xs">
                  Change
                </div>
              </div>
            </div>
          </div>

          {/* Quick Operator 1-Tap Switching Strip */}
          {operators.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Quick Select:
              </span>
              {operators.map((op) => {
                const isSelected = selectedOperator === op.operator_code;
                return (
                  <button
                    key={op.operator_code}
                    type="button"
                    onClick={() => {
                      setSelectedOperator(op.operator_code);
                      setFetchedBill(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-brand-500/15 border-blue-600 dark:border-brand-500 text-blue-700 dark:text-brand-300 ring-1 ring-blue-500/30 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <OperatorIcon operatorCode={op.operator_code} size="xs" />
                    <span className="truncate max-w-[120px]">{op.operator_name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Electricity EB: Dedicated BBPS Bill Fetch Component */}
          {activeTab === 'ELECTRICITY' && (
            <div className="space-y-3 pt-1">
              {!fetchedBill ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-brand-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                      <Zap className="w-4 h-4" />
                      <span>Bharat Bill Payment System (BBPS) Fetch</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Enter your Consumer Number above and fetch your official state electricity bill details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchBill}
                    disabled={fetchingBill || !accountNumber}
                    className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-brand-600/20 shrink-0"
                  >
                    {fetchingBill ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching Bill...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Fetch Bill Details</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-900 dark:to-slate-950 border border-emerald-500/40 space-y-3 shadow-sm dark:shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{fetchedBill.consumer_name}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                            BBPS VERIFIED
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{fetchedBill.board_name}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchBill}
                      disabled={fetchingBill}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold flex items-center gap-1 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20"
                    >
                      {fetchingBill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Re-fetch Bill'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Consumer No</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fetchedBill.consumer_number}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Bill Number</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fetchedBill.bill_number}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Bill Date</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{fetchedBill.bill_date}</span>
                    </div>
                    <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-bold">Due Date</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-300">{fetchedBill.due_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Outstanding Bill Amount Due:</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{fetchedBill.bill_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount and Live Commission Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {activeTab === 'ELECTRICITY' ? 'BILL AMOUNT TO PAY (INR)' : 'RECHARGE AMOUNT (INR)'}
              </label>
              {commissionPreview && (
                <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    Cashback: {commissionPreview.retailer_rate_percent}% (
                    ₹{commissionPreview.retailer_commission.toFixed(2)})
                  </span>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 font-mono">
                ₹
              </span>
              <input
                type="number"
                required
                min="10"
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                readOnly={activeTab === 'ELECTRICITY' && !!fetchedBill}
                placeholder={activeTab === 'ELECTRICITY' ? (fetchedBill ? String(fetchedBill.bill_amount) : 'Click Fetch Bill Details') : '299'}
                className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl py-3 pl-8 pr-4 text-xl font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors ${
                  activeTab === 'ELECTRICITY' && fetchedBill ? 'bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 cursor-not-allowed' : ''
                }`}
              />
            </div>
            {activeTab === 'ELECTRICITY' && fetchedBill && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3" />
                <span>Amount locked to verified BBPS electricity invoice</span>
              </p>
            )}
          </div>

          {/* Popular Plans Carousel for Mobile & DTH with Browse All Plans button */}
          {activeTab !== 'ELECTRICITY' && plans.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Popular Plans for {currentOp?.operator_name || selectedOperator}
                </div>
                <button
                  type="button"
                  onClick={() => setIsBrowsePlansOpen(true)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-bold flex items-center gap-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Browse All Plans ({plans.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {plans.slice(0, 4).map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setFaceValue(String(p.amount))}
                    className={`cursor-pointer p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                      faceValue === String(p.amount)
                        ? 'bg-blue-50 dark:bg-brand-500/10 border-blue-600 dark:border-brand-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-blue-600 dark:text-brand-400">₹{p.amount}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{p.validity}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {p.data}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[65%]">
                        {p.description}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanForDetails(p);
                        }}
                        className="text-[10px] font-bold text-blue-600 dark:text-brand-400 hover:underline shrink-0"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security & Instant Processing Assurance */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Instant Automated Delivery • 100% Safe & Secure</span>
            </div>
            <span className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium shadow-xs">
              Instant Receipt
            </span>
          </div>

          {/* Submit Checkout Button */}
          <button
            type="submit"
            disabled={submitting || fetchingBill || (activeTab === 'ELECTRICITY' && !accountNumber)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Instant Payment...</span>
              </>
            ) : fetchingBill ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Consumer Details with Electricity Board...</span>
              </>
            ) : activeTab === 'ELECTRICITY' && !fetchedBill ? (
              <>
                <FileText className="w-4 h-4" />
                <span>Fetch Bill Details First</span>
              </>
            ) : (
              <>
                <span>
                  Confirm & Pay ₹{commissionPreview ? commissionPreview.final_cost_billed.toFixed(2) : (faceValue || '0.00')}
                </span>
                {commissionPreview && commissionPreview.retailer_commission > 0 && (
                  <span className="text-xs bg-black/20 px-2 py-0.5 rounded text-brand-200">
                    (Earn ₹{commissionPreview.retailer_commission.toFixed(2)} Cash)
                  </span>
                )}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Browse Plans Modal (Categorized & Searchable like GPay / PhonePe) */}
      <BrowsePlansModal
        isOpen={isBrowsePlansOpen}
        onClose={() => setIsBrowsePlansOpen(false)}
        operatorName={currentOp?.operator_name || selectedOperator}
        operatorCode={selectedOperator}
        plans={plans}
        onSelectPlan={(amt) => setFaceValue(String(amt))}
        currentAmount={faceValue}
      />

      {/* Plan Details Modal (PhonePe / GPay Style Inspection Sheet) */}
      <PlanDetailsModal
        isOpen={Boolean(selectedPlanForDetails)}
        onClose={() => setSelectedPlanForDetails(null)}
        plan={selectedPlanForDetails}
        operatorName={currentOp?.operator_name || selectedOperator}
        operatorCode={selectedOperator}
        isDth={activeTab === 'DTH'}
        onProceed={(amt) => {
          setFaceValue(String(amt));
          setSelectedPlanForDetails(null);
        }}
      />

      {/* Operator Selection Modal (PhonePe / GPay Style Sheet) */}
      <OperatorSelectModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        operators={operators}
        selectedOperatorCode={selectedOperator}
        serviceType={activeTab}
        onSelectOperator={(op) => {
          setSelectedOperator(op.operator_code);
          setFetchedBill(null);
        }}
      />
    </div>
  );
};
