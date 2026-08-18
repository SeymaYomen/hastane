import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { clinicConfig } from '../../config/clinicConfig';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

interface ChatbotDialogProps {
  onClose: () => void;
}

const getInitialMessages = (): Message[] => [
  {
    id: 1,
    text: `Merhaba! Ben ${clinicConfig.chatbotName}. Size nasıl yardımcı olabilirim?`,
    sender: 'bot',
    timestamp: new Date(),
  },
  {
    id: 2,
    text: 'Lütfen şikayetlerinizi anlatın, size uygun bölümü önerebilirim.',
    sender: 'bot',
    timestamp: new Date(),
  },
];

const symptomsToDepartments = {
  // Kardiyoloji
  'göğüs ağrısı': 'Kardiyoloji',
  'çarpıntı': 'Kardiyoloji',
  'nefes darlığı': 'Kardiyoloji',
  'kalp': 'Kardiyoloji',
  'tansiyon': 'Kardiyoloji',

  // Nöroloji
  'baş ağrısı': 'Nöroloji',
  'migren': 'Nöroloji',
  'baş dönmesi': 'Nöroloji',
  'epilepsi': 'Nöroloji',
  'sara': 'Nöroloji',
  'felç': 'Nöroloji',
  'unutkanlık': 'Nöroloji',

  // Ortopedi
  'eklem ağrısı': 'Ortopedi',
  'kırık': 'Ortopedi',
  'bel ağrısı': 'Ortopedi',
  'boyun ağrısı': 'Ortopedi',
  'diz ağrısı': 'Ortopedi',
  'kemik': 'Ortopedi',

  // Göz Hastalıkları
  'göz': 'Göz Hastalıkları',
  'görme': 'Göz Hastalıkları',
  'katarakt': 'Göz Hastalıkları',
  'gözlük': 'Göz Hastalıkları',

  // Kulak Burun Boğaz
  'boğaz': 'Kulak Burun Boğaz',
  'kulak': 'Kulak Burun Boğaz',
  'burun': 'Kulak Burun Boğaz',
  'işitme': 'Kulak Burun Boğaz',
  'geniz': 'Kulak Burun Boğaz',
  'horlama': 'Kulak Burun Boğaz',

  // Dahiliye
  'ateş': 'Dahiliye',
  'grip': 'Dahiliye',
  'öksürük': 'Dahiliye',
  'halsizlik': 'Dahiliye',
  'kilo': 'Dahiliye',
  'diyabet': 'Dahiliye',
  'şeker': 'Dahiliye',

  // Cildiye
  'cilt': 'Cildiye',
  'deri': 'Cildiye',
  'döküntü': 'Cildiye',
  'kaşıntı': 'Cildiye',
  'sivilce': 'Cildiye',
  'egzama': 'Cildiye',

  // Genel Cerrahi
  'karın ağrısı': 'Genel Cerrahi',
  'apandisit': 'Genel Cerrahi',
  'fıtık': 'Genel Cerrahi',
  'safra': 'Genel Cerrahi',
  'mide': 'Genel Cerrahi',
};

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages());
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastSuggestedDepartment, setLastSuggestedDepartment] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const analyzeSymptomsAndSuggestDepartment = (text: string) => {
    const lowerText = text.toLowerCase();
    let foundDepartments = new Set<string>();

    Object.entries(symptomsToDepartments).forEach(([symptom, department]) => {
      if (lowerText.includes(symptom)) {
        foundDepartments.add(department);
      }
    });

    if (foundDepartments.size === 0) {
      return {
        message: 'Üzgünüm, şikayetlerinizi tam olarak anlayamadım. Lütfen semptomlarınızı daha detaylı anlatır mısınız? Örneğin: baş ağrısı, mide bulantısı, göğüs ağrısı gibi.',
        department: null
      };
    }

    const departments = Array.from(foundDepartments);
    if (departments.length === 1) {
      return {
        message: `Belirttiğiniz şikayetlere göre ${departments[0]} bölümümüze başvurmanızı öneriyorum. Size hemen bir randevu oluşturmamı ister misiniz? (Evet/Hayır)`,
        department: departments[0]
      };
    } else {
      return {
        message: `Belirttiğiniz şikayetlere göre şu bölümlerimizden birine başvurabilirsiniz: ${departments.join(', ')}. Hangi bölümden randevu almak istersiniz?`,
        department: null
      };
    }
  };

  const handleConfirmation = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lastSuggestedDepartment) {
      if (lowerText.includes('evet') || lowerText.includes('tamam') || lowerText.includes('olur')) {
        return {
          message: 'Sizi randevu sayfasına yönlendiriyorum...',
          shouldRedirect: true
        };
      } else if (lowerText.includes('hayır') || lowerText.includes('hayir') || lowerText.includes('istemiyorum')) {
        setAwaitingConfirmation(false);
        setLastSuggestedDepartment(null);
        return {
          message: 'Anladım. Başka nasıl yardımcı olabilirim?',
          shouldRedirect: false
        };
      }
    }

    const mentionedDepartment = Object.values(symptomsToDepartments).find(dept => 
      lowerText.includes(dept.toLowerCase())
    );

    if (mentionedDepartment) {
      setLastSuggestedDepartment(mentionedDepartment);
      setAwaitingConfirmation(true);
      return {
        message: `${mentionedDepartment} bölümünden randevu almak istediğinizi onaylıyor musunuz? (Evet/Hayır)`,
        shouldRedirect: false
      };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    setTimeout(() => {
      let response;
      let shouldRedirect = false;

      if (awaitingConfirmation) {
        const confirmationResponse = handleConfirmation(inputValue);
        if (confirmationResponse) {
          response = confirmationResponse.message;
          shouldRedirect = confirmationResponse.shouldRedirect;
        }
      }

      if (!response) {
        const analysisResult = analyzeSymptomsAndSuggestDepartment(inputValue);
        response = analysisResult.message;
        if (analysisResult.department) {
          setLastSuggestedDepartment(analysisResult.department);
          setAwaitingConfirmation(true);
        }
      }

      const botMessage: Message = {
        id: messages.length + 2,
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      if (shouldRedirect) {
        setTimeout(() => {
          localStorage.setItem('selectedDepartment', lastSuggestedDepartment || '');
          navigate('/appointment');
        }, 1000);
      }
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.3 }}
      className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 h-[500px] bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col"
    >
      {/* Header */}
      <div className="bg-theme-primary text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center">
          <Bot size={20} className="mr-2" />
          <span className="font-semibold">ElazığSağlık Asistanı</span>
        </div>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
          aria-label="Close chatbot"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.sender === 'user' 
                  ? 'bg-theme-primary text-white rounded-tr-none' 
                  : 'bg-gray-200 text-gray-800 rounded-tl-none'
              }`}
            >
              <p>{message.text}</p>
              <span 
                className={`text-xs mt-1 block ${
                  message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-tl-none max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Yanıt yazılıyor...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className={`p-2 rounded-lg ${
              !inputValue.trim() || isTyping
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-theme-primary text-white hover:bg-theme-primary-hover'
            }`}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ChatbotDialog;