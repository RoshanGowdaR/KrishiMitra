import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../lib/supabase';

const MACHINERY_CATALOG = [
  {
    name: 'Tractor',
    image: 'https://www.mahindratractor.com/sites/default/files/styles/customwebp/public/2024-05/mahindra-265-di-sp-plus-tuff-series-blog.webp?itok=to_Ku_Zq',
  },
  {
    name: 'Rotavator',
    image: 'https://www.mahindratractor.com/sites/default/files/2025-02/what-is-a-rotavator-uses-and-benefits-explained-detail.webp',
  },
  {
    name: 'Seed Drill',
    image: 'https://m.media-amazon.com/images/I/411mkRAwyYL.jpg',
  },
  {
    name: 'Harvester',
    image: 'https://5.imimg.com/data5/WC/IE/YH/ANDROID-86040604/prod-20200810-2031297210080910753376724-jpg.jpg',
  },
  {
    name: 'Power Tiller',
    image: 'https://m.media-amazon.com/images/I/619qeZLgynL._AC_UF1000,1000_QL80_.jpg',
  },
  {
    name: 'Sprayer',
    image: 'https://www.rdsmme.com/wp-content/uploads/2022/03/AgricturalSprayer-scaled.jpg',
  },
  {
    name: 'Agriculture Drone',
    image: 'https://5.imimg.com/data5/SELLER/Default/2025/3/499469630/FU/YR/LD/23329148/agricultural-pesticide-spray-drone-services-500x500.jpg',
    isNew: true,
  },
  {
    name: 'Cultivator',
    image: 'https://cdn.britannica.com/84/73384-050-6DFF3413/crop-cultivator.jpg',
  },
  {
    name: 'Thresher',
    image: 'https://content.jdmagicbox.com/quickquotes/images_main/advanced-multi-crop-power-thresher-machine-for-all-crop-types-803419713-0m0v26o1.jpg?impolicy=queryparam&im=Resize=(360,360),aspect=fit',
  },
  {
    name: 'Other',
    image: 'https://images.unsplash.com/photo-1524486361537-8ad15938e1a3?w=600&h=400&fit=crop',
  },
];

const today = new Date().toISOString().slice(0, 10);

