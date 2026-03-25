import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const VEHICLES = [
  'Two-Wheeler',
  'Three-Wheeler Tempo',
  'Mini Truck',
  'Medium Truck',
  'Large Truck',
  'Container',
];

const SAMPLE_BOOKINGS = [
  {
    id: 'sample-1',
    farmer_name: 'Ravi Kumar',
    farmer_phone: '9876543210',
    commodity: 'Rice',
    quantity_kg: 500,
    pickup_state: 'Karnataka',
    pickup_district: 'Hassan',
    destination: 'Bengaluru APMC',
    pickup_date: '2026-03-28',
    estimated_cost: 2500,
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    farmer_name: 'Suresh Patil',
    farmer_phone: '9845612345',
    commodity: 'Onion',
    quantity_kg: 1000,
    pickup_state: 'Maharashtra',
    pickup_district: 'Nashik',
    destination: 'Mumbai Market',
    pickup_date: '2026-03-27',
    estimated_cost: 4000,
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-3',
    farmer_name: 'Anand Singh',
    farmer_phone: '9654123789',
    commodity: 'Wheat',
    quantity_kg: 2000,
    pickup_state: 'Punjab',
    pickup_district: 'Ludhiana',
    destination: 'Delhi Mandi',
    pickup_date: '2026-03-30',
    estimated_cost: 8000,
    status: 'pending',
    created_at: new Date().toISOString(),
  },
];

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

const parseRouteMeta = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getDisplayFare = (booking) => {
  const numeric = Number(booking?.estimated_cost || 0);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return Math.max(600, Math.round(Number(booking?.quantity_kg || 0) * 4.5));
};

const getDisplayFrom = (booking) => {
  const meta = parseRouteMeta(booking?.route_meta);
  if (meta?.from) return meta.from;
  const district = String(booking?.pickup_district || '').trim();
  const state = String(booking?.pickup_state || '').trim();
  return [district, state].filter(Boolean).join(', ') || 'Location not provided';
};

const getDisplayTo = (booking) => {
  const meta = parseRouteMeta(booking?.route_meta);
  const destination = String(booking?.destination || '').trim();
  return meta?.to || destination || 'Destination not provided';
};

const ACCEPTED_JOBS_STORAGE_KEY = 'transporter_accepted_jobs';

