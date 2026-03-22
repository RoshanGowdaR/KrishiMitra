import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const floatingEmojis = ['🌱', '🍃', '🌾'];

export default function Login() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  const particles = Array.from({ length: 15 }, (_, index) => ({
    id: `login-particle-${index + 1}`,
    emoji: floatingEmojis[index % floatingEmojis.length],
    left: `${(index * 37) % 100}%`,
    top: `${(index * 29) % 100}%`,
    delay: `${(index % 8) * 0.6}s`,
    duration: `${9 + (index % 5)}s`,
    size: `${16 + (index % 4) * 4}px`,
    opacity: 0.16 + (index % 5) * 0.08,
  }));

  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const startLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#050d05',
        backgroundImage: 'radial-gradient(125% 125% at 50% 10%, #000 35%, #0a2010 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <style>
        {`
          @keyframes loginFloatUp {
            0% { transform: translate3d(0, 22px, 0); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translate3d(0, -62px, 0); opacity: 0; }
          }
        `}
      </style>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {particles.map((particle) => (
          <span
            key={particle.id}
            style={{
              position: 'absolute',
              left: particle.left,
              top: particle.top,
              fontSize: particle.size,
              opacity: particle.opacity,
              animationName: 'loginFloatUp',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              transform: 'translate3d(0, 0, 0)',
              filter: 'drop-shadow(0 0 8px rgba(22,163,74,0.2))',
            }}
          >
            {particle.emoji}
          </span>
        ))}
      </div>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '90%',
          maxWidth: '420px',
          borderRadius: '24px',
          padding: '3rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45 }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.75rem',
              background: 'rgba(22,163,74,0.2)',
              border: '1px solid rgba(22,163,74,0.4)',
              boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
            }}
          >
            🌿
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.45 }}
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            color: '#fff',
            fontFamily: 'Playfair Display, serif',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}
        >
          Welcome Back
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}
        >
          Sign in to your farming workspace
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.45 }}
          style={{ margin: 0, marginBottom: '2rem', color: 'rgba(22,163,74,0.7)', fontSize: '0.85rem', fontWeight: 500 }}
        >
          ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scaleX: 0.85 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}
        />

        <motion.button
          type="button"
          onClick={startLogin}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.45 }}
          whileHover={{ y: -2, backgroundColor: '#f0fdf4', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '0.9rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 500,
            color: '#1a1a1a',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </motion.button>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          style={{ margin: 0, marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}
        >
          By continuing you agree to our terms of service
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.45 }}
          style={{ margin: 0, marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(22,163,74,0.6)', textAlign: 'center' }}
        >
          🌾 Empowering 600M Indian Farmers with AI
        </motion.p>
      </motion.div>
    </div>
  );
}
