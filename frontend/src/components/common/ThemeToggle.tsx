import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      className={`relative p-2 rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
        theme === 'light'
          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
          : 'bg-slate-800 hover:bg-slate-750 text-amber-300 border-slate-700'
      } ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200" />
      ) : (
        <Sun className="w-4 h-4 text-amber-300 transition-transform duration-200" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {theme === 'light' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};
