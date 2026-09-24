import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  ChevronDown, 
  Search, 
  Percent, 
  Wallet, 
  Zap, 
  ShieldCheck, 
  Printer, 
  PhoneCall 
} from 'lucide-react';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>('comm_1');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const faqs: FaqItem[] = [
    {
      id: 'comm_1',
      category: 'COMMISSION',
      question: 'How and when is recharge commission (cashback) credited?',
      answer: 'Your retailer cashback is credited immediately and instantly to your wallet balance on every successful recharge! For example, on a ₹1,000 recharge with a 3.00% commission rate, only ₹970.00 is deducted from your balance, retaining ₹30.00 cash profit instantly in your hand.'
    },
    {
      id: 'comm_2',
      category: 'COMMISSION',
      question: 'Where can I see my exact commission rates for each operator?',
      answer: 'You can check your allocated margin table anytime by opening the "Commission" tab in the bottom bar or top menu. It displays live rates across all active mobile prepaid and DTH television operators.'
    },
    {
      id: 'tx_1',
      category: 'RECHARGES',
      question: 'What happens if a recharge shows "Pending" or "Failed"?',
      answer: 'All transactions undergo automatic upstream status verification. If an order fails at the telecom operator, your billed amount is instantly refunded back to your wallet with zero deduction. If pending, our gateway checks status every few seconds until completion.'
    },
    {
      id: 'tx_2',
      category: 'RECHARGES',
      question: 'Can I print or share receipts with my shop customers?',
      answer: 'Yes! Every recharge generates an official transaction receipt. You can tap on any order in your Passbook to view, download as PDF, or print on a 58mm/80mm Bluetooth thermal printer with your store branding.'
    },
    {
      id: 'wallet_1',
      category: 'WALLET',
      question: 'How do I add money to my shop wallet?',
      answer: 'Tap "Add Cash (UPI)" on your home screen or wallet strip. Enter the amount (minimum ₹10), and scan the dynamic UPI QR using GPay, PhonePe, Paytm, or BHIM. Enter the 12-digit UTR number to instantly credit your float wallet with zero surcharge.'
    },
    {
      id: 'sec_1',
      category: 'SECURITY',
      question: 'Is my wallet balance and account secure?',
      answer: 'TriHubPay uses bank-grade 256-bit encryption, JWT session authentication, and automated IP-based security notifications. Every time an admin or shopkeeper signs in, an email alert with IP and location details is dispatched immediately.'
    },
    {
      id: 'sec_2',
      category: 'SECURITY',
      question: 'How do I reach TriHub Technologies priority support?',
      answer: 'Our dedicated retailer desk is available 24/7. Call our helpline at +91 63745 69225 or email trihubtechnologies@gmail.com for instant float topup assistance or dispute reconciliation.'
    }
  ];

  const categories = [
    { id: 'ALL', label: 'All Topics' },
    { id: 'COMMISSION', label: 'Cashback & Rates' },
    { id: 'RECHARGES', label: 'Recharges & Status' },
    { id: 'WALLET', label: 'UPI Topup' },
    { id: 'SECURITY', label: 'Security & Support' }
  ];

  const filtered = faqs.filter((f) => {
    const matchesCat = activeCategory === 'ALL' || f.category === activeCategory;
    const matchesSearch = !search.trim() || 
      f.question.toLowerCase().includes(search.toLowerCase()) || 
      f.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Frequently Asked Questions (FAQ)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quick answers on recharge operations, margins &amp; wallet float
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

        <div className="p-4 sm:p-5 space-y-3.5 max-h-[520px] overflow-y-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help topics (e.g. commission, UPI, refund)..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion Items */}
          <div className="space-y-2 pt-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching help articles found. Please reach out to helpline: +91 63745 69225.
              </div>
            ) : (
              filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="w-full p-3.5 text-left text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isExpanded ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans border-t border-slate-100 dark:border-slate-850 animate-in fade-in">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Support Hotline */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
          <span>Still need help? 24/7 Retailer Support: <strong>+91 63745 69225</strong></span>
        </div>
      </div>
    </div>
  );
};
