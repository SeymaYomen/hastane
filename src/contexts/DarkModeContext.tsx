import React, { createContext, useContext, useState, useEffect } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const currentHour = new Date().getHours();
    return currentHour >= 18 || currentHour < 6;
  });

  useEffect(() => {
    const checkTime = () => {
      const currentHour = new Date().getHours();
      setIsDarkMode(currentHour >= 18 || currentHour < 6);
    };

    // Check time every minute
    const interval = setInterval(checkTime, 60000);
    
    // Initial check
    checkTime();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <DarkModeContext.Provider value={{ isDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};