import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import { getSchemes, getSchemeDetails } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

const HOW_TO_APPLY_LINKS = {
  'pm-kisan': 'https://www.youtube.com/watch?v=-WQ7P2K_qAc&utm_source=chatgpt.com',
  pmfby: 'https://youtu.be/QIh_IlHq524?si=cGZ9cbyX04uT3Ins',
  kcc: 'https://youtu.be/z63JifKbygc?si=CwDQiTz3MiREAlmK',
  pkvy: 'https://youtu.be/pefFjegVTEo?si=5nbd17I_PNIF02Yy',
  smam: 'https://youtu.be/XytJu8AXUhs?si=totk0gvOqK7xwwAh',
  pmksy: 'https://youtu.be/YJyrH5YXs0s?si=dnq42XG8L_bsfHTJ',
  enam: 'https://youtu.be/H_I_NcJqhvg?si=VxCNVyoAux-uaRfV',
  'soil-health-card': 'https://youtu.be/-0L2s9okVtk?si=Q8Q1AMZN7Bdcu3q-',
};

export default function Schemes() {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const { role } = useRole();
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newScheme, setNewScheme] = useState({
    name: '',
    description: '',
    youtube_url: '',
  });

  useEffect(() => {
    let ignore = false;

    async function loadSchemes() {
      setIsLoading(true);
      setError('');

      try {
        const data = await getSchemes(language);
        if (!ignore) {
          setSchemes(data?.schemes || []);
        }
      } catch (fetchError) {
        if (!ignore) {
          const message = t('schemes.messages.fetchError');
          setError(message);
          toast.error(message);
          setSchemes([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadSchemes();

    return () => {
      ignore = true;
    };
  }, [language]);

  const openSchemeDetails = async (scheme) => {
    if (String(scheme?.id || '').startsWith('custom-')) {
      setSelectedScheme({
        ...scheme,
        eligibility: scheme.eligibility || ['Refer description'],
        benefits: scheme.benefits || ['Refer description'],
        application_process: scheme.application_process || 'Refer description and shared video link',
      });
      return;
    }

    setIsModalLoading(true);

    try {
      const details = await getSchemeDetails(scheme.id, language);
      setSelectedScheme(details);
    } catch (fetchError) {
      toast.error(t('schemes.messages.detailsError'));
    } finally {
      setIsModalLoading(false);
    }
  };

  const openHowToApply = (schemeId) => {
    const link = HOW_TO_APPLY_LINKS[schemeId];
    if (!link) {
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const addAdminScheme = async () => {
    if (role !== 'admin') return;
    if (!newScheme.name.trim() || !newScheme.description.trim() || !newScheme.youtube_url.trim()) {
      toast.error('Please fill scheme name, description, and youtube link');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        id: `custom-${Date.now()}`,
        name: newScheme.name.trim(),
        description: newScheme.description.trim(),
        language,
        deadline: 'Open',
        ministry: 'Admin Added Scheme',
        youtube_url: newScheme.youtube_url.trim(),
      };

      const { error: insertError } = await supabase.from('custom_schemes').insert(payload);
      if (insertError) {
        const { error: fallbackError } = await supabase.from('custom_schemes').insert({
          id: payload.id,
          name: payload.name,
          description: payload.description,
          language: payload.language,
          deadline: payload.deadline,
          ministry: payload.ministry,
        });

        if (fallbackError) throw fallbackError;
      }

      setNewScheme({ name: '', description: '', youtube_url: '' });
      toast.success('Scheme added successfully');

      const refreshed = await getSchemes(language);
      setSchemes(refreshed?.schemes || []);
    } catch (createError) {
      toast.error(createError?.message || 'Unable to add scheme');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label={t('schemes.loading')} />;
  }

  return (
    <div className="page-wrap schemes-page">
      <h2>{t('schemes.title')}</h2>

      <div className="schemes-toolbar">
        <label>
          {t('common.language')}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {supportedLanguages.map((item) => (
              <option key={item.code} value={item.code}>{item.native}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="page-error">{error}</p> : null}

      {role === 'admin' ? (
        <section className="panel" style={{ marginBottom: '1rem' }}>
          <h3>Add Government Scheme</h3>
          <div className="soil-form-grid">
            <label>Scheme Name
              <input
                value={newScheme.name}
                onChange={(event) => setNewScheme((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Enter scheme name"
              />
            </label>
            <label>Description
              <textarea
                rows={4}
                value={newScheme.description}
                onChange={(event) => setNewScheme((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Add full description including eligibility and benefits"
              />
            </label>
            <label>YouTube Video Link
              <input
                value={newScheme.youtube_url}
                onChange={(event) => setNewScheme((prev) => ({ ...prev, youtube_url: event.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </label>
            <button type="button" className="primary-btn" onClick={addAdminScheme} disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add Scheme'}
            </button>
          </div>
        </section>
      ) : null}

      <div className="schemes-grid">
        {schemes.length === 0 ? <p className="page-muted">{t('schemes.messages.empty')}</p> : null}

        {schemes.map((scheme) => (
          <article key={scheme.id} className="scheme-card">
            <div className="scheme-card-tags">
              <span className="scheme-ministry">{scheme.ministry || t('schemes.defaults.government')}</span>
              <span className="scheme-type">{scheme.scheme_type || t('schemes.defaults.general')}</span>
            </div>
            <h3>{scheme.name}</h3>
            <p>{scheme.description || t('schemes.defaults.description')}</p>
            {scheme.created_at ? (
              <p className="page-muted">Added on: {new Date(scheme.created_at).toLocaleDateString('en-IN')}</p>
            ) : null}
            <p className="page-muted">{t('schemes.messages.regionalLanguageSoon', { defaultValue: 'Regional language details will be available soon.' })}</p>
            <div className="scheme-card-actions">
              <button type="button" className="primary-btn" onClick={() => openSchemeDetails(scheme)}>
                {t('common.viewDetails')}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  if (scheme.youtube_url) {
                    window.open(scheme.youtube_url, '_blank', 'noopener,noreferrer');
                  } else {
                    openHowToApply(scheme.id);
                  }
                }}
                disabled={!HOW_TO_APPLY_LINKS[scheme.id] && !scheme.youtube_url}
              >
                {t('common.howToApply', { defaultValue: 'How to Apply' })}
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedScheme ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedScheme(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="scheme-modal-header">
              <h3>{selectedScheme.name}</h3>
              <button type="button" className="ghost-btn" onClick={() => setSelectedScheme(null)}>
                {t('common.close')}
              </button>
            </div>

            {isModalLoading ? (
              <LoadingSpinner label={t('schemes.loadingDetails')} />
            ) : (
              <div className="scheme-modal-content">
                <div>
                  <h4>{t('schemes.sections.eligibility')}</h4>
                  <ul>
                    {(selectedScheme.eligibility || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>{t('schemes.sections.benefits')}</h4>
                  <ul>
                    {(selectedScheme.benefits || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>{t('schemes.sections.applicationProcess')}</h4>
                  <p>{selectedScheme.application_process || t('schemes.defaults.applicationProcess')}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
