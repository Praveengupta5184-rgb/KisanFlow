import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { farmerApi } from '../../services/api';
import { useFarmer } from '../../context/FarmerContext';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "नमस्कार! मैं किसान-फ्लो AI सहायक हूँ। मैं टोकन, मंडी भाव, और कतार के बारे में आपकी कैसे मदद कर सकता हूँ?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { activeToken } = useFarmer();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await farmerApi.chatWithAi(userMessage, 'hi');
      setMessages(prev => [...prev, { text: response.reply || 'Sorry, I am unable to respond right now.', sender: 'bot' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { text: 'Connection Error. Please try again later.', sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#2e7d32',
            color: '#fff',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.4)',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          <MessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '320px',
          height: '450px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={24} />
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>KisanFlow AI</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Chat Body */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                {msg.sender === 'bot' && (
                  <div style={{ background: '#e2e8f0', color: '#0f172a', padding: '6px', borderRadius: '50%' }}>
                    <Bot size={16} />
                  </div>
                )}
                <div style={{
                  background: msg.sender === 'user' ? '#2e7d32' : '#fff',
                  color: msg.sender === 'user' ? '#fff' : '#1e293b',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                <div style={{ background: '#e2e8f0', padding: '6px', borderRadius: '50%' }}><Bot size={16} /></div>
                <Loader2 size={16} className="animate-spin" />
                <span style={{ fontSize: '0.8rem' }}>AI is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={{
            padding: '12px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '24px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                background: input.trim() && !isLoading ? '#2e7d32' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
              }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
