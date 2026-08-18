import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Modern Tema Sistemi - 3 Mode
 * - light: Açık tema, gündüz kullanımı
 * - dark: Koyu tema, akşam kullanımı
 * - high-contrast: Erişilebilirlik, yüksek kontrast
 */
type Theme = 'light' | 'dark' | 'high-contrast';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return (savedTheme as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    // data-theme attribute'u CSS'de [data-theme="light"] selektörü için
    document.documentElement.setAttribute('data-theme', theme);
    // Sistem preferansını override et
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};