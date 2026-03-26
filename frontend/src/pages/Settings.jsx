import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { authedFetch } from '../lib/authFetch';
import i18n from '../i18n';
import { formatDateIST } from '../utils/istTime';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [profile, setProfile] = useState(fallbackProfile);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const accountCreatedAt = useMemo(() => {
    if (!user?.created_at) return t('settings.unknown', { defaultValue: 'Unknown' });
    return formatDateIST(user.created_at, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [t, user]);

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
        const response = await authedFetch('http://127.0.0.1:8000/api/v1/auth/me');
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
      const response = await authedFetch('http://127.0.0.1:8000/api/v1/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.detail || t('settings.messages.saveProfileError', { defaultValue: 'Unable to save profile' }));
      }
      toast.success(t('settings.messages.profileSaved', { defaultValue: 'Profile saved' }));
    } catch (error) {
      toast.error(error?.message || t('settings.messages.saveProfileFailed', { defaultValue: 'Failed to save profile' }));
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
      const response = await authedFetch('http://127.0.0.1:8000/api/v1/auth/update-profile', {
        method: 'POST',
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
        throw new Error(data?.detail || t('settings.messages.languageUpdateError', { defaultValue: 'Unable to update language' }));
      }
      toast.success(t('settings.messages.languageUpdated', { defaultValue: 'Language updated successfully' }));
    } catch (error) {
      toast.error(error?.message || t('settings.messages.languageUpdateFailed', { defaultValue: 'Failed to update language' }));
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
      <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>{t('settings.profileSettings', { defaultValue: 'Profile Settings' })}</h3>
        <div className="soil-form-grid">
          <label>{t('settings.fields.fullName', { defaultValue: 'Full Name' })}
            <input value={profile.name} onChange={(event) => updateProfileField('name', event.target.value)} />
          </label>
          <label>{t('settings.fields.state', { defaultValue: 'State' })}
            <input value={profile.state} onChange={(event) => updateProfileField('state', event.target.value)} />
          </label>
          <label>{t('settings.fields.district', { defaultValue: 'District' })}
            <input value={profile.district} onChange={(event) => updateProfileField('district', event.target.value)} />
          </label>
          <label>{t('settings.fields.taluk', { defaultValue: 'Taluk/Tehsil' })}
            <input value={profile.taluk} onChange={(event) => updateProfileField('taluk', event.target.value)} />
          </label>
          <label>{t('settings.fields.village', { defaultValue: 'Village/Town' })}
            <input value={profile.village} onChange={(event) => updateProfileField('village', event.target.value)} />
          </label>
          <button type="button" className="primary-btn" onClick={saveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? t('settings.saving', { defaultValue: 'Saving...' }) : t('settings.saveChanges', { defaultValue: 'Save changes' })}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>{t('settings.languageRegion', { defaultValue: 'Language and Region' })}</h3>
        <label>{t('settings.preferredLanguage', { defaultValue: 'Preferred Language' })}
          <select value={profile.preferred_language} onChange={(event) => handleLanguageChange(event.target.value)}>
            {languageOptions.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>{t('settings.notifications.title', { defaultValue: 'Notifications' })}</h3>
        <div className="simple-list">
          <label><input type="checkbox" checked={notifications.weatherAlerts} onChange={() => toggleNotification('weatherAlerts')} /> {t('settings.notifications.weatherAlerts', { defaultValue: 'Weather alerts' })}</label>
          <label><input type="checkbox" checked={notifications.marketUpdates} onChange={() => toggleNotification('marketUpdates')} /> {t('settings.notifications.marketUpdates', { defaultValue: 'Market price updates' })}</label>
          <label><input type="checkbox" checked={notifications.schemeDeadlines} onChange={() => toggleNotification('schemeDeadlines')} /> {t('settings.notifications.schemeDeadlines', { defaultValue: 'Scheme deadlines' })}</label>
          <label><input type="checkbox" checked={notifications.sosExpertAvailable} onChange={() => toggleNotification('sosExpertAvailable')} /> {t('settings.notifications.sosExpertAvailable', { defaultValue: 'SOS expert available' })}</label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h3>{t('settings.appPreferences', { defaultValue: 'App Preferences' })}</h3>
        <div className="soil-form-grid">
          <label>{t('settings.fields.temperatureUnit', { defaultValue: 'Temperature unit' })}
            <select value={preferences.temperatureUnit} onChange={(event) => updatePreference('temperatureUnit', event.target.value)}>
              <option value="Celsius">Celsius</option>
              <option value="Fahrenheit">Fahrenheit</option>
            </select>
          </label>
          <label>{t('settings.fields.currencyDisplay', { defaultValue: 'Currency display' })}
            <select value={preferences.currencyDisplay} onChange={(event) => updatePreference('currencyDisplay', event.target.value)}>
              <option value="INR">INR</option>
              <option value="per kg">per kg</option>
              <option value="per quintal">per quintal</option>
            </select>
          </label>
          <label>{t('settings.fields.defaultMarketState', { defaultValue: 'Default market state' })}
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
