import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../services/api';
import { Operator, Plan, CommissionPreview, ElectricityBillDetails, ServiceType } from '../../types';
import { BrowsePlansModal } from './BrowsePlansModal';
import { PlanDetailsModal } from './PlanDetailsModal';
import { OperatorIcon } from '../common/OperatorIcon';
import { OperatorSelectModal } from './OperatorSelectModal';
import { RechargeConfirmModal } from './RechargeConfirmModal';
import { formatOperatorName } from '../../utils/formatters';

interface RechargeTabsProps {
  onSuccess: (txData: any, newBalance: number) => void;
  walletBalance: number;
  initialService?: ServiceType;
  onBackToHome?: () => void;
}

const getServiceTitle = (service: ServiceType) => {
  switch (service) {
    case 'MOBILE': return 'Mobile Prepaid Recharge';
    case 'DTH': return 'DTH TV Recharge';
    case 'ELECTRICITY': return 'Electricity Bill Payment';
    case 'GOOGLE_PLAY': return 'Google Play Redeem Code';
    case 'OTT_APPS': return 'OTT Streaming Subscription';
    case 'FASTAG': return 'FASTag Toll Recharge';
    case 'LPG_GAS': return 'LPG Gas Cylinder Booking';
    case 'BROADBAND': return 'Broadband Internet Bill';
    default: return 'Utility Payment';
  }
};

const getAccountLabel = (service: ServiceType) => {
  switch (service) {
    case 'MOBILE': return 'MOBILE NUMBER (10 DIGITS)';
    case 'DTH': return 'SMART CARD / VC NUMBER';
    case 'ELECTRICITY': return 'CONSUMER NUMBER / CA NUMBER';
    case 'GOOGLE_PLAY': return 'RECIPIENT MOBILE NUMBER (FOR SMS CODE)';
    case 'OTT_APPS': return 'RECIPIENT MOBILE NUMBER';
    case 'FASTAG': return 'VEHICLE NUMBER (e.g. TN01AB1234)';
    case 'LPG_GAS': return 'REGISTERED MOBILE / CONSUMER NO';
    case 'BROADBAND': return 'ACCOUNT NUMBER / USERNAME';
    default: return 'ACCOUNT / CONSUMER NUMBER';
  }
};

const getAccountPlaceholder = (service: ServiceType) => {
  switch (service) {
    case 'MOBILE': return 'e.g. 9876543210';
    case 'DTH': return 'Enter 10 or 11 digit VC number';
    case 'ELECTRICITY': return 'Enter electricity consumer number';
    case 'GOOGLE_PLAY': return 'Enter 10-digit mobile number';
    case 'OTT_APPS': return 'Enter 10-digit mobile number';
    case 'FASTAG': return 'e.g. TN01AB1234 or FASTag Wallet ID';
    case 'LPG_GAS': return 'Enter 10-digit mobile or LPG ID';
    case 'BROADBAND': return 'Enter broadband account ID';
    default: return 'Enter account number';
  }
};

const getOperatorLabel = (service: ServiceType) => {
  switch (service) {
    case 'ELECTRICITY': return 'ELECTRICITY BOARD (BBPS)';
    case 'FASTAG': return 'FASTAG ISSUER BANK';
    case 'LPG_GAS': return 'LPG GAS PROVIDER';
    case 'BROADBAND': return 'BROADBAND OPERATOR';
    case 'GOOGLE_PLAY': return 'PLATFORM';
    case 'OTT_APPS': return 'OTT PLATFORM';
    default: return 'OPERATOR & CIRCLE';
  }
};

