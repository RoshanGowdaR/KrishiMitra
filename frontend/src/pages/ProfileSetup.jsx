import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { completeProfile } = useAuth();
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('Bengaluru');

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('krishimitra_profile', JSON.stringify({ state, district }));
    completeProfile();
    navigate('/app', { replace: true });
  };

  return (
    <div className="language-overlay">
      <form className="language-modal" onSubmit={handleSubmit}>
        <div className="language-header">
          <h1>{t('appName')}</h1>
          <p>Complete your profile to personalize recommendations.</p>
        </div>

        <div className="soil-form-grid">
          <label htmlFor="profile-state">
            {t('common.state')}
            <input id="profile-state" value={state} onChange={(event) => setState(event.target.value)} required />
          </label>

          <label htmlFor="profile-district">
            {t('common.district')}
            <input id="profile-district" value={district} onChange={(event) => setDistrict(event.target.value)} required />
          </label>
        </div>

        <button type="submit" className="primary-btn">Continue to Dashboard</button>
      </form>
    </div>
  );
}
