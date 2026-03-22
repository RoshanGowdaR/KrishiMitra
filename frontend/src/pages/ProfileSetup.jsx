import { useMemo, useState } from 'react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  const navigate = useNavigate();
  const { user, completeProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
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

  const steps = useMemo(() => [
    { id: 1, label: 'Google Login', status: 'done' },
    { id: 2, label: 'Profile Setup', status: 'current' },
    { id: 3, label: 'Dashboard', status: 'upcoming' },
  ], []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hasFieldError = (key) => showValidation && !String(form[key] || '').trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setShowValidation(true);

    if (!form.name.trim() || !form.state.trim() || !form.district.trim() || !form.taluk.trim() || !form.village.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        throw new Error('Missing auth session');
      }

      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.detail || 'Unable to save profile');
      }

      localStorage.setItem('krishimitra_profile', JSON.stringify(form));
      completeProfile();
      toast.success('Profile saved successfully');
      navigate('/app', { replace: true });
    } catch (error) {
      toast.error(error?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050d05',
        backgroundImage: 'radial-gradient(125% 125% at 50% 10%, #000 35%, #0a2010 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '90%',
          maxWidth: '480px',
          borderRadius: '24px',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          color: '#fff',
        }}
      >
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            {steps.map((step, index) => (
              <Fragment key={`progress-${step.id}`}>
                <span
                  key={`step-${step.id}`}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: step.status === 'current' ? 'rgba(249,115,22,0.22)' : step.status === 'done' ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.05)',
                    color: step.status === 'current' ? '#fed7aa' : step.status === 'done' ? '#bbf7d0' : 'rgba(255,255,255,0.75)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.status === 'done' ? '✓ ' : ''}Step {step.id}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    key={`line-${step.id}`}
                    style={{
                      flex: 1,
                      height: 2,
                      background: step.status === 'done' ? 'rgba(22,163,74,0.7)' : 'rgba(255,255,255,0.2)',
                      borderRadius: 999,
                    }}
                  />
                ) : null}
              </Fragment>
            ))}
          </div>
          <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
            Step 2: Profile Setup
          </div>
        </div>

        <h1 style={{ margin: 0, marginBottom: '0.45rem', fontFamily: 'Playfair Display, serif', fontSize: '2rem' }}>Complete Your Profile</h1>
        <p style={{ margin: 0, marginBottom: '1.25rem', color: 'rgba(255,255,255,0.58)' }}>Tell us your farm location for smarter local recommendations.</p>

        <div className="soil-form-grid">
          <label htmlFor="profile-name">
            Full Name
            <input
              id="profile-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              style={{ border: hasFieldError('name') ? '1px solid #ef4444' : undefined }}
            />
          </label>

          <label htmlFor="profile-state">
            State
            <select id="profile-state" value={form.state} onChange={(event) => updateField('state', event.target.value)} required>
              {indianStatesAndUTs.map((stateName) => (
                <option key={stateName} value={stateName}>{stateName}</option>
              ))}
            </select>
          </label>

          <label htmlFor="profile-district">
            District
            <input
              id="profile-district"
              value={form.district}
              onChange={(event) => updateField('district', event.target.value)}
              required
              style={{ border: hasFieldError('district') ? '1px solid #ef4444' : undefined }}
            />
          </label>

          <label htmlFor="profile-taluk">
            Taluk/Tehsil
            <input
              id="profile-taluk"
              value={form.taluk}
              onChange={(event) => updateField('taluk', event.target.value)}
              required
              style={{ border: hasFieldError('taluk') ? '1px solid #ef4444' : undefined }}
            />
          </label>

          <label htmlFor="profile-village">
            Village/Town
            <input
              id="profile-village"
              value={form.village}
              onChange={(event) => updateField('village', event.target.value)}
              required
              style={{ border: hasFieldError('village') ? '1px solid #ef4444' : undefined }}
            />
          </label>

          <label htmlFor="profile-language-readonly">
            Language
            <input id="profile-language-readonly" value={`${selectedLanguageName} ✓`} readOnly />
          </label>
        </div>

        <p style={{ margin: '0.7rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
          Need to change language?{' '}
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
            Select again
          </button>
        </p>

        <button
          type="submit"
          className="primary-btn"
          disabled={isSaving}
          style={{ marginTop: '0.8rem', width: '100%', background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        >
          {isSaving ? 'Saving Profile...' : 'Start Farming Smarter 🌾'}
        </button>
      </form>
    </div>
  );
}
