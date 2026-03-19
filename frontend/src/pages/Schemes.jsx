import { useQuery } from '@tanstack/react-query';
import { getAllSchemes } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Schemes() {
  const { data, isLoading } = useQuery({ queryKey: ['schemes'], queryFn: () => getAllSchemes('en'), retry: 0 });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-wrap">
      <h2>Government Schemes</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.schemes || []).map((scheme) => (
            <li key={scheme.id}>
              <strong>{scheme.name}</strong> - {scheme.scheme_type}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
