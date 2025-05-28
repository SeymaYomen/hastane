import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const DarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="relative p-2 rounded-lg hover:bg-gray-100/10 transition-colors duration-200 group"
      aria-label={isDarkMode ? 'Açık moda geç' : 'Koyu moda geç'}
      title={`${isDarkMode ? 'Açık' : 'Koyu'} mod (18:00-06:00 arası otomatik koyu mod)`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`absolute inset-0 h-5 w-5 text-white transition-all duration-500 transform ${
            isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <Moon
          className={`absolute inset-0 h-5 w-5 text-white transition-all duration-500 transform ${
            isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
      </div>
    </button>
  );
};

export default DarkModeToggle;