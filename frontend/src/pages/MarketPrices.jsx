import { useQuery } from '@tanstack/react-query';
import { getMarketPrices } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MarketPrices() {
  const { data, isLoading } = useQuery({
    queryKey: ['market-prices'],
    queryFn: () => getMarketPrices('Karnataka', 'Udupi'),
    retry: 0,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-wrap">
      <h2>Market Prices</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.prices || []).map((item, index) => (
            <li key={index}>
              {item.commodity} | {item.market} | Modal {item.modal_price}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
