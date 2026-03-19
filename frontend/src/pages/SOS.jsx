import { useState } from 'react';
import { createSosRequest } from '../services/api';

export default function SOS() {
  const [status, setStatus] = useState(null);

  const triggerSos = async () => {
    const request = await createSosRequest({
      farmer_name: 'Demo Farmer',
      phone: '9876543210',
      state: 'Karnataka',
      district: 'Hassan',
      issue_type: 'crop_disease',
      description: 'Severe leaf spots spreading fast',
      image_base64: btoa('sample'),
      urgency: 'critical',
    });
    setStatus(request);
  };

  return (
    <div className="page-wrap">
      <h2>SOS Expert Connect</h2>
      <div className="panel">
        <button type="button" className="danger-btn" onClick={triggerSos}>Create SOS Request</button>
        {status && (
          <div className="result-box">
            <p><strong>Status:</strong> {status.status}</p>
            <p><strong>Fallback level:</strong> {status.fallback_level}</p>
          </div>
        )}
      </div>
    </div>
  );
}
