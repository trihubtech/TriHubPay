import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { 
  Bell, 
  Send, 
  Trash2, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  Tag, 
  CheckCircle2, 
  Loader2, 
  Info 
} from 'lucide-react';

interface AdminNotificationManagerProps {
  users: User[];
}

export const AdminNotificationManager: React.FC<AdminNotificationManagerProps> = ({ users }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<string>('UPDATE');
  const [targetType, setTargetType] = useState<'ALL' | 'SELECTED'>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleToggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u.id));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFeedback('');

    if (!title.trim() || !message.trim()) {
      setErrorMsg('Please enter both title and message');
      return;
    }

    if (targetType === 'SELECTED' && selectedUserIds.length === 0) {
      setErrorMsg('Please select at least one recipient user or choose "Broadcast to All Users"');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createAdminNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        target_type: targetType,
        target_user_ids: targetType === 'SELECTED' ? selectedUserIds : []
      });

      if (res.success) {
        setFeedback(res.message || 'Notification broadcasted successfully!');
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
        loadNotifications();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notification for all recipients?')) return;
    try {
      const res = await api.deleteAdminNotification(id);
      if (res.success) {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Broadcast Notification Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Send promotional offers, app release notes, system alerts, or commission bonuses to all or selected users.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Compose Form */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            <span>Compose New Announcement</span>
          </h3>

          <form onSubmit={handleSend} className="space-y-4">
            {feedback && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{feedback}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Notification Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'OFFER', label: 'Offer / Deal', icon: Tag, color: 'text-emerald-600' },
                  { id: 'UPDATE', label: 'App Update', icon: Sparkles, color: 'text-blue-600' },
                  { id: 'FEATURE', label: 'New Feature', icon: Users, color: 'text-purple-600' },
                  { id: 'ALERT', label: 'Urgent Alert', icon: AlertTriangle, color: 'text-rose-600' }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        type === item.id
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Selection: All or Selected */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Audience Decision
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('ALL')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    targetType === 'ALL'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📢 Broadcast to ALL Users
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('SELECTED')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    targetType === 'SELECTED'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🎯 Select Few Users ({selectedUserIds.length})
                </button>
              </div>
            </div>

            {/* User Multi-select if Target is SELECTED */}
            {targetType === 'SELECTED' && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Choose specific recipients:
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    {selectedUserIds.length === users.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => handleToggleUser(u.id)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {u.owner_name || u.organization_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({u.phone})</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Notification Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Jio Special 0.60% Commission Hour or New App Feature!"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Notification Body
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter complete message details, offer validity, or instructions for retailers..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Notification...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Sent History */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Broadcast History ({notifications.length})</span>
            </h3>
            <button
              onClick={loadNotifications}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <span>Loading broadcast records...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              No notifications dispatched yet. Use the form on the left to broadcast your first offer or update!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          n.type === 'OFFER' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                          n.type === 'ALERT' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                          n.type === 'FEATURE' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' :
                          'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        }`}>
                          {n.type}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{n.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })} IST
                        {' • '}
                        {n.target_type === 'ALL' ? '📢 All Retailers' : `🎯 Selected Users (${(n.target_user_ids || []).length})`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