export default function Machineries() {
  const { user } = useAuth();
  const { role } = useRole();

  const [requests, setRequests] = useState([]);
  const [requestOffers, setRequestOffers] = useState([]);
  const [offers, setOffers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMachinery, setSelectedMachinery] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  const [form, setForm] = useState({
    farmer_name: user?.user_metadata?.full_name || '',
    phone: user?.user_metadata?.phone || '',
    machinery_type: 'Tractor',
    other_machinery: '',
    hours_required: '',
    required_date: today,
    state: 'Karnataka',
    district: 'Hassan',
    taluk: '',
    village: '',
    land_area_acres: '',
    budget_per_hour: '',
    urgency: 'normal',
    work_details: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: reqRows, error: reqError }, { data: offerRows, error: offerError }] = await Promise.all([
        supabase.from('machinery_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('machinery_offers').select('*').order('created_at', { ascending: false }),
      ]);

      if (reqError) throw reqError;
      if (offerError) throw offerError;

      setRequests(reqRows || []);
      setRequestOffers(offerRows || []);
    } catch (error) {
      setRequests([]);
      setRequestOffers([]);
      toast.error(
        String(error?.message || '').includes('relation')
          ? 'Machinery tables not found. Run backend/sql/machinery_features.sql in Supabase.'
          : 'Unable to load machinery requests right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const open = requests.filter((item) => item.status === 'open' || item.status === 'pending').length;
    const totalHours = requests.reduce((sum, item) => sum + Number(item.hours_required || 0), 0);
    const latest = requests[0];
    const latestPlace = latest ? [latest.village, latest.taluk, latest.district].filter(Boolean).join(', ') : 'No requests yet';
    return {
      open,
      totalHours,
      latestPlace,
    };
  }, [requests]);

  const openRequests = useMemo(() => requests.filter((item) => item.status === 'open'), [requests]);

  const acceptedByMe = useMemo(
    () => requests.filter(
      (item) => ['accepted', 'in_progress'].includes(item.status) && item.accepted_provider_id === user?.id
    ),
    [requests, user?.id]
  );

  const mySubmittedRequests = useMemo(
    () => requests.filter((item) => item.requester_id === user?.id),
    [requests, user?.id]
  );

  const acceptedOfferByRequest = useMemo(() => {
    const map = {};
    requestOffers.forEach((offer) => {
      if (offer.request_id && offer.provider_id) {
        map[`${offer.request_id}:${offer.provider_id}`] = offer;
      }
    });
    return map;
  }, [requestOffers]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const notifyUser = async ({ userId, title, message, link, type = 'info' }) => {
    if (!userId) return;
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        link,
        type,
        is_read: false,
      });
    } catch {
      // Notification failures should not block primary workflow.
    }
  };

  const chooseMachinery = (machineryName) => {
    setSelectedMachinery(machineryName);
    setIsFormModalOpen(true);
    setForm((prev) => ({
      ...prev,
      machinery_type: machineryName,
    }));
  };

  const onImageError = (name) => {
    setBrokenImages((prev) => ({ ...prev, [name]: true }));
  };

  useEffect(() => {
    if (!isFormModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormModalOpen]);

  const submitRequest = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Please login before submitting request');
      return false;
    }

    if (!form.farmer_name.trim() || !form.phone.trim()) {
      toast.error('Farmer name and phone are required');
      return false;
    }

    if (!form.hours_required || Number(form.hours_required) <= 0) {
      toast.error('Enter valid number of hours required');
      return false;
    }

    if (!form.machinery_type) {
      toast.error('Select machinery type');
      return false;
    }

    if (form.machinery_type === 'Other' && !form.other_machinery.trim()) {
      toast.error('Please mention machinery name in Other field');
      return false;
    }

    if (!form.state.trim() || !form.district.trim()) {
      toast.error('State and district are required');
      return false;
    }

    setSubmitting(true);
    try {
      const payload = {
        requester_id: user.id,
        farmer_name: form.farmer_name,
        phone: form.phone,
        machinery_type: form.machinery_type === 'Other' ? form.other_machinery : form.machinery_type,
        hours_required: Number(form.hours_required),
        required_date: form.required_date,
        state: form.state,
        district: form.district,
        taluk: form.taluk,
        village: form.village,
        land_area_acres: form.land_area_acres ? Number(form.land_area_acres) : null,
        budget_per_hour: form.budget_per_hour ? Number(form.budget_per_hour) : null,
        urgency: form.urgency,
        work_details: form.work_details,
        status: 'open',
      };

      const { error } = await supabase.from('machinery_requests').insert(payload);
      if (error) throw error;

      await loadData();

      setForm((prev) => ({
        ...prev,
        machinery_type: 'Tractor',
        other_machinery: '',
        hours_required: '',
        required_date: today,
        land_area_acres: '',
        budget_per_hour: '',
        urgency: 'normal',
        work_details: '',
      }));

      toast.success('Machinery request submitted');
      return true;
    } catch (error) {
      toast.error(String(error?.message || 'Unable to submit request'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    const target = requests.find((item) => item.id === requestId);
    const { error } = await supabase
      .from('machinery_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast.error('Unable to update request status');
      return;
    }

    if (target?.requester_id && target.requester_id !== user?.id) {
      await notifyUser({
        userId: target.requester_id,
        title: 'Machinery Request Updated',
        message: `Your ${target.machinery_type} request status changed to ${status}.`,
        link: '/app/machineries',
        type: status === 'fulfilled' ? 'success' : 'info',
      });
    }

    await loadData();
    toast.success('Request status updated');
  };

  const updateOfferDraft = (requestId, key, value) => {
    setOffers((prev) => ({
      ...prev,
      [requestId]: {
        provider_name: user?.user_metadata?.full_name || '',
        provider_phone: user?.user_metadata?.phone || '',
        rate_per_hour: '',
        note: '',
        ...(prev[requestId] || {}),
        [key]: value,
      },
    }));
  };

  const acceptRequest = async (requestId) => {
    if (role !== 'machinery') return;
    if (!user?.id) {
      toast.error('Please login to accept requests');
      return;
    }

    const offer = offers[requestId] || {};
    if (!offer.provider_name?.trim() || !offer.provider_phone?.trim()) {
      toast.error('Provider name and phone are required');
      return;
    }
    if (!offer.rate_per_hour || Number(offer.rate_per_hour) <= 0) {
      toast.error('Enter valid rent per hour');
      return;
    }

    try {
      const { error: offerError } = await supabase
        .from('machinery_offers')
        .upsert(
          {
            request_id: requestId,
            provider_id: user.id,
            provider_name: offer.provider_name,
            provider_phone: offer.provider_phone,
            rate_per_hour: Number(offer.rate_per_hour),
            note: offer.note || '',
            status: 'accepted',
          },
          { onConflict: 'request_id,provider_id' }
        );

      if (offerError) throw offerError;

      const { error: requestError } = await supabase
        .from('machinery_requests')
        .update({
          status: 'accepted',
          accepted_provider_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'open');

      if (requestError) throw requestError;

      const acceptedRequest = requests.find((item) => item.id === requestId);
      if (acceptedRequest?.requester_id) {
        await notifyUser({
          userId: acceptedRequest.requester_id,
          title: 'Machinery Request Accepted',
          message: `${offer.provider_name} accepted your ${acceptedRequest.machinery_type} request at ₹${Number(offer.rate_per_hour).toLocaleString('en-IN')}/hour.`,
          link: '/app/machineries',
          type: 'success',
        });
      }

      await loadData();
      toast.success('Request accepted. Farmer can contact you now.');
    } catch (error) {
      toast.error(String(error?.message || 'Unable to accept request'));
    }
  };

  return (
    <div className="page-wrap machineries-page">
      <section className="panel machineries-hero">
        <div className="machineries-hero-content">
          <h2>Machinery</h2>
          <p>{role === 'machinery' ? 'Accept nearby machinery rental requests and offer your hourly pricing.' : 'Request farm machinery rentals with clear timing, location, and work details.'}</p>
          <div className="machineries-hero-stats">
            <article>
              <strong>{stats.open}</strong>
              <span>Open Requests</span>
            </article>
            <article>
              <strong>{stats.totalHours}</strong>
              <span>Total Requested Hours</span>
            </article>
            <article>
              <strong>{stats.latestPlace}</strong>
              <span>Latest Location</span>
            </article>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="panel machineries-list-panel">
          <p className="page-muted" style={{ marginBottom: 0 }}>Loading machinery requests...</p>
        </section>
      ) : null}

      {!loading && role === 'farmer' ? (
        <>
        <section className="panel machineries-catalog-panel">
          <div className="machineries-section-head">
            <h3>Select Machinery Type</h3>
            <p className="page-muted">Choose by image first. The form will auto-fill machinery type.</p>
          </div>

          <div className="machineries-catalog-grid">
            {MACHINERY_CATALOG.map((machine) => (
              <button
                key={machine.name}
                type="button"
                className={selectedMachinery === machine.name ? 'machinery-catalog-card active' : 'machinery-catalog-card'}
                onClick={() => chooseMachinery(machine.name)}
              >
                {machine.isNew ? <span className="machinery-new-badge">NEW</span> : null}
                {selectedMachinery === machine.name ? (
                  <span className="machinery-selected-badge"><span className="machinery-selected-check">✓</span> Selected</span>
                ) : null}
                <div className="machinery-catalog-image-wrap">
                  {brokenImages[machine.name] ? (
                    <div className="machinery-image-fallback">
                      <span>Image unavailable</span>
                    </div>
                  ) : (
                    <img src={machine.image} alt={machine.name} loading="lazy" onError={() => onImageError(machine.name)} />
                  )}
                </div>
                <p>{machine.name}</p>
              </button>
            ))}
          </div>
        </section>

        {isFormModalOpen ? (
          <div className="machineries-modal-backdrop" role="presentation" onClick={() => setIsFormModalOpen(false)}>
            <section className="machineries-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="machineries-modal-head">
                <div>
                  <h3>Request Machinery</h3>
                  <p className="page-muted">Selected: <strong>{selectedMachinery || form.machinery_type}</strong></p>
                </div>
                <button type="button" className="ghost-btn" onClick={() => setIsFormModalOpen(false)}>Close</button>
              </div>

              <form className="soil-form-grid machineries-form-grid" onSubmit={async (event) => {
                const ok = await submitRequest(event);
                if (ok) {
                  setIsFormModalOpen(false);
                }
              }}>
                <label>Farmer Name<input value={form.farmer_name} onChange={(event) => updateForm('farmer_name', event.target.value)} required /></label>
                <label>Phone Number<input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} required /></label>

                <label>Machinery Type
                  <input value={form.machinery_type} readOnly />
                </label>

                <label>Hours Needed
                  <input type="number" min="1" value={form.hours_required} onChange={(event) => updateForm('hours_required', event.target.value)} required />
                </label>

                {form.machinery_type === 'Other' ? (
                  <label>Other Machinery Name<input value={form.other_machinery} onChange={(event) => updateForm('other_machinery', event.target.value)} required /></label>
                ) : null}

                <label>Required Date
                  <input type="date" min={today} value={form.required_date} onChange={(event) => updateForm('required_date', event.target.value)} required />
                </label>

                <label>State<input value={form.state} onChange={(event) => updateForm('state', event.target.value)} required /></label>
                <label>District<input value={form.district} onChange={(event) => updateForm('district', event.target.value)} required /></label>
                <label>Taluk/Tehsil<input value={form.taluk} onChange={(event) => updateForm('taluk', event.target.value)} /></label>
                <label>Village/Place<input value={form.village} onChange={(event) => updateForm('village', event.target.value)} /></label>

                <label>Land Area (acres)
                  <input type="number" min="0" step="0.1" value={form.land_area_acres} onChange={(event) => updateForm('land_area_acres', event.target.value)} />
                </label>
                <label>Budget per Hour (INR)
                  <input type="number" min="0" step="1" value={form.budget_per_hour} onChange={(event) => updateForm('budget_per_hour', event.target.value)} />
                </label>

                <label>Urgency
                  <select value={form.urgency} onChange={(event) => updateForm('urgency', event.target.value)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <label className="machineries-notes-label">
                  Work Details / Notes
                  <textarea
                    rows={4}
                    placeholder="Mention crop type, field condition, preferred start time, and any operator requirement"
                    value={form.work_details}
                    onChange={(event) => updateForm('work_details', event.target.value)}
                  />
                </label>

                <div className="machineries-submit-row">
                  <button type="submit" className="primary-btn" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        <section className="panel machineries-list-panel">
          <p className="page-muted" style={{ marginBottom: 0 }}>
            Your submitted requests: {mySubmittedRequests.length}
          </p>
        </section>
        </>
      ) : null}

      {!loading && role === 'machinery' ? (
        <>
          <section className="panel machineries-list-panel">
            <div className="machineries-section-head">
              <h3>Incoming Farmer Requests</h3>
              <p className="page-muted">Only machinery providers can view and accept these requests.</p>
            </div>

            {openRequests.length === 0 ? (
              <p className="page-muted" style={{ marginBottom: 0 }}>No open machinery requests right now.</p>
            ) : (
              <div className="machineries-request-grid">
                {openRequests.map((item) => (
                  <article key={item.id} className="machineries-request-card">
                    <div className="machineries-request-head">
                      <h4>{item.machinery_type}</h4>
                      <span className={`machineries-status ${item.status}`}>{item.status}</span>
                    </div>

                    <p><strong>Farmer:</strong> {item.farmer_name}</p>
                    <p><strong>Phone:</strong> {item.phone}</p>
                    <p><strong>Hours:</strong> {item.hours_required}</p>
                    <p><strong>Date:</strong> {item.required_date}</p>
                    <p><strong>Location:</strong> {[item.village, item.taluk, item.district, item.state].filter(Boolean).join(', ')}</p>
                    <p><strong>Budget/Hour:</strong> {item.budget_per_hour ? `₹${item.budget_per_hour}` : 'Not set'}</p>
                    <p><strong>Urgency:</strong> {item.urgency}</p>
                    {item.work_details ? <p><strong>Notes:</strong> {item.work_details}</p> : null}

                    <div className="machinery-offer-grid">
                      <label>Your Name
                        <input
                          value={offers[item.id]?.provider_name || user?.user_metadata?.full_name || ''}
                          onChange={(event) => updateOfferDraft(item.id, 'provider_name', event.target.value)}
                        />
                      </label>
                      <label>Your Phone
                        <input
                          value={offers[item.id]?.provider_phone || user?.user_metadata?.phone || ''}
                          onChange={(event) => updateOfferDraft(item.id, 'provider_phone', event.target.value)}
                        />
                      </label>
                      <label>Rent per Hour (INR)
                        <input
                          type="number"
                          min="1"
                          value={offers[item.id]?.rate_per_hour || ''}
                          onChange={(event) => updateOfferDraft(item.id, 'rate_per_hour', event.target.value)}
                        />
                      </label>
                      <label>Offer Note
                        <input
                          value={offers[item.id]?.note || ''}
                          onChange={(event) => updateOfferDraft(item.id, 'note', event.target.value)}
                          placeholder="Availability details"
                        />
                      </label>
                    </div>

                    <div className="machineries-actions-row">
                      <button type="button" className="primary-btn" onClick={() => acceptRequest(item.id)}>Accept Request</button>
                      <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'cancelled')}>Cancel Request</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel machineries-list-panel">
            <div className="machineries-section-head">
              <h3>My Accepted Jobs</h3>
            </div>

            {acceptedByMe.length === 0 ? (
              <p className="page-muted" style={{ marginBottom: 0 }}>You have not accepted any machinery requests yet.</p>
            ) : (
              <div className="machineries-request-grid">
                {acceptedByMe.map((item) => {
                  const offer = acceptedOfferByRequest[`${item.id}:${user?.id}`];
                  return (
                    <article key={item.id} className="machineries-request-card">
                      <div className="machineries-request-head">
                        <h4>{item.machinery_type}</h4>
                        <span className={`machineries-status ${item.status}`}>{item.status}</span>
                      </div>
                      <p><strong>Farmer:</strong> {item.farmer_name}</p>
                      <p><strong>Farmer Phone:</strong> {item.phone}</p>
                      <p><strong>Hours:</strong> {item.hours_required}</p>
                      <p><strong>Date:</strong> {item.required_date}</p>
                      <p><strong>Location:</strong> {[item.village, item.taluk, item.district, item.state].filter(Boolean).join(', ')}</p>
                      <p><strong>Your Rate:</strong> {offer?.rate_per_hour ? `₹${offer.rate_per_hour}/hour` : 'Not set'}</p>
                      {offer?.note ? <p><strong>Your Note:</strong> {offer.note}</p> : null}

                      <div className="machineries-actions-row">
                        {item.status === 'accepted' ? (
                          <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'in_progress')}>Start Work</button>
                        ) : null}
                        {(item.status === 'accepted' || item.status === 'in_progress') ? (
                          <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'fulfilled')}>Mark Fulfilled</button>
                        ) : null}
                        {(item.status === 'accepted' || item.status === 'in_progress') ? (
                          <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'cancelled')}>Cancel Job</button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!loading && role === 'farmer' ? (
        <section className="panel machineries-list-panel">
          <div className="machineries-section-head">
            <h3>My Submitted Requests</h3>
          </div>

          {mySubmittedRequests.length === 0 ? (
            <p className="page-muted" style={{ marginBottom: 0 }}>No requests submitted yet.</p>
          ) : (
            <div className="machineries-request-grid">
              {mySubmittedRequests.map((item) => {
                const offer = item.accepted_provider_id
                  ? acceptedOfferByRequest[`${item.id}:${item.accepted_provider_id}`]
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

                    {offer ? (
                      <section className="machineries-provider-box">
                        <p><strong>Provider:</strong> {offer.provider_name}</p>
                        <p><strong>Provider Phone:</strong> {offer.provider_phone}</p>
                        <p><strong>Accepted Rate:</strong> ₹{offer.rate_per_hour}/hour</p>
                        {offer.note ? <p><strong>Offer Note:</strong> {offer.note}</p> : null}
                      </section>
                    ) : null}

                    <div className="machineries-actions-row">
                      {(item.status === 'open' || item.status === 'accepted' || item.status === 'in_progress') ? (
                        <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'cancelled')}>Cancel Booking</button>
                      ) : null}
                      {item.status === 'cancelled' ? (
                        <button type="button" className="ghost-btn" onClick={() => updateRequestStatus(item.id, 'open')}>Reopen Booking</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {!loading && !['farmer', 'machinery'].includes(role) ? (
        <section className="panel machineries-list-panel">
          <p className="page-muted" style={{ marginBottom: 0 }}>
            This section is for Farmer request submission and Machinery-provider acceptance workflow.
          </p>
        </section>
      ) : null}
    </div>
  );
}
