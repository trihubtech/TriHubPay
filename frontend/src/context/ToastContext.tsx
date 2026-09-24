import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Humanizes raw backend / telecom switch errors into warm, reassuring, positive text
 */
export function humanizeErrorMessage(raw: string): { title: string; message: string } {
  const lower = String(raw || '').toLowerCase();

  if (lower.includes('no api active') || lower.includes('operator inactive')) {
    return {
      title: 'Service Temporarily Updating',
      message: 'This operator service is currently undergoing routine switch maintenance. Your wallet balance is 100% safe and refunded. Please try again shortly or try another provider.'
    };
  }

  if (lower.includes('insufficient_funds') || lower.includes('insufficient prepaid wallet')) {
    return {
      title: 'Wallet Balance Low',
      message: 'Your current wallet balance is lower than the recharge cost. Please add cash via instant UPI to continue.'
    };
  }

  if (lower.includes('invalid_mobile_number') || lower.includes('10-digit')) {
    return {
      title: 'Invalid Mobile Number',
      message: 'Please double-check the 10-digit mobile number starting with 6, 7, 8, or 9.'
    };
  }

  if (lower.includes('invalid_plan_amount') || lower.includes('not a valid active plan')) {
    return {
      title: 'Plan Selection',
      message: 'Please pick an active plan from the Browse Plans tab to ensure instant operator activation.'
    };
  }

  if (lower.includes('gateway_balance_low') || lower.includes('gateway balance is temporarily low')) {
    return {
      title: 'Gateway Processing',
      message: 'The telecom gateway is synchronizing. Your money is completely safe. Please re-attempt in 2-3 minutes.'
    };
  }

  if (lower.includes('declined by operator') || lower.includes('operator rejected')) {
    return {
      title: 'Operator Declined',
      message: 'The telecom operator could not process this request right now. Your wallet balance has been 100% refunded.'
    };
  }

  return {
    title: 'Notice',
    message: raw || 'Something went wrong. Please try again.'
  };
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 5000) => {
      let finalTitle = title;
      let finalMessage = message;

      if (type === 'error') {
        const humanized = humanizeErrorMessage(message);
        finalTitle = title || humanized.title;
        finalMessage = humanized.message;
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title: finalTitle,
        message: finalMessage,
        duration
      };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep maximum 4 concurrent toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'success', title || 'Success', 4500);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'error', title, 6000);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'info', title, 4000);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'warning', title || 'Attention', 5000);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4 z-50 flex flex-col gap-2.5 w-[92vw] max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 flex items-start gap-3 ${
                isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30'
                  : isError
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/30'
                  : isWarning
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/30'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-100 shadow-slate-950/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertCircle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-xs font-bold tracking-tight text-white mb-0.5">
                    {toast.title}
                  </p>
                )}
                <p className="text-[12px] leading-relaxed text-slate-200">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
