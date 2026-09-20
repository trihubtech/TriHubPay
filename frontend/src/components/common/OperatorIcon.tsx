import React from 'react';

export interface OperatorIconProps {
  operatorCode?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const OperatorIcon: React.FC<OperatorIconProps> = ({
  operatorCode = '',
  size = 'md',
  className = ''
}) => {
  const code = (operatorCode || '').toUpperCase().trim();

  const dimensions = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base'
  }[size];

  // 1. Reliance Jio
  if (code === 'JIO' || code.includes('JIO')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#0a2885] flex items-center justify-center shadow-md shadow-blue-900/30 shrink-0 overflow-hidden ${className}`}
        title="Reliance Jio Infocomm"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#001466] to-[#1242d6] opacity-90" />
        <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] relative z-10" fill="none">
          <circle cx="50" cy="50" r="46" fill="#0b30a8" stroke="#ffffff" strokeWidth="3" opacity="0.3"/>
          <text 
            x="50" 
            y="61" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="34" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="-0.5"
          >
            Jio
          </text>
        </svg>
      </div>
    );
  }

  // 2. Bharti Airtel
  if (code === 'AIRTEL' || (code.includes('AIRTEL') && !code.includes('DTH'))) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#e40000] flex items-center justify-center shadow-md shadow-red-600/30 shrink-0 overflow-hidden ${className}`}
        title="Bharti Airtel"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#c40000] to-[#ff2b2b]" />
        <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] relative z-10" fill="none">
          {/* Airtel Iconic Loop Wave */}
          <path 
            d="M20,68 C20,38 38,20 62,20 C75,20 84,28 84,40 C84,55 70,64 54,64 C42,64 36,58 36,50 C36,40 44,34 54,34 C64,34 70,40 70,48" 
            stroke="#ffffff" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle cx="54" cy="50" r="4.5" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // 3. Vodafone Idea (Vi)
  if (code === 'VI' || code.includes('IDEA') || code.includes('VODAFONE')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#ee1d23] flex items-center justify-center shadow-md shadow-rose-900/30 shrink-0 overflow-hidden ${className}`}
        title="Vodafone Idea (Vi)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#b80b10] to-[#ff3b40]" />
        <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] relative z-10" fill="none">
          {/* Bold Vi Lettering */}
          <text 
            x="38" 
            y="66" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="46" 
            fontFamily="Inter, Arial, sans-serif"
          >
            V
          </text>
          <text 
            x="68" 
            y="66" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="46" 
            fontFamily="Inter, Arial, sans-serif"
          >
            ı
          </text>
          {/* Iconic Vi Yellow Dot on 'i' */}
          <circle cx="68" cy="27" r="7.5" fill="#fbbb00" />
        </svg>
      </div>
    );
  }

  // 4. BSNL
  if (code === 'BSNL') {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#004b93] flex items-center justify-center shadow-md shadow-blue-900/30 shrink-0 overflow-hidden ${className}`}
        title="Bharat Sanchar Nigam Limited (BSNL)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#003366] to-[#0066cc]" />
        <svg viewBox="0 0 100 100" className="w-[84%] h-[84%] relative z-10" fill="none">
          {/* BSNL Connecting Blue & Green Arrows */}
          <circle cx="50" cy="50" r="44" stroke="#ffffff" strokeWidth="2.5" opacity="0.3"/>
          <path d="M22,50 A28,28 0 0,1 78,50" stroke="#ffcc00" strokeWidth="6" strokeLinecap="round" />
          <path d="M78,50 A28,28 0 0,1 22,50" stroke="#00c853" strokeWidth="6" strokeLinecap="round" />
          <text 
            x="50" 
            y="57" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="22" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.8"
          >
            BSNL
          </text>
        </svg>
      </div>
    );
  }

  // 5. Sun Direct TV
  if (code === 'SUNDIRECT' || code.includes('SUN')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#f26522] flex items-center justify-center shadow-md shadow-orange-600/30 shrink-0 overflow-hidden ${className}`}
        title="Sun Direct TV"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#d94806] via-[#f76707] to-[#ffa94d]" />
        <svg viewBox="0 0 100 100" className="w-[86%] h-[86%] relative z-10" fill="none">
          {/* Sun Rays */}
          <circle cx="50" cy="42" r="16" fill="#ffd43b" />
          <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round">
            <line x1="50" y1="16" x2="50" y2="22" />
            <line x1="50" y1="62" x2="50" y2="68" />
            <line x1="24" y1="42" x2="30" y2="42" />
            <line x1="70" y1="42" x2="76" y2="42" />
            <line x1="32" y1="24" x2="36" y2="28" />
            <line x1="64" y1="56" x2="68" y2="60" />
            <line x1="32" y1="60" x2="36" y2="56" />
            <line x1="64" y1="28" x2="68" y2="24" />
          </g>
          <text 
            x="50" 
            y="84" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="15" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.5"
          >
            SUN DIRECT
          </text>
        </svg>
      </div>
    );
  }

  // 6. Tata Play DTH
  if (code === 'TATAPLAY' || code.includes('TATA')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#a0006d] flex items-center justify-center shadow-md shadow-pink-900/30 shrink-0 overflow-hidden ${className}`}
        title="Tata Play DTH"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#650085] via-[#a0006d] to-[#e6007e]" />
        <svg viewBox="0 0 100 100" className="w-[88%] h-[88%] relative z-10" fill="none">
          <text 
            x="50" 
            y="44" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="18" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="2.5"
          >
            TATA
          </text>
          <g transform="translate(18, 52)">
            <rect x="0" y="0" width="64" height="26" rx="13" fill="#ffffff" />
            <text 
              x="32" 
              y="18" 
              textAnchor="middle" 
              fill="#a0006d" 
              fontWeight="900" 
              fontSize="16" 
              fontFamily="Inter, Arial, sans-serif" 
              letterSpacing="0.2"
            >
              play
            </text>
          </g>
        </svg>
      </div>
    );
  }

  // 7. Airtel Digital TV (DTH)
  if (code === 'AIRTEL_DTH' || (code.includes('AIRTEL') && code.includes('DTH'))) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#d32f2f] flex items-center justify-center shadow-md shadow-red-700/30 shrink-0 overflow-hidden ${className}`}
        title="Airtel Digital TV"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#9a0007] to-[#e53935]" />
        <svg viewBox="0 0 100 100" className="w-[84%] h-[84%] relative z-10" fill="none">
          {/* Satellite Dish Icon */}
          <path d="M26,38 A34,34 0 0,1 74,38" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <path d="M34,48 A22,22 0 0,1 66,48" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <line x1="50" y1="48" x2="50" y2="70" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="24" r="5" fill="#ffd54f" />
          <text 
            x="50" 
            y="87" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="14" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="1"
          >
            AIRTEL DTH
          </text>
        </svg>
      </div>
    );
  }

  // 8. Dish TV
  if (code === 'DISHTV' || code.includes('DISH')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#ed1c24] flex items-center justify-center shadow-md shadow-red-600/30 shrink-0 overflow-hidden ${className}`}
        title="Dish TV India"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#b70f15] to-[#ff3b40]" />
        <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] relative z-10" fill="none">
          <text 
            x="50" 
            y="48" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="26" 
            fontFamily="Inter, Arial, sans-serif"
          >
            dish
          </text>
          {/* Smiling Dish Red Arc */}
          <path d="M24,56 C34,74 66,74 76,56" stroke="#ffeb3b" strokeWidth="6" strokeLinecap="round" />
          <text 
            x="50" 
            y="88" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="15" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="1.2"
          >
            TV
          </text>
        </svg>
      </div>
    );
  }

  // 9. Videocon D2H
  if (code === 'VIDEOCON' || code.includes('D2H')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#00873d] flex items-center justify-center shadow-md shadow-green-700/30 shrink-0 overflow-hidden ${className}`}
        title="Videocon d2h"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#005c29] to-[#00a84c]" />
        <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] relative z-10" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#ffffff" strokeWidth="3" opacity="0.3"/>
          <text 
            x="50" 
            y="62" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="34" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="-0.5"
          >
            d2h
          </text>
        </svg>
      </div>
    );
  }

  // 10. TNEB / Tamil Nadu Electricity (TANGEDCO)
  if (code === 'TNEB' || code.includes('TNEB') || code.includes('TAMIL NADU')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#0b6e3f] flex items-center justify-center shadow-md shadow-emerald-800/30 shrink-0 overflow-hidden ${className}`}
        title="Tamil Nadu Electricity Board (TNEB / TANGEDCO)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#064728] via-[#0b6e3f] to-[#109b59]" />
        <svg viewBox="0 0 100 100" className="w-[88%] h-[88%] relative z-10" fill="none">
          {/* Gold Crest with Lightning Bolt */}
          <circle cx="50" cy="50" r="44" stroke="#f1c40f" strokeWidth="4" />
          <polygon points="56,16 34,50 48,50 42,84 68,44 52,44" fill="#f1c40f" stroke="#ffffff" strokeWidth="2" />
          <text 
            x="50" 
            y="94" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="12" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.5"
          >
            TNEB
          </text>
        </svg>
      </div>
    );
  }

  // 11. BESCOM (Bangalore Electricity)
  if (code === 'BESCOM' || code.includes('BESCOM')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#0284c7] flex items-center justify-center shadow-md shadow-sky-800/30 shrink-0 overflow-hidden ${className}`}
        title="Bangalore Electricity Supply (BESCOM)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0369a1] to-[#38bdf8]" />
        <svg viewBox="0 0 100 100" className="w-[88%] h-[88%] relative z-10" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#ffffff" strokeWidth="3" opacity="0.4"/>
          <polygon points="55,18 36,48 48,48 44,80 66,44 52,44" fill="#facc15" />
          <text 
            x="50" 
            y="93" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="11" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.8"
          >
            BESCOM
          </text>
        </svg>
      </div>
    );
  }

  // 12. MSEB / MSEDCL (Maharashtra State Electricity)
  if (code === 'MSEB' || code.includes('MSEB') || code.includes('MSEDCL')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#ea580c] flex items-center justify-center shadow-md shadow-orange-800/30 shrink-0 overflow-hidden ${className}`}
        title="Maharashtra State Electricity (MSEDCL)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#c2410c] to-[#f97316]" />
        <svg viewBox="0 0 100 100" className="w-[86%] h-[86%] relative z-10" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#ffffff" strokeWidth="3" opacity="0.4"/>
          <polygon points="54,20 38,48 48,48 44,78 64,44 52,44" fill="#ffffff" />
          <text 
            x="50" 
            y="92" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="12" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.5"
          >
            MSEDCL
          </text>
        </svg>
      </div>
    );
  }

  // 13. WBSEDCL (West Bengal State Electricity)
  if (code === 'WBSEDCL' || code.includes('WBSEDCL')) {
    return (
      <div 
        className={`relative ${dimensions} rounded-2xl bg-[#0d9488] flex items-center justify-center shadow-md shadow-teal-800/30 shrink-0 overflow-hidden ${className}`}
        title="West Bengal State Electricity (WBSEDCL)"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#115e59] to-[#14b8a6]" />
        <svg viewBox="0 0 100 100" className="w-[86%] h-[86%] relative z-10" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#ffffff" strokeWidth="3" opacity="0.4"/>
          <polygon points="54,20 38,48 48,48 44,78 64,44 52,44" fill="#facc15" />
          <text 
            x="50" 
            y="92" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontWeight="900" 
            fontSize="10" 
            fontFamily="Inter, Arial, sans-serif" 
            letterSpacing="0.2"
          >
            WBSEDCL
          </text>
        </svg>
      </div>
    );
  }

  // Fallback: Generic High-Tech Utility Badge
  return (
    <div 
      className={`relative ${dimensions} rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black font-mono shadow-md shrink-0 ${className}`}
    >
      <span>{code.slice(0, 3) || 'OP'}</span>
    </div>
  );
};
