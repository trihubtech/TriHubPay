import React, { useState } from 'react';

export interface OperatorIconProps {
  operatorCode?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ─── Real logo URLs (Wikimedia Commons CDN — freely available) ─────────────
const LOGO_MAP: Record<string, { url: string; bg: string; label: string }> = {
  // ── Mobile Operators ──────────────────────────────────────────────────────
  JIO: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Reliance_Jio_Logo.svg',
    bg: '#0b30a8',
    label: 'Jio',
  },
  AIRTEL: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Airtel_logo.svg',
    bg: '#e40000',
    label: 'Airtel',
  },
  VI: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Vodafone_Idea_logo.svg',
    bg: '#ee1d23',
    label: 'Vi',
  },
  IDEA: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Vodafone_Idea_logo.svg',
    bg: '#ee1d23',
    label: 'Vi',
  },
  VODAFONE: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Vodafone_Idea_logo.svg',
    bg: '#ee1d23',
    label: 'Vi',
  },
  BSNL: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/BSNL_New_Logo.png',
    bg: '#004b93',
    label: 'BSNL',
  },
  // ── DTH Providers ────────────────────────────────────────────────────────
  TATAPLAY: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Tata_Play_2022_logo.svg',
    bg: '#a0006d',
    label: 'Tata Play',
  },
  TATASKY: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Tata_Play_2022_logo.svg',
    bg: '#a0006d',
    label: 'Tata Play',
  },
  AIRTEL_DTH: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Airtel_logo.svg',
    bg: '#d32f2f',
    label: 'Airtel DTH',
  },
  DISHTV: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/DishTV_logo_%282025%29.svg',
    bg: '#ed1c24',
    label: 'Dish TV',
  },
  DISH: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/DishTV_logo_%282025%29.svg',
    bg: '#ed1c24',
    label: 'Dish TV',
  },
  SUNDIRECT: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Sun_Direct_Max.png',
    bg: '#f26522',
    label: 'Sun Direct',
  },
  SUN: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Sun_Direct_Max.png',
    bg: '#f26522',
    label: 'Sun Direct',
  },
  VIDEOCON: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Videocon_d2h.png',
    bg: '#00873d',
    label: 'd2h',
  },
  D2H: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Videocon_d2h.png',
    bg: '#00873d',
    label: 'd2h',
  },
  // ── Electricity Boards ────────────────────────────────────────────────────
  TNEB: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Tamil_Nadu_Electricity_Board_logo.png',
    bg: '#0b6e3f',
    label: 'TNEB',
  },
  BESCOM: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/BESCOM_Logo.png',
    bg: '#0284c7',
    label: 'BESCOM',
  },
  MSEDCL: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Maharashtra_State_Electricity_Distribution_Co._Ltd._logo.png',
    bg: '#ea580c',
    label: 'MSEDCL',
  },
  MSEB: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Maharashtra_State_Electricity_Distribution_Co._Ltd._logo.png',
    bg: '#ea580c',
    label: 'MSEDCL',
  },
  WBSEDCL: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/WBSEDCL_logo.png',
    bg: '#0d9488',
    label: 'WBSEDCL',
  },
};

// ─── Fallback colors for unknown codes ────────────────────────────────────────
const FALLBACK_COLORS: Record<string, string> = {
  JIO: '#0b30a8',
  AIRTEL: '#e40000',
  VI: '#ee1d23',
  IDEA: '#ee1d23',
  BSNL: '#004b93',
  TATAPLAY: '#a0006d',
  DISHTV: '#ed1c24',
  SUNDIRECT: '#f26522',
  VIDEOCON: '#00873d',
  TNEB: '#0b6e3f',
  BESCOM: '#0284c7',
  MSEDCL: '#ea580c',
  WBSEDCL: '#0d9488',
};

// ─── Match a code to its LOGO_MAP entry ──────────────────────────────────────
function resolve(code: string) {
  // Direct hit
  if (LOGO_MAP[code]) return LOGO_MAP[code];
  // Partial match (e.g. "AIRTEL_DTH" starts with AIRTEL, but AIRTEL_DTH is in map already)
  for (const key of Object.keys(LOGO_MAP)) {
    if (code.includes(key) || key.includes(code)) return LOGO_MAP[key];
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
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
  const bgColor = entry?.bg ?? (FALLBACK_COLORS[code] ?? '#475569');
  const label = (entry?.label ?? code.slice(0, 3)) || 'OP';

  // Padding inside the circle for logo breathing room
  const paddingClass = size === 'xs' ? 'p-0.5' : size === 'sm' ? 'p-1' : 'p-1.5';

  if (entry && !imgError) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md ${paddingClass} ${className}`}
        style={{ backgroundColor: bgColor + '20', border: `1.5px solid ${bgColor}40` }}
        title={label}
      >
        <img
          src={entry.url}
          alt={label}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: colored circle with initials
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 shadow-md font-black text-white ${className}`}
      style={{ backgroundColor: bgColor }}
      title={label}
    >
      <span style={{ fontSize: size === 'xs' ? 8 : size === 'sm' ? 10 : size === 'lg' ? 14 : size === 'xl' ? 18 : 11 }}>
        {(label.slice(0, 2) || 'OP').toUpperCase()}
      </span>
    </div>
  );
};
