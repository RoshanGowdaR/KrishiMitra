import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import i18n from '../i18n';

const STORAGE_KEY = 'krishimitra_language';
const floatingEmojis = ['🌱', '🍃', '🌾'];

const languageOptions = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिंदी', english: 'Hindi' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese' },
];

export default function SelectLanguage() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem(STORAGE_KEY) || '');

  const particles = useMemo(() => Array.from({ length: 15 }, (_, index) => ({
    id: `select-language-particle-${index + 1}`,
    emoji: floatingEmojis[index % floatingEmojis.length],
    left: `${(index * 31) % 100}%`,
    top: `${(index * 23) % 100}%`,
    delay: `${(index % 8) * 0.6}s`,
    duration: `${8 + (index % 5)}s`,
    size: `${16 + (index % 4) * 4}px`,
    opacity: 0.15 + (index % 5) * 0.08,
  })), []);

  const handleContinue = () => {
    if (!selectedLanguage) return;
    localStorage.setItem(STORAGE_KEY, selectedLanguage);
    i18n.changeLanguage(selectedLanguage);
    navigate('/profile-setup', { replace: true });
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
        padding: '1rem',
      }}
    >
      <style>
        {`
          @keyframes selectLanguageFloat {
            0% { transform: translate3d(0, 22px, 0); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translate3d(0, -60px, 0); opacity: 0; }
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
              animationName: 'selectLanguageFloat',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          >
            {particle.emoji}
          </span>
        ))}
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '860px',
          borderRadius: '24px',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          color: '#fff',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: '1rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.7rem',
              background: 'rgba(22,163,74,0.2)',
              border: '1px solid rgba(22,163,74,0.4)',
            }}
          >
            🌿
          </div>
        </div>

        <h1 style={{ margin: 0, textAlign: 'center', fontFamily: 'Playfair Display, serif', fontSize: '2rem' }}>
          Choose Your Language
        </h1>
        <p style={{ marginTop: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.62)' }}>
          अपनी भाषा चुनें • ನಿಮ್ಮ ಭಾಷೆ ಆರಿಸಿ
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', background: 'rgba(22,163,74,0.25)', border: '1px solid rgba(22,163,74,0.5)', fontSize: '0.75rem' }}>Step 1: Language</span>
          <span style={{ width: '44px', height: '2px', background: 'rgba(255,255,255,0.28)' }} />
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.45)', fontSize: '0.75rem' }}>Step 2: Profile</span>
          <span style={{ width: '44px', height: '2px', background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>Step 3: Done</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.8rem',
            marginBottom: '1.35rem',
          }}
        >
          {languageOptions.map((item) => {
            const isSelected = selectedLanguage === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setSelectedLanguage(item.code)}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  border: isSelected ? '2px solid #16a34a' : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
              >
                {isSelected ? (
                  <span style={{ position: 'absolute', top: '0.35rem', right: '0.55rem', color: '#22c55e', fontWeight: 700 }}>✓</span>
                ) : null}
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>{item.native}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.62)' }}>{item.english}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedLanguage}
            style={{
              width: '100%',
              maxWidth: '400px',
              border: 'none',
              borderRadius: '12px',
              padding: '0.9rem 1.2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              cursor: selectedLanguage ? 'pointer' : 'not-allowed',
              background: selectedLanguage ? '#16a34a' : '#4b5563',
            }}
          >
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
