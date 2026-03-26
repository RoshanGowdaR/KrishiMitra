import { createRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const floatingEmojis = ['🌱', '🍃', '🌾'];

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [authBlock, setAuthBlock] = useState(null);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([...Array(6)].map(() => createRef()));

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('krishimitra_auth_block');
      const parsed = raw ? JSON.parse(raw) : null;
      setAuthBlock(parsed);
    } catch {
      setAuthBlock(null);
    }
  }, []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const startLogin = async () => {
    await signInWithGoogle();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number');
      return;
    }

    setSendingOtp(true);
    setPhoneError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setPhoneError(error.message || 'Failed to send OTP. Please try again.');
        return;
      }

      setOtpSent(true);
      setOtpTimer(300);
    } catch {
      setPhoneError('Something went wrong. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpDigit = (index, value) => {
    const newDigits = [...otpDigits];
    newDigits[index] = value.replace(/\D/g, '').slice(-1);
    setOtpDigits(newDigits);
    setOtp(newDigits.join(''));

    if (value && index < 5) {
      otpRefs.current[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    setVerifyingOtp(true);
    setPhoneError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms',
      });

      if (error) {
        setPhoneError(error.message || 'Invalid OTP. Please try again.');
        setOtpSent(false);
        setOtpDigits(['', '', '', '', '', '']);
        setOtp('');
        return;
      }

      if (data.session) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, name, state')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (!existingUser || !existingUser.name) {
          await supabase.from('users').upsert({
            id: data.session.user.id,
            phone: `+91${phone}`,
          });

          const savedLanguage = localStorage.getItem('krishimitra_language');
          if (!savedLanguage) {
            navigate('/select-language', { replace: true });
          } else {
            navigate('/profile-setup', { replace: true });
          }
        } else {
          navigate('/app', { replace: true });
        }
      }
    } catch {
      setPhoneError('Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
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

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
          {t('login.welcomeBack', { defaultValue: 'Welcome Back' })}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}
        >
          {t('login.subtitle', { defaultValue: 'Sign in to your farming workspace' })}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.45 }}
          style={{ margin: 0, marginBottom: '2rem', color: 'rgba(22,163,74,0.7)', fontSize: '0.85rem', fontWeight: 500 }}
        >
          {t('login.localWelcome', { defaultValue: 'ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ' })}
        </motion.p>

        {authBlock ? (
          <div
            style={{
              background: authBlock.type === 'temporary' ? '#fef9c3' : '#fee2e2',
              border: `1px solid ${authBlock.type === 'temporary' ? '#eab308' : '#ef4444'}`,
              color: authBlock.type === 'temporary' ? '#991b1b' : '#7f1d1d',
              borderRadius: 12,
              padding: '0.75rem',
              marginBottom: '1rem',
              textAlign: 'left',
              fontSize: '0.82rem',
            }}
          >
            <p style={{ margin: 0, fontWeight: 700 }}>
              {authBlock.type === 'temporary'
                ? 'Your account has been suspended temporarily for 7 days.'
                : 'Your account has been banned permanently.'}
            </p>
            {authBlock.until && authBlock.type === 'temporary' ? (
              <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>
                Suspension until: {new Date(authBlock.until).toLocaleString('en-IN')}
              </p>
            ) : null}
            <p style={{ margin: '0.35rem 0 0' }}>
              Reason: {authBlock.reason || 'Policy violation'}
            </p>
          </div>
        ) : null}

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
          {t('login.continueWithGoogle', { defaultValue: 'Continue with Google' })}
        </motion.button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {!otpSent ? (
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, marginBottom: '0.35rem', color: 'white', fontWeight: 600 }}>Login with Phone</p>
            <p style={{ margin: 0, marginBottom: '0.8rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
              Enter your mobile number to receive a one-time password.
            </p>

            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '0.8rem',
              }}
            >
              <span
                style={{
                  padding: '0.9rem 1rem',
                  background: 'rgba(22,163,74,0.15)',
                  color: '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                  whiteSpace: 'nowrap',
                }}
              >
                🇮🇳 +91
              </span>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(event) => {
                  const val = event.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  setPhoneError('');
                }}
                style={{
                  flex: 1,
                  padding: '0.9rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '1rem',
                }}
                maxLength={10}
              />
            </div>

            {phoneError ? (
              <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0, marginBottom: '0.5rem' }}>
                {phoneError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || phone.length !== 10}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: phone.length === 10
                  ? 'linear-gradient(135deg, #16a34a, #15803d)'
                  : 'rgba(255,255,255,0.05)',
                color: phone.length === 10 ? 'white' : 'rgba(255,255,255,0.3)',
                border: '1px solid rgba(22,163,74,0.3)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: phone.length === 10 ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
              }}
            >
              {sendingOtp ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Sending OTP...
                </span>
              ) : '📱 Send OTP'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setOtpDigits(['', '', '', '', '', '']);
                setPhoneError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#86efac',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '0.7rem',
              }}
            >
              ← Change number
            </button>

            <p style={{ margin: 0, marginBottom: '0.35rem', color: 'white', fontWeight: 600 }}>Enter OTP</p>
            <p style={{ margin: 0, marginBottom: '0.8rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
              Sent to +91 {phone.slice(0, 3)}XXXXXXX{phone.slice(-2)}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={otpRefs.current[index]}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpDigit(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  style={{
                    width: '44px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    background: digit
                      ? 'rgba(22,163,74,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    border: digit
                      ? '2px solid rgba(22,163,74,0.5)'
                      : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            {phoneError ? (
              <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0, marginBottom: '0.5rem', textAlign: 'center' }}>
                {phoneError}
              </p>
            ) : null}

            {otpTimer > 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: 0 }}>
                OTP expires in <span style={{ color: '#4ade80', fontWeight: 700 }}>{formatTimer(otpTimer)}</span>
              </p>
            ) : (
              <p style={{ textAlign: 'center', fontSize: '0.82rem', margin: 0 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>OTP expired. </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpDigits(['', '', '', '', '', '']);
                    setOtp('');
                    setPhoneError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontWeight: 600 }}
                >
                  Resend OTP
                </button>
              </p>
            )}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyingOtp || otp.length !== 6}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: otp.length === 6
                  ? 'linear-gradient(135deg, #16a34a, #15803d)'
                  : 'rgba(255,255,255,0.05)',
                color: otp.length === 6 ? 'white' : 'rgba(255,255,255,0.3)',
                border: '1px solid rgba(22,163,74,0.3)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: otp.length === 6 ? 'pointer' : 'not-allowed',
                marginTop: '0.8rem',
              }}
            >
              {verifyingOtp ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Verifying...
                </span>
              ) : '✅ Verify OTP & Login'}
            </button>
          </div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          style={{ margin: 0, marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}
        >
          {t('login.terms', { defaultValue: 'By continuing you agree to our terms of service' })}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.45 }}
          style={{ margin: 0, marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(22,163,74,0.6)', textAlign: 'center' }}
        >
          🌾 {t('login.footer', { defaultValue: 'Empowering 600M Indian Farmers with AI' })}
        </motion.p>
      </motion.div>
    </div>
  );
}
