import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getSchemes, getSchemeDetails } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Schemes() {
  const [language, setLanguage] = useState('en');
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
          const message = 'Unable to load government schemes right now.';
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
      toast.error('Unable to load scheme details.');
    } finally {
      setIsModalLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading schemes..." />;
  }

  return (
    <div className="page-wrap schemes-page">
      <h2>Government Schemes</h2>

      <div className="schemes-toolbar">
        <label>
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="kn">Kannada</option>
          </select>
        </label>
      </div>

      {error ? <p className="page-error">{error}</p> : null}

      <div className="schemes-grid">
        {schemes.length === 0 ? <p className="page-muted">No schemes found.</p> : null}

        {schemes.map((scheme) => (
          <article key={scheme.id} className="scheme-card">
            <div className="scheme-card-tags">
              <span className="scheme-ministry">{scheme.ministry || 'Government'}</span>
              <span className="scheme-type">{scheme.scheme_type || 'General'}</span>
            </div>
            <h3>{scheme.name}</h3>
            <p>{scheme.description || 'Support scheme for farmers and agri workers.'}</p>
            <button type="button" className="primary-btn" onClick={() => openSchemeDetails(scheme)}>
              View Details
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
                Close
              </button>
            </div>

            {isModalLoading ? (
              <LoadingSpinner label="Loading details..." />
            ) : (
              <div className="scheme-modal-content">
                <div>
                  <h4>Eligibility</h4>
                  <ul>
                    {(selectedScheme.eligibility || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Benefits</h4>
                  <ul>
                    {(selectedScheme.benefits || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Application Process</h4>
                  <p>{selectedScheme.application_process || 'Visit nearest agri office for assistance.'}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
