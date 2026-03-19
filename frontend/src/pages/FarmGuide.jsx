import { useQuery } from '@tanstack/react-query';
import { getFarmGuideCrops } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FarmGuide() {
  const { data, isLoading } = useQuery({ queryKey: ['farm-guide'], queryFn: () => getFarmGuideCrops({ language: 'en' }), retry: 0 });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="page-wrap">
      <h2>Farm Guide</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.crops || []).map((crop) => (
            <li key={crop.name}>{crop.name} - {crop.season} - {crop.difficulty}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
