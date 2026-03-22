import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'krishimitra_language';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const resolveAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const hasProfile = localStorage.getItem('krishimitra_profile_complete') === 'true';
      const isNewUser = !hasProfile;
      const selectedLanguage = localStorage.getItem(STORAGE_KEY);

      if (!isNewUser) {
        navigate('/app', { replace: true });
        return;
      }

      if (!selectedLanguage) {
        navigate('/language-select', { replace: true });
        return;
      }

      navigate('/profile-setup', { replace: true });
    };

    resolveAuth();
  }, [navigate]);

  return <LoadingSpinner label="Completing sign in..." />;
}
