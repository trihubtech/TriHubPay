import React, { useState } from 'react';
import { api } from '../../services/api';
import { ToggleLeft, ToggleRight, ShieldAlert, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FailoverToggleProps {
  currentMode: 'AUTO' | 'FORCE_A1TOPUP' | 'FORCE_NOBLE_WEB';
  onUpdate: (newMode: string) => void;
}

export const FailoverToggle: React.FC<FailoverToggleProps> = ({ currentMode, onUpdate }) => {
  const [updating, setUpdating] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<string>(currentMode);
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
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Global Upstream API Failover Toggle</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manual master override switch to divert network traffic during provider outages.
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
            Primary A1Topup (8s limit) ➔ Seamless fallback to Noble Web Studio.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-blue-600 dark:text-brand-400 uppercase">
            Recommended Default
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
            Bypass A1Topup completely. 100% traffic routed to sub-400ms REST endpoint.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Emergency Provider Bypass</span>
          </div>
        </div>

        {/* Mode 3: FORCE A1TOPUP */}
        <div
          onClick={() => handleModeChange('FORCE_A1TOPUP')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedMode === 'FORCE_A1TOPUP'
              ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Force A1Topup Only</span>
            <span className={`w-2.5 h-2.5 rounded-full ${selectedMode === 'FORCE_A1TOPUP' ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Strictly use A1Topup. No failover channel even if timeouts or rejections occur.
          </div>
          <div className="mt-3 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
            Max Commission Locked
          </div>
        </div>
      </div>
    </div>
  );
};
