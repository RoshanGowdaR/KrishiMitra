import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { RiPushpin2Line } from 'react-icons/ri';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sendChatbotMessage } from '../services/api';
import { speakText, startVoiceInput, detectTextLanguage } from '../services/voiceService';
import { formatDateTimeIST, formatTimeIST } from '../utils/istTime';

const LANG_NAMES = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  bn: 'বাংলা',
  pa: 'ਪੰਜਾਬੀ',
  ml: 'മലയാളം',
};

const CHAT_STORAGE_PREFIX = 'krishimitra_chat_threads_v1';
const CHAT_HISTORY_PIN_PREFIX = 'krishimitra_chat_history_pinned_v1';

const makeThreadId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createThread = () => {
  const now = new Date().toISOString();
  return {
    id: makeThreadId(),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

const formatChatTitle = (content = '') => {
  const text = String(content || '').trim();
  if (!text) return 'New chat';
  return text.length > 44 ? `${text.slice(0, 44)}...` : text;
};

const formatThreadTime = (iso) => {
  if (!iso) return '';
  return formatDateTimeIST(iso, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Chatbot() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [inputMessage, setInputMessage] = useState('');
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingLang, setSpeakingLang] = useState('English');
  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem('chatbot_voice') === 'true'
  );
  const [isHistoryDesktop, setHistoryDesktop] = useState(() => window.innerWidth > 980);
  const [isHistoryHovered, setHistoryHovered] = useState(false);
  const [isHistoryClickedOpen, setHistoryClickedOpen] = useState(false);
  const [isHistoryPinned, setHistoryPinned] = useState(() => {
    const pinKey = `${CHAT_HISTORY_PIN_PREFIX}_${user?.id || 'guest'}`;
    return localStorage.getItem(pinKey) === 'true';
  });
  const listRef = useRef(null);
  const recognitionRef = useRef(null);

  const storageKey = useMemo(
    () => `${CHAT_STORAGE_PREFIX}_${user?.id || 'guest'}`,
    [user?.id]
  );

  const pinStorageKey = useMemo(
    () => `${CHAT_HISTORY_PIN_PREFIX}_${user?.id || 'guest'}`,
    [user?.id]
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const messages = activeThread?.messages || [];
  const isHistoryExpanded = isHistoryDesktop
    ? (isHistoryPinned || isHistoryHovered || isHistoryClickedOpen)
    : true;

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth > 980;
      setHistoryDesktop(desktop);
      if (!desktop) {
        setHistoryHovered(false);
        setHistoryClickedOpen(false);
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setHistoryPinned(localStorage.getItem(pinStorageKey) === 'true');
  }, [pinStorageKey]);

  useEffect(() => {
    const savedRaw = localStorage.getItem(storageKey);

    if (!savedRaw) {
      const freshThread = createThread();
      setThreads([freshThread]);
      setActiveThreadId(freshThread.id);
      return;
    }

    try {
      const saved = JSON.parse(savedRaw);
      const savedThreads = Array.isArray(saved?.threads) ? saved.threads : [];

      if (!savedThreads.length) {
        const freshThread = createThread();
        setThreads([freshThread]);
        setActiveThreadId(freshThread.id);
        return;
      }

      const normalized = savedThreads
        .filter((thread) => thread?.id)
        .map((thread) => ({
          id: thread.id,
          title: thread.title || 'New chat',
          createdAt: thread.createdAt || new Date().toISOString(),
          updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
          messages: Array.isArray(thread.messages) ? thread.messages : [],
        }))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const preferredActive = saved?.activeThreadId;
      const activeExists = normalized.some((thread) => thread.id === preferredActive);

      setThreads(normalized);
      setActiveThreadId(activeExists ? preferredActive : normalized[0].id);
    } catch {
      const freshThread = createThread();
      setThreads([freshThread]);
      setActiveThreadId(freshThread.id);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!threads.length) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeThreadId,
        threads,
      })
    );
  }, [threads, activeThreadId, storageKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, activeThreadId]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const conversationHistory = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const addMessageToThread = (threadId, message) => {
    setThreads((prev) => {
      const next = prev
        .map((thread) => {
          if (thread.id !== threadId) return thread;

          const isFirstUserMessage =
            message.role === 'user' && !thread.messages.some((item) => item.role === 'user');

          return {
            ...thread,
            title: isFirstUserMessage ? formatChatTitle(message.content) : thread.title,
            updatedAt: new Date().toISOString(),
            messages: [...thread.messages, message],
          };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return next;
    });
  };

  const handleNewChat = () => {
    const next = createThread();
    setThreads((prev) => [next, ...prev]);
    setActiveThreadId(next.id);
    setInputMessage('');
    setIsTyping(false);
  };

  const toggleHistoryPin = () => {
    setHistoryPinned((prev) => {
      const next = !prev;
      localStorage.setItem(pinStorageKey, String(next));
      if (next) {
        setHistoryClickedOpen(false);
      }
      return next;
    });
  };

  const toggleHistoryPanel = () => {
    if (!isHistoryDesktop) return;
    if (isHistoryPinned) {
      toggleHistoryPin();
      return;
    }
    setHistoryClickedOpen((prev) => !prev);
  };

  const handleSendMessage = async (rawMessage = inputMessage) => {
    const cleanMessage = String(rawMessage || '').trim();
    if (!cleanMessage) return;

    let threadId = activeThreadId;

    if (!threadId) {
      const next = createThread();
      threadId = next.id;
      setThreads((prev) => [next, ...prev]);
      setActiveThreadId(next.id);
    }

    const userMessage = {
      role: 'user',
      content: cleanMessage,
      time: formatTimeIST(new Date().toISOString(), { hour: '2-digit', minute: '2-digit' }),
    };

    addMessageToThread(threadId, userMessage);
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
        time: formatTimeIST(new Date().toISOString(), { hour: '2-digit', minute: '2-digit' }),
      };

      addMessageToThread(threadId, botMessage);

      const detected = detectTextLanguage(botText);
      setSpeakingLang(LANG_NAMES[detected] || 'English');

      if (voiceEnabled) {
        speakText(botText, language);
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
        {voiceEnabled && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#16a34a',
              marginLeft: '0.5rem',
            }}
          >
            🔊 Speaking in: {speakingLang}
          </span>
        )}
      </div>

      <div className={isHistoryExpanded ? 'panel chatbot-shell history-expanded' : 'panel chatbot-shell history-collapsed'}>
        <aside
          className={isHistoryExpanded ? 'chat-thread-panel expanded' : 'chat-thread-panel collapsed'}
          onMouseEnter={() => {
            if (isHistoryDesktop && !isHistoryPinned) {
              setHistoryHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (isHistoryDesktop && !isHistoryPinned) {
              setHistoryHovered(false);
            }
          }}
        >
          <div className="chat-thread-controls">
            <button
              type="button"
              className="chat-history-toggle"
              onClick={toggleHistoryPanel}
              title={isHistoryExpanded ? 'Collapse chat history' : 'Open chat history'}
              aria-label={isHistoryExpanded ? 'Collapse chat history' : 'Open chat history'}
            >
              ☰
            </button>
            {isHistoryDesktop ? (
              <button
                type="button"
                className={isHistoryPinned ? 'chat-history-pin pinned' : 'chat-history-pin'}
                onClick={toggleHistoryPin}
                title={isHistoryPinned ? 'Unpin chat history' : 'Pin chat history'}
                aria-label={isHistoryPinned ? 'Unpin chat history' : 'Pin chat history'}
              >
                <RiPushpin2Line />
              </button>
            ) : null}
          </div>

          <button type="button" className="primary-btn chat-new-btn" onClick={handleNewChat}>
            + New Chat
          </button>

          <div className="chat-thread-list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={`chat-thread-item ${thread.id === activeThreadId ? 'active' : ''}`}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  if (isHistoryDesktop && !isHistoryExpanded) {
                    setHistoryClickedOpen(true);
                  }
                }}
              >
                <strong>{thread.title}</strong>
                <span>{thread.messages.length} messages</span>
                <time>{formatThreadTime(thread.updatedAt)}</time>
              </button>
            ))}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-log modern" ref={listRef}>
            {messages.length === 0 ? (
              <p className="page-muted">Start this chat by sending a message.</p>
            ) : null}

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
    </div>
  );
}
