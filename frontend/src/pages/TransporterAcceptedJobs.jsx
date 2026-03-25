import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'transporter_accepted_jobs';

const statusText = {
  accepted: 'Accepted',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

const statusColor = {
  accepted: { bg: '#dbeafe', text: '#1d4ed8' },
  in_transit: { bg: '#ffedd5', text: '#c2410c' },
  delivered: { bg: '#dcfce7', text: '#166534' },
};

function readSavedJobs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TransporterAcceptedJobs() {
  const [jobs, setJobs] = useState(() => readSavedJobs());
  const [loading, setLoading] = useState(false);

  const profile = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('transporter_profile') || '{}');
      return {
        name: parsed?.name || '',
        phone: parsed?.phone || '',
      };
    } catch {
      return { name: '', phone: '' };
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const refreshFromSupabase = async () => {
    if (!profile.phone) {
      toast.error('Save transporter profile with phone number first.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('transport_bookings')
      .select('*')
      .eq('transporter_phone', profile.phone)
      .in('status', ['accepted', 'in_transit', 'delivered'])
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Could not refresh jobs right now.');
      setLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setJobs(rows);
    setLoading(false);
    toast.success('Accepted jobs refreshed.');
  };

  const updateJobStatus = async (job, status) => {
    const updated = { ...job, status, updated_at: new Date().toISOString() };

    if (!String(job.id).startsWith('sample-')) {
      const { error } = await supabase
        .from('transport_bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', job.id);

      if (error) {
        toast.error('Status update failed.');
        return;
      }
    }

    setJobs((prev) => prev.map((item) => (item.id === job.id ? updated : item)));
    toast.success(`Job marked as ${statusText[status] || status}.`);
  };

  const openRoute = (job) => {
    const from = `${job.pickup_district || ''} ${job.pickup_state || ''} India`.trim();
    const to = `${job.destination || ''} India`.trim();
    window.open(`https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`, '_blank');
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>My Accepted Jobs</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Manage all accepted and in-progress deliveries.</p>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Jobs</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="ghost-btn" onClick={refreshFromSupabase}>
              {loading ? 'Refreshing...' : 'Refresh from Server'}
            </button>
            <Link to="/app/transporter" className="ghost-btn" style={{ textDecoration: 'none' }}>Available Bookings</Link>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{ marginTop: '0.9rem', border: '1px dashed #d1d5db', borderRadius: 12, padding: '1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>
              No accepted jobs yet. Accept a booking from the Available Bookings page.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.8rem', marginTop: '0.9rem' }}>
            {jobs.map((job) => {
              const badge = statusColor[job.status] || statusColor.accepted;
              return (
                <article key={job.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>📦 {job.commodity} - {job.quantity_kg} kg</p>
                    <span style={{ background: badge.bg, color: badge.text, borderRadius: 999, padding: '0.2rem 0.65rem', fontWeight: 700 }}>
                      {statusText[job.status] || 'Accepted'}
                    </span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0' }}>FROM: 📍 {job.pickup_district}, {job.pickup_state}</p>
                  <p style={{ margin: '0.2rem 0 0' }}>TO: 🎯 {job.destination}</p>
                  <p style={{ margin: '0.2rem 0 0' }}>Farmer: {job.farmer_name || '-'} ({job.farmer_phone || 'NA'})</p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                    {job.status === 'accepted' ? (
                      <button type="button" className="primary-btn" style={{ background: '#f97316' }} onClick={() => updateJobStatus(job, 'in_transit')}>
                        Start Journey
                      </button>
                    ) : null}

                    {job.status === 'in_transit' ? (
                      <button type="button" className="primary-btn" style={{ background: '#16a34a' }} onClick={() => updateJobStatus(job, 'delivered')}>
                        Mark Delivered
                      </button>
                    ) : null}

                    <button type="button" className="ghost-btn" onClick={() => openRoute(job)}>Open Route Map</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
