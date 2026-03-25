import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getMarketPricesWithFilters } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const stateOptions = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Andhra Pradesh'];
const districtOptions = {
  Karnataka: ['Bengaluru', 'Mysuru', 'Mandya'],
  Maharashtra: ['Pune', 'Nagpur', 'Nashik'],
  'Tamil Nadu': ['Coimbatore', 'Madurai', 'Thanjavur'],
  'Andhra Pradesh': ['Guntur', 'Vijayawada', 'Kurnool'],
};

export default function MarketPrices() {
  const { t } = useTranslation();
  const [stateName, setStateName] = useState('Karnataka');
  const [districtName, setDistrictName] = useState('Bengaluru');
  const [commodity, setCommodity] = useState('');
  const [prices, setPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const availableDistricts = useMemo(
    () => districtOptions[stateName] || ['Bengaluru'],
    [stateName]
  );

  const fetchPrices = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getMarketPricesWithFilters({
        state: stateName,
        district: districtName,
        commodity,
      });
      setPrices(data?.prices || []);
    } catch (fetchError) {
      const message = t('marketPrices.messages.fetchError');
      setError(message);
      toast.error(message);
      setPrices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [stateName, districtName]);

  useEffect(() => {
    if (!availableDistricts.includes(districtName)) {
      setDistrictName(availableDistricts[0]);
    }
  }, [availableDistricts, districtName]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchPrices();
  };

  if (isLoading) {
    return <LoadingSpinner label={t('marketPrices.loading')} />;
  }

  return (
    <div className="page-wrap market-page">
      <h2>{t('marketPrices.title')}</h2>

      <form className="market-filters" onSubmit={handleSearchSubmit}>
        <label>
          {t('common.state')}
          <select value={stateName} onChange={(event) => setStateName(event.target.value)}>
            {stateOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          {t('common.district')}
          <select value={districtName} onChange={(event) => setDistrictName(event.target.value)}>
            {availableDistricts.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          {t('common.commodity')}
          <input
            value={commodity}
            onChange={(event) => setCommodity(event.target.value)}
            placeholder={t('marketPrices.searchPlaceholder')}
          />
        </label>

        <button type="submit" className="primary-btn">{t('common.search')}</button>
        <button type="button" className="ghost-btn" onClick={fetchPrices}>{t('common.refresh')}</button>
      </form>

      {error ? <p className="page-error">{error}</p> : null}

      <div className="panel">
        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th>{t('common.commodity')}</th>
                <th>{t('marketPrices.columns.market')}</th>
                <th>{t('marketPrices.columns.min')}</th>
                <th>{t('marketPrices.columns.max')}</th>
                <th>{t('marketPrices.columns.modalPrice')}</th>
                <th>{t('marketPrices.columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="market-empty">{t('marketPrices.messages.noResults')}</td>
                </tr>
              ) : (
                prices.map((item, index) => (
                  <tr key={item.id || `${item.commodity}-${index}`}>
                    <td>{item.commodity || '-'}</td>
                    <td>{item.market || '-'}</td>
                    <td>{item.min_price ?? '-'}</td>
                    <td>{item.max_price ?? '-'}</td>
                    <td>{item.modal_price ?? '-'}</td>
                    <td>{item.arrival_date || item.date || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
