import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RiCloudy2Line,
  RiLineChartLine,
  RiGovernmentLine,
  RiMicroscopeLine,
  RiRobot2Line,
  RiShoppingBag3Line,
  RiFileList3Line,
  RiPlantLine,
  RiMessage2Line,
  RiAlarmWarningLine,
  RiBookOpenLine,
  RiHome5Line,
} from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { getWeather } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const features = [
  { key: 'home', path: '/app', icon: RiHome5Line, text: 'Dashboard overview and highlights.' },
  { key: 'weather', path: '/app/weather', icon: RiCloudy2Line, text: 'Live weather and 5-day forecast.' },
  { key: 'marketPrices', path: '/app/market-prices', icon: RiLineChartLine, text: 'Mandi insights by commodity.' },
  { key: 'schemes', path: '/app/schemes', icon: RiGovernmentLine, text: 'Government support programs.' },
  { key: 'cropDisease', path: '/app/crop-disease', icon: RiMicroscopeLine, text: 'Image-based disease diagnosis.' },
  { key: 'chatbot', path: '/app/chatbot', icon: RiRobot2Line, text: 'AI assistant for farming decisions.' },
  { key: 'marketplace', path: '/app/marketplace', icon: RiShoppingBag3Line, text: 'Buy and sell produce locally.' },
  { key: 'quiz', path: '/app/quiz', icon: RiFileList3Line, text: 'Daily learning with farming quizzes.' },
  { key: 'soilHealth', path: '/app/soil-health', icon: RiPlantLine, text: 'Soil analysis and cost planner.' },
  { key: 'forum', path: '/app/forum', icon: RiMessage2Line, text: 'Peer community and expert replies.' },
  { key: 'sos', path: '/app/sos', icon: RiAlarmWarningLine, text: 'Emergency connect with experts.' },
  { key: 'farmGuide', path: '/app/farm-guide', icon: RiBookOpenLine, text: 'Complete crop cultivation guides.' },
];

export default function Home() {
  const { t } = useTranslation();

  const { data: weather, isLoading } = useQuery({
    queryKey: ['homeWeather'],
    queryFn: () => getWeather(12.97, 77.59),
    retry: 0,
  });

  const stats = useMemo(
    () => [
      { label: t('home.schemesAvailable'), value: '8+' },
      { label: t('home.marketUpdates'), value: '100+' },
    ],
    [t]
  );

  return (
    <div className="page-wrap">
      <section className="page-hero">
        <h2>{t('home.title')}</h2>
        <p>{t('home.subtitle')}</p>
      </section>

      <section className="widget-row">
        <div className="weather-widget">
          <h3>{t('nav.weather')}</h3>
          {isLoading ? (
            <LoadingSpinner label={t('common.loading')} />
          ) : (
            <>
              <p className="weather-main">{weather?.description || 'Clear sky'}</p>
              <p className="weather-temp">{Math.round(weather?.temperature || 30)}°C</p>
              <p>{weather?.city_name || 'Bengaluru'}, {weather?.country || 'IN'}</p>
            </>
          )}
        </div>

        <div className="stats-widget">
          <h3>{t('home.quickStats')}</h3>
          <div className="stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link to={feature.path} className="feature-card">
                <Icon />
                <h4>{t('nav.' + feature.key)}</h4>
                <p>{feature.text}</p>
              </Link>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
