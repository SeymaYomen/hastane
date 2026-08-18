import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        className="p-2 rounded-lg hover:bg-gray-100/10 transition-colors duration-200 flex items-center space-x-1"
        aria-label="Tema seçenekleri"
        onClick={() => setIsOpen(!isOpen)}
        title={`Mevcut tema: ${getCurrentThemeName()}`}
      >
        <Palette className="h-5 w-5 text-white" />
        <span className="hidden sm:inline text-sm text-white font-medium">{getCurrentThemeName()}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2 z-50 border border-gray-200 dark:border-slate-700">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`w-full px-4 py-3 text-left flex items-start space-x-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                theme === t.id ? 'bg-blue-50 dark:bg-slate-600' : ''
              }`}
              aria-pressed={theme === t.id}
            >
              <div className="flex-shrink-0 mt-1">
                {theme === t.id && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-500 text-white text-xs font-bold">
                    ✓
                  </span>
                )}
                {theme !== t.id && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border-2 border-gray-300 dark:border-slate-500"></span>
                )}
              </div>
              <div className="flex-grow">
                <div className="text-gray-900 dark:text-gray-100 font-medium">{t.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;