function readSavedAcceptedJobs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCEPTED_JOBS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TransporterDashboard() {
  const [profile, setProfile] = useState(() => {
    const defaults = {
      name: '',
      phone: '',
      vehicle_type: 'Truck (Small)',
      operating_states: [],
      available: true,
    };

    const saved = localStorage.getItem('transporter_profile');
    if (!saved) return defaults;

    try {
      const parsed = JSON.parse(saved);
      return {
        name: parsed?.name || '',
        phone: parsed?.phone || '',
        // Backward-compatible key mapping from old dashboard structure.
        vehicle_type: parsed?.vehicle_type || parsed?.vehicleType || 'Truck (Small)',
        operating_states: Array.isArray(parsed?.operating_states)
          ? parsed.operating_states
          : Array.isArray(parsed?.states)
            ? parsed.states
            : [],
        available: typeof parsed?.available === 'boolean' ? parsed.available : true,
      };
    } catch {
      return defaults;
    }
  });

  const [availableBookings, setAvailableBookings] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState(() => readSavedAcceptedJobs());
  const [loading, setLoading] = useState(true);

  const [acceptingBooking, setAcceptingBooking] = useState(null);
  const [arrivalDate, setArrivalDate] = useState('');
  const [notes, setNotes] = useState('');

  const saveProfile = () => {
    if (!profile.name || !profile.phone) {
      toast.error('Name and phone are required');
      return;
    }
    localStorage.setItem('transporter_profile', JSON.stringify(profile));
    alert('Profile saved successfully!');
  };

  const fetchAvailableBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transport_bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      setAvailableBookings(SAMPLE_BOOKINGS);
    } else {
      setAvailableBookings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailableBookings();
  }, []);

  useEffect(() => {
    localStorage.setItem(ACCEPTED_JOBS_STORAGE_KEY, JSON.stringify(acceptedJobs));
  }, [acceptedJobs]);

  const earnings = useMemo(() => {
    const delivered = acceptedJobs.filter((job) => job.status === 'delivered');
    return {
      count: delivered.length,
      total: delivered.reduce((sum, job) => sum + Number(job.estimated_cost || 0), 0),
    };
  }, [acceptedJobs]);

  const openAcceptModal = (booking) => {
    setAcceptingBooking(booking);
    setArrivalDate('');
    setNotes('');
  };

  const confirmAccept = async () => {
    if (!acceptingBooking) return;
    if (!profile.name || !profile.phone) {
      toast.error('Save your profile first.');
      return;
    }

    const acceptedRecord = {
      ...acceptingBooking,
      status: 'accepted',
      transporter_name: profile.name,
      transporter_phone: profile.phone,
      estimated_arrival: arrivalDate,
      notes,
      updated_at: new Date().toISOString(),
    };

    if (String(acceptingBooking.id).startsWith('sample-')) {
      toast.success('Sample job accepted successfully.');
    } else {
      const { error } = await supabase
        .from('transport_bookings')
        .update({
          status: 'accepted',
          transporter_name: profile.name,
          transporter_phone: profile.phone,
          estimated_arrival: arrivalDate,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', acceptingBooking.id);

      if (error) {
        toast.error('Unable to accept this job right now.');
        return;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: acceptingBooking.farmer_id,
          title: 'Transport Accepted! 🚛',
          message: `${profile.name} has accepted your transport booking for ${acceptingBooking.commodity}. Phone: ${profile.phone}`,
          type: 'success',
          link: '/app/marketplace',
        });
    }

    setAvailableBookings((prev) => prev.filter((item) => item.id !== acceptingBooking.id));
    setAcceptedJobs((prev) => [acceptedRecord, ...prev]);
    setAcceptingBooking(null);
  };

  const skipBooking = (id) => {
    setAvailableBookings((prev) => prev.filter((item) => item.id !== id));
  };

  const updateJobStatus = async (job, status) => {
    const updated = { ...job, status, updated_at: new Date().toISOString() };

    if (!String(job.id).startsWith('sample-')) {
      const { error } = await supabase
        .from('transport_bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', job.id);

      if (error) {
        toast.error('Status update failed');
        return;
      }
    }

    setAcceptedJobs((prev) => prev.map((item) => (item.id === job.id ? updated : item)));
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>Welcome, Transporter!</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Find transport jobs near you</p>
      </section>

      <section className="panel" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
        <h3 style={{ marginTop: 0 }}>Earnings Summary</h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #dbeafe', background: '#fff', borderRadius: 12, padding: '0.75rem 1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>✅ Completed Jobs</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 800, fontSize: '1.3rem' }}>{earnings.count}</p>
          </div>
          <div style={{ border: '1px solid #dbeafe', background: '#fff', borderRadius: 12, padding: '0.75rem 1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>💰 Estimated Earnings</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 800, fontSize: '1.3rem', color: '#15803d' }}>₹{earnings.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>My Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
          <input
            value={profile.name}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            required
          />
          <input
            value={profile.phone}
            onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
            required
          />
          <select
            value={profile.vehicle_type}
            onChange={(event) => setProfile((prev) => ({ ...prev, vehicle_type: event.target.value }))}
          >
            {VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
          </select>
          <input
            value={(profile.operating_states || []).join(', ')}
            onChange={(event) => {
              const states = event.target.value.split(',').map((item) => item.trim()).filter(Boolean);
              setProfile((prev) => ({ ...prev, operating_states: states }));
            }}
            placeholder="Operating states (comma separated)"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setProfile((prev) => ({ ...prev, available: !prev.available }))}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '999px',
              padding: '0.35rem 0.8rem',
              background: profile.available ? '#dcfce7' : '#f3f4f6',
              color: profile.available ? '#166534' : '#4b5563',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {profile.available ? 'Available: ON' : 'Available: OFF'}
          </button>

          <button type="button" className="primary-btn" onClick={saveProfile}>Save Profile</button>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Available Bookings</h3>
        {loading ? <p className="page-muted">Loading bookings...</p> : null}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {availableBookings.map((booking) => (
            <article key={booking.id} style={{ background: '#fff', boxShadow: '0 10px 22px rgba(15,23,42,0.08)', borderRadius: 12, padding: '1.5rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontWeight: 800 }}>📦 {booking.commodity} - {booking.quantity_kg} kg</p>
                <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '0.2rem 0.7rem', fontWeight: 700 }}>
                  ₹{getDisplayFare(booking).toLocaleString('en-IN')}
                </span>
              </div>

              <p style={{ margin: '0.55rem 0 0' }}>FROM: 📍 {getDisplayFrom(booking)}</p>
              <p style={{ margin: '0.2rem 0 0' }}>→ TO: 🎯 {getDisplayTo(booking)}</p>
              <p style={{ margin: '0.2rem 0 0' }}>Pickup Date: 📅 {booking.pickup_date}</p>
              <p style={{ margin: '0.2rem 0 0' }}>Farmer: 👨‍🌾 {booking.farmer_name}</p>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                <button type="button" className="primary-btn" onClick={() => openAcceptModal(booking)}>✅ Accept Job</button>
                <button type="button" className="ghost-btn" onClick={() => skipBooking(booking.id)}>❌ Skip</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>My Accepted Jobs</h3>
        {acceptedJobs.length === 0 ? <p className="page-muted">No accepted jobs yet.</p> : null}
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {acceptedJobs.map((job) => {
            const badge = statusColor[job.status] || statusColor.accepted;
            return (
              <article key={job.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>📦 {job.commodity} - {job.quantity_kg} kg</p>
                  <span style={{ background: badge.bg, color: badge.text, borderRadius: 999, padding: '0.2rem 0.6rem', fontWeight: 700 }}>
                    {statusText[job.status] || 'Accepted'}
                  </span>
                </div>

                <p style={{ margin: '0.25rem 0 0' }}>FROM: 📍 {job.pickup_district}, {job.pickup_state}</p>
                <p style={{ margin: '0.2rem 0 0' }}>TO: 🎯 {job.destination}</p>
                <p style={{ margin: '0.2rem 0 0' }}>Farmer contact: {job.farmer_phone || 'Not available'}</p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                  {job.status === 'accepted' ? (
                    <button type="button" className="primary-btn" style={{ background: '#f97316' }} onClick={() => updateJobStatus(job, 'in_transit')}>
                      🚛 Start Journey
                    </button>
                  ) : null}

                  {job.status === 'in_transit' ? (
                    <button type="button" className="primary-btn" style={{ background: '#16a34a' }} onClick={() => updateJobStatus(job, 'delivered')}>
                      ✅ Mark Delivered
                    </button>
                  ) : null}

                  {job.status === 'delivered' ? (
                    <span style={{ alignSelf: 'center', color: '#166534', fontWeight: 700 }}>Delivered ✓ · ₹{Number(job.estimated_cost || 0).toLocaleString('en-IN')}</span>
                  ) : null}

                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => window.open(
                      `https://www.google.com/maps/dir/${encodeURIComponent(`${job.pickup_district} ${job.pickup_state} India`)}/${encodeURIComponent(`${job.destination} India`)}`,
                      '_blank'
                    )}
                  >
                    Route Map
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {acceptingBooking ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setAcceptingBooking(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Accept Transport Job</h3>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <input value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} placeholder="Your Name" />
              <input value={profile.phone} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Your Phone" />
              <input value={profile.vehicle_type} onChange={(event) => setProfile((prev) => ({ ...prev, vehicle_type: event.target.value }))} placeholder="Vehicle Type" />
              <input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} />
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any special notes..." />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="primary-btn" onClick={confirmAccept}>Confirm & Accept</button>
                <button type="button" className="ghost-btn" onClick={() => setAcceptingBooking(null)}>Cancel</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
