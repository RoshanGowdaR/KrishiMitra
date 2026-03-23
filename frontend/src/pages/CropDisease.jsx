import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { analyzeCropDiseaseImage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CropDisease() {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const severityClass = useMemo(() => {
    const severity = (result?.severity || '').toLowerCase();
    if (severity.includes('severe')) return 'severity severe';
    if (severity.includes('moderate')) return 'severity moderate';
    return 'severity mild';
  }, [result?.severity]);

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const output = String(reader.result || '');
      setImagePreview(output);
      setImageBase64(output.split(',')[1] || '');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      toast.error(t('cropDisease.messages.uploadFirst'));
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const data = await analyzeCropDiseaseImage({ imageBase64, language });
      setResult(data);
    } catch (analyzeError) {
      toast.error(t('cropDisease.messages.analyzeError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="page-wrap crop-disease-page">
      <h2>{t('cropDisease.title')}</h2>

      <div className="panel crop-disease-panel">
        <div
          className="upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <p>{t('cropDisease.uploadHint')}</p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        {imagePreview ? <img src={imagePreview} alt="Uploaded crop" className="crop-preview" /> : null}

        <div className="crop-controls">
          <label>
            {t('common.language')}
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {supportedLanguages.map((item) => (
                <option key={item.code} value={item.code}>{item.native}</option>
              ))}
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={handleAnalyze} disabled={isAnalyzing}>
            {t('cropDisease.analyze')}
          </button>
        </div>

        {isAnalyzing ? <LoadingSpinner label={t('cropDisease.analyzing')} /> : null}

        {result && !isAnalyzing ? (
          <div className="crop-result">
            <div className="crop-result-head">
              <p><strong>{t('cropDisease.result.cropType')}:</strong> {result.crop_type || t('common.unknown')}</p>
              <p><strong>{t('cropDisease.result.disease')}:</strong> {result.disease_name || t('cropDisease.result.notIdentified')}</p>
              <span className={severityClass}>{result.severity || t('cropDisease.result.mild')}</span>
            </div>

            <div className="crop-result-grid">
              <section>
                <h4>{t('cropDisease.sections.symptoms')}</h4>
                <ul>
                  {(result.symptoms || []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4>{t('cropDisease.sections.treatment')}</h4>
                <ul>
                  {(result.treatment || result.treatments || []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4>{t('cropDisease.sections.prevention')}</h4>
                <ul>
                  {(result.prevention_tips || result.prevention || []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