export const RechargeTabs: React.FC<RechargeTabsProps> = ({ 
  onSuccess, 
  walletBalance, 
  initialService,
  onBackToHome 
}) => {
  const [activeTab, setActiveTab] = useState<ServiceType>(initialService || 'MOBILE');

  useEffect(() => {
    if (initialService) {
      setActiveTab(initialService);
    }
  }, [initialService]);

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

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

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
        const filtered = res.data.filter((op: Operator) => !op.service_type || op.service_type === activeTab);
        const listToUse = filtered.length > 0 ? filtered : res.data;
        setOperators(listToUse);
        setSelectedOperator(listToUse[0].operator_code);
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
    if (!val || val <= 0 || isNaN(val)) {
      setCommissionPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingPreview(true);
      api.getCommissionPreview(selectedOperator, val)
        .then((res: any) => {
          if (res.success) {
            setCommissionPreview(res.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPreview(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedOperator, faceValue]);

  // Auto-detect Indian Mobile Operator prefix logic
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(clean);
    setErrorMsg('');

    if (activeTab === 'MOBILE' && clean.length >= 4) {
      const prefix = clean.substring(0, 4);
      const prefixNum = parseInt(prefix, 10);
      
      if ([6289, 6290, 7000, 7001, 7002, 7003, 8270, 8981, 9830, 9831].includes(prefixNum)) {
        if (selectedOperator !== 'JIO') setSelectedOperator('JIO');
      } else if ([9840, 9841, 9444, 9445, 9884].includes(prefixNum)) {
        if (selectedOperator !== 'AIRTEL') setSelectedOperator('AIRTEL');
      } else if ([9820, 9821, 9892, 9819].includes(prefixNum)) {
        if (selectedOperator !== 'VI') setSelectedOperator('VI');
      }
    }
  };

  const handleFetchBill = async () => {
    const clean = accountNumber.trim();
    if (!clean) {
      setErrorMsg('Please enter a consumer or account number');
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

  // Open confirmation modal upon submit
  const handleOpenConfirmation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // If electricity tab and bill is not fetched yet, force fetch first
    if (activeTab === 'ELECTRICITY' && !fetchedBill) {
      handleFetchBill();
      return;
    }

    const val = parseFloat(faceValue);
    if (!accountNumber || accountNumber.length < (activeTab === 'MOBILE' ? 10 : 4)) {
      setErrorMsg(activeTab === 'MOBILE' ? 'Please enter a valid 10-digit mobile number' : 'Please enter a valid account or consumer number');
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

    setIsConfirmModalOpen(true);
  };

  // Execute recharge after user explicitly confirms in modal
  const executeRechargeConfirmed = async () => {
    const val = parseFloat(faceValue);
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
        setIsConfirmModalOpen(false);
        onSuccess(res.data, res.data.remaining_wallet_balance);
        if (activeTab === 'ELECTRICITY') {
          setFetchedBill(null);
          setFaceValue('');
        }
      } else {
        setErrorMsg(res.message || 'Transaction failed');
        setIsConfirmModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction failed');
      setIsConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Operators strictly filtered by the current active service category (Mobile, DTH, or Electricity)
  const tabOperators = useMemo(() => {
    return operators.filter(op => !op.service_type || op.service_type === activeTab);
  }, [operators, activeTab]);

  const currentOp = tabOperators.find(o => o.operator_code === selectedOperator) || operators.find(o => o.operator_code === selectedOperator);

  // Exact matched plan based on entered faceValue
  const matchedPlan = useMemo(() => {
    if (!faceValue || isNaN(Number(faceValue))) return null;
    const typed = faceValue.trim();
    return plans.find(p => String(p.amount) === typed) || null;
  }, [plans, faceValue]);

  // Dynamic displayed plans: if user types an amount that exists in plans (e.g. 19 or 10),
  // immediately surface that exact plan as selected in the quick cards!
  const displayedPlans = useMemo(() => {
    if (!plans || plans.length === 0) return [];
    const typed = faceValue.trim();
    if (typed && !isNaN(Number(typed))) {
      const match = plans.find(p => String(p.amount) === typed);
      if (match) {
        // If matched plan is already in top 4, return top 4
        const inTop4 = plans.slice(0, 4).some(p => String(p.amount) === typed);
        if (inTop4) {
          return plans.slice(0, 4);
        }
        // Surface matched plan at index 0, followed by the top 3 other plans
        const others = plans.filter(p => String(p.amount) !== typed).slice(0, 3);
        return [match, ...others];
      }
    }
    return plans.slice(0, 4);
  }, [plans, faceValue]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Sleek Service Header Bar with Back Button */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center overflow-hidden">
            <OperatorIcon operatorCode={activeTab} size="sm" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {getServiceTitle(activeTab)}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Instant Lapu Dispatch • Live Operator Status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentOp?.retailer_pass_down_rate !== undefined && currentOp.retailer_pass_down_rate > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              <Sparkles className="w-3 h-3" />
              <span>{currentOp.retailer_pass_down_rate}% Margin</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 pb-28 sm:pb-6">
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleOpenConfirmation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account / Mobile input with in-input Operator Icon */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {getAccountLabel(activeTab)}
              </label>
              <div className="relative flex items-center">
                <input
                  type={['MOBILE', 'GOOGLE_PLAY', 'OTT_APPS'].includes(activeTab) ? 'tel' : 'text'}
                  placeholder={getAccountPlaceholder(activeTab)}
                  value={accountNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-mono font-bold text-base tracking-wider focus:outline-none focus:border-brand-500 pr-12 transition-all shadow-inner"
                  required
                />
                <div className="absolute right-3.5 pointer-events-none flex items-center">
                  <OperatorIcon operatorCode={selectedOperator} size="sm" />
                </div>
              </div>
            </div>

            {/* Operator Selection Pill Card */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {getOperatorLabel(activeTab)}
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
                      {formatOperatorName(selectedOperator, currentOp?.operator_name)}
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
          {tabOperators.length > 1 && (
            <div className="pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none touch-scroll py-1 -mx-1 px-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 pr-1 select-none">
                  Quick Select:
                </span>
                {tabOperators.map((op) => {
                  const isSelected = selectedOperator === op.operator_code;
                  return (
                    <button
                      key={op.operator_code}
                      type="button"
                      onClick={() => {
                        setSelectedOperator(op.operator_code);
                        setFetchedBill(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-brand-500/15 border-blue-600 dark:border-brand-500 text-blue-700 dark:text-brand-300 ring-1 ring-blue-500/30 shadow-xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <OperatorIcon operatorCode={op.operator_code} size="xs" />
                      <span className="whitespace-nowrap">{formatOperatorName(op.operator_code, op.operator_name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Electricity Verified Bill Detail Card */}
          {activeTab === 'ELECTRICITY' && fetchedBill && (
            <div className={`p-4 rounded-2xl animate-in fade-in space-y-2 border ${
              fetchedBill.bill_amount === 0 || fetchedBill.status === 'PAID'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Consumer Verified: {fetchedBill.consumer_name}</span>
                </span>
                <span className="text-[11px] font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  Bill #{fetchedBill.bill_number}
                </span>
              </div>
              {fetchedBill.bill_amount === 0 || fetchedBill.status === 'PAID' ? (
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-1">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>No Bill Due for This Cycle</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    The bill for this consumer number has already been paid in full. You can enter an advance payment amount if you wish to pay ahead.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600 dark:text-slate-400">
                  <div>Due Date: <strong className="text-slate-900 dark:text-white">{fetchedBill.due_date}</strong></div>
                  <div className="text-right">Bill Date: <strong className="text-slate-900 dark:text-white">{fetchedBill.bill_date || 'N/A'}</strong></div>
                </div>
              )}
            </div>
          )}

          {/* Amount Input with Live Commission Margin Display */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {activeTab === 'ELECTRICITY' ? 'INVOICE AMOUNT (INR)' : 'RECHARGE AMOUNT (INR)'}
              </label>
              {commissionPreview && (
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Cashback: {commissionPreview.retailer_rate_percent}% (₹{commissionPreview.retailer_commission.toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xl font-bold">
                ₹
              </span>
              <input
                type="number"
                placeholder={
                  activeTab === 'ELECTRICITY' 
                    ? (fetchedBill?.bill_amount === 0 ? 'Enter advance amount (e.g. 500)' : 'Fetch bill or enter amount') 
                    : 'e.g. 19, 299, 349'
                }
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                readOnly={activeTab === 'ELECTRICITY' && Boolean(fetchedBill && fetchedBill.bill_amount > 0)}
                className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-3 text-slate-900 dark:text-white font-mono font-bold text-xl focus:outline-none focus:border-brand-500 transition-all ${
                  activeTab === 'ELECTRICITY' && fetchedBill && fetchedBill.bill_amount > 0 ? 'bg-slate-100 dark:bg-slate-900 cursor-not-allowed text-emerald-600 dark:text-emerald-400' : ''
                }`}
                required
              />
            </div>

            {activeTab === 'ELECTRICITY' && fetchedBill && fetchedBill.bill_amount > 0 && (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
                  Popular Plans for {formatOperatorName(selectedOperator, currentOp?.operator_name)}
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

              {/* Instant feedback badge when entered amount matches any plan */}
              {matchedPlan && (
                <div className="mb-2.5 p-2 px-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-brand-400 shrink-0" />
                    <span className="font-bold text-blue-950 dark:text-blue-100">
                      ₹{matchedPlan.amount} Plan Selected
                    </span>
                    <span className="text-blue-600 dark:text-brand-400 font-medium truncate">
                      • {matchedPlan.validity} {matchedPlan.data ? `• ${matchedPlan.data}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">
                    Selected
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {displayedPlans.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setFaceValue(String(p.amount))}
                    className={`cursor-pointer p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                      faceValue === String(p.amount)
                        ? 'bg-blue-50 dark:bg-brand-500/10 border-blue-600 dark:border-brand-500 text-slate-900 dark:text-white shadow-sm ring-2 ring-blue-500/40'
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

          {/* Submit Checkout Button (Desktop inline) */}
          <div className="hidden sm:block pt-2">
            <button
              type="submit"
              disabled={submitting || fetchingBill || (activeTab === 'ELECTRICITY' && !accountNumber)}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
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
                    Confirm &amp; Pay ₹{commissionPreview ? commissionPreview.final_cost_billed.toFixed(2) : ((parseFloat(faceValue) || 0).toFixed(2))}
                  </span>
                  {commissionPreview && commissionPreview.retailer_commission > 0 && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg text-white font-semibold">
                      (Earn ₹{commissionPreview.retailer_commission.toFixed(2)} Cash)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mobile Fixed Sticky Checkout Bar (Always visible on mobile without scrolling!) */}
        <div className="sm:hidden fixed bottom-14 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 shadow-2xl safe-area-bottom">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">To Pay (Net)</span>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                  ₹{commissionPreview ? commissionPreview.final_cost_billed.toFixed(2) : ((parseFloat(faceValue) || 0).toFixed(2))}
                </span>
                {commissionPreview && commissionPreview.retailer_commission > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded truncate">
                    +₹{commissionPreview.retailer_commission.toFixed(2)} Off
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenConfirmation}
              disabled={submitting || fetchingBill || !accountNumber || (activeTab !== 'ELECTRICITY' && (!faceValue || parseFloat(faceValue) <= 0))}
              className="flex-1 max-w-[200px] bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{activeTab === 'ELECTRICITY' && !fetchedBill ? 'Fetch Bill' : 'Confirm & Pay'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recharge Confirmation Modal */}
      <RechargeConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeRechargeConfirmed}
        loading={submitting}
        operatorCode={selectedOperator}
        operatorName={formatOperatorName(selectedOperator, currentOp?.operator_name)}
        accountNumber={accountNumber}
        serviceType={activeTab}
        faceValue={parseFloat(faceValue) || 0}
        cashbackEarned={commissionPreview?.retailer_commission || 0}
        finalCostBilled={commissionPreview?.final_cost_billed ?? (parseFloat(faceValue) || 0)}
        walletBalance={walletBalance}
        planDetails={matchedPlan}
      />

      {/* Browse Plans Modal (Categorized & Searchable like GPay / PhonePe) */}
      <BrowsePlansModal
        isOpen={isBrowsePlansOpen}
        onClose={() => setIsBrowsePlansOpen(false)}
        operatorName={formatOperatorName(selectedOperator, currentOp?.operator_name)}
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
        operatorName={formatOperatorName(selectedOperator, currentOp?.operator_name)}
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
        operators={tabOperators}
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
