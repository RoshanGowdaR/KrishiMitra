import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createSosRequest, getSosHelplines } from '../services/api';

const urgencyOptions = ['low', 'medium', 'high', 'critical'];

const fallbackHelplines = [
  { name: 'Kisan Call Center', number: '1800-180-1551' },
  { name: 'PM-KISAN', number: '155261' },
];

export default function SOS() {
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
      toast.success('SOS request submitted successfully.');
    } catch (error) {
      toast.error('Unable to submit SOS request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showExpert = result?.fallback_level && Number(result.fallback_level) <= 3;

  return (
    <div className="page-wrap sos-page">
      <h2>SOS Expert Connect</h2>

      <section className="panel sos-main-panel">
        <button type="button" className="sos-emergency-button" onClick={triggerSos}>
          <span>🆘</span>
          <span>Tap for Emergency Help</span>
        </button>

        <div className="urgency-pill-row">
          {urgencyOptions.map((level) => (
            <button
              key={level}
              type="button"
              className={urgency === level ? `urgency-pill ${level} active` : `urgency-pill ${level}`}
              onClick={() => setUrgency(level)}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>

        <label>
          Problem Description
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe your crop issue in detail"
          />
        </label>

        <label>
          Upload Crop Photo
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>

        <button type="button" className="danger-btn" onClick={triggerSos} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit SOS Request'}
        </button>
      </section>

      {result ? (
        <section className="panel sos-result-panel">
          <h3>Emergency Response</h3>

          {showExpert ? (
            <article className="sos-expert-card">
              <h4>{result.assigned_expert?.name || 'Assigned Expert'}</h4>
              <p><strong>Phone:</strong> {result.assigned_expert?.phone || 'N/A'}</p>
              <p><strong>Specialization:</strong> {result.assigned_expert?.specialization || 'Crop Support'}</p>
              <p><strong>Rating:</strong> {'⭐'.repeat(Math.round(result.assigned_expert?.rating || 4))}</p>
              <a className="primary-btn" href={`tel:${result.assigned_expert?.phone || '18001801551'}`}>Call Now</a>
            </article>
          ) : (
            <article className="sos-ai-card">
              <h4>AI Emergency Advice</h4>
              <p><strong>Medicine:</strong> {result.ai_response?.medicine_name || 'Consult nearest input center'}</p>
              <p><strong>Dosage:</strong> {result.ai_response?.dosage || 'As per label instruction'}</p>
              <ol>
                <li>{result.ai_response?.action_plan_24hr || 'Start isolation and remove infected leaves.'}</li>
                <li>{result.ai_response?.action_plan_48hr || 'Apply first treatment spray.'}</li>
                <li>{result.ai_response?.action_plan_72hr || 'Reassess spread and repeat spray if needed.'}</li>
              </ol>
            </article>
          )}
        </section>
      ) : null}

      <section className="panel sos-helpline-panel">
        <h3>Helplines</h3>
        <div className="sos-helpline-grid">
          {helplines.map((line) => (
            <article key={line.number} className="sos-helpline-card">
              <h4>{line.name}</h4>
              <p>{line.number}</p>
              <a className="primary-btn" href={`tel:${line.number}`}>Call</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
