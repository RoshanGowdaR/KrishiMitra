import { useState } from 'react';
import { analyzeSoil } from '../services/api';

export default function SoilHealth() {
  const [report, setReport] = useState(null);

  const runAnalysis = async () => {
    const payload = {
      pH: 6.8,
      nitrogen: 310,
      phosphorus: 28,
      potassium: 300,
      organic_carbon: 0.85,
      micronutrients: { zinc: 1.1, boron: 0.5, iron: 3.9 },
    };
    const result = await analyzeSoil(payload);
    setReport(result);
  };

  return (
    <div className="page-wrap">
      <h2>Soil Health</h2>
      <div className="panel">
        <button type="button" className="primary-btn" onClick={runAnalysis}>Run Soil Analysis</button>
        {report && (
          <div className="result-box">
            <p><strong>Status:</strong> {report.soil_health_status}</p>
            <p><strong>Recommended crops:</strong> {report.crop_recommendations.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
