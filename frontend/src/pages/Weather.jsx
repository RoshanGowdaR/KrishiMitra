import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getWeather, getForecast } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_COORDS = { lat: 12.9716, lon: 77.5946, label: 'Bengaluru' };
const QUICK_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Pune', lat: 18.5204, lon: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
];

export default function Weather() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  const [lat, setLat] = useState(DEFAULT_COORDS.lat);
  const [lon, setLon] = useState(DEFAULT_COORDS.lon);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationLabel, setLocationLabel] = useState(DEFAULT_COORDS.label);

  const fetchWeather = async (targetLat, targetLon, label = 'Selected location') => {
    setIsLoading(true);
    setError('');

    try {
      const [weatherData, forecastData] = await Promise.all([
        getWeather(targetLat, targetLon),
        getForecast(targetLat, targetLon),
      ]);

      setWeather(weatherData || null);
      setForecast((forecastData?.forecast || []).slice(0, 5));
      setLat(targetLat);
      setLon(targetLon);
      setLocationLabel(weatherData?.city_name || label);
    } catch (fetchError) {
      const message = t('weather.messages.fetchError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported. Using Bengaluru.');
      fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.label);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        fetchWeather(latitude, longitude, 'Your location');
      },
      () => {
        setIsLocating(false);
        toast.error('Location access denied. Using Bengaluru.');
        fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.label);
      }
    );
  };

  const handleManualSearch = (event) => {
    event.preventDefault();
    const query = String(locationQuery || '').trim();
    if (!query) {
      toast.error('Please enter a city or village name.');
      return;
    }

    const geocodeAndFetch = async () => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
        );
        const payload = await response.json();
        const first = payload?.results?.[0];

        if (!first) {
          toast.error('Location not found. Try nearby city name.');
          return;
        }

        const name = [first.name, first.admin1, first.country].filter(Boolean).join(', ');
        fetchWeather(first.latitude, first.longitude, name);
      } catch {
        toast.error('Unable to search location right now.');
      }
    };

    geocodeAndFetch();
  };

  const handleQuickCity = (city) => {
    fetchWeather(city.lat, city.lon, city.name);
  };

  useEffect(() => {
    handleUseMyLocation();
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

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
          >
            {isLocating ? 'Getting your location...' : '📍 Use My Location'}
          </button>
          <span className="page-muted" style={{ fontSize: '0.9rem' }}>
            Using location: {locationLabel} ({Number(lat).toFixed(4)}, {Number(lon).toFixed(4)})
          </span>
        </div>

        <form onSubmit={handleManualSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.6rem', marginBottom: '0.9rem' }}>
          <input
            type="text"
            placeholder="Type your city or village (e.g., Hassan, Alur)"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
          />
          <div />
          <button type="submit" className="ghost-btn">Search</button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {QUICK_CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              className="ghost-btn"
              onClick={() => handleQuickCity(city)}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

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
