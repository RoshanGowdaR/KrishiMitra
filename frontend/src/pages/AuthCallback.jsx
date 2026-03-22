import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'krishimitra_language';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();

  useEffect(() => {
    const hasProfile = localStorage.getItem('krishimitra_profile_complete') === 'true';
    const isNewUser = searchParams.get('new') === '1' && !hasProfile;
    const selectedLanguage = localStorage.getItem(STORAGE_KEY);

    signIn({ isNewUser });

    if (!isNewUser) {
      navigate('/app', { replace: true });
      return;
    }

    if (!selectedLanguage) {
      navigate('/language-select', { replace: true });
      return;
    }

    navigate('/profile-setup', { replace: true });
  }, [navigate, searchParams, signIn]);

  return <LoadingSpinner label="Completing sign in..." />;
}
