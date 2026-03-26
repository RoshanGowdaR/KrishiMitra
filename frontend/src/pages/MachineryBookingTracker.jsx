import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const TIMELINE_STEPS = [
  { key: 'open', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'fulfilled', label: 'Fulfilled' },
];

const stepState = (currentStatus, stepKey) => {
  if (currentStatus === 'cancelled') return 'cancelled';

  const order = ['open', 'accepted', 'in_progress', 'fulfilled'];
  const currentIndex = order.indexOf(currentStatus);
  const stepIndex = order.indexOf(stepKey);
  if (currentIndex < 0 || stepIndex < 0) return 'upcoming';
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'current';
  return 'upcoming';
};

export default function MachineryBookingTracker() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [{ data: requestRows, error: requestError }, { data: offerRows, error: offerError }] = await Promise.all([
        supabase
          .from('machinery_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('machinery_offers').select('*').order('created_at', { ascending: false }),
      ]);

      if (requestError) throw requestError;
      if (offerError) throw offerError;

      setRequests(requestRows || []);
      setOffers(offerRows || []);
    } catch (error) {
      toast.error(
        String(error?.message || '').includes('relation')
          ? 'Machinery tables not found. Run backend/sql/machinery_features.sql in Supabase.'
          : 'Unable to load machinery bookings.'
      );
      setRequests([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const offerByRequest = useMemo(() => {
    const map = {};
    offers.forEach((item) => {
      if (item.request_id && item.provider_id) {
        map[`${item.request_id}:${item.provider_id}`] = item;
      }
    });
    return map;
  }, [offers]);

  const updateBookingStatus = async (requestId, status) => {
    try {
      const { error } = await supabase
        .from('machinery_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('requester_id', user?.id);

      if (error) throw error;
      toast.success('Booking updated');
      await loadData();
    } catch (error) {
      toast.error(error?.message || 'Unable to update booking status');
    }
  };

  return (
    <div className="page-wrap machineries-page">
      <section className="panel machineries-list-panel">
        <div className="machineries-section-head">
          <h3>Track Machinery Bookings</h3>
          <p className="page-muted">Track status, accepted provider details, and cancel or reopen your machinery bookings.</p>
        </div>

        {loading ? <p className="page-muted" style={{ marginBottom: 0 }}>Loading bookings...</p> : null}

        {!loading && requests.length === 0 ? (
          <p className="page-muted" style={{ marginBottom: 0 }}>No machinery bookings found.</p>
        ) : null}

        {!loading && requests.length > 0 ? (
          <div className="machineries-request-grid">
            {requests.map((item) => {
              const acceptedOffer = item.accepted_provider_id
                ? offerByRequest[`${item.id}:${item.accepted_provider_id}`]
                : null;

              return (
                <article key={item.id} className="machineries-request-card">
                  <div className="machineries-request-head">
                    <h4>{item.machinery_type}</h4>
                    <span className={`machineries-status ${item.status}`}>{item.status}</span>
                  </div>

                  <p><strong>Hours:</strong> {item.hours_required}</p>
                  <p><strong>Date:</strong> {item.required_date}</p>
                  <p><strong>Location:</strong> {[item.village, item.taluk, item.district, item.state].filter(Boolean).join(', ')}</p>
                  <p><strong>Budget/Hour:</strong> {item.budget_per_hour ? `₹${item.budget_per_hour}` : 'Not set'}</p>

                  <div className="machinery-timeline-strip" aria-label="Booking timeline">
                    {TIMELINE_STEPS.map((step) => {
                      const state = stepState(item.status, step.key);
                      return (
                        <div key={step.key} className={`machinery-timeline-step ${state}`}>
                          <span className="machinery-timeline-dot" />
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {acceptedOffer ? (
                    <section className="machineries-provider-box">
                      <p><strong>Provider:</strong> {acceptedOffer.provider_name}</p>
                      <p><strong>Provider Phone:</strong> {acceptedOffer.provider_phone}</p>
                      <p><strong>Accepted Rate:</strong> ₹{acceptedOffer.rate_per_hour}/hour</p>
                      {acceptedOffer.note ? <p><strong>Offer Note:</strong> {acceptedOffer.note}</p> : null}
                    </section>
                  ) : null}

                  <div className="machineries-actions-row">
                    {(item.status === 'open' || item.status === 'accepted' || item.status === 'in_progress') ? (
                      <button type="button" className="ghost-btn" onClick={() => updateBookingStatus(item.id, 'cancelled')}>
                        Cancel Booking
                      </button>
                    ) : null}
                    {item.status === 'cancelled' ? (
                      <button type="button" className="ghost-btn" onClick={() => updateBookingStatus(item.id, 'open')}>
                        Reopen Booking
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
