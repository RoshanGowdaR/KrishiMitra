import { useState } from 'react';
import { analyzeCropDisease } from '../services/api';

export default function CropDisease() {
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    const sample = btoa('demo-image-content');
    const data = await analyzeCropDisease({ image_base64: sample, language: 'en' });
    setResult(data);
  };

  return (
    <div className="page-wrap">
      <h2>Crop Disease Detection</h2>
      <div className="panel">
        <button type="button" className="primary-btn" onClick={handleAnalyze}>Analyze Sample Image</button>
        {result && (
          <div className="result-box">
            <p><strong>Crop:</strong> {result.crop_type}</p>
            <p><strong>Disease:</strong> {result.disease_name}</p>
            <p><strong>Severity:</strong> {result.severity}</p>
          </div>
        )}
      </div>
    </div>
  );
}
