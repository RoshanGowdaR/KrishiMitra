import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'transporter_accepted_jobs';

function readSavedJobs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TransporterRouteMap() {
  const jobs = useMemo(() => readSavedJobs(), []);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');

  const openMap = (from, to) => {
    const fromValue = String(from || '').trim();
    const toValue = String(to || '').trim();
    if (!fromValue || !toValue) return;
    window.open(`https://www.google.com/maps/dir/${encodeURIComponent(fromValue)}/${encodeURIComponent(toValue)}`, '_blank');
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>Route Map</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Open turn-by-turn routes for your active jobs.</p>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Quick Route Builder</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
          <input value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="Pickup location" />
          <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination" />
          <button type="button" className="primary-btn" onClick={() => openMap(pickup, destination)}>Open in Google Maps</button>
        </div>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Routes from Accepted Jobs</h3>
          <Link to="/app/transporter/accepted-jobs" className="ghost-btn" style={{ textDecoration: 'none' }}>My Accepted Jobs</Link>
        </div>

        {jobs.length === 0 ? (
          <div style={{ marginTop: '0.9rem', border: '1px dashed #d1d5db', borderRadius: 12, padding: '1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>
              No accepted jobs found. Accept jobs first, then route shortcuts will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.9rem' }}>
            {jobs.map((job) => {
              const from = `${job.pickup_district || ''} ${job.pickup_state || ''} India`.trim();
              const to = `${job.destination || ''} India`.trim();

              return (
                <article key={job.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem' }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>📦 {job.commodity} - {job.quantity_kg} kg</p>
                  <p style={{ margin: '0.3rem 0 0' }}>FROM: {from}</p>
                  <p style={{ margin: '0.2rem 0 0' }}>TO: {to}</p>
                  <button type="button" className="ghost-btn" style={{ marginTop: '0.65rem' }} onClick={() => openMap(from, to)}>
                    Open Route
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
