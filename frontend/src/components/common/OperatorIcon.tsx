import React, { useState } from 'react';

export interface OperatorIconProps {
  operatorCode?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ─── Official High-Resolution Operator Logo URLs ────────────────────────────
// Sourced from NeroPay CDN (https://docs.neropay.co.in) and trusted vectors
const LOGO_MAP: Record<string, { url?: string; isSvg?: boolean; bg: string; label: string; svg?: React.ReactNode }> = {
  // ── Mobile Operators ──────────────────────────────────────────────────────
  JIO: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/jio-logo.png',
    bg: '#0b30a8',
    label: 'Jio',
  },
  AIRTEL: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/airtel-logo.png',
    bg: '#e40000',
    label: 'Airtel',
  },
  VI: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/vi-logo.svg',
    bg: '#ee1d23',
    label: 'Vi',
  },
  BSNL: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/bsnl-logo.jpeg',
    bg: '#004b93',
    label: 'BSNL',
  },

  // ── DTH Providers ────────────────────────────────────────────────────────
  TATAPLAY: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/tata-play-logo.png',
    bg: '#a0006d',
    label: 'Tata Play',
  },
  TATA_PLAY: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/tata-play-logo.png',
    bg: '#a0006d',
    label: 'Tata Play',
  },
  TATASKY: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/tata-play-logo.png',
    bg: '#a0006d',
    label: 'Tata Play',
  },
  AIRTEL_DTH: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/airtel-dth-logo.png',
    bg: '#d32f2f',
    label: 'Airtel DTH',
  },
  AIRTELDTH: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/airtel-dth-logo.png',
    bg: '#d32f2f',
    label: 'Airtel DTH',
  },
  DISHTV: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/dish-tv-logo.png',
    bg: '#ed1c24',
    label: 'Dish TV',
  },
  DISH_TV: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/dish-tv-logo.png',
    bg: '#ed1c24',
    label: 'Dish TV',
  },
  SUNDIRECT: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/sun-direct-logo.png',
    bg: '#f26522',
    label: 'Sun Direct',
  },
  SUN_DIRECT: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/sun-direct-logo.png',
    bg: '#f26522',
    label: 'Sun Direct',
  },
  VIDEOCON: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/videocon-d2h-logo.png',
    bg: '#00873d',
    label: 'Videocon d2h',
  },
  VIDEOCON_D2H: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/videocon-d2h-logo.png',
    bg: '#00873d',
    label: 'Videocon d2h',
  },
  D2H: {
    url: 'https://docs.neropay.co.in/assets/images/service_logo/videocon-d2h-logo.png',
    bg: '#00873d',
    label: 'd2h',
  },

  // ── High-Margin & Digital Services ────────────────────────────────────────
  GOOGLE_PLAY: {
    bg: '#01875f',
    label: 'Google Play',
    isSvg: true,
  },
  FASTAG: {
    bg: '#00529b',
    label: 'FASTag',
    isSvg: true,
  },
  LPG_GAS: {
    bg: '#e65100',
    label: 'LPG Gas',
    isSvg: true,
  },
  BROADBAND: {
    bg: '#0284c7',
    label: 'Broadband',
    isSvg: true,
  },
  OTT_APPS: {
    bg: '#7c3aed',
    label: 'OTT Apps',
    isSvg: true,
  },

  // ── Electricity Boards ────────────────────────────────────────────────────
  TNEB: {
    bg: '#0b6e3f',
    label: 'TNEB',
    isSvg: true,
  },
  BESCOM: {
    bg: '#0284c7',
    label: 'BESCOM',
    isSvg: true,
  },
  MSEB: {
    bg: '#ea580c',
    label: 'MSEB',
    isSvg: true,
  },
  MSEDCL: {
    bg: '#ea580c',
    label: 'MSEDCL',
    isSvg: true,
  },
  WBSEDCL: {
    bg: '#0d9488',
    label: 'WBSEDCL',
    isSvg: true,
  },
};

// ─── Match a code strictly (Exact match first, then longest matching key) ────
function resolve(code: string) {
  if (!code) return null;
  const clean = code.toUpperCase().trim();
  
  // 1. Direct Exact Match
  if (LOGO_MAP[clean]) return LOGO_MAP[clean];

  // 2. Specific alias mappings to prevent VI matching VIDEOCON
  if (clean.includes('VIDEOCON') || clean.includes('D2H')) return LOGO_MAP['VIDEOCON_D2H'];
  if (clean.includes('TATA') || clean.includes('SKY')) return LOGO_MAP['TATAPLAY'];
  if (clean.includes('SUN')) return LOGO_MAP['SUNDIRECT'];
  if (clean.includes('DISH')) return LOGO_MAP['DISHTV'];
  if (clean.includes('AIRTEL') && clean.includes('DTH')) return LOGO_MAP['AIRTEL_DTH'];
  if (clean === 'AT' || clean === 'AIRTEL') return LOGO_MAP['AIRTEL'];
  if (clean === 'VI' || clean === 'IDEA' || clean === 'VODAFONE') return LOGO_MAP['VI'];
  if (clean === 'JIO') return LOGO_MAP['JIO'];
  if (clean === 'BSNL') return LOGO_MAP['BSNL'];
  if (clean.includes('PLAY') || clean.includes('GOOGLE')) return LOGO_MAP['GOOGLE_PLAY'];
  if (clean.includes('FASTAG')) return LOGO_MAP['FASTAG'];
  if (clean.includes('GAS') || clean.includes('LPG')) return LOGO_MAP['LPG_GAS'];
  if (clean.includes('FIBER') || clean.includes('BROADBAND')) return LOGO_MAP['BROADBAND'];
  if (clean.includes('OTT')) return LOGO_MAP['OTT_APPS'];
  if (clean.includes('TNEB') || clean.includes('TANGEDCO')) return LOGO_MAP['TNEB'];
  if (clean.includes('BESCOM')) return LOGO_MAP['BESCOM'];
  if (clean.includes('MSEB') || clean.includes('MSEDCL')) return LOGO_MAP['MSEB'];
  if (clean.includes('WBSEDCL')) return LOGO_MAP['WBSEDCL'];

  return null;
}

