import React, { useState } from 'react';
import { api } from '../../services/api';
import { Cpu, CheckCircle2, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';

interface FailoverToggleProps {
  currentMode: string;
  onUpdate: (newMode: string) => void;
}

export const FailoverToggle: React.FC<FailoverToggleProps> = ({ currentMode, onUpdate }) => {
  const [updating, setUpdating] = useState<boolean>(false);
  const normalizedMode = (currentMode === 'FORCE_A1TOPUP' ? 'FORCE_NEROPAY' : currentMode) || 'AUTO';
  const [selectedMode, setSelectedMode] = useState<string>(normalizedMode);
  const [msg, setMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleModeChange = async (mode: string) => {
    setUpdating(true);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await api.updateFailoverSettings(mode);
      if (res.success) {
        setSelectedMode(mode);
        onUpdate(mode);
        setMsg(`Routing mode switched to ${mode}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update failover settings');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Upstream Multi-Gateway Smart Router</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Primary Gateway: NeroPay • Failover Engine: Noble Web Studio
            </p>
          </div>
        </div>

        {msg && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{msg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Mode 1: AUTO */}
        <div
          onClick={() => handleModeChange('AUTO')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedMode === 'AUTO'
              ? 'bg-blue-50/80 dark:bg-brand-500/10 border-blue-600 dark:border-brand-500 shadow-md shadow-blue-500/10'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Smart Automated Failover</span>
            <span className={`w-2.5 h-2.5 rounded-full ${selectedMode === 'AUTO' ? 'bg-blue-600 dark:bg-brand-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Primary NeroPay (8s limit) ➔ Automated margin failover to Noble Web Studio.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-blue-600 dark:text-brand-400 uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Recommended Default</span>
          </div>
        </div>

        {/* Mode 2: FORCE NOBLE WEB */}
        <div
          onClick={() => handleModeChange('FORCE_NOBLE_WEB')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedMode === 'FORCE_NOBLE_WEB'
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Force Noble Web Studio</span>
            <span className={`w-2.5 h-2.5 rounded-full ${selectedMode === 'FORCE_NOBLE_WEB' ? 'bg-amber-500 dark:bg-amber-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bypass NeroPay completely. 100% traffic routed to Noble Web Studio.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Emergency Provider Bypass</span>
          </div>
        </div>

        {/* Mode 3: FORCE NEROPAY */}
        <div
          onClick={() => handleModeChange('FORCE_NEROPAY')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedMode === 'FORCE_NEROPAY' || selectedMode === 'FORCE_A1TOPUP'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Force NeroPay Only</span>
            <span className={`w-2.5 h-2.5 rounded-full ${selectedMode === 'FORCE_NEROPAY' || selectedMode === 'FORCE_A1TOPUP' ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Strictly route 100% of recharges to NeroPay Primary Gateway.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>NeroPay Primary Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
};
