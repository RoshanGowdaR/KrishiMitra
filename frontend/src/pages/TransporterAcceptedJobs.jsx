import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'transporter_accepted_jobs';
const DIRECT_CANCEL_WINDOW_MINUTES = 10;
const CANCEL_REQUEST_PREFIX = '[CANCEL_REQUEST_PENDING]';

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

function extractCancelRequest(notes) {
  const lines = String(notes || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const requestLine = lines.find((line) => line.startsWith(CANCEL_REQUEST_PREFIX));
  if (!requestLine) return null;

  try {
    return JSON.parse(requestLine.slice(CANCEL_REQUEST_PREFIX.length));
  } catch {
    return null;
  }
}

function stripCancelRequest(notes) {
  return String(notes || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(CANCEL_REQUEST_PREFIX))
    .join('\n')
    .trim();
}

function addCancelRequest(notes, payload) {
  const clean = stripCancelRequest(notes);
  const marker = `${CANCEL_REQUEST_PREFIX}${JSON.stringify(payload)}`;
  return clean ? `${clean}\n${marker}` : marker;
}

function minutesSinceAccepted(job) {
  const acceptedAt = new Date(job?.updated_at || job?.created_at || Date.now()).getTime();
  const diff = (Date.now() - acceptedAt) / 60000;
  return Number.isFinite(diff) ? diff : DIRECT_CANCEL_WINDOW_MINUTES + 1;
}

export default function TransporterAcceptedJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(() => readSavedJobs());
  const [loading, setLoading] = useState(false);
  const [reasonByJob, setReasonByJob] = useState({});
  const [openReasonForJob, setOpenReasonForJob] = useState('');
  const [sendingRequestForJob, setSendingRequestForJob] = useState('');

  const profile = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('transporter_profile') || '{}');
      return {
        name: parsed?.name || user?.user_metadata?.full_name || '',
        phone: parsed?.phone || user?.user_metadata?.phone || '',
      };
    } catch {
      return {
        name: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
      };
    }
  }, [user?.user_metadata?.full_name, user?.user_metadata?.phone]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const refreshFromSupabase = useCallback(async () => {
    const transporterPhone = String(profile.phone || '').trim();
    const transporterName = String(profile.name || '').trim();

    if (!transporterPhone && !transporterName) {
      return;
    }

    setLoading(true);
    const baseQuery = supabase
      .from('transport_bookings')
      .select('*')
      .in('status', ['accepted', 'in_transit', 'delivered'])
      .order('updated_at', { ascending: false });

    const [{ data: byPhone, error: phoneError }, { data: byName, error: nameError }] = await Promise.all([
      transporterPhone ? baseQuery.eq('transporter_phone', transporterPhone) : Promise.resolve({ data: [], error: null }),
      transporterName ? baseQuery.eq('transporter_name', transporterName) : Promise.resolve({ data: [], error: null }),
    ]);

    const error = phoneError || nameError;

    if (error) {
      toast.error('Could not refresh jobs right now.');
      setLoading(false);
      return;
    }

    const merged = [...(Array.isArray(byPhone) ? byPhone : []), ...(Array.isArray(byName) ? byName : [])];
    const uniqueRows = [];
    const seen = new Set();
    merged.forEach((row) => {
      const key = String(row?.id || '');
      if (seen.has(key)) return;
      seen.add(key);
      uniqueRows.push(row);
    });

    const rows = uniqueRows;
    setJobs(rows);
    setLoading(false);
  }, [profile.name, profile.phone]);

  useEffect(() => {
    if (!profile.phone && !profile.name) return;
    refreshFromSupabase();
  }, [profile.name, profile.phone, refreshFromSupabase]);

  useEffect(() => {
    const transporterPhone = String(profile.phone || '').trim();
    const transporterName = String(profile.name || '').trim();
    if (!transporterPhone && !transporterName) return undefined;

    const channel = supabase
      .channel(`transporter-bookings-${transporterPhone || transporterName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transport_bookings',
          ...(transporterPhone ? { filter: `transporter_phone=eq.${transporterPhone}` } : { filter: `transporter_name=eq.${transporterName}` }),
        },
        () => {
          refreshFromSupabase();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile.name, profile.phone, refreshFromSupabase]);

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

  const notifyFarmer = async (job, title, message, type = 'warning') => {
    if (!job?.farmer_id) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: job.farmer_id,
        title,
        message,
        type,
        link: '/app/farmer/bookings',
      });
  };

  const cancelWithinWindow = async (job) => {
    if (!window.confirm('Cancel this booking now?')) return;

    if (String(job.id).startsWith('sample-')) {
      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      toast.success('Booking cancelled.');
      return;
    }

    const { error } = await supabase
      .from('transport_bookings')
      .update({
        status: 'cancelled',
        notes: stripCancelRequest(job.notes),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    if (error) {
      toast.error('Unable to cancel booking right now.');
      return;
    }

    await notifyFarmer(
      job,
      'Transport Booking Cancelled',
      `${profile.name || 'Transporter'} cancelled transport for ${job.commodity || 'your booking'} within the grace window.`,
      'error'
    );

    setJobs((prev) => prev.filter((item) => item.id !== job.id));
    toast.success('Booking cancelled.');
  };

  const requestCancellation = async (job) => {
    const reason = String(reasonByJob[job.id] || '').trim();
    if (!reason) {
      toast.error('Please enter a reason for cancellation request.');
      return;
    }

    const payload = {
      status: 'pending',
      reason,
      requested_at: new Date().toISOString(),
      transporter_name: profile.name || user?.user_metadata?.full_name || 'Transporter',
      transporter_phone: profile.phone || '',
      transporter_user_id: user?.id || null,
    };

    setSendingRequestForJob(job.id);

    if (!String(job.id).startsWith('sample-')) {
      const { error } = await supabase
        .from('transport_bookings')
        .update({
          notes: addCancelRequest(job.notes, payload),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (error) {
        toast.error('Unable to submit cancel request.');
        setSendingRequestForJob('');
        return;
      }

      await notifyFarmer(
        job,
        'Cancel Request Received',
        `${payload.transporter_name} requested cancellation for ${job.commodity || 'your booking'}. Reason: ${reason}`,
        'warning'
      );
    }

    setJobs((prev) => prev.map((item) => (
      item.id === job.id
        ? { ...item, notes: addCancelRequest(item.notes, payload), updated_at: new Date().toISOString() }
        : item
    )));
    setReasonByJob((prev) => ({ ...prev, [job.id]: '' }));
    setOpenReasonForJob('');
    setSendingRequestForJob('');
    toast.success('Cancellation request sent to farmer.');
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
              const pendingCancelRequest = extractCancelRequest(job.notes);
              const directCancelAllowed = job.status === 'accepted'
                && minutesSinceAccepted(job) <= DIRECT_CANCEL_WINDOW_MINUTES
                && !pendingCancelRequest;
              const canRequestCancel = (job.status === 'accepted' || job.status === 'in_transit')
                && !pendingCancelRequest
                && !directCancelAllowed;

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

                    {directCancelAllowed ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        style={{ borderColor: '#ef4444', color: '#b91c1c' }}
                        onClick={() => cancelWithinWindow(job)}
                      >
                        Cancel Booking
                      </button>
                    ) : null}

                    {canRequestCancel ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        style={{ borderColor: '#f59e0b', color: '#92400e' }}
                        onClick={() => setOpenReasonForJob((prev) => (prev === job.id ? '' : job.id))}
                      >
                        Request Cancel
                      </button>
                    ) : null}
                  </div>

                  {pendingCancelRequest ? (
                    <p className="page-muted" style={{ marginTop: '0.6rem', color: '#92400e' }}>
                      Cancel request pending farmer approval.
                    </p>
                  ) : null}

                  {openReasonForJob === job.id ? (
                    <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.5rem' }}>
                      <textarea
                        value={reasonByJob[job.id] || ''}
                        onChange={(event) => setReasonByJob((prev) => ({ ...prev, [job.id]: event.target.value }))}
                        placeholder="Enter reason for cancellation request"
                        style={{ minHeight: 92 }}
                      />
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => requestCancellation(job)}
                          disabled={sendingRequestForJob === job.id}
                        >
                          {sendingRequestForJob === job.id ? 'Sending...' : 'Send Request'}
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => setOpenReasonForJob('')}>Close</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
