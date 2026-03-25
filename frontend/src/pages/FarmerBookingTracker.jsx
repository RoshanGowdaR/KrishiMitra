import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDateTimeIST } from '../utils/istTime';

const bookingStepMap = {
  pending: 1,
  accepted: 2,
  in_transit: 3,
  delivered: 4,
};

const statusBadge = {
  pending: { bg: '#fef3c7', color: '#92400e', text: 'Awaiting Pickup' },
  accepted: { bg: '#dbeafe', color: '#1e40af', text: 'Transporter Assigned' },
  in_transit: { bg: '#ffedd5', color: '#c2410c', text: 'In Transit' },
  delivered: { bg: '#dcfce7', color: '#166534', text: 'Delivered' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' },
};

const LOCAL_TRANSPORT_BOOKINGS_KEY = 'krishimitra_farmer_transport_bookings';

const readLocalBookings = (farmerId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_TRANSPORT_BOOKINGS_KEY) || '[]');
    const rows = Array.isArray(parsed) ? parsed : [];
    return farmerId ? rows.filter((item) => item.farmer_id === farmerId) : rows;
  } catch {
    return [];
  }
};

const writeLocalBookings = (bookings) => {
  localStorage.setItem(LOCAL_TRANSPORT_BOOKINGS_KEY, JSON.stringify(bookings));
};

const formatDateTime = (dateText) => {
  return formatDateTimeIST(dateText);
};

function BookingProgress({ status }) {
  if (status === 'cancelled') return null;

  const active = bookingStepMap[status] || 1;
  const labels = [
    { icon: '📋', label: 'Booked' },
    { icon: '🔍', label: 'Finding Transporter' },
    { icon: '🚛', label: 'In Transit' },
    { icon: '✅', label: 'Delivered' },
  ];

  return (
    <div style={{ marginTop: '0.7rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', alignItems: 'center' }}>
        {labels.map((item, index) => {
          const step = index + 1;
          const isDone = step <= active;
          const isCurrent = step === active;

          return (
            <div key={item.label} style={{ textAlign: 'center', position: 'relative' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  margin: '0 auto',
                  borderRadius: '50%',
                  border: isDone ? '2px solid #16a34a' : '2px solid #9ca3af',
                  background: isDone ? '#16a34a' : '#fff',
                  color: isDone ? '#fff' : '#9ca3af',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.78rem',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(22,163,74,0.15)' : 'none',
                }}
              >
                {item.icon}
              </div>

              {step < 4 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: '58%',
                    width: '88%',
                    height: 3,
                    background: step < active ? '#16a34a' : '#d1d5db',
                  }}
                />
              ) : null}

              <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: '#334155' }}>{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FarmerBookingTracker() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBookings = async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('transport_bookings')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      const localRows = readLocalBookings(user.id);
      if (localRows.length > 0) {
        setBookings(localRows);
      } else {
        toast.error('Unable to load your bookings right now.');
        setBookings([]);
      }
    } else {
      const remoteRows = data || [];
      const localRows = readLocalBookings(user.id);
      if (remoteRows.length === 0 && localRows.length > 0) {
        setBookings(localRows);
      } else {
        setBookings(remoteRows);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`farmer-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transport_bookings',
          filter: `farmer_id=eq.${user.id}`,
        },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const cancelBooking = async (bookingId) => {
    if (String(bookingId).startsWith('local-')) {
      const allRows = readLocalBookings();
      writeLocalBookings(allRows.filter((row) => row.id !== bookingId));
      toast.success('Local booking cancelled.');
      await loadBookings();
      return;
    }

    const { error } = await supabase
      .from('transport_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      toast.error('Could not cancel booking.');
      return;
    }

    toast.success('Booking cancelled.');
    await loadBookings();
  };

  const openRoute = (booking) => {
    const from = `${booking.pickup_district || ''} ${booking.pickup_state || ''} India`.trim();
    const to = `${booking.destination || ''} India`.trim();

    if (!from || !to) {
      toast.error('Route details are incomplete for this booking.');
      return;
    }

    window.open(`https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`, '_blank');
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>Transport Booking Tracker</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Track your transport bookings in real time, just like delivery apps.</p>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>My Bookings</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="button" className="ghost-btn" onClick={loadBookings}>Refresh</button>
            <Link to="/app/marketplace" className="ghost-btn" style={{ textDecoration: 'none' }}>Book New Transport</Link>
          </div>
        </div>

        {loading ? <p className="page-muted" style={{ marginTop: '0.9rem' }}>Loading bookings...</p> : null}
        {!loading && filteredBookings.length === 0 ? (
          <div style={{ marginTop: '0.9rem', border: '1px dashed #d1d5db', borderRadius: 12, padding: '1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>No bookings found for selected filter.</p>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.9rem' }}>
          {filteredBookings.map((booking) => {
            const badge = statusBadge[booking.status] || statusBadge.pending;
            const shortId = String(booking.id || '').slice(0, 8).toUpperCase();

            return (
              <article key={booking.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: '0.95rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800 }}>{booking.commodity || 'Commodity'} - {booking.pickup_date || '-'}</p>
                    <p style={{ margin: '0.25rem 0 0' }}>📍 {booking.pickup_district}, {booking.pickup_state} → {booking.destination}</p>
                    <p style={{ margin: '0.2rem 0 0' }}>Quantity: {booking.quantity_kg} kg</p>
                    <p style={{ margin: '0.2rem 0 0' }}>Estimated Cost: ₹{Number(booking.estimated_cost || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <span style={{ alignSelf: 'flex-start', borderRadius: 999, padding: '0.25rem 0.7rem', background: badge.bg, color: badge.color, fontWeight: 700, fontSize: '0.78rem' }}>
                    {badge.text}
                  </span>
                </div>

                <BookingProgress status={booking.status} />

                {booking.status !== 'cancelled' && bookingStepMap[booking.status] >= 2 ? (
                  <section style={{ marginTop: '0.7rem', background: '#f8fafc', borderRadius: 10, padding: '0.65rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0 }}>🚛 Transporter: {booking.transporter_name || '-'}</p>
                    <p style={{ margin: '0.2rem 0 0' }}>📱 {booking.transporter_phone || '-'}</p>
                    <p style={{ margin: '0.2rem 0 0' }}>📅 ETA: {booking.estimated_arrival || '-'}</p>
                  </section>
                ) : null}

                {booking.notes ? (
                  <section style={{ marginTop: '0.6rem', background: '#fff7ed', borderRadius: 10, padding: '0.65rem', border: '1px solid #fed7aa' }}>
                    <p style={{ margin: 0 }}>💬 Notes: {booking.notes}</p>
                  </section>
                ) : null}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {booking.status === 'pending' ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => cancelBooking(booking.id)}
                      style={{ borderColor: '#ef4444', color: '#b91c1c' }}
                    >
                      Cancel Booking
                    </button>
                  ) : null}

                  {(booking.status === 'accepted' || booking.status === 'in_transit' || booking.status === 'delivered') ? (
                    <button type="button" className="ghost-btn" onClick={() => openRoute(booking)}>Open Route Map</button>
                  ) : null}

                  {booking.status === 'delivered' ? (
                    <button type="button" className="primary-btn" onClick={() => toast.success('Thanks! Rating captured.')}>Rate Transport</button>
                  ) : null}
                </div>

                <div style={{ marginTop: '0.7rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.55rem' }}>
                  <p className="page-muted" style={{ margin: 0, fontSize: '0.78rem' }}>Booking ID: #{shortId}</p>
                  <p className="page-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.78rem' }}>Created: {formatDateTime(booking.created_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
