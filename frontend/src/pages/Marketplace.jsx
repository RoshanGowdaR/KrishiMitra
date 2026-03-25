import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createListing, getListings } from '../services/api';
import { estimateTransportPrice } from '../services/marketService';
import { formatDateTimeIST } from '../utils/istTime';

const bookingStepMap = {
  pending: 1,
  accepted: 2,
  in_transit: 3,
  delivered: 4,
};

const states = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Telangana', 'Andhra Pradesh'];

const statusBadge = {
  pending: { bg: '#fef3c7', color: '#92400e', text: 'Awaiting Pickup' },
  accepted: { bg: '#dbeafe', color: '#1e40af', text: 'Transporter Assigned' },
  in_transit: { bg: '#ffedd5', color: '#c2410c', text: 'In Transit' },
  delivered: { bg: '#dcfce7', color: '#166534', text: 'Delivered ✅' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' },
};

const today = new Date().toISOString().slice(0, 10);
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

const upsertLocalBooking = (booking) => {
  const existing = readLocalBookings();
  const index = existing.findIndex((item) => item.id === booking.id);
  if (index >= 0) {
    existing[index] = booking;
  } else {
    existing.unshift(booking);
  }
  writeLocalBookings(existing);
};

const getFriendlyInsertError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('violates row-level security policy')) {
    return 'Transport table policy is blocking inserts (RLS). Please update Supabase policy.';
  }
  if (message.includes('column') && message.includes('does not exist')) {
    return 'Transport table schema mismatch detected. Please sync column names in Supabase.';
  }
  if (message.includes('invalid input syntax for type uuid')) {
    return 'Invalid farmer ID format for booking request.';
  }
  return error?.message || 'Please try again.';
};

const combineAddress = ({ state, district, taluk, place }) => ([
  place,
  taluk,
  district,
  state,
  'India',
].filter(Boolean).join(', '));

const parseColumnNameFromSupabaseError = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i);
  return match?.[1] || null;
};

const insertBookingWithSchemaFallback = async (payload) => {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await supabase.from('transport_bookings').insert(nextPayload);
    if (!error) return { error: null, insertedPayload: nextPayload };

    const badColumn = parseColumnNameFromSupabaseError(error);
    if (!badColumn || !(badColumn in nextPayload)) {
      return { error, insertedPayload: nextPayload };
    }

    delete nextPayload[badColumn];
  }

  return { error: new Error('Could not insert booking with current transport_bookings schema.'), insertedPayload: nextPayload };
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
    <div style={{ marginTop: '0.6rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.2rem', alignItems: 'center' }}>
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

