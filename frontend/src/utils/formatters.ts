/**
 * Formats raw operator codes or legal company names into clean consumer brand names
 * (identical to Google Pay, PhonePe, and Paytm).
 * e.g., "Bharti Airtel" -> "Airtel", "Reliance Jio Infocomm" -> "Jio", etc.
 */
export function formatOperatorName(code?: string, rawName?: string): string {
  const c = (code || '').toUpperCase().trim();

  // Primary Mobile Operators
  if (c === 'AIRTEL') return 'Airtel';
  if (c === 'JIO') return 'Jio';
  if (c === 'VI' || c === 'IDEA' || c === 'VODAFONE') return 'Vi';
  if (c === 'BSNL') return 'BSNL';

  // Primary DTH Providers
  if (c === 'TATAPLAY' || c.includes('TATAPLAY') || c.includes('TATA')) return 'Tata Play';
  if (c === 'AIRTEL_DTH') return 'Airtel DTH';
  if (c === 'DISHTV' || c.includes('DISHTV')) return 'Dish TV';
  if (c === 'SUNDIRECT' || c.includes('SUNDIRECT')) return 'Sun Direct';

  // State Electricity Boards
  if (c === 'TNEB') return 'TNEB Electricity';
  if (c === 'BESCOM') return 'BESCOM Electricity';
  if (c === 'MSEB') return 'MSEB Electricity';
  if (c === 'WBSEDCL') return 'WBSEDCL Electricity';

  // Fallback cleanup if rawName has corporate suffixes
  if (rawName) {
    const cleaned = rawName
      .replace(/Reliance\s+/i, '')
      .replace(/\s+Infocomm/i, '')
      .replace(/Bharti\s+/i, '')
      .replace(/Vodafone\s+Idea/i, 'Vi')
      .replace(/\s+GSM\s*\/\s*Topup/i, '')
      .replace(/\s+Digital\s+TV/i, ' DTH')
      .replace(/\s+India/i, '')
      .trim();
    if (cleaned) return cleaned;
  }

  return code || 'Operator';
}
