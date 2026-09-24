import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  MessageSquare, 
  Star, 
  CheckCircle2, 
  Clock, 
  Check, 
  Reply, 
  Loader2, 
  Search,
  Filter,
  User,
  Phone
} from 'lucide-react';

export const AdminFeedbackBoard: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFeedbacks();
      if (res.success) {
        setFeedbacks(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string, adminResponse?: string) => {
    setIsUpdating(true);
    try {
      const res = await api.updateFeedbackStatus(id, newStatus, adminResponse);
      if (res.success) {
        setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, status: newStatus, admin_response: adminResponse || f.admin_response } : f));
        setRespondingId(null);
        setResponseText('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update feedback status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = feedbacks.filter(f => selectedStatus === 'ALL' || f.status === selectedStatus);

  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'NEW').length,
    reviewed: feedbacks.filter(f => f.status === 'REVIEWED').length,
    resolved: feedbacks.filter(f => f.status === 'RESOLVED').length
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & KPI Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                User Feedback &amp; Suggestions Board
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor user satisfaction, review bug reports, and track suggestions submitted by retail partners.
              </p>
            </div>
          </div>

          <button
            onClick={loadFeedbacks}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline self-start sm:self-center"
          >
            Refresh
          </button>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'ALL', label: 'All Submissions', count: stats.total },
            { id: 'NEW', label: 'New / Unreviewed', count: stats.new, color: 'text-amber-500' },
            { id: 'REVIEWED', label: 'In Review', count: stats.reviewed, color: 'text-blue-500' },
            { id: 'RESOLVED', label: 'Resolved / Closed', count: stats.resolved, color: 'text-emerald-500' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedStatus(pill.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                selectedStatus === pill.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-white shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{pill.label}</span>
              <span className={`font-mono font-bold ${pill.color || 'text-slate-900 dark:text-white'}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mb-2 text-blue-600" />
            <span>Loading user feedback...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No feedback found for the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {item.user_name || item.organization_name || 'Retailer'}
                    </span>
                    {item.organization_name && (
                      <span className="text-xs text-slate-400">({item.organization_name})</span>
                    )}
                    {item.user_phone && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {item.user_phone}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= item.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : item.status === 'REVIEWED'
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Feedback Body */}
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  "{item.message}"
                </p>

                {/* Admin Response if any */}
                {item.admin_response && (
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Reply className="w-3.5 h-3.5" />
                      <span>Admin Resolution Note:</span>
                    </span>
                    <p className="font-sans">{item.admin_response}</p>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(item.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {respondingId === item.id ? (
                      <button
                        onClick={() => setRespondingId(null)}
                        className="text-slate-400 hover:text-slate-600 text-[11px]"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setRespondingId(item.id);
                          setResponseText(item.admin_response || '');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {item.admin_response ? 'Edit Response' : 'Reply / Note'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Response Input */}
                {respondingId === item.id && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <textarea
                      rows={2}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Add an internal note or resolution comment..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, 'REVIEWED', responseText)}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
