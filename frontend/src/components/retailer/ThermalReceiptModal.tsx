import React from 'react';
import { jsPDF } from 'jspdf';
import { X, Printer, Share2, CheckCircle2, Download } from 'lucide-react';
import { Transaction } from '../../types';
import { OperatorIcon } from '../common/OperatorIcon';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | any;
  shopName: string;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  shopName
}) => {
  if (!isOpen || !transaction) return null;

  const handleDownloadPdf = () => {
    try {
      // --- Pass 1: pre-calculate total y to determine exact receipt height ---
      const store = (shopName || 'TRIHUBPAY RECHARGE POINT').toUpperCase();
      const srv = String(transaction.service_type || 'PREPAID').toUpperCase();
      const op = String(transaction.operator_name || transaction.operator_code || 'TELECOM');
      const num = String(transaction.target_account_number || transaction.target_account || '');
      const txId = String(transaction.internal_tx_id || transaction.transaction_id || '');
      const opRef = String(transaction.upstream_operator_ref || 'CONFIRMED');
      const amt = Number(transaction.face_value || 0).toFixed(2);
      const dateStr = new Date(transaction.created_at || transaction.timestamp || Date.now()).toLocaleString('en-IN');
      const status = String(transaction.status || 'SUCCESS').toUpperCase();

      // Simulate y accumulation identical to drawing pass below
      let yCalc = 23;
      const rowCount = 5; // Service, Operator, Number, TxnID, OpRef
      yCalc += rowCount * 4.5; // addRow steps
      yCalc += 1 + 5 + 3;     // divider + TOTAL PAID + lower divider
      yCalc += 5.5 + 4 + 3.8 + 3; // STATUS + thank you + branding + url
      const docHeight = yCalc + 6; // 6mm bottom padding

      // --- Pass 2: create doc with exact content height (no blank space) ---
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, docHeight]
      });

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.text(store, 29, 8, { align: 'center', maxWidth: 52 });

      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
        doc.text('Authorized Partner', 29, 12.5, { align: 'center' });
      doc.text(dateStr, 29, 16, { align: 'center' });

      doc.setLineDashPattern([1, 1], 0);
      doc.setLineWidth(0.2);
      doc.line(3, 18.5, 55, 18.5);

      let y = 23;
      const addRow = (label: string, val: string) => {
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.text(label, 3, y);
        doc.setFont('courier', 'bold');
        doc.text(val, 55, y, { align: 'right' });
        y += 4.5;
      };

      addRow('Service:', srv);
      addRow('Operator:', op);
      addRow('Number / ID:', num);
      addRow('Txn ID:', txId.length > 15 ? txId.substring(0, 15) + '..' : txId);
      addRow('Operator Ref:', opRef.length > 15 ? opRef.substring(0, 15) + '..' : opRef);

      y += 1;
      doc.line(3, y, 55, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont('courier', 'bold');
      doc.text('TOTAL PAID', 3, y);
      doc.text(`Rs. ${amt}`, 55, y, { align: 'right' });
      y += 3;
      doc.line(3, y, 55, y);

      y += 5.5;
      doc.setFontSize(8);
      doc.text(`STATUS: ${status}`, 29, y, { align: 'center' });
      y += 4;
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.text('Thank you! Please visit again.', 29, y, { align: 'center' });
      y += 3.8;
      doc.setFontSize(6);
      doc.text('Powered by TriHubPay', 29, y, { align: 'center' });
      y += 3;
      doc.text('https://trihubpay.in/', 29, y, { align: 'center' });

      doc.save(`TriHubPay_Receipt_${txId || 'ticket'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      handlePrint(58);
    }
  };

  const handlePrint = (paperWidthMm: number = 58) => {
    const printable = document.getElementById('thermal-receipt-printable');
    if (!printable) {
      window.print();
      return;
    }

    // Isolate print in dedicated invisible iframe to prevent multi-page DOM overflow and ensure 1 single page
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;width:0;height:0;top:-1000px;left:-1000px;border:none;');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }


    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>TriHubPay Receipt - ${transaction.internal_tx_id || transaction.transaction_id || 'Print'}</title>
          <style>
            @page {
              size: ${paperWidthMm}mm auto;
              margin: 0mm;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                width: ${paperWidthMm}mm !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', Courier, monospace;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 3mm 4mm;
              width: ${paperWidthMm}mm;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * { box-sizing: border-box; }
            .store-header {
              text-align: center;
              border-bottom: 1px dashed #444;
              padding-bottom: 5px;
              margin-bottom: 6px;
            }
            .store-name {
              font-weight: 900;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 9px;
              color: #555;
              margin-top: 2px;
            }
            .date-time {
              font-size: 8.5px;
              color: #666;
              margin-top: 3px;
            }
            .tx-table {
              width: 100%;
              font-size: 10.5px;
              line-height: 1.35;
              margin-bottom: 6px;
            }
            .tx-row {
              display: flex;
              justify-content: space-between;
              padding: 1.5px 0;
            }
            .tx-label { color: #555; }
            .tx-val {
              font-weight: 700;
              text-align: right;
              font-family: 'Courier New', Courier, monospace;
            }
            .total-banner {
              border-top: 1px dashed #444;
              border-bottom: 1px dashed #444;
              padding: 5px 0;
              margin: 6px 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              font-weight: 900;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #444;
              margin-top: 5px;
              line-height: 1.3;
            }
            .status-badge {
              font-weight: 900;
              text-transform: uppercase;
              color: #000;
              margin-bottom: 2px;
            }
            .brand-footer {
              font-size: 7.5px;
              color: #666;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="store-header">
            <div class="store-name">${shopName || 'TRIHUBPAY RECHARGE POINT'}</div>
            <div class="sub-title">Authorized Partner</div>
            <div class="date-time">${new Date(transaction.created_at || transaction.timestamp || Date.now()).toLocaleString('en-IN')}</div>
          </div>

          <div class="tx-table">
            <div class="tx-row">
              <span class="tx-label">Service:</span>
              <span class="tx-val">${transaction.service_type || 'PREPAID'}</span>
            </div>
            <div class="tx-row">
              <span class="tx-label">Operator:</span>
              <span class="tx-val">${transaction.operator_name || transaction.operator_code}</span>
            </div>
            <div class="tx-row">
              <span class="tx-label">Number / ID:</span>
              <span class="tx-val">${transaction.target_account_number || transaction.target_account}</span>
            </div>
            <div class="tx-row">
              <span class="tx-label">Txn ID:</span>
              <span class="tx-val" style="font-size:8.5px;">${transaction.internal_tx_id || transaction.transaction_id}</span>
            </div>
            <div class="tx-row">
              <span class="tx-label">Operator Ref:</span>
              <span class="tx-val" style="font-size:8.5px;">${transaction.upstream_operator_ref || 'CONFIRMED'}</span>
            </div>
          </div>

          <div class="total-banner">
            <span>TOTAL PAID</span>
            <span>₹${Number(transaction.face_value).toFixed(2)}</span>
          </div>

          <div class="footer">
            <div class="status-badge">STATUS: ${transaction.status || 'SUCCESS'}</div>
            <div>Thank you! Please visit again.</div>
            <div class="brand-footer">Powered by TriHubPay • https://trihubpay.in/</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          // cleanup
        }
      }, 1500);
    }, 250);
  };

  const handleWhatsAppShare = () => {
    const text = `🧾 *RECHARGE PAYMENT RECEIPT*
🏪 *Store:* ${shopName || 'Retailer Store'}
📱 *Service No:* ${transaction.target_account_number || transaction.target_account}
⚡ *Operator:* ${transaction.operator_name || transaction.operator_code}
💰 *Amount Paid:* ₹${Number(transaction.face_value).toFixed(2)}
🔢 *Txn Reference:* ${transaction.internal_tx_id || transaction.transaction_id}
🏛️ *Operator Ref:* ${transaction.upstream_operator_ref || 'N/A'}
✅ *Status:* ${transaction.status || 'SUCCESS'}
🕒 *Date:* ${new Date(transaction.created_at || transaction.timestamp || Date.now()).toLocaleString('en-IN')}

_Thank you for recharging with TriHubPay!_
🌐 https://trihubpay.in/`;

    const cleanPhone = (transaction.target_account_number || transaction.target_account || '').replace(/\D/g, '');
    const waUrl = cleanPhone.length === 10
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Digital & Thermal Receipt</span>
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 58mm Thermal Receipt Printable Box */}
        <div className="p-6 bg-slate-100 dark:bg-slate-950">
          <div
            id="thermal-receipt-printable"
            className="bg-white text-black p-4 rounded-xl font-mono text-xs shadow-md dark:shadow-inner space-y-3 leading-tight"
          >
            {/* Store Banner */}
            <div className="text-center border-b border-dashed border-neutral-400 pb-2">
              <div className="font-black text-sm uppercase tracking-wider">{shopName || 'RECHARGE POINT'}</div>
              <div className="text-[10px] text-neutral-600">Authorized Partner</div>
              <div className="text-[9px] text-neutral-500 mt-0.5">
                {new Date(transaction.created_at || transaction.timestamp || Date.now()).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Transaction Data */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-600">Service:</span>
                <span className="font-bold">{transaction.service_type || 'PREPAID'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Operator:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  <OperatorIcon operatorCode={transaction.operator_code} size="xs" />
                  <span>{transaction.operator_name || transaction.operator_code}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Number / ID:</span>
                <span className="font-bold">{transaction.target_account_number || transaction.target_account}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Txn ID:</span>
                <span className="font-mono text-[9px]">{transaction.internal_tx_id || transaction.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Operator Ref:</span>
                <span className="font-mono text-[9px]">{transaction.upstream_operator_ref || 'CONFIRMED'}</span>
              </div>
            </div>

            {/* Total Face Value */}
            <div className="border-t border-b border-dashed border-neutral-400 py-2 flex justify-between items-center text-sm font-black">
              <span>TOTAL PAID</span>
              <span>₹{Number(transaction.face_value).toFixed(2)}</span>
            </div>

            {/* Status & Footer */}
            <div className="text-center text-[10px] text-neutral-600 space-y-1">
              <div className="font-bold text-neutral-900 uppercase">STATUS: {transaction.status || 'SUCCESS'}</div>
              <div>Thank you! Please visit again.</div>
              <div className="text-[8px] text-neutral-400 font-sans">Powered by TriHubPay • https://trihubpay.in/</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: 58mm PDF Download | Thermal Print | WhatsApp Share */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-2 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors"
            title="Download true 58mm bill paper size PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>58mm PDF</span>
          </button>

          <button
            onClick={() => handlePrint(58)}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white py-2.5 px-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            title="Print directly to 58mm/80mm POS slip printer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-2 rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
            title="Share receipt via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
