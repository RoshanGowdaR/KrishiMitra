import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const quickActionMeta = [
  {
    icon: '🔬',
    path: '/app/crop-disease',
  },
  {
    icon: '🤖',
    path: '/app/chatbot',
  },
  {
    icon: '📈',
    path: '/app/market',
  },
  {
    icon: '🌤️',
    path: '/app/weather',
  },
  {
    icon: '🆘',
    path: '/app/sos',
  },
  {
    icon: '🛒',
    path: '/app/marketplace',
  },
];

const playGreeting = (language, userName) => {
  const greetings = {
    en: `Welcome to KrishiMitra${userName ? `, ${userName}` : ''}! Your smart farming assistant is ready.`,
    hi: `कृषिमित्र में आपका स्वागत है${userName ? `, ${userName}` : ''}! आपका कृषि सहायक तैयार है।`,
    kn: `ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ${userName ? `, ${userName}` : ''}! ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ.`,
    ta: 'கிரிஷிமித்ராவிற்கு வரவேற்கிறோம்! உங்கள் விவசாய உதவியாளர் தயாராக இருக்கிறார்.',
    te: 'కృషిమిత్రకు స్వాగతం! మీ వ్యవసాయ సహాయకుడు సిద్ధంగా ఉన్నారు.',
    mr: 'कृषिमित्रमध्ये स्वागत आहे! तुमचा शेती सहाय्यक तयार आहे.',
  };

  const text = greetings[language] || greetings.en;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const localeMap = {
    en: 'en-IN',
    hi: 'hi-IN',
    kn: 'kn-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    mr: 'mr-IN',
  };
  utterance.lang = localeMap[language] || 'en-IN';
  utterance.rate = 0.85;
  utterance.volume = 1.0;

  // Small delay to ensure page is loaded
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 1500);
};

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const greetedRef = useRef(false);

  useEffect(() => {
    if (user && !greetedRef.current) {
      greetedRef.current = true;
      const hasGreeted = sessionStorage.getItem('greeted');
      if (!hasGreeted) {
        sessionStorage.setItem('greeted', 'true');
        const language = localStorage.getItem(
          'krishimitra_language'
        ) || 'en';
        const userName = user.user_metadata?.full_name?.split(' ')[0] || '';
        playGreeting(language, userName);
      }
    }
  }, [user]);

  const normalizeDegree = (value) => String(value || '').replace(/°/g, '\u00B0').replace(/�C/g, '\u00B0C');
  const normalizeRupee = (value) => String(value || '').replace(/₹/g, '\u20B9').replace(/\?/g, '\u20B9');
  const weatherValue = normalizeDegree(t('home.stats.weather.value'));
  const priceValue = normalizeRupee(t('home.stats.price.value'));
  const priceSubtext = normalizeRupee(t('home.stats.price.subtext'));
  const dashboardStats = [
    { icon: '🌤️', title: t('home.stats.weather.title'), value: weatherValue, subtext: t('home.stats.weather.subtext') },
    { icon: '📈', title: t('home.stats.price.title'), value: priceValue, subtext: priceSubtext },
    { icon: '🏛️', title: t('home.stats.schemes.title'), value: t('home.stats.schemes.value'), subtext: t('home.stats.schemes.subtext') },
    { icon: '🆘', title: t('home.stats.expert.title'), value: t('home.stats.expert.value'), subtext: t('home.stats.expert.subtext') },
  ];
  const quickActions = quickActionMeta.map((action, index) => ({
    ...action,
    title: t(`home.quickActions.${index}.title`),
    description: t(`home.quickActions.${index}.description`),
  }));
  const recentUpdates = [
    { text: t('home.updates.0.text'), time: t('home.updates.0.time') },
    { text: t('home.updates.1.text'), time: t('home.updates.1.time') },
    { text: t('home.updates.2.text'), time: t('home.updates.2.time') },
  ];

  return (
    <div className="dashboard-home">
      <section className="dashboard-home-header">
        <h2>{t('home.greeting')}</h2>
        <p>{t('home.subtitle')}</p>
      </section>

      <section className="dashboard-stat-grid">
        {dashboardStats.map((card) => (
          <article key={card.title} className="dashboard-stat-card">
            <p className="dashboard-stat-title">{card.icon} {card.title}</p>
            <h3>{card.value}</h3>
            <span>{card.subtext}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-quick-actions">
        <h3>{t('home.quickActionsTitle')}</h3>
        <div className="dashboard-actions-grid">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              className="dashboard-action-card"
              onClick={() => navigate(action.path)}
            >
              <span className="dashboard-action-icon">{action.icon}</span>
              <strong>{action.title}</strong>
              <p>{action.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-updates">
        <h3>{t('home.recentUpdatesTitle')}</h3>
        <div className="dashboard-update-list">
          {recentUpdates.map((item) => (
            <article key={item.text} className="dashboard-update-item">
              <span className="dashboard-update-dot" aria-hidden="true" />
              <div>
                <p>{item.text}</p>
                <time>{item.time}</time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
