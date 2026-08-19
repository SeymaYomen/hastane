import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import ChatbotDialog from './ChatbotDialog';
import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from 'motion/react';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Simulate an automated initial message after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setHasNewMessage(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (hasNewMessage) {
      setHasNewMessage(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleChatbot}
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 ${isHighContrast ? 'border-2 border-white bg-black shadow-none focus-visible:ring-offset-black' : isLight ? 'border border-[#0F172A]/10 bg-gradient-to-br from-[#2DD4BF] via-[#22D3EE] to-[#3B82F6] shadow-[0_10px_30px_rgba(34,211,238,0.30)] focus-visible:ring-offset-white' : 'border border-cyan-200/20 bg-gradient-to-br from-[#2DD4BF] via-[#22D3EE] to-[#3B82F6] shadow-[0_12px_36px_rgba(34,211,238,0.35)] focus-visible:ring-offset-[#070A0F]'} ${prefersReducedMotion ? '' : 'chatbot-breathe'} ${hasNewMessage ? 'ring-2 ring-cyan-200/70' : ''}`}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        {isOpen ? <X size={22} /> : <MessageSquarePlus size={22} />}
        {hasNewMessage && (
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-cyan-300"></span>
        )}
      </button>

      {isOpen && <ChatbotDialog onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default ChatbotButton;