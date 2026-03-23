import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { sendChatbotMessage } from '../services/api';

export default function Chatbot() {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const conversationHistory = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const handleSend = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      role: 'user',
      content: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
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

      const botText = response.response_text || response.reply || response.message || response.response || t('chatbot.defaults.reply');
      const botMessage = {
        role: 'assistant',
        content: botText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (sendError) {
      toast.error(t('chatbot.messages.sendError'));
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    const speechLocaleMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      kn: 'kn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      bn: 'bn-IN',
      pa: 'pa-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      as: 'as-IN',
    };
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(t('chatbot.messages.voiceUnsupported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLocaleMap[language] || 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t('chatbot.messages.voiceFailed'));
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  return (
    <div className="page-wrap chatbot-page">
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

        <form onSubmit={handleSend} className="inline-form">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('chatbot.placeholder')}
          />
          <button type="button" className="ghost-btn" onClick={handleVoiceInput}>
            {isListening ? t('chatbot.listening') : '🎤'}
          </button>
          <button type="submit" className="primary-btn">{t('common.send')}</button>
        </form>
      </div>
    </div>
  );
}
