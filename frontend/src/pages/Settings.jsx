import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

const STORAGE_NOTIFICATIONS = 'krishimitra_notification_settings';
const STORAGE_PREFERENCES = 'krishimitra_app_preferences';
const STORAGE_LANGUAGE = 'krishimitra_language';

const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
];

const defaultNotifications = {
  weatherAlerts: true,
  marketUpdates: true,
  schemeDeadlines: true,
  sosExpertAvailable: true,
};

const defaultPreferences = {
  temperatureUnit: 'Celsius',
  currencyDisplay: 'INR',
  defaultMarketState: 'Karnataka',
};

const fallbackProfile = {
  name: '',
  state: '',
  district: '',
  taluk: '',
  village: '',
  preferred_language: 'en',
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [profile, setProfile] = useState(fallbackProfile);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const accountCreatedAt = useMemo(() => {
    if (!user?.created_at) return 'Unknown';
    return new Date(user.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [user]);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('No active session found');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const savedNotifications = localStorage.getItem(STORAGE_NOTIFICATIONS);
    if (savedNotifications) {
      try {
        setNotifications((prev) => ({ ...prev, ...JSON.parse(savedNotifications) }));
      } catch {
        setNotifications(defaultNotifications);
      }
    }

    const savedPreferences = localStorage.getItem(STORAGE_PREFERENCES);
    if (savedPreferences) {
      try {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(savedPreferences) }));
      } catch {
        setPreferences(defaultPreferences);
      }
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('http://127.0.0.1:8000/api/v1/auth/me', { headers });
        const data = await response.json();
        if (response.ok && data?.user) {
          setProfile((prev) => ({
            ...prev,
            name: data.user.name || user?.user_metadata?.full_name || '',
            state: data.user.state || '',
            district: data.user.district || '',
            taluk: data.user.taluk || '',
            village: data.user.village || '',
            preferred_language: data.user.preferred_language || language,
          }));
        }
      } catch {
        setProfile((prev) => ({
          ...prev,
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
          preferred_language: language,
        }));
      }
    }

    loadProfile();
  }, [language, user]);

  const updateProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/update-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.detail || 'Unable to save profile');
      }
      toast.success('Profile saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    updateProfileField('preferred_language', nextLanguage);
    localStorage.setItem(STORAGE_LANGUAGE, nextLanguage);
    i18n.changeLanguage(nextLanguage);
    setLanguage(nextLanguage);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/update-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: profile.name,
          state: profile.state,
          district: profile.district,
          taluk: profile.taluk,
          village: profile.village,
          preferred_language: nextLanguage,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.detail || 'Unable to update language');
      }
      toast.success('Language updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update language');
    }
  };

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  };

  const updatePreference = (key, value) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page-wrap" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2>Settings</h2>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Profile Settings</h3>
        <div className="soil-form-grid">
          <label>Full Name
            <input value={profile.name} onChange={(event) => updateProfileField('name', event.target.value)} />
          </label>
          <label>State
            <input value={profile.state} onChange={(event) => updateProfileField('state', event.target.value)} />
          </label>
          <label>District
            <input value={profile.district} onChange={(event) => updateProfileField('district', event.target.value)} />
          </label>
          <label>Taluk/Tehsil
            <input value={profile.taluk} onChange={(event) => updateProfileField('taluk', event.target.value)} />
          </label>
          <label>Village/Town
            <input value={profile.village} onChange={(event) => updateProfileField('village', event.target.value)} />
          </label>
          <button type="button" className="primary-btn" onClick={saveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Language and Region</h3>
        <label>Preferred Language
          <select value={profile.preferred_language} onChange={(event) => handleLanguageChange(event.target.value)}>
            {languageOptions.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Notifications</h3>
        <div className="simple-list">
          <label><input type="checkbox" checked={notifications.weatherAlerts} onChange={() => toggleNotification('weatherAlerts')} /> Weather alerts</label>
          <label><input type="checkbox" checked={notifications.marketUpdates} onChange={() => toggleNotification('marketUpdates')} /> Market price updates</label>
          <label><input type="checkbox" checked={notifications.schemeDeadlines} onChange={() => toggleNotification('schemeDeadlines')} /> Scheme deadlines</label>
          <label><input type="checkbox" checked={notifications.sosExpertAvailable} onChange={() => toggleNotification('sosExpertAvailable')} /> SOS expert available</label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>App Preferences</h3>
        <div className="soil-form-grid">
          <label>Temperature unit
            <select value={preferences.temperatureUnit} onChange={(event) => updatePreference('temperatureUnit', event.target.value)}>
              <option value="Celsius">Celsius</option>
              <option value="Fahrenheit">Fahrenheit</option>
            </select>
          </label>
          <label>Currency display
            <select value={preferences.currencyDisplay} onChange={(event) => updatePreference('currencyDisplay', event.target.value)}>
              <option value="INR">INR</option>
              <option value="per kg">per kg</option>
              <option value="per quintal">per quintal</option>
            </select>
          </label>
          <label>Default market state
            <input value={preferences.defaultMarketState} onChange={(event) => updatePreference('defaultMarketState', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Account</h3>
        <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
        <p><strong>Created:</strong> {accountCreatedAt}</p>
        <button type="button" className="danger-btn" style={{ width: '100%' }} onClick={handleLogout}>Logout</button>
        <p style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#6b7280' }}>Delete account (coming soon)</p>
      </section>
    </div>
  );
}
