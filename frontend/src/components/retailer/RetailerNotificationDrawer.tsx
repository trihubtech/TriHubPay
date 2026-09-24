import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Bell, 
  X, 
  Tag, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  RefreshCw,
  Clock
} from 'lucide-react';

interface RetailerNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const RetailerNotificationDrawer: React.FC<RetailerNotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.getRetailerNotifications();
      if (res.success) {
        setNotifications(res.data);
        if (onUnreadCountChange) onUnreadCountChange(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Announcements &amp; Offers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official notices, promotional rates &amp; updates from TriHub
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Fetching latest announcements...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              <span>No active announcements at the moment. All systems operating smoothly!</span>
            </div>
          ) : (
            notifications.map((n) => {
              const isOffer = n.type === 'OFFER';
              const isAlert = n.type === 'ALERT';
              const isFeature = n.type === 'FEATURE';

              const Icon = isOffer ? Tag : isAlert ? AlertTriangle : isFeature ? Sparkles : Info;
              const badgeBg = isOffer ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              isAlert ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                              isFeature ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                              'bg-blue-500/10 text-blue-600 border-blue-500/20';

              return (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${badgeBg}`}>
                        <Icon className="w-3 h-3" />
                        <span>{n.type}</span>
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                        {n.title}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {n.message}
                  </p>

                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
