import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import ChatbotDialog from './ChatbotDialog';
import { useTheme } from '../../contexts/ThemeContext';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { theme } = useTheme();

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
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
          hasNewMessage 
            ? 'bg-theme-primary animate-pulse-theme' 
            : 'bg-theme-primary hover:bg-theme-primary-hover'
        } text-white`}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        {isOpen ? <X size={24} /> : <MessageSquarePlus size={24} />}
        {hasNewMessage && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && <ChatbotDialog onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default ChatbotButton;