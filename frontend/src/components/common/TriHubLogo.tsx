import React from 'react';

interface TriHubPayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
}

export const TriHubPayLogo: React.FC<TriHubPayLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  subtitleText = 'Pay',
  className = ''
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  }[size];

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl'
  }[size];

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official TriHubPay Logo Image with Subtle Gradient Glow */}
      <div className={`relative ${iconDimensions} shrink-0 flex items-center justify-center`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 to-emerald-500/30 rounded-2xl blur-md" />
        <img
          src="/logo.png?v=2"
          alt="TriHubPay"
          className="relative w-full h-full object-contain rounded-xl drop-shadow-md"
        />
      </div>

      {/* Typography: Royal Blue & Emerald Green */}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-none flex items-center ${titleSizes}`}>
          <span className="text-blue-600 font-extrabold tracking-tight">TriHub</span>
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent font-black">Pay</span>
          {showSubtitle && subtitleText !== 'Pay' && (
            <span className="ml-1 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">
              {subtitleText}
            </span>
          )}
        </div>
        <div className={`text-slate-400 font-medium tracking-wide mt-0.5 flex items-center gap-1 ${subtitleSizes}`}>
          <span>TriHubPay</span>
          <span className="inline-block w-1 h-1 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-semibold">Official</span>
        </div>
      </div>
    </div>
  );
};

// Backward-compat alias
export const TriHubLogo = TriHubPayLogo;
