import React from 'react';
import { X, UserCheck, Mail, Phone, MapPin, Clock, ShieldAlert } from 'lucide-react';

interface GrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrievanceModal: React.FC<GrievanceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Grievance Redressal Officer</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            In accordance with the <strong>Information Technology Act, 2000</strong>, the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, the contact details of the Grievance Redressal Officer are published below:
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 font-sans">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Designation</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Nodal Grievance &amp; Compliance Officer</span>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Email Support</span>
                <a href="mailto:support@trihubpay.com" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  support@trihubpay.com / trihubtechnologies@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">WhatsApp &amp; Helpline</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">
                  +91 63745 69225 / +91 88255 38776
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Office Jurisdiction</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  TriHub Technologies, Tamil Nadu, India - 600001
                </span>
              </div>
            </div>
          </div>

          {/* SLA Timeline Box */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Statutory Resolution Timelines:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              &bull; <strong>Acknowledgment:</strong> Within 48 hours of complaint receipt.<br />
              &bull; <strong>Final Resolution:</strong> Within 30 days from the date of receipt per statutory compliance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
