import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { getSchemes, getSchemeDetails } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Schemes() {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [error, setError] = useState('');

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
            <p className="page-muted">{t('schemes.messages.regionalLanguageSoon')}</p>
            <button type="button" className="primary-btn" onClick={() => openSchemeDetails(scheme)}>
              {t('common.viewDetails')}
            </button>
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
