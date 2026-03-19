import { useQuery } from '@tanstack/react-query';
import { getPosts } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Forum() {
  const { data, isLoading } = useQuery({ queryKey: ['forum'], queryFn: () => getPosts({}), retry: 0 });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="page-wrap">
      <h2>Community Forum</h2>
      <div className="panel">
        <ul className="simple-list">
          {(data?.posts || []).map((post) => (
            <li key={post.id}>{post.title} - {post.author_name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