export default function Marketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [searchCommodity, setSearchCommodity] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const [showListingModal, setShowListingModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [estimatingFare, setEstimatingFare] = useState(false);
  const [fareSummary, setFareSummary] = useState('');

  const [listingForm, setListingForm] = useState({
    farmer_name: '',
    phone: '',
    commodity: '',
    variety: '',
    quantity_kg: '',
    price_per_kg: '',
    state: 'Karnataka',
    district: 'Hassan',
    description: '',
  });

  const [transportForm, setTransportForm] = useState({
    pickup_state: 'Karnataka',
    pickup_district: 'Bengaluru',
    pickup_taluk: '',
    pickup_place: '',
    to_state: '',
    to_district: '',
    to_taluk: '',
    to_place: '',
    commodity: 'rice',
    quantity_kg: '',
    estimated_cost: '',
    pickup_date: today,
    farmer_name: user?.user_metadata?.full_name || '',
    farmer_phone: user?.user_metadata?.phone || '',
  });

  const detectPickupLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`;
          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) throw new Error('Reverse geocoding failed');
          const data = await response.json();
          const address = data?.address || {};

          const state = address.state || address.region || '';
          const district = address.state_district || address.county || address.city_district || address.city || '';
          const taluk = address.suburb || address.town || address.municipality || address.village || '';
          const place = address.road || address.neighbourhood || address.hamlet || address.village || address.town || '';

          setTransportForm((prev) => ({
            ...prev,
            pickup_state: state || prev.pickup_state,
            pickup_district: district || prev.pickup_district,
            pickup_taluk: taluk || prev.pickup_taluk,
            pickup_place: place || prev.pickup_place,
          }));

          toast.success('Pickup location detected');
        } catch {
          toast.error('Could not detect location details. Please fill manually.');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        toast.error('Location permission denied. Please fill pickup address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const calculateFare = async (quantityOverride) => {
    const quantityInput = quantityOverride ?? transportForm.quantity_kg;
    const quantity = Number(quantityInput || 0);
    if (!quantity) {
      toast.error('Enter quantity to estimate fare.');
      return null;
    }

    if (!transportForm.pickup_state || !transportForm.pickup_district || !transportForm.pickup_taluk || !transportForm.pickup_place) {
      toast.error('Please fill complete pickup details (state, district, taluk, place).');
      return null;
    }

    if (!transportForm.to_state || !transportForm.to_district || !transportForm.to_taluk || !transportForm.to_place) {
      toast.error('Please fill complete destination details (state, district, taluk, place).');
      return null;
    }

    const fromAddress = combineAddress({
      state: transportForm.pickup_state,
      district: transportForm.pickup_district,
      taluk: transportForm.pickup_taluk,
      place: transportForm.pickup_place,
    });

    const toAddress = combineAddress({
      state: transportForm.to_state,
      district: transportForm.to_district,
      taluk: transportForm.to_taluk,
      place: transportForm.to_place,
    });

    setEstimatingFare(true);
    try {
      const estimate = await estimateTransportPrice({
        commodity: transportForm.commodity,
        quantityKg: quantity,
        fromAddress,
        toAddress,
      });

      setTransportForm((prev) => ({
        ...prev,
        estimated_cost: String(estimate.estimatedCost),
      }));
      setFareSummary(estimate.summary || 'Fare estimated using Groq');
      toast.success(`Estimated fare: ₹${estimate.estimatedCost.toLocaleString('en-IN')}`);
      return estimate.estimatedCost;
    } catch {
      const fallback = Math.max(700, Math.round(500 + (quantity / 100) * 65));
      setTransportForm((prev) => ({ ...prev, estimated_cost: String(fallback) }));
      setFareSummary('Fallback fare used because AI estimate was unavailable.');
      toast('Using fallback transport estimate.', { icon: 'ℹ️' });
      return fallback;
    } finally {
      setEstimatingFare(false);
    }
  };

  const loadListings = async () => {
    setLoadingListings(true);
    try {
      const response = await getListings({
        commodity: searchCommodity || undefined,
        state: stateFilter === 'all' ? undefined : stateFilter,
      });
      setListings(response?.listings || []);
    } catch {
      setListings([]);
      toast.error('Failed to fetch listings');
    } finally {
      setLoadingListings(false);
    }
  };

  const loadBookings = async () => {
    if (!user?.id) return;
    setLoadingBookings(true);

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
    setLoadingBookings(false);
  };

  useEffect(() => {
    loadListings();
  }, [searchCommodity, stateFilter]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab, user?.id]);

  const visibleListings = useMemo(() => {
    if (listings.length) return listings;
    return [
      {
        id: 'sample-a', commodity: 'Rice', variety: 'Sona Masuri', price_per_kg: 34, quantity_kg: 1200,
        state: 'Karnataka', district: 'Hassan', farmer_name: 'Ravi Kumar', phone: '9876543210',
      },
      {
        id: 'sample-b', commodity: 'Maize', variety: 'HQPM-1', price_per_kg: 26, quantity_kg: 900,
        state: 'Tamil Nadu', district: 'Erode', farmer_name: 'Lakshmi', phone: '9123456789',
      },
    ];
  }, [listings]);

  const submitListing = async (event) => {
    event.preventDefault();
    await createListing({
      ...listingForm,
      quantity_kg: Number(listingForm.quantity_kg),
      price_per_kg: Number(listingForm.price_per_kg),
      status: 'active',
      available_from: today,
    });
    toast.success('Listing posted successfully');
    setShowListingModal(false);
    setListingForm({
      farmer_name: '', phone: '', commodity: '', variety: '', quantity_kg: '', price_per_kg: '',
      state: 'Karnataka', district: 'Hassan', description: '',
    });
    loadListings();
  };

  const submitTransport = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error('Please login to book transport.');
      return;
    }

    const quantity = Number(transportForm.quantity_kg || 0);
    if (!quantity) {
      toast.error('Quantity is required');
      return;
    }

    const estimatedCost = Number(transportForm.estimated_cost || 0) || await calculateFare(quantity);
    if (!estimatedCost) {
      toast.error('Could not estimate transport price.');
      return;
    }

    const fromShort = [transportForm.pickup_place, transportForm.pickup_taluk, transportForm.pickup_district].filter(Boolean).join(', ');
    const fromAddress = combineAddress({
      state: transportForm.pickup_state,
      district: transportForm.pickup_district,
      taluk: transportForm.pickup_taluk,
      place: transportForm.pickup_place,
    });
    const toAddress = combineAddress({
      state: transportForm.to_state,
      district: transportForm.to_district,
      taluk: transportForm.to_taluk,
      place: transportForm.to_place,
    });

    const payload = {
      farmer_id: user.id,
      farmer_name: transportForm.farmer_name,
      farmer_phone: transportForm.farmer_phone,
      pickup_state: transportForm.pickup_state,
      pickup_district: fromShort || transportForm.pickup_district,
      destination: toAddress,
      commodity: transportForm.commodity,
      quantity_kg: quantity,
      pickup_date: transportForm.pickup_date,
      estimated_cost: estimatedCost,
      status: 'pending',
    };

    const { error: finalError, insertedPayload } = await insertBookingWithSchemaFallback(payload);

    const localBooking = {
      id: `local-${Date.now()}`,
      ...(insertedPayload || payload),
      created_at: new Date().toISOString(),
    };

    if (finalError) {
      upsertLocalBooking(localBooking);
      toast.error(getFriendlyInsertError(finalError));
      toast.success('Booking saved locally so tracking still works.');
      console.warn('Transport booking insert failed:', finalError);
    } else {
      upsertLocalBooking(localBooking);
      toast.success('Transport booked successfully.');
    }

    setShowTransportModal(false);
    setBookingSuccess(localBooking);
    setTransportForm((prev) => ({
      ...prev,
      quantity_kg: '',
      estimated_cost: '',
      pickup_date: today,
    }));
    setFareSummary('');
    await loadBookings();
  };

  const cancelBooking = async (bookingId) => {
    if (String(bookingId).startsWith('local-')) {
      const allRows = readLocalBookings();
      writeLocalBookings(allRows.filter((row) => row.id !== bookingId));
      toast.success('Local booking removed');
      loadBookings();
      return;
    }

    const { error } = await supabase
      .from('transport_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      toast.error('Could not cancel booking');
      return;
    }

    toast.success('Booking cancelled');
    loadBookings();
  };

  return (
    <div className="page-wrap marketplace-page" style={{ gap: '0.9rem' }}>
      <div className="section-header-row">
        <h2 style={{ margin: 0 }}>Marketplace</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="primary-btn" onClick={() => setShowListingModal(true)}>List Produce</button>
          <button type="button" className="primary-btn" style={{ background: '#ea580c' }} onClick={() => setShowTransportModal(true)}>Book Transport</button>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button type="button" className={activeTab === 'listings' ? 'primary-btn' : 'ghost-btn'} onClick={() => setActiveTab('listings')}>Listings</button>
          <button type="button" className={activeTab === 'transport' ? 'primary-btn' : 'ghost-btn'} onClick={() => setActiveTab('transport')}>Transport Requests</button>
          <button type="button" className={activeTab === 'bookings' ? 'primary-btn' : 'ghost-btn'} onClick={() => setActiveTab('bookings')}>My Bookings</button>
        </div>
      </section>

      {activeTab === 'listings' ? (
        <>
          <section className="panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
              <input value={searchCommodity} onChange={(event) => setSearchCommodity(event.target.value)} placeholder="Search commodity" />
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                <option value="all">All states</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.7rem' }}>
            {loadingListings ? <p className="page-muted">Loading listings...</p> : visibleListings.map((item) => (
              <article key={item.id} className="panel">
                <h3 style={{ margin: 0 }}>{item.commodity}</h3>
                <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>{item.variety || 'Standard variety'}</p>
                <p style={{ margin: '0.35rem 0 0', fontWeight: 700, color: '#15803d' }}>₹{item.price_per_kg}/kg</p>
                <p style={{ margin: '0.3rem 0 0' }}>Quantity: {item.quantity_kg} kg</p>
                <p style={{ margin: '0.25rem 0 0' }}>📍 {item.district}, {item.state}</p>
                <p style={{ margin: '0.25rem 0 0' }}>👨‍🌾 {item.farmer_name}</p>
                <a className="marketplace-contact" href={`tel:${item.phone || '18001801551'}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  Contact Farmer
                </a>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {activeTab === 'transport' ? (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Transport Requests</h3>
          <p className="page-muted">Book pickup for your produce and track progress from My Bookings tab.</p>
          <button type="button" className="primary-btn" style={{ background: '#ea580c' }} onClick={() => setShowTransportModal(true)}>
            Book Transport
          </button>
        </section>
      ) : null}

      {activeTab === 'bookings' ? (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>My Bookings</h3>
          {loadingBookings ? <p className="page-muted">Loading bookings...</p> : null}
          {!loadingBookings && bookings.length === 0 ? <p className="page-muted">No bookings yet. Create one from Transport Requests.</p> : null}
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {bookings.map((booking) => {
              const badge = statusBadge[booking.status] || statusBadge.pending;
              const shortId = String(booking.id || '').slice(0, 8).toUpperCase();
              return (
                <article key={booking.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: '0.9rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800 }}>{booking.commodity || 'Commodity'} - {booking.pickup_date || '-'}</p>
                      <p style={{ margin: '0.2rem 0 0' }}>📍 {booking.pickup_district}, {booking.pickup_state} → {booking.destination}</p>
                      <p style={{ margin: '0.2rem 0 0' }}>Quantity: {booking.quantity_kg} kg</p>
                      <p style={{ margin: '0.2rem 0 0' }}>Estimated Cost: ₹{Number(booking.estimated_cost || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <span style={{ alignSelf: 'flex-start', borderRadius: '999px', padding: '0.25rem 0.7rem', background: badge.bg, color: badge.color, fontWeight: 700, fontSize: '0.78rem' }}>
                      {badge.text}
                    </span>
                  </div>

                  <BookingProgress status={booking.status} />

                  {booking.status !== 'cancelled' && bookingStepMap[booking.status] >= 2 ? (
                    <section style={{ marginTop: '0.7rem', background: '#f8fafc', borderRadius: 10, padding: '0.65rem', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0 }}>🚛 Transporter: {booking.transporter_name || '-'}</p>
                      <p style={{ margin: '0.2rem 0 0' }}>
                        📱 <a href={`tel:${booking.transporter_phone || ''}`}>{booking.transporter_phone || '-'}</a>
                      </p>
                      <p style={{ margin: '0.2rem 0 0' }}>📅 Estimated arrival: {booking.estimated_arrival || '-'}</p>
                    </section>
                  ) : null}

                  {booking.notes ? (
                    <section style={{ marginTop: '0.6rem', background: '#fff7ed', borderRadius: 10, padding: '0.65rem', border: '1px solid #fed7aa' }}>
                      <p style={{ margin: 0 }}>💬 Notes: {booking.notes}</p>
                    </section>
                  ) : null}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
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

                    {booking.status === 'delivered' ? (
                      <button type="button" className="primary-btn" onClick={() => toast.success('Thanks! Rating feature captured.')}>⭐ Rate Transport</button>
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
      ) : null}

      {showListingModal ? (
        <div
          role="presentation"
          onClick={() => setShowListingModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '2rem',
              width: '100%',
              maxWidth: 560,
              margin: '2rem auto 4rem auto',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowListingModal(false)}
              aria-label="Close"
              style={{
                position: 'sticky',
                top: '-2rem',
                float: 'right',
                zIndex: 10,
                width: 34,
                height: 34,
                border: '1px solid #e5e7eb',
                borderRadius: '50%',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <h3 style={{ marginTop: 0 }}>Create Listing</h3>
            <form className="soil-form-grid" onSubmit={submitListing}>
              <label>Farmer Name<input value={listingForm.farmer_name} onChange={(event) => setListingForm((prev) => ({ ...prev, farmer_name: event.target.value }))} required /></label>
              <label>Phone<input value={listingForm.phone} onChange={(event) => setListingForm((prev) => ({ ...prev, phone: event.target.value }))} required /></label>
              <label>Commodity<input value={listingForm.commodity} onChange={(event) => setListingForm((prev) => ({ ...prev, commodity: event.target.value }))} required /></label>
              <label>Variety<input value={listingForm.variety} onChange={(event) => setListingForm((prev) => ({ ...prev, variety: event.target.value }))} /></label>
              <label>Quantity (kg)<input type="number" min="1" value={listingForm.quantity_kg} onChange={(event) => setListingForm((prev) => ({ ...prev, quantity_kg: event.target.value }))} required /></label>
              <label>Price/kg<input type="number" min="1" value={listingForm.price_per_kg} onChange={(event) => setListingForm((prev) => ({ ...prev, price_per_kg: event.target.value }))} required /></label>
              <label>State<input value={listingForm.state} onChange={(event) => setListingForm((prev) => ({ ...prev, state: event.target.value }))} required /></label>
              <label>District<input value={listingForm.district} onChange={(event) => setListingForm((prev) => ({ ...prev, district: event.target.value }))} required /></label>
              <label>Description<textarea rows={3} value={listingForm.description} onChange={(event) => setListingForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#16a34a',
                  color: '#fff',
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginTop: '1.5rem',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Create Listing
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {showTransportModal ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setShowTransportModal(false)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Book Transport</h3>
            <form className="soil-form-grid" onSubmit={submitTransport}>
              <label>Pickup State<input value={transportForm.pickup_state} onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_state: event.target.value }))} required /></label>
              <label>Pickup District<input value={transportForm.pickup_district} onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_district: event.target.value }))} required /></label>
              <label>Pickup Taluk<input value={transportForm.pickup_taluk} onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_taluk: event.target.value }))} required /></label>
              <label>Pickup Place<input value={transportForm.pickup_place} onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_place: event.target.value }))} required /></label>
              <button type="button" className="ghost-btn" onClick={detectPickupLocation} disabled={detectingLocation}>
                {detectingLocation ? 'Detecting Location...' : 'Detect My Location'}
              </button>
              <label>To State<input value={transportForm.to_state} onChange={(event) => setTransportForm((prev) => ({ ...prev, to_state: event.target.value }))} required /></label>
              <label>To District<input value={transportForm.to_district} onChange={(event) => setTransportForm((prev) => ({ ...prev, to_district: event.target.value }))} required /></label>
              <label>To Taluk<input value={transportForm.to_taluk} onChange={(event) => setTransportForm((prev) => ({ ...prev, to_taluk: event.target.value }))} required /></label>
              <label>To Place<input value={transportForm.to_place} onChange={(event) => setTransportForm((prev) => ({ ...prev, to_place: event.target.value }))} required /></label>
              <label>Commodity<input value={transportForm.commodity} onChange={(event) => setTransportForm((prev) => ({ ...prev, commodity: event.target.value }))} required /></label>
              <label>Quantity (kg)<input type="number" min="1" value={transportForm.quantity_kg} onChange={(event) => setTransportForm((prev) => ({ ...prev, quantity_kg: event.target.value }))} required /></label>
              <label>Estimated Cost (INR)<input type="number" min="1" value={transportForm.estimated_cost} onChange={(event) => setTransportForm((prev) => ({ ...prev, estimated_cost: event.target.value }))} required /></label>
              <label>Pickup Date<input type="date" min={today} value={transportForm.pickup_date} onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_date: event.target.value }))} required /></label>
              <label>Farmer Name<input value={transportForm.farmer_name} onChange={(event) => setTransportForm((prev) => ({ ...prev, farmer_name: event.target.value }))} required /></label>
              <label>Farmer Phone<input value={transportForm.farmer_phone} onChange={(event) => setTransportForm((prev) => ({ ...prev, farmer_phone: event.target.value }))} required /></label>
              <button type="button" className="ghost-btn" onClick={() => calculateFare()} disabled={estimatingFare}>
                {estimatingFare ? 'Estimating Fare...' : 'Estimate Fare with Groq'}
              </button>
              {fareSummary ? <p className="page-muted" style={{ margin: 0 }}>{fareSummary}</p> : null}
              <button type="submit" className="primary-btn">Find Transport</button>
            </form>
          </section>
        </div>
      ) : null}

      {bookingSuccess ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setBookingSuccess(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <h3 style={{ marginBottom: '0.2rem' }}>Transport Booked Successfully!</h3>
            <p style={{ margin: 0 }}>Booking ID: #{String(bookingSuccess.id || '').slice(0, 8).toUpperCase()}</p>
            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: '0.8rem' }}
              onClick={() => {
                setBookingSuccess(null);
                setActiveTab('bookings');
              }}
            >
              Track in My Bookings tab
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
