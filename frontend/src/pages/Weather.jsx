import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getWeather, getForecast } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Weather() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadWeatherData() {
      setIsLoading(true);
      setError('');

      try {
        const [weatherData, forecastData] = await Promise.all([
          getWeather(12.97, 77.59),
          getForecast(12.97, 77.59),
        ]);

        if (ignore) {
          return;
        }

        setWeather(weatherData || null);
        setForecast((forecastData?.forecast || []).slice(0, 5));
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        const message = t('weather.messages.fetchError');
        setError(message);
        toast.error(message);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadWeatherData();

    return () => {
      ignore = true;
    };
  }, []);

  const condition = (weather?.description || '').toLowerCase();
  const weatherIcon = condition.includes('rain')
    ? '🌧️'
    : condition.includes('cloud')
      ? '☁️'
      : condition.includes('storm')
        ? '⛈️'
        : '☀️';

  if (isLoading) {
    return <LoadingSpinner label={t('weather.loading')} />;
  }

  return (
    <div className="page-wrap weather-page">
      <h2>{t('weather.title')}</h2>

      {error ? <p className="page-error">{error}</p> : null}

      <div className="panel weather-current-card">
        <div className="weather-current-main">
          <span className="weather-emoji" aria-hidden="true">{weatherIcon}</span>
          <div>
            <h3>{weather?.city_name || 'Bengaluru'}</h3>
            <p>{weather?.description || t('weather.defaults.condition')}</p>
          </div>
        </div>

        <div className="weather-metrics-grid">
          <div>
            <span>{t('weather.metrics.temperature')}</span>
            <strong>{Math.round(weather?.temperature ?? 30)}°C</strong>
          </div>
          <div>
            <span>{t('weather.metrics.feelsLike')}</span>
            <strong>{Math.round(weather?.feels_like ?? weather?.temperature ?? 30)}°C</strong>
          </div>
          <div>
            <span>{t('weather.metrics.humidity')}</span>
            <strong>{weather?.humidity ?? 60}%</strong>
          </div>
          <div>
            <span>{t('weather.metrics.windSpeed')}</span>
            <strong>{weather?.wind_speed ?? 6} km/h</strong>
          </div>
        </div>
      </div>

      <div className="panel weather-forecast-panel">
        <h3>{t('weather.forecastTitle')}</h3>
        <div className="weather-forecast-row">
          {forecast.length === 0 ? <p className="page-muted">{t('weather.messages.noForecast')}</p> : null}

          {forecast.map((item, idx) => (
            <article key={item.date || idx} className="weather-forecast-card">
              <span>{item.date || t('weather.dayLabel', { day: idx + 1 })}</span>
              <strong>{Math.round(item.temperature ?? 0)}°C</strong>
              <p>{item.description || t('weather.defaults.update')}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
