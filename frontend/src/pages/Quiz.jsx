import { useQuery } from '@tanstack/react-query';
import { getQuizzes } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Quiz() {
  const { data, isLoading } = useQuery({ queryKey: ['quiz'], queryFn: () => getQuizzes({ language: 'en' }), retry: 0 });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="page-wrap">
      <h2>Farming Quiz</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.quizzes || []).map((quiz) => (
            <li key={quiz.id}>{quiz.title} - {quiz.difficulty}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
