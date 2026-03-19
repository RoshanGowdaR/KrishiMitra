import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { analyzeCropDiseaseImage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CropDisease() {
  const [language, setLanguage] = useState('en');
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
      toast.error('Please upload an image first.');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const data = await analyzeCropDiseaseImage({ imageBase64, language });
      setResult(data);
    } catch (analyzeError) {
      toast.error('Unable to analyze this crop image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="page-wrap crop-disease-page">
      <h2>Crop Disease Detection</h2>

      <div className="panel crop-disease-panel">
        <div
          className="upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <p>Drag & drop crop image here, or click to upload</p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        {imagePreview ? <img src={imagePreview} alt="Uploaded crop" className="crop-preview" /> : null}

        <div className="crop-controls">
          <label>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={handleAnalyze} disabled={isAnalyzing}>
            Analyze Crop
          </button>
        </div>

        {isAnalyzing ? <LoadingSpinner label="Analyzing your crop..." /> : null}

        {result && !isAnalyzing ? (
          <div className="crop-result">
            <div className="crop-result-head">
              <p><strong>Crop Type:</strong> {result.crop_type || 'Unknown'}</p>
              <p><strong>Disease:</strong> {result.disease_name || 'Not identified'}</p>
              <span className={severityClass}>{result.severity || 'Mild'}</span>
            </div>

            <div className="crop-result-grid">
              <section>
                <h4>Symptoms</h4>
                <ul>
                  {(result.symptoms || []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4>Treatment Steps</h4>
                <ul>
                  {(result.treatment || result.treatments || []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4>Prevention Tips</h4>
                <ul>
                  {(result.prevention || []).map((item, index) => (
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
