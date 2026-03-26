import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const indianStatesAndUTs = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const languageNameByCode = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  bn: 'বাংলা',
  pa: 'ਪੰਜਾਬੀ',
  ml: 'മലയാളം',
  or: 'ଓଡ଼ିଆ',
  as: 'অসমীয়া',
};

export default function ProfileSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, completeProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const floatingEmojis = ['🌱', '🍃', '🌾'];
  const particles = useMemo(
    () => Array.from({ length: 15 }, (_, index) => ({
      id: `profile-particle-${index + 1}`,
      emoji: floatingEmojis[index % floatingEmojis.length],
      left: `${(index * 37) % 100}%`,
      top: `${(index * 29) % 100}%`,
      delay: `${(index % 8) * 0.6}s`,
      duration: `${9 + (index % 5)}s`,
      size: `${14 + (index % 4) * 3}px`,
      opacity: 0.14 + (index % 5) * 0.07,
    })),
    []
  );

  const selectedLanguageCode = localStorage.getItem('krishimitra_language') || 'en';
  const selectedLanguageName = languageNameByCode[selectedLanguageCode] || 'English';
  const [form, setForm] = useState(() => ({
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    state: 'Karnataka',
    district: '',
    taluk: '',
    village: '',
    preferred_language: selectedLanguageCode,
  }));

  const saveProfileDirectlyToSupabase = async () => {
    const payload = {
      id: user?.id,
      name: form.name,
      state: form.state,
      district: form.district,
      taluk: form.taluk,
      village: form.village,
      preferred_language: form.preferred_language,
    };

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  };

  const saveAndContinue = () => {
    localStorage.setItem('krishimitra_profile', JSON.stringify(form));
    completeProfile();
    toast.success(t('profileSetup.messages.saveSuccess', { defaultValue: 'Profile saved successfully' }));
    navigate('/app', { replace: true });
  };

  const getProfileUpdateUrl = () => {
    const rawBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const base = rawBase.replace(/\/+$/, '');
    return base.endsWith('/api/v1')
      ? `${base}/auth/update-profile`
      : `${base}/api/v1/auth/update-profile`;
  };

  const steps = useMemo(() => [
    { id: 1, label: t('profileSetup.steps.googleLogin', { defaultValue: 'Google Login' }), status: 'done' },
    { id: 2, label: t('profileSetup.steps.profileSetup', { defaultValue: 'Profile Setup' }), status: 'current' },
    { id: 3, label: t('profileSetup.steps.dashboard', { defaultValue: 'Dashboard' }), status: 'upcoming' },
  ], [t]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hasFieldError = (key) => showValidation && !String(form[key] || '').trim();

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const existingToken = sessionData?.session?.access_token;
    if (existingToken) {
      return existingToken;
    }

    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(t('profileSetup.messages.sessionExpired', { defaultValue: 'Your login session expired. Please sign in again.' }));
    }

    const refreshedToken = refreshedData?.session?.access_token;
    if (!refreshedToken) {
      throw new Error(t('profileSetup.messages.sessionExpired', { defaultValue: 'Your login session expired. Please sign in again.' }));
    }

    return refreshedToken;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setShowValidation(true);

    if (!form.name.trim() || !form.state.trim() || !form.district.trim() || !form.taluk.trim() || !form.village.trim()) {
      toast.error(t('profileSetup.messages.requiredFields', { defaultValue: 'Please fill all required fields' }));
      return;
    }

    setIsSaving(true);
    try {
      const token = await getAccessToken();
      const profileUpdateUrl = getProfileUpdateUrl();

      const response = await fetch(profileUpdateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        try {
          await saveProfileDirectlyToSupabase();
          saveAndContinue();
          return;
        } catch {
          throw new Error(payload?.detail || t('profileSetup.messages.saveError', { defaultValue: 'Unable to save profile' }));
        }
      }

      if (!payload?.success) {
        throw new Error(payload?.detail || t('profileSetup.messages.saveError', { defaultValue: 'Unable to save profile' }));
      }

      saveAndContinue();
    } catch (error) {
      const message = String(error?.message || '');
      const isNetworkOrCorsIssue =
        message.toLowerCase().includes('failed to fetch')
        || message.toLowerCase().includes('cors')
        || message.toLowerCase().includes('networkerror');

      if (isNetworkOrCorsIssue) {
        try {
          await saveProfileDirectlyToSupabase();
          saveAndContinue();
          return;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError?.message || t('profileSetup.messages.saveFailed', { defaultValue: 'Failed to save profile' });
          toast.error(fallbackMessage);
          return;
        }
      }

      const safeMessage = message || t('profileSetup.messages.saveFailed', { defaultValue: 'Failed to save profile' });
      toast.error(safeMessage);
      if (safeMessage.toLowerCase().includes('session expired')) {
        navigate('/login', { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050d05',
        backgroundImage: 'radial-gradient(125% 125% at 50% 10%, #000 35%, #0a2010 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes profileFloatUp {
            0% { transform: translate3d(0, 20px, 0); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translate3d(0, -58px, 0); opacity: 0; }
          }

          .profile-input {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            padding: 0.8rem 1rem;
            color: white;
            font-size: 0.95rem;
            margin-bottom: 0.2rem;
            outline: none;
          }

          .profile-input:focus {
            border-color: #16a34a;
            background: rgba(22,163,74,0.08);
          }

          .profile-input.error {
            border-color: #dc2626;
            background: rgba(220,38,38,0.08);
          }

          .profile-input option {
            background: #1a1a1a;
            color: #fff;
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
              animationName: 'profileFloatUp',
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

      <form
        onSubmit={handleSubmit}
        style={{
          width: '90%',
          maxWidth: '480px',
          borderRadius: '20px',
          padding: '2.5rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.45)',
          color: '#fff',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {steps.map((step, index) => (
              <Fragment key={`progress-${step.id}`}>
                <span
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: step.status === 'current' ? '#16a34a' : 'rgba(255,255,255,0.08)',
                    color: step.status === 'current' ? '#fff' : 'rgba(255,255,255,0.72)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.status === 'done' ? '✓ ' : ''}{t('profileSetup.stepPrefix', { defaultValue: 'Step' })} {step.id}: {step.id === 1 ? t('profileSetup.stepLabels.language', { defaultValue: 'Language' }) : step.id === 2 ? t('profileSetup.stepLabels.profile', { defaultValue: 'Profile' }) : t('profileSetup.stepLabels.done', { defaultValue: 'Done' })}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    style={{
                      width: 20,
                      height: 2,
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '999px',
                      alignSelf: 'center',
                    }}
                  />
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>

        <h1 style={{ margin: 0, marginBottom: '0.5rem', fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
          {t('profileSetup.title', { defaultValue: 'Complete Your Profile' })}
        </h1>
        <p style={{ margin: 0, marginBottom: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
          {t('profileSetup.subtitle', { defaultValue: 'Tell us your farm location for smarter local recommendations.' })}
        </p>

        <div>
          <label htmlFor="profile-name">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.fullName', { defaultValue: 'Full Name' })}</span>
            <input
              id="profile-name"
              className={hasFieldError('name') ? 'profile-input error' : 'profile-input'}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
            {hasFieldError('name') ? <small style={{ color: '#ef4444', display: 'block', marginBottom: '1rem' }}>{t('profileSetup.validation.fullName', { defaultValue: 'Full Name is required' })}</small> : <div style={{ marginBottom: '1rem' }} />}
          </label>

          <label htmlFor="profile-state">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.state', { defaultValue: 'State' })}</span>
            <select
              id="profile-state"
              className={hasFieldError('state') ? 'profile-input error' : 'profile-input'}
              value={form.state}
              onChange={(event) => updateField('state', event.target.value)}
              required
            >
              {indianStatesAndUTs.map((stateName) => (
                <option key={stateName} value={stateName}>{stateName}</option>
              ))}
            </select>
            {hasFieldError('state') ? <small style={{ color: '#ef4444', display: 'block', marginBottom: '1rem' }}>{t('profileSetup.validation.state', { defaultValue: 'State is required' })}</small> : <div style={{ marginBottom: '1rem' }} />}
          </label>

          <label htmlFor="profile-district">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.district', { defaultValue: 'District' })}</span>
            <input
              id="profile-district"
              className={hasFieldError('district') ? 'profile-input error' : 'profile-input'}
              value={form.district}
              onChange={(event) => updateField('district', event.target.value)}
              required
            />
            {hasFieldError('district') ? <small style={{ color: '#ef4444', display: 'block', marginBottom: '1rem' }}>{t('profileSetup.validation.district', { defaultValue: 'District is required' })}</small> : <div style={{ marginBottom: '1rem' }} />}
          </label>

          <label htmlFor="profile-taluk">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.taluk', { defaultValue: 'Taluk/Tehsil' })}</span>
            <input
              id="profile-taluk"
              className={hasFieldError('taluk') ? 'profile-input error' : 'profile-input'}
              value={form.taluk}
              onChange={(event) => updateField('taluk', event.target.value)}
              required
            />
            {hasFieldError('taluk') ? <small style={{ color: '#ef4444', display: 'block', marginBottom: '1rem' }}>{t('profileSetup.validation.taluk', { defaultValue: 'Taluk/Tehsil is required' })}</small> : <div style={{ marginBottom: '1rem' }} />}
          </label>

          <label htmlFor="profile-village">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.village', { defaultValue: 'Village/Town' })}</span>
            <input
              id="profile-village"
              className={hasFieldError('village') ? 'profile-input error' : 'profile-input'}
              value={form.village}
              onChange={(event) => updateField('village', event.target.value)}
              required
            />
            {hasFieldError('village') ? <small style={{ color: '#ef4444', display: 'block', marginBottom: '1rem' }}>{t('profileSetup.validation.village', { defaultValue: 'Village/Town is required' })}</small> : <div style={{ marginBottom: '1rem' }} />}
          </label>

          <label htmlFor="profile-language-readonly">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('profileSetup.fields.language', { defaultValue: 'Language' })}</span>
            <input
              id="profile-language-readonly"
              className="profile-input"
              value={`${selectedLanguageName} ✓`}
              readOnly
            />
          </label>
        </div>

        <p style={{ margin: '0.7rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
          {t('profileSetup.changeLanguagePrompt', { defaultValue: 'Need to change language?' })}{' '}
          <button
            type="button"
            onClick={() => navigate('/select-language')}
            style={{
              border: 'none',
              background: 'none',
              color: '#4ade80',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.82rem',
            }}
          >
            {t('profileSetup.changeLanguageAction', { defaultValue: 'Select again' })}
          </button>
        </p>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            width: '100%',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            marginTop: '0.5rem',
            transition: 'all 0.2s ease',
            opacity: isSaving ? 0.6 : 1,
            boxShadow: isSaving ? 'none' : '0 8px 20px rgba(22,163,74,0.3)',
          }}
          onMouseEnter={(event) => {
            if (isSaving) return;
            event.currentTarget.style.background = '#15803d';
            event.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = '#16a34a';
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isSaving ? t('profileSetup.saving', { defaultValue: 'Saving Profile...' }) : `${t('profileSetup.submit', { defaultValue: 'Start Farming Smarter' })} 🌾`}
        </button>
      </form>
    </div>
  );
}