export const OperatorIcon: React.FC<OperatorIconProps> = ({
  operatorCode = '',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const code = (operatorCode || '').toUpperCase().trim();

  const dimensions: Record<string, string> = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };

  const sizeClass = dimensions[size] ?? dimensions.md;
  const entry = resolve(code);
  const bgColor = entry?.bg ?? '#2563eb';
  const label = (entry?.label ?? code.slice(0, 3)) || 'OP';

  // Specific custom brand vector icons for services without image URLs
  if (entry?.isSvg) {
    if (code.includes('GOOGLE_PLAY') || code.includes('PLAY')) {
      return (
        <div className={`${sizeClass} rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 p-1.5 ${className}`} title="Google Play">
          <svg viewBox="0 0 512 512" className="w-full h-full">
            <path fill="#4285f4" d="M32.5 25.1c-4.2 4.4-6.5 11.2-6.5 20.3v421.2c0 9.1 2.3 15.9 6.5 20.3l2.3 2.1 236-236v-5.6l-236-236-2.3 3.9z"/>
            <path fill="#ffba00" d="M349.5 308.2l-78.7-78.7v-5.6l78.7-78.7 1.8 1 93.3 53c26.6 15.1 26.6 39.8 0 54.9l-93.3 53-1.8 1.1z"/>
            <path fill="#ea4335" d="M351.3 307.1L270.8 226.6 32.5 464.9c8.8 9.3 23.3 10.4 39.6 1.2l279.2-159z"/>
            <path fill="#00e676" d="M351.3 149.7L72.1 9.3C55.8.1 41.3 1.2 32.5 10.5l238.3 238.3 80.5-99.1z"/>
          </svg>
        </div>
      );
    }

    if (code.includes('FASTAG')) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#00529b] text-white font-black shadow-sm flex flex-col items-center justify-center shrink-0 p-1 ${className}`} title="FASTag">
          <span className="font-extrabold tracking-tighter" style={{ fontSize: size === 'xs' ? 7 : size === 'sm' ? 8 : 10 }}>FAST</span>
          <div className="w-3/4 h-0.5 bg-yellow-400 rounded-full mt-0.2"></div>
        </div>
      );
    }

    if (code.includes('LPG') || code.includes('GAS')) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#e65100] text-white shadow-sm flex items-center justify-center shrink-0 p-1.5 ${className}`} title="LPG Cylinder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M10 2h4M12 2v4M8 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
          </svg>
        </div>
      );
    }

    if (code.includes('BROADBAND') || code.includes('FIBER')) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#0284c7] text-white shadow-sm flex items-center justify-center shrink-0 p-1.5 ${className}`} title="Broadband">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
        </div>
      );
    }

    if (code.includes('OTT')) {
      return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 text-white shadow-sm flex items-center justify-center shrink-0 p-1.5 ${className}`} title="OTT Apps">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      );
    }

    // Electricity Boards (TNEB, BESCOM, MSEB, WBSEDCL)
    return (
      <div 
        className={`${sizeClass} rounded-full text-white font-extrabold shadow-sm flex flex-col items-center justify-center shrink-0 p-1 ${className}`} 
        style={{ backgroundColor: bgColor }}
        title={label}
      >
        <span className="tracking-tighter font-mono" style={{ fontSize: size === 'xs' ? 7 : size === 'sm' ? 8 : size === 'lg' ? 12 : 9 }}>
          {label.slice(0, 4)}
        </span>
      </div>
    );
  }

  // Operator with official image URL
  if (entry?.url && !imgError) {
    const paddingClass = size === 'xs' ? 'p-0.5' : size === 'sm' ? 'p-1' : 'p-1.5';
    return (
      <div
        className={`${sizeClass} rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${paddingClass} ${className}`}
        title={label}
      >
        <img
          src={entry.url}
          alt={label}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: colored circle with uppercase initials
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 shadow-sm font-black text-white ${className}`}
      style={{ backgroundColor: bgColor }}
      title={label}
    >
      <span style={{ fontSize: size === 'xs' ? 8 : size === 'sm' ? 10 : size === 'lg' ? 14 : size === 'xl' ? 18 : 11 }}>
        {(label.slice(0, 3) || 'OP').toUpperCase()}
      </span>
    </div>
  );
};
