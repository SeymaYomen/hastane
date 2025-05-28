import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = [
    { id: 'blue', name: 'Mavi', color: 'bg-blue-500' },
    { id: 'green', name: 'Yeşil', color: 'bg-green-500' },
    { id: 'pink', name: 'Pembe', color: 'bg-pink-500' },
    { id: 'purple', name: 'Mor', color: 'bg-purple-500' },
    { id: 'gray', name: 'Gri', color: 'bg-gray-500' },
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-2 rounded-lg hover:bg-gray-100/10 transition-colors duration-200"
        aria-label="Tema seçenekleri"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette className="h-5 w-5 text-white" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`w-full px-4 py-2 text-left flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                theme === t.id ? 'font-medium' : ''
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${t.color}`}></span>
              <span className="text-gray-700 dark:text-gray-200">{t.name}</span>
              {theme === t.id && (
                <span className="ml-auto text-green-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;