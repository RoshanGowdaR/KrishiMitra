import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getWeather, getForecast } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_COORDS = { lat: 12.9716, lon: 77.5946, label: 'Bengaluru' };
const GEO_ACCURACY_GOOD_METERS = 1200;
const GEO_ACCURACY_APPROX_METERS = 3500;
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
  const [locationNote, setLocationNote] = useState('');

  const getBrowserPosition = (options) => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

  const reverseGeocodeLabel = async (targetLat, targetLon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${targetLat}&lon=${targetLon}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();
      const address = data?.address || {};
      return (
        address.village
        || address.town
        || address.city
        || address.suburb
        || address.county
        || 'Your location'
      );
    } catch {
      return 'Your location';
    }
  };

  const getBestCurrentPosition = async () => new Promise((resolve, reject) => {
    let bestPosition = null;
    let watchId = null;
    let completed = false;

    const finalize = (position, error) => {
      if (completed) return;
      completed = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (position) {
        resolve(position);
      } else {
        reject(error || new Error('Unable to detect location'));
      }
    };

    // Gather a few GPS updates and keep the best accuracy sample.
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= GEO_ACCURACY_GOOD_METERS) {
          finalize(position, null);
        }
      },
      (locError) => {
        if (bestPosition) {
          finalize(bestPosition, null);
          return;
        }
        finalize(null, locError);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );

    setTimeout(() => {
      if (bestPosition) {
        finalize(bestPosition, null);
      } else {
        // Last fallback for devices that do not stream high-accuracy updates quickly.
        getBrowserPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 45000,
        })
          .then((fallbackPosition) => finalize(fallbackPosition, null))
          .catch((fallbackError) => finalize(null, fallbackError));
      }
    }, 12000);
  });

  const geocodeWithOpenMeteo = async (query) => {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    const payload = await response.json();
    return payload?.results || [];
  };

  const geocodeWithNominatim = async (query) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  };

  const geocodeWithPhoton = async (query) => {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
    );
    const payload = await response.json();
    return Array.isArray(payload?.features) ? payload.features : [];
  };

  const buildLocationQueryAttempts = (rawQuery) => {
    const base = String(rawQuery || '').trim();
    const attempts = [base];

    const noTaluk = base.replace(/\btaluk\b/gi, '').replace(/\bdistrict\b/gi, '').trim();
    if (noTaluk && noTaluk !== base) {
      attempts.push(noTaluk);
    }

    const commaParts = base
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (commaParts.length > 1) {
      attempts.push(commaParts.join(' '));
      attempts.push(commaParts.slice(0, 2).join(' '));
    }

    const words = base
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2);

    if (words.length >= 2) {
      attempts.push(`${words[0]} ${words[1]}`);
      attempts.push(`${words[words.length - 2]} ${words[words.length - 1]}`);
    }

    if (words.length >= 1) {
      attempts.push(words[0]);
    }

    return [...new Set(attempts.map((item) => item.trim()).filter(Boolean))];
  };

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
      setLocationLabel(label || weatherData?.city_name || 'Selected location');
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

    const locate = async () => {
      try {
        const position = await getBestCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;

        const detectedLabel = await reverseGeocodeLabel(latitude, longitude);
        setIsLocating(false);
        fetchWeather(latitude, longitude, detectedLabel);

        if (accuracy && accuracy > GEO_ACCURACY_APPROX_METERS) {
          setLocationNote('Location is approximate. Enable precise location for better accuracy.');
        } else {
          setLocationNote('');
        }
      } catch {
        setIsLocating(false);
        setLocationNote('');
        toast.error('Location access denied. Using Bengaluru.');
        fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.label);
      }
    };

    locate();
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
        const queryAttempts = buildLocationQueryAttempts(query);

        for (const attempt of queryAttempts) {
          const openMeteoCandidates = await geocodeWithOpenMeteo(attempt);
          const openMeteoMatch = openMeteoCandidates[0];

          if (openMeteoMatch) {
            const openMeteoName = [
              openMeteoMatch.name,
              openMeteoMatch.admin2,
              openMeteoMatch.admin1,
              openMeteoMatch.country,
            ].filter(Boolean).join(', ');

            fetchWeather(openMeteoMatch.latitude, openMeteoMatch.longitude, openMeteoName);
            return;
          }

          const nominatimCandidates = await geocodeWithNominatim(attempt);
          const nominatimMatch = nominatimCandidates[0];

          if (nominatimMatch) {
            const address = nominatimMatch.address || {};
            const nominatimName = [
              address.village || address.town || address.city || address.suburb || nominatimMatch.display_name,
              address.county,
              address.state,
            ].filter(Boolean).join(', ');

            fetchWeather(Number(nominatimMatch.lat), Number(nominatimMatch.lon), nominatimName);
            return;
          }

          const photonCandidates = await geocodeWithPhoton(attempt);
          const photonMatch = photonCandidates[0];

          if (photonMatch) {
            const properties = photonMatch.properties || {};
            const photonName = [
              properties.name,
              properties.city,
              properties.county,
              properties.state,
              properties.country,
            ].filter(Boolean).join(', ');

            const [photonLon, photonLat] = photonMatch.geometry?.coordinates || [];
            fetchWeather(Number(photonLat), Number(photonLon), photonName || attempt);
            return;
          }
        }

        toast.error('Location not found. Try nearby village, taluk or district name.');
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

        {locationNote ? (
          <p
            style={{
              margin: '-0.3rem 0 0.9rem',
              fontSize: '0.85rem',
              color: '#92400e',
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              width: 'fit-content',
            }}
          >
            {locationNote}
          </p>
        ) : null}

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
