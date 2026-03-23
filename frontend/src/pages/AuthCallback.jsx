import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'krishimitra_language';

const playGreeting = async (language) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/voice/greeting?language=${language}`
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(() => {});
  } catch (error) {
    console.log('Voice greeting unavailable:', error);
  }
};

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      const savedLanguage = localStorage.getItem(
        'krishimitra_language'
      ) || 'en';
      await playGreeting(savedLanguage);

      const user = session.user;

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name, state, preferred_language')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingUser || !existingUser.name) {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);
        if (!savedLanguage) {
          navigate('/select-language', { replace: true });
        } else {
          navigate('/profile-setup', { replace: true });
        }
      } else {
        navigate('/app', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#050d05',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid #16a34a',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
        Setting up your account...
      </p>
    </div>
  );
}
