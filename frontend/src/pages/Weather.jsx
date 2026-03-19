import { useQuery } from '@tanstack/react-query';
import { getWeather, getForecast } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Weather() {
  const weatherQuery = useQuery({ queryKey: ['weather'], queryFn: () => getWeather(12.97, 77.59), retry: 0 });
  const forecastQuery = useQuery({ queryKey: ['forecast'], queryFn: () => getForecast(12.97, 77.59), retry: 0 });

  if (weatherQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-wrap">
      <h2>Weather</h2>
      <div className="panel">
        <p><strong>Location:</strong> {weatherQuery.data?.city_name || 'Bengaluru'}</p>
        <p><strong>Condition:</strong> {weatherQuery.data?.description || 'Clear sky'}</p>
        <p><strong>Temperature:</strong> {weatherQuery.data?.temperature || 30}°C</p>
      </div>

      <div className="panel">
        <h3>Forecast</h3>
        {forecastQuery.isLoading ? (
          <LoadingSpinner />
        ) : (
          <ul className="simple-list">
            {(forecastQuery.data?.forecast || []).slice(0, 5).map((item, idx) => (
              <li key={idx}>{item.description || 'Weather update'} - {item.temperature || '-'}°C</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
