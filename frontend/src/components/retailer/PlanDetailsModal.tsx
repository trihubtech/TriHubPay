import React from 'react';
import { Plan } from '../../types';
import { 
  X, 
  Sparkles, 
  Zap, 
  Check, 
  Phone, 
  Mail, 
  Calendar, 
  HardDrive, 
  Tv, 
  ShieldCheck, 
  Gift, 
  ArrowRight,
  Wifi
} from 'lucide-react';
import { OperatorIcon } from '../common/OperatorIcon';

interface PlanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  operatorName: string;
  operatorCode: string;
  isDth?: boolean;
  onProceed: (amount: number) => void;
}

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({
  isOpen,
  onClose,
  plan,
  operatorName,
  operatorCode,
  isDth = false,
  onProceed
}) => {
  if (!isOpen || !plan) return null;

  // Determine smart breakdown from description & data
  const hasUnlimitedCalls = /call|voice|unlimited/i.test(plan.description) || !isDth;
  const callsText = isDth 
    ? 'HD Audio' 
    : (hasUnlimitedCalls ? 'Unlimited Calls' : 'Standard Rates');
    
  const smsMatch = plan.description.match(/(\d+\s*SMS(?:\/day)?)/i);
  const smsText = isDth 
    ? 'All Regional Audio' 
    : (smsMatch ? smsMatch[1] : (plan.amount >= 149 ? '100 SMS/day' : 'Standard SMS'));

  const dataText = plan.data || (isDth ? 'Regional Pack' : 'Standard Data');

  // Smart extra benefits deduction
  const extraBenefits: string[] = [];
  
  if (!isDth) {
    if (/5G/i.test(plan.description) || /5G/i.test(plan.tag || '') || plan.amount >= 349) {
      extraBenefits.push('Unlimited 5G High Speed Data with eligible 5G device');
    } else if (plan.amount === 299 || (plan.amount < 349 && plan.amount >= 239)) {
      extraBenefits.push('Choose ₹349 Plan to get Unlimited 5G Data for 28 days');
    }

    if (/hotstar/i.test(plan.description)) {
      extraBenefits.push('Disney+ Hotstar Mobile Subscription included');
    }
    if (/netflix/i.test(plan.description)) {
      extraBenefits.push('Netflix Basic / Mobile Access included');
    }
    if (/prime/i.test(plan.description)) {
      extraBenefits.push('Amazon Prime Video Mobile Edition included');
    }
    if (/sonyliv|zee5/i.test(plan.description)) {
      extraBenefits.push('SonyLIV + ZEE5 OTT Entertainment Pack Included');
    }
    if (/gemini|cloud|jio/i.test(operatorName.toLowerCase()) || /jio/i.test(operatorCode.toLowerCase())) {
      extraBenefits.push('Complimentary subscription to Jio Apps - JioTV, JioCloud & JioCinema');
    }
    if (/airtel/i.test(operatorName.toLowerCase()) || /airtel/i.test(operatorCode.toLowerCase())) {
      extraBenefits.push('Free Hellotunes with unlimited song change + Wynk Music');
    }
    if (/vi/i.test(operatorName.toLowerCase()) || /vodafone|idea/i.test(operatorName.toLowerCase())) {
      extraBenefits.push('Binge All Night (12am to 6am Free Data) + Weekend Data Rollover');
    }
  } else {
    extraBenefits.push('Complete Digital High-Definition Dolby Audio clarity');
    extraBenefits.push('Free-to-Air (FTA) channels pack complimentary');
    if (/hd/i.test(plan.description) || /hd/i.test(plan.data)) {
      extraBenefits.push('Crystal Clear 1080i HD Picture Quality with 16:9 widescreen format');
    }
    if (/sports|cricket/i.test(plan.description)) {
      extraBenefits.push('Live Cricket & Star Sports / Sony Sports HD broadcast feeds');
    }
  }

  const handleProceedClick = () => {
    onProceed(plan.amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-slideUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OperatorIcon operatorCode={operatorCode} size="md" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                ₹{plan.amount} Plan Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {operatorName} • {plan.category || (isDth ? 'DTH Pack' : 'SmartPhone')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Main Price & Metrics Card */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plan price</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  ₹{plan.amount}
                </div>
              </div>

              {plan.tag && (
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{plan.tag}</span>
                </span>
              )}
            </div>

            {/* 4-Grid Key Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isDth ? <Tv className="w-3.5 h-3.5 text-brand-500" /> : <HardDrive className="w-3.5 h-3.5 text-brand-500" />}
                  <span>{isDth ? 'Pack Name' : 'Data'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {dataText}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Validity</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {plan.validity}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isDth ? <Wifi className="w-3.5 h-3.5 text-blue-500" /> : <Phone className="w-3.5 h-3.5 text-blue-500" />}
                  <span>{isDth ? 'Broadcast' : 'Calls'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {callsText}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isDth ? <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> : <Mail className="w-3.5 h-3.5 text-purple-500" />}
                  <span>{isDth ? 'Channels' : 'SMS'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {smsText}
                </div>
              </div>
            </div>
          </div>

          {/* Extra Benefits & Offers Section */}
          {extraBenefits.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Extra Benefits &amp; Offers ({extraBenefits.length})</span>
              </div>

              <div className="space-y-2">
                {extraBenefits.map((b, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="font-medium leading-relaxed">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan Description & Terms */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Complete Plan Details
            </h4>
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5">
              <p>
                <strong>Summary:</strong> {plan.description}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800/80 pt-1.5 mt-1.5">
                Note: Plan validity and promotional OTT benefits are subject to telecom operator guidelines and active subscriber account status.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Action Button: Proceed with ₹Amount */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Back to Plans
          </button>

          <button
            type="button"
            onClick={handleProceedClick}
            className="flex-1 max-w-xs py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <span>PROCEED WITH ₹{plan.amount}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
