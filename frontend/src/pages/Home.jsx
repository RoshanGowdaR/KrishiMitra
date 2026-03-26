import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { playGreeting } from '../services/voiceService';
import { getDailyBriefing } from '../services/api';
import { supabase } from '../lib/supabase';

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

const fallbackBriefing = {
  quote: 'Plant with patience, nurture with discipline, and every season becomes a chance to grow stronger.',
  news: [
    {
      title: 'Precision irrigation rising',
      summary: 'Farmers are increasingly adopting sensor-led watering to reduce waste and protect crop yield.',
      why_it_matters: 'This can reduce water cost and keep crops safer during uneven rainfall weeks.',
      details: 'Sensor-based irrigation helps farmers apply water only when the crop actually needs it, instead of fixed-time watering. This reduces overwatering risk, saves pumping energy, and protects root-zone oxygen. Over a full season, better water timing can improve nutrient uptake, lower disease pressure in wet fields, and keep crop growth more uniform during heat and dry spells.',
    },
    {
      title: 'Soil health gets focus',
      summary: 'More regions are promoting soil testing and micronutrient balancing before sowing cycles.',
      why_it_matters: 'Balanced nutrients improve plant strength and reduce avoidable fertilizer expense.',
      details: 'Soil testing before sowing helps identify specific nutrient gaps, pH issues, and organic matter status for each plot. With this, farmers can apply targeted inputs instead of broad fertilizer doses. Better nutrient precision supports stronger early growth, improves root development, and reduces unnecessary input spending. It also helps maintain soil productivity across seasons instead of chasing short-term yield only.',
    },
    {
      title: 'Digital mandi tracking grows',
      summary: 'Real-time market monitoring is helping farmers pick better selling windows.',
      why_it_matters: 'Better timing at sale can improve price realization for the same produce.',
      details: 'Regular mandi tracking gives farmers visibility on demand shifts, price momentum, and nearby market opportunities before selling. This allows planning harvest dispatch and storage timing more smartly, instead of immediate distress sale. Even a short delay based on trend confirmation can improve realized rates. Over time, these small timing decisions can significantly improve income from the same crop output.',
    },
  ],
};

const truncateNewsText = (text, limit = 180) => {
  const normalized = String(text || '').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
};

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const greetedRef = useRef(false);
  const [dailyBriefing, setDailyBriefing] = useState(fallbackBriefing);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [selectedNewsItem, setSelectedNewsItem] = useState(null);
  const [accountWarning, setAccountWarning] = useState('');

  useEffect(() => {
    if (user && !greetedRef.current) {
      greetedRef.current = true;
      const language = localStorage.getItem('krishimitra_language') || 'en';
      const userName = user.user_metadata?.full_name?.split(' ')[0]
        || user.email?.split('@')[0]
        || '';
      playGreeting(language, userName);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadDailyBriefing = async () => {
      try {
        setBriefingLoading(true);
        const payload = await getDailyBriefing(language);
        if (!active) return;

        setDailyBriefing({
          quote: payload?.quote || 'Today is another chance to improve your farm one smart decision at a time.',
          news: Array.isArray(payload?.news) && payload.news.length > 0
            ? payload.news.slice(0, 3).map((item) => ({
              title: item?.title || 'Farming Update',
              summary: item?.summary || 'Daily farming trend update.',
              why_it_matters: item?.why_it_matters || 'Useful for improving on-field decision making.',
              details: item?.details || 'Open this card for more practical context and impact for your farm decisions.',
            }))
            : fallbackBriefing.news,
        });
      } catch {
        // Keep graceful fallback content if API fails.
      } finally {
        if (active) setBriefingLoading(false);
      }
    };

    loadDailyBriefing();
    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    let active = true;

    const loadAccountWarning = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('notifications')
        .select('id, message, type, created_at')
        .eq('user_id', user.id)
        .eq('type', 'warning')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!active) return;
      setAccountWarning(data?.[0]?.message || '');
    };

    loadAccountWarning();
    return () => {
      active = false;
    };
  }, [user?.id]);

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
  const userName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Farmer';

  return (
    <div className="dashboard-home">
      {accountWarning ? (
        <section
          className="panel"
          style={{
            background: '#fef9c3',
            border: '1px solid #facc15',
            color: '#b91c1c',
            marginBottom: '0.8rem',
          }}
        >
          <strong>Admin Warning:</strong> {accountWarning}
        </section>
      ) : null}

      <section className="dashboard-home-header">
        <div className="dashboard-home-header-content">
          <h2>Hello {userName}</h2>
          <p className="dashboard-daily-quote">"{dailyBriefing.quote}"</p>
        </div>
      </section>

      <section className="dashboard-daily-news" aria-live="polite">
        <div className="dashboard-daily-news-head">
          <h3>Top 3 Trending Farming News</h3>
          <span>{briefingLoading ? 'Updating...' : 'Updated today'}</span>
        </div>
        <div className="dashboard-daily-news-grid">
          {dailyBriefing.news.slice(0, 3).map((item, index) => (
            <button
              key={item.title}
              type="button"
              className="dashboard-news-item"
              onClick={() => setSelectedNewsItem(item)}
            >
              <span className="dashboard-news-rank">0{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                <small>{item.why_it_matters}</small>
                <p className="dashboard-news-preview">{truncateNewsText(item.details)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedNewsItem ? (
        <div className="dashboard-news-modal-backdrop" role="presentation" onClick={() => setSelectedNewsItem(null)}>
          <section
            className="dashboard-news-modal"
            role="dialog"
            aria-modal="true"
            aria-label="News details"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dashboard-news-modal-close"
              onClick={() => setSelectedNewsItem(null)}
              aria-label="Close news details"
            >
              x
            </button>
            <h3>{selectedNewsItem.title}</h3>
            <p className="dashboard-news-modal-summary">{selectedNewsItem.summary}</p>
            <div className="dashboard-news-modal-chip">
              Why this matters: {selectedNewsItem.why_it_matters}
            </div>
            <p className="dashboard-news-modal-details">{selectedNewsItem.details}</p>
          </section>
        </div>
      ) : null}

      <section className="dashboard-stat-grid">
        {dashboardStats.map((card, index) => (
          <article key={card.title} className={`dashboard-stat-card stat-accent-${index + 1}`}>
            <p className="dashboard-stat-title"><span className="dashboard-stat-icon" aria-hidden="true">{card.icon}</span>{card.title}</p>
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
              <span className="dashboard-action-icon" aria-hidden="true">{action.icon}</span>
              <div className="dashboard-action-copy">
                <strong>{action.title}</strong>
                <p>{action.description}</p>
              </div>
              <span className="dashboard-action-arrow" aria-hidden="true">→</span>
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
