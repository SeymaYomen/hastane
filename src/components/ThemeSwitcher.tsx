import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const themes = [
    { id: 'light', name: 'Açık', description: 'Gündüz modu' },
    { id: 'dark', name: 'Koyu', description: 'Akşam modu' },
    { id: 'high-contrast', name: 'Yüksek Kontrast', description: 'Erişilebilirlik' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId as any);
    setIsOpen(false);
  };

  const getCurrentThemeName = () => {
    return themes.find(t => t.id === theme)?.name || 'Açık';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center space-x-1 rounded-full px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isHighContrast ? 'border border-white bg-black text-white hover:bg-white hover:text-black' : isLight ? 'border border-[#0F172A]/12 bg-white/80 text-[#0F172A] hover:bg-white' : 'border border-white/15 bg-white/10 text-white hover:bg-white/20'}`}
        aria-label="Tema seçenekleri"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        title={`Mevcut tema: ${getCurrentThemeName()}`}
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline font-medium">{getCurrentThemeName()}</span>
      </button>
      
      {isOpen && (
        <div className={`absolute right-0 z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl py-1.5 shadow-lg backdrop-blur-md ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/92' : 'border border-white/15 bg-[#0D121B]/94'}`}>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`flex w-full items-start space-x-3 px-3 py-2.5 text-left transition-colors ${
                theme === t.id
                  ? isHighContrast
                    ? 'bg-white text-black'
                    : isLight
                      ? 'bg-[#F1F5F9]'
                      : 'bg-white/10'
                  : isHighContrast
                    ? 'hover:bg-white hover:text-black'
                    : isLight
                      ? 'hover:bg-[#F8FAFC]'
                      : 'hover:bg-white/10'
              }`}
              aria-pressed={theme === t.id}
            >
              <div className="flex-shrink-0 mt-1">
                {theme === t.id && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold">
                    ✓
                  </span>
                )}
                {theme !== t.id && (
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${isHighContrast ? 'border-white' : isLight ? 'border-[#94A3B8]' : 'border-slate-500'}`}></span>
                )}
              </div>
              <div className="flex-grow">
                <div className={`font-medium ${isHighContrast ? (theme === t.id ? 'text-black' : 'text-white') : isLight ? 'text-[#0F172A]' : 'text-gray-100'}`}>{t.name}</div>
                <div className={`text-xs ${isHighContrast ? (theme === t.id ? 'text-black/80' : 'text-gray-200') : isLight ? 'text-[#64748B]' : 'text-gray-400'}`}>{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;