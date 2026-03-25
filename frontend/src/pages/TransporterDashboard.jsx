import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Puducherry',
];

const VEHICLES = [
  'Two-Wheeler', 'Three-Wheeler', 'Truck (Small)', 'Truck (Medium)', 'Truck (Large)', 'Tempo',
];

const statusLabel = {
  accepted: 'Accepted',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

const timeAgo = (dateText) => {
  if (!dateText) return '-';
  const ms = Date.now() - new Date(dateText).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function TransporterDashboard() {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('transporter_profile') || '{}');
      return {
        vehicleType: saved.vehicleType || 'Truck (Small)',
        states: saved.states || ['Karnataka'],
        available: typeof saved.available === 'boolean' ? saved.available : true,
        name: saved.name || '',
        phone: saved.phone || '',
      };
    } catch {
      return {
        vehicleType: 'Truck (Small)',
        states: ['Karnataka'],
        available: true,
        name: '',
        phone: '',
      };
    }
  });

  const [loading, setLoading] = useState(true);
  const [allPending, setAllPending] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [hiddenBookingIds, setHiddenBookingIds] = useState([]);
  const [stateFilter, setStateFilter] = useState('all');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accepting, setAccepting] = useState(null);
  const [acceptForm, setAcceptForm] = useState({
    name: '',
    phone: '',
    vehicle: 'Truck (Small)',
    arrival: '',
    notes: '',
  });

  useEffect(() => {
    localStorage.setItem('transporter_profile', JSON.stringify(profile));
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    const [{ data: pending }, { data: accepted }] = await Promise.all([
      supabase
        .from('transport_bookings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      profile.phone
        ? supabase
          .from('transport_bookings')
          .select('*')
          .eq('transporter_phone', profile.phone)
          .in('status', ['accepted', 'in_transit', 'delivered'])
          .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setAllPending(pending || []);
    setAcceptedJobs(accepted || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile.phone]);

  const availableBookings = useMemo(() => {
    return allPending
      .filter((booking) => !hiddenBookingIds.includes(booking.id))
      .filter((booking) => (stateFilter === 'all' ? true : booking.pickup_state === stateFilter))
      .filter((booking) => (commodityFilter ? String(booking.commodity || '').toLowerCase().includes(commodityFilter.toLowerCase()) : true))
      .filter((booking) => {
        if (!fromDate && !toDate) return true;
        const dateValue = booking.pickup_date || booking.created_at;
        if (!dateValue) return false;
        const value = new Date(dateValue).getTime();
        if (fromDate && value < new Date(fromDate).getTime()) return false;
        if (toDate && value > new Date(toDate).getTime()) return false;
        return true;
      });
  }, [allPending, hiddenBookingIds, stateFilter, commodityFilter, fromDate, toDate]);

  const earnings = useMemo(() => {
    const delivered = acceptedJobs.filter((job) => job.status === 'delivered');
    const total = delivered.reduce((sum, job) => sum + Number(job.estimated_cost || 0), 0);
    return { completedCount: delivered.length, total };
  }, [acceptedJobs]);

  const openAcceptModal = (booking) => {
    setAccepting(booking);
    setAcceptForm({
      name: profile.name || '',
      phone: profile.phone || '',
      vehicle: profile.vehicleType || 'Truck (Small)',
      arrival: '',
      notes: '',
    });
  };

  const confirmAccept = async () => {
    if (!accepting) return;
    if (!acceptForm.name || !acceptForm.phone || !acceptForm.arrival) {
      toast.error('Please fill transporter name, phone and estimated arrival.');
      return;
    }

    const { error } = await supabase
      .from('transport_bookings')
      .update({
        status: 'accepted',
        transporter_name: acceptForm.name,
        transporter_phone: acceptForm.phone,
        estimated_arrival: acceptForm.arrival,
        notes: acceptForm.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accepting.id);

    if (error) {
      toast.error('Unable to accept this booking.');
      return;
    }

    await supabase.from('notifications').insert({
      user_id: accepting.farmer_id,
      title: 'Transport Booked!',
      message: `Your transport for ${accepting.commodity || 'commodity'} has been accepted by ${acceptForm.name}`,
      type: 'success',
      link: '/app/marketplace',
    });

    setProfile((prev) => ({
      ...prev,
      name: acceptForm.name,
      phone: acceptForm.phone,
      vehicleType: acceptForm.vehicle,
    }));

    toast.success('Job Accepted! Farmer will be notified.');
    setAccepting(null);
    loadData();
  };

  const updateStatus = async (bookingId, status) => {
    const { error } = await supabase
      .from('transport_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to update status.');
      return;
    }

    toast.success(status === 'in_transit' ? 'Marked as in transit' : 'Marked as delivered');
    loadData();
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>Welcome, Transporter!</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Find transport jobs near you</p>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>My Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.7rem' }}>
          <input
            value={profile.name}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Transporter name"
          />
          <input
            value={profile.phone}
            onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
          />
          <select value={profile.vehicleType} onChange={(event) => setProfile((prev) => ({ ...prev, vehicleType: event.target.value }))}>
            {VEHICLES.map((vehicle) => (
              <option key={vehicle} value={vehicle}>{vehicle}</option>
            ))}
          </select>
          <select
            multiple
            value={profile.states}
            onChange={(event) => {
              const values = Array.from(event.target.selectedOptions).map((option) => option.value);
              setProfile((prev) => ({ ...prev, states: values }));
            }}
            style={{ minHeight: 100 }}
          >
            {STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={profile.available}
              onChange={(event) => setProfile((prev) => ({ ...prev, available: event.target.checked }))}
            />
            Available
          </label>
        </div>
      </section>

      <section className="panel" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
        <h3 style={{ marginTop: 0 }}>Earnings Summary</h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dbeafe', padding: '0.75rem 1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>Completed Jobs</p>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1.3rem', color: '#1d4ed8' }}>{earnings.completedCount}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dbeafe', padding: '0.75rem 1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>Estimated Earnings</p>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1.3rem', color: '#15803d' }}>₹{earnings.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Available Bookings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem', marginBottom: '0.7rem' }}>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">All States</option>
            {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <input value={commodityFilter} onChange={(event) => setCommodityFilter(event.target.value)} placeholder="Commodity" />
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>

        {loading ? <p className="page-muted">Loading bookings...</p> : null}

        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {availableBookings.map((booking) => (
            <article key={booking.id} style={{ borderLeft: '4px solid #3b82f6', border: '1px solid #dbeafe', borderRadius: 12, padding: '0.8rem', boxShadow: '0 8px 20px rgba(30,64,175,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800 }}>📦 {booking.commodity} - {booking.quantity_kg} kg</p>
                  <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>Posted: {timeAgo(booking.created_at)}</p>
                </div>
                <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '0.2rem 0.6rem', fontWeight: 700 }}>₹{Number(booking.estimated_cost || 0).toLocaleString('en-IN')}</span>
              </div>

              <p style={{ margin: '0.5rem 0 0' }}>FROM: 📍 {booking.pickup_district}, {booking.pickup_state}</p>
              <p style={{ margin: '0.25rem 0 0' }}>TO: 🎯 {booking.destination}</p>
              <p style={{ margin: '0.25rem 0 0' }}>Pickup Date: 📅 {booking.pickup_date || '-'}</p>
              <p style={{ margin: '0.25rem 0 0' }}>Farmer: 👨‍🌾 {booking.farmer_name || 'Farmer'}</p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                <button type="button" className="primary-btn" onClick={() => openAcceptModal(booking)}>✅ Accept Job</button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setHiddenBookingIds((prev) => [...prev, booking.id])}
                >
                  ❌ Skip
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => window.open(`https://www.google.com/maps/dir/${encodeURIComponent(`${booking.pickup_district} ${booking.pickup_state}`)}/${encodeURIComponent(`${booking.destination} India`)}`, '_blank', 'noopener,noreferrer')}
                >
                  🗺️ Route Map
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>My Accepted Jobs</h3>
        {acceptedJobs.length === 0 ? (
          <p className="page-muted">No accepted jobs found for your transporter phone.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {acceptedJobs.map((booking) => (
              <article key={booking.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.75rem' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>📦 {booking.commodity} - {booking.quantity_kg} kg</p>
                <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>Status: {statusLabel[booking.status] || booking.status}</p>
                <p style={{ margin: '0.2rem 0 0' }}>Farmer Contact: {booking.farmer_phone || 'Visible after acceptance'}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                  {booking.status === 'accepted' ? (
                    <button type="button" className="primary-btn" onClick={() => updateStatus(booking.id, 'in_transit')}>
                      Mark as In Transit
                    </button>
                  ) : null}
                  {booking.status === 'in_transit' ? (
                    <button type="button" className="primary-btn" style={{ background: '#15803d' }} onClick={() => updateStatus(booking.id, 'delivered')}>
                      Mark as Delivered
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {accepting ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setAccepting(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Accept this transport job?</h3>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <input value={acceptForm.name} onChange={(event) => setAcceptForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Your name" />
              <input value={acceptForm.phone} onChange={(event) => setAcceptForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Your phone" />
              <select value={acceptForm.vehicle} onChange={(event) => setAcceptForm((prev) => ({ ...prev, vehicle: event.target.value }))}>
                {VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
              </select>
              <input type="date" value={acceptForm.arrival} onChange={(event) => setAcceptForm((prev) => ({ ...prev, arrival: event.target.value }))} />
              <textarea rows={3} value={acceptForm.notes} onChange={(event) => setAcceptForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes (optional)" />
              <button type="button" className="primary-btn" onClick={confirmAccept}>Confirm Accept</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
