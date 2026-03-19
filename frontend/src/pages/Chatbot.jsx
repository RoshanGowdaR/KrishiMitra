import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { sendChatbotMessage } from '../services/api';

export default function Chatbot() {
  const [language, setLanguage] = useState('en');
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

      const botText = response.reply || response.message || response.response || 'I am here to help you with farming queries.';
      const botMessage = {
        role: 'assistant',
        content: botText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (sendError) {
      toast.error('Unable to send message right now.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice capture failed. Please try again.');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  return (
    <div className="page-wrap chatbot-page">
      <h2>AI Chatbot</h2>

      <div className="chat-toolbar">
        <label>
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="kn">Kannada</option>
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
              <div className="chat-bubble typing">Typing...</div>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSend} className="inline-form">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about crops, soil, or markets"
          />
          <button type="button" className="ghost-btn" onClick={handleVoiceInput}>
            {isListening ? 'Listening...' : '🎤'}
          </button>
          <button type="submit" className="primary-btn">Send</button>
        </form>
      </div>
    </div>
  );
}
