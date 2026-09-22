import React, { useState } from 'react';
import { User, LedgerEntry } from '../../types';
import { api } from '../../services/api';
import { 
  Store, 
  Plus, 
  Minus, 
  Settings2, 
  FileText, 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  Lock,
  Phone,
  Mail,
  X,
  Edit3,
  Building2,
  User as UserIcon,
  Save,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface UserBalanceManagerProps {
  users: User[];
  onRefresh: () => void;
  onOpenCustomCommissions: (user: User) => void;
  onOpenOnboardShop?: () => void;
}

export const UserBalanceManager: React.FC<UserBalanceManagerProps> = ({
  users,
  onRefresh,
  onOpenCustomCommissions,
  onOpenOnboardShop
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState<string>('1000');
  const [reason, setReason] = useState<string>('Bank Transfer NEFT float credit');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [statusError, setStatusError] = useState<string>('');

  // Shop Login Credentials & Password Reset Modal state
  const [credentialsModalUser, setCredentialsModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('Password@123');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string>('');
  const [resetErrorMsg, setResetErrorMsg] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [copiedCreds, setCopiedCreds] = useState<boolean>(false);

  // Ledger inspection drawer state
  const [ledgerModalUser, setLedgerModalUser] = useState<User | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  // Edit Profile Modal state
  const [profileModalUser, setProfileModalUser] = useState<User | null>(null);
  const [editOrgName, setEditOrgName] = useState<string>('');
  const [editOwnerName, setEditOwnerName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editProfileError, setEditProfileError] = useState<string>('');
  const [editProfileSuccess, setEditProfileSuccess] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const handleOpenEditProfile = (u: User) => {
    setProfileModalUser(u);
    setEditOrgName(u.organization_name || '');
    setEditOwnerName(u.owner_name || '');
    setEditPhone(u.phone || '');
    setEditEmail(u.email || '');
    setEditProfileError('');
    setEditProfileSuccess('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileModalUser) return;

    const cleanPhone = editPhone.trim();
    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanOrg = editOrgName.trim();
    const cleanOwner = editOwnerName.trim();

    if (!cleanOrg || !cleanOwner) {
      setEditProfileError('Organization and owner names cannot be empty.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setEditProfileError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEditProfileError('Please enter a valid email address.');
      return;
    }

    setIsSavingProfile(true);
    setEditProfileError('');
    setEditProfileSuccess('');
    try {
      const res = await api.adminUpdateUserProfile(profileModalUser.id, {
        organization_name: cleanOrg,
        owner_name: cleanOwner,
        phone: cleanPhone,
        email: cleanEmail
      });

      if (res.success) {
        setEditProfileSuccess('User profile updated successfully!');
        setTimeout(() => {
          setProfileModalUser(null);
          onRefresh();
        }, 1200);
      } else {
        setEditProfileError(res.message || 'Failed to update user profile.');
      }
    } catch (err: any) {
      setEditProfileError(err.message || 'Failed to update profile. Mobile number or email is already used by another profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [isResettingBalances, setIsResettingBalances] = useState<boolean>(false);

  const handleResetAllBalances = async () => {
    const confirmed = window.confirm(
      '⚠️ RESET ALL RETAILER BALANCES TO ₹0.00?\n\nThis will zero out all retailer cash balances in your platform so that recharges require real wallet deposits. Continue?'
    );
    if (!confirmed) return;

    setIsResettingBalances(true);
    try {
      const res = await api.resetAllRetailerBalances();
      if (res.success) {
        setFeedbackMsg({ text: 'All retailer balances successfully reset to ₹0.00 for live launch.' });
        onRefresh();
      } else {
        setFeedbackMsg({ text: res.message || 'Failed to reset balances', error: true });
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || 'Error resetting balances', error: true });
    } finally {
      setIsResettingBalances(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.organization_name.toLowerCase().includes(search.toLowerCase()) ||
    u.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const handleOpenAdjust = (u: User, type: 'CREDIT' | 'DEBIT') => {
    setSelectedUser(u);
    setActionType(type);
    setReason(type === 'CREDIT' ? 'Direct Bank RTGS / Cash settlement deposit' : 'Chargeback / Manual correction');
    setModalOpen(true);
    setFeedbackMsg(null);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setFeedbackMsg({ text: 'Please enter a valid amount', error: true });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await api.adjustUserBalance(selectedUser.id, numAmt, actionType, reason);
      if (res.success) {
        setFeedbackMsg({ text: res.message });
        setTimeout(() => {
          setModalOpen(false);
          onRefresh();
        }, 1200);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to adjust balance', error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    setStatusError('');
    try {
      await api.toggleUserStatus(u.id, !u.is_active);
      onRefresh();
    } catch (err: any) {
      setStatusError(err.message || 'Error toggling user status');
    }
  };

  const handleOpenCredentials = (u: User) => {
    setCredentialsModalUser(u);
    setNewPassword('Password@123');
    setResetSuccessMsg('');
    setResetErrorMsg('');
    setCopiedCreds(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsModalUser) return;
    setIsResetting(true);
    setResetSuccessMsg('');
    setResetErrorMsg('');
    try {
      const res = await api.resetUserPassword(credentialsModalUser.id, newPassword);
      if (res.success) {
        setResetSuccessMsg(`Password successfully updated to "${newPassword}" for ${credentialsModalUser.organization_name}`);
      }
    } catch (err: any) {
      setResetErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsResetting(false);
    }
  };

  const copyCredsToClipboard = () => {
    if (!credentialsModalUser) return;
    const text = `🎉 TriHubPay Partner Credentials\n\nStore: ${credentialsModalUser.organization_name}\nOwner: ${credentialsModalUser.owner_name}\nLogin Phone: ${credentialsModalUser.phone}\nPassword: ${newPassword}\nPortal: https://pay.trihubtechnologies.com\n\nTriHub Technologies`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const handleViewLedger = async (u: User) => {
    setLedgerModalUser(u);
    setLoadingLedger(true);
    try {
      const res = await api.getUserLedger(u.id);
      if (res.success) {
        setLedgerEntries(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      {statusError && (
        <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>{statusError}</span>
          </div>
          <button onClick={() => setStatusError('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Search */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-500" />
            <span>Accounts &amp; Cash Balance Manager</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage cash balances, assign custom cashback rates, and review audit ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleResetAllBalances}
            disabled={isResettingBalances}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all shrink-0"
            title="Reset all test retailer balances to ₹0.00 for live launch"
          >
            {isResettingBalances ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            <span>Reset Balances to ₹0</span>
          </button>

          <button
            onClick={onOpenOnboardShop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard New Account</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search account, name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Account &amp; Name</th>
              <th className="py-3 px-4">Phone / Role</th>
              <th className="py-3 px-4 text-right">Available Balance</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{u.organization_name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.owner_name}</div>
                </td>

                <td className="py-3.5 px-4 font-mono">
                  <div>{u.phone}</div>
                  <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                    {u.role}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    ₹{Number(u.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {u.total_recharges || 0} recharges done
                  </div>
                </td>

                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => handleToggleStatus(u)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                      u.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{u.is_active ? 'Active' : 'Blocked'}</span>
                  </button>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Credit Float */}
                    <button
                      onClick={() => handleOpenAdjust(u, 'CREDIT')}
                      title="Credit Float"
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Debit Float */}
                    <button
                      onClick={() => handleOpenAdjust(u, 'DEBIT')}
                      title="Debit Balance"
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    {/* Shop Custom Commission */}
                    <button
                      onClick={() => onOpenCustomCommissions(u)}
                      title="Configure Custom Commissions for this Shop"
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    {/* View Ledger */}
                    <button
                      onClick={() => handleViewLedger(u)}
                      title="View Chronological Wallet Ledger"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* View / Reset Credentials */}
                    <button
                      onClick={() => handleOpenCredentials(u)}
                      title="View / Reset Login Credentials"
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit User Profile & Unique Mobile/Email */}
                    <button
                      onClick={() => handleOpenEditProfile(u)}
                      title="Edit Shop Profile & Contact"
                      className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit / Debit Balance Modal */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {actionType === 'CREDIT' ? 'Credit Cash Balance' : 'Debit Cash Balance'}
              </h4>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs">
                Cancel
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              {feedbackMsg && (
                <div className={`p-3 rounded-xl text-xs ${feedbackMsg.error ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                  {feedbackMsg.text}
                </div>
              )}

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Target Account:</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedUser.organization_name}</div>
                <div className="text-xs text-slate-500 font-mono">Current Balance: ₹{Number(selectedUser.current_balance).toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">AMOUNT (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl py-2.5 pl-8 pr-3 font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">AUDIT JUSTIFICATION / REASON</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Bank NEFT settlement credit"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-colors flex items-center justify-center gap-2 ${
                  actionType === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Execute {actionType} with Row-Lock</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Inspection Modal */}
      {ledgerModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <span>Wallet Ledger Audit: {ledgerModalUser.organization_name}</span>
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Current Balance: ₹{Number(ledgerModalUser.current_balance).toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => setLedgerModalUser(null)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingLedger ? (
                <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading immutable ledger...</span>
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No ledger entries found.</div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-xs">
                  {ledgerEntries.map((e) => (
                    <div key={e.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            e.transaction_type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {e.transaction_type}
                          </span>
                          <span className="text-slate-900 dark:text-white font-bold">₹{Number(e.amount).toFixed(2)}</span>
                          <span className="text-slate-400 text-[10px]">{e.reference_id}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-[11px] font-sans mt-0.5">{e.description}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-slate-700 dark:text-slate-300 text-[11px]">
                          ₹{Number(e.balance_before).toFixed(2)} ➔ ₹{Number(e.balance_after).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {new Date(e.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopkeeper Login Credentials & Password Reset Modal */}
      {credentialsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Account Login Credentials</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">View and reset partner login credentials</p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsModalUser(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Account & Owner Info */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-850">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Account Name</span>
                  <span className="text-slate-900 dark:text-white font-semibold font-sans">{credentialsModalUser.organization_name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-850">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Owner</span>
                  <span className="text-slate-900 dark:text-white font-sans">{credentialsModalUser.owner_name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-850">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Username (Mobile)</span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">{credentialsModalUser.phone}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Default Password</span>
                  <span className="text-amber-600 dark:text-amber-300 font-bold">Password@123</span>
                </div>
              </div>

              {resetSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {resetErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span>{resetErrorMsg}</span>
                </div>
              )}

              {/* Password Reset Form */}
              <form onSubmit={handleResetPassword} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span>SET NEW PASSWORD</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyCredsToClipboard}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                    <span>{copiedCreds ? 'Copied!' : 'Copy for WhatsApp'}</span>
                  </button>
                </div>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setCredentialsModalUser(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Profile Modal */}
      {profileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Edit Retailer Profile
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update organization, owner name, and unique contact details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalUser(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
              {editProfileError && (
                <div className="p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editProfileError}</span>
                </div>
              )}

              {editProfileSuccess && (
                <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editProfileSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Organization / Shop Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Full Name / Owner Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Unique Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">No two accounts can share the same mobile number.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Unique Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">No two accounts can share the same email address.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalUser(null)}
                  disabled={isSavingProfile}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
