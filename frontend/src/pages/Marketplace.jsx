import { useQuery } from '@tanstack/react-query';
import { getListings } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Marketplace() {
  const { data, isLoading } = useQuery({ queryKey: ['marketplace'], queryFn: () => getListings({}), retry: 0 });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="page-wrap">
      <h2>Marketplace</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.listings || []).map((item) => (
            <li key={item.id}>{item.commodity} - {item.quantity_kg}kg @ INR {item.price_per_kg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
