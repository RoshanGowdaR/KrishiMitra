import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { sendChatbotMessage } from '../services/api';

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

  const speakResponse = (text, languageCode) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const localeMap = {
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
    };

    utterance.lang = localeMap[languageCode] || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) =>
      v.lang.startsWith(localeMap[languageCode]?.split('-')[0] || 'en')
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

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

      const botText = response.response_text || response.reply || response.message || response.response || t('chatbot.defaults.reply');
      const botMessage = {
        role: 'assistant',
        content: botText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
      speakResponse(botText, language);
    } catch (sendError) {
      toast.error(t('chatbot.messages.sendError'));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    await handleSendMessage(inputMessage);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser. Use Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition ||
      window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Map language code to speech recognition locale
    const localeMap = {
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
    };

    recognition.lang = localeMap[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
      // Auto send after voice input
      setTimeout(() => {
        handleSendMessage(transcript);
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone in browser settings.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            border: 'none',
            background: voiceEnabled ? '#16a34a' : '#e5e7eb',
            color: voiceEnabled ? 'white' : '#666',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onClick={() => {
            const newVal = !voiceEnabled;
            setVoiceEnabled(newVal);
            localStorage.setItem('chatbot_voice', newVal);
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

        <form onSubmit={handleSend} className="inline-form">
          <input
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder={t('chatbot.placeholder')}
          />
          <button
            type="button"
            onClick={startVoiceInput}
            style={{
              background: isListening ? '#dc2626' : 'transparent',
              border: isListening ? 'none' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              fontSize: '1.2rem',
              animation: isListening ? 'pulse 1s infinite' : 'none',
            }}
            title={isListening ? 'Listening...' : 'Click to speak'}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
          <button type="submit" className="primary-btn">{t('common.send')}</button>
        </form>
      </div>
    </div>
  );
}
