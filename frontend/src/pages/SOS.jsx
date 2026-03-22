import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { createSosRequest, getSosHelplines } from '../services/api';

const urgencyOptions = ['low', 'medium', 'high', 'critical'];

const fallbackHelplines = [
  { name: 'Kisan Call Center', number: '1800-180-1551' },
  { name: 'PM-KISAN', number: '155261' },
];

export default function SOS() {
  const { t } = useTranslation();
  const [urgency, setUrgency] = useState('high');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [result, setResult] = useState(null);
  const [helplines, setHelplines] = useState(fallbackHelplines);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSosHelplines()
      .then((data) => {
        const national = data?.national || [];
        const parsed = national.slice(0, 3).map((item) => ({
          name: item.name,
          number: item.number,
        }));
        if (parsed.length) {
          setHelplines(parsed);
        }
      })
      .catch(() => {
        setHelplines(fallbackHelplines);
      });
  }, []);

  const readImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result || '');
      setImageBase64(image.split(',')[1] || '');
    };
    reader.readAsDataURL(file);
  };

  const triggerSos = async () => {
    setIsSubmitting(true);
    try {
      const request = await createSosRequest({
        farmer_name: 'KrishiMitra Farmer',
        phone: '9876543210',
        state: 'Karnataka',
        district: 'Hassan',
        issue_type: 'crop_disease',
        description: description || 'Emergency crop issue reported.',
        image_base64: imageBase64 || btoa('sample-image'),
        urgency,
      });
      setResult(request);
      toast.success(t('sos.messages.submitSuccess'));
    } catch (error) {
      toast.error(t('sos.messages.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showExpert = result?.fallback_level && Number(result.fallback_level) <= 3;

  return (
    <div className="page-wrap sos-page">
      <h2>{t('sos.title')}</h2>

      <section className="panel sos-main-panel">
        <button type="button" className="sos-emergency-button" onClick={triggerSos}>
          <span>🆘</span>
          <span>{t('sos.tapEmergency')}</span>
        </button>

        <div className="urgency-pill-row">
          {urgencyOptions.map((level) => (
            <button
              key={level}
              type="button"
              className={urgency === level ? `urgency-pill ${level} active` : `urgency-pill ${level}`}
              onClick={() => setUrgency(level)}
            >
              {t(`sos.urgency.${level}`)}
            </button>
          ))}
        </div>

        <label>
          {t('sos.problemDescription')}
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('sos.problemPlaceholder')}
          />
        </label>

        <label>
          {t('sos.uploadPhoto')}
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>

        <button type="button" className="danger-btn" onClick={triggerSos} disabled={isSubmitting}>
          {isSubmitting ? t('sos.submitting') : t('sos.submitRequest')}
        </button>
      </section>

      {result ? (
        <section className="panel sos-result-panel">
          <h3>{t('sos.emergencyResponse')}</h3>

          {showExpert ? (
            <article className="sos-expert-card">
              <h4>{result.assigned_expert?.name || t('sos.assignedExpert')}</h4>
              <p><strong>{t('sos.phone')}:</strong> {result.assigned_expert?.phone || 'N/A'}</p>
              <p><strong>{t('sos.specialization')}:</strong> {result.assigned_expert?.specialization || t('sos.cropSupport')}</p>
              <p><strong>{t('sos.rating')}:</strong> {'⭐'.repeat(Math.round(result.assigned_expert?.rating || 4))}</p>
              <a className="primary-btn" href={`tel:${result.assigned_expert?.phone || '18001801551'}`}>{t('common.callNow')}</a>
            </article>
          ) : (
            <article className="sos-ai-card">
              <h4>{t('sos.aiAdvice')}</h4>
              <p><strong>{t('sos.medicine')}:</strong> {result.ai_response?.medicine_name || t('sos.defaults.medicine')}</p>
              <p><strong>{t('sos.dosage')}:</strong> {result.ai_response?.dosage || t('sos.defaults.dosage')}</p>
              <ol>
                <li>{result.ai_response?.action_plan_24hr || t('sos.defaults.step1')}</li>
                <li>{result.ai_response?.action_plan_48hr || t('sos.defaults.step2')}</li>
                <li>{result.ai_response?.action_plan_72hr || t('sos.defaults.step3')}</li>
              </ol>
            </article>
          )}
        </section>
      ) : null}

      <section className="panel sos-helpline-panel">
        <h3>{t('sos.helplines')}</h3>
        <div className="sos-helpline-grid">
          {helplines.map((line, index) => (
            <article key={`helpline-${index}`} className="sos-helpline-card">
              <h4>{line.name}</h4>
              <p>{line.number}</p>
              <a className="primary-btn" href={`tel:${line.number}`}>{t('sos.call')}</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
