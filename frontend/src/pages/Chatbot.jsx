import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { sendChatbotMessage } from '../services/api';
import { speakWithElevenLabs, startVoiceInput } from '../services/voiceService';

export default function Chatbot() {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem('chatbot_voice') === 'true'
  );
  const listRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const conversationHistory = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const handleSendMessage = async (rawMessage = inputMessage) => {
    const cleanMessage = String(rawMessage || '').trim();
    if (!cleanMessage) return;

    const userMessage = {
      role: 'user',
      content: cleanMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const nextConversationHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage.content },
      ];

      const response = await sendChatbotMessage({
        message: userMessage.content,
        conversationHistory: nextConversationHistory,
        language,
      });

      const botText = response.response_text
        || response.reply
        || response.message
        || response.response
        || t('chatbot.defaults.reply');

      const botMessage = {
        role: 'assistant',
        content: botText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);

      if (voiceEnabled) {
        speakWithElevenLabs(botText, language);
      }
    } catch (sendError) {
      toast.error(t('chatbot.messages.sendError'));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (rawMessage = inputMessage) => {
    await handleSendMessage(rawMessage);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognitionRef.current = startVoiceInput(
      language,
      (transcript) => {
        setIsListening(false);
        setInputMessage(transcript);
        // Auto send after voice input with small delay
        setTimeout(() => handleSend(transcript), 300);
      },
      (error) => {
        setIsListening(false);
        toast.error(error);
      }
    );

    if (!recognitionRef.current) {
      setIsListening(false);
    }
  };

  return (
    <div className="page-wrap chatbot-page">
      <style>
        {`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }`}
      </style>
      <h2>{t('chatbot.title')}</h2>

      <div className="chat-toolbar">
        <label>
          {t('common.language')}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {supportedLanguages.map((item) => (
              <option key={item.code} value={item.code}>{item.native}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const newVal = !voiceEnabled;
            setVoiceEnabled(newVal);
            localStorage.setItem('chatbot_voice', String(newVal));
          }}
          style={{
            padding: '0.35rem 0.8rem',
            borderRadius: '20px',
            border: 'none',
            background: voiceEnabled ? '#16a34a' : '#e5e7eb',
            color: voiceEnabled ? 'white' : '#666',
            fontSize: '0.78rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
        </button>
      </div>

      <div className="panel">
        <div className="chat-log modern" ref={listRef}>
          {messages.map((item, index) => (
            <div
              key={`${item.role}-${item.time}-${index}`}
              className={item.role === 'user' ? 'chat-row user' : 'chat-row bot'}
            >
              {item.role === 'assistant' ? <span className="chat-avatar">KM</span> : null}
              <div className="chat-bubble">
                <p>{item.content}</p>
                <time>{item.time}</time>
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="chat-row bot">
              <span className="chat-avatar">KM</span>
              <div className="chat-bubble typing">{t('chatbot.typing')}</div>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend(inputMessage);
          }}
          className="inline-form"
        >
          <input
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder={t('chatbot.placeholder')}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? 'Stop listening' : 'Speak your message'}
            style={{
              background: isListening ? '#dc2626' : 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.5rem 0.7rem',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
              animation: isListening ? 'pulse 1s infinite' : 'none',
            }}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
          <button type="submit" className="primary-btn">{t('common.send')}</button>
        </form>
      </div>
    </div>
  );
}
