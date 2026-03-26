import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useLanguage } from '../context/LanguageContext';
import { translateChatText } from '../services/api';
import {
  acceptLabourJob,
  cancelAcceptedLabourJob,
  createLabourRequest,
  fetchLabourDashboardData,
  respondLabourCancelRequest,
} from '../services/labourService';

const initialDraft = {
  labourNeeded: '',
  payPerPerson: '',
  workDescription: '',
  hoursRequired: '',
  location: '',
};

const statusBadge = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'filled') return { bg: '#dbeafe', color: '#1d4ed8', text: 'Filled' };
  if (value === 'cancel_requested') return { bg: '#fef3c7', color: '#92400e', text: 'Cancel requested' };
  if (value === 'cancelled') return { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' };
  return { bg: '#dcfce7', color: '#166534', text: 'Open' };
};

const withinThirtyMinutes = (isoText) => {
  const at = new Date(isoText).getTime();
  if (!Number.isFinite(at)) return false;
  return Date.now() - at <= (30 * 60 * 1000);
};

export default function LabourHub() {
  const { user } = useAuth();
  const { role } = useRole();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [working, setWorking] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [cancelReasonByAcceptance, setCancelReasonByAcceptance] = useState({});

  const [availableWork, setAvailableWork] = useState([]);
  const [myAccepted, setMyAccepted] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [translatedTextMap, setTranslatedTextMap] = useState({});
  const translatedCacheRef = useRef({});

  const requestFocusId = searchParams.get('requestId');

  const isLabourView = role === 'labour';

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const payload = await fetchLabourDashboardData({ userId: user.id });
    if (payload.error) {
      toast.error('Unable to load labour section. Ensure labour tables are created.');
      setLoading(false);
      return;
    }

    setAvailableWork(payload.availableWork || []);
    setMyAccepted(payload.myAccepted || []);
    setMyRequests(payload.myRequests || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id, role]);

  useEffect(() => {
    if (language === 'en') {
      translatedCacheRef.current = {};
      setTranslatedTextMap({});
      return;
    }

    const texts = new Set();

    availableWork.forEach((item) => {
      if (item?.work_description) texts.add(item.work_description);
      if (item?.location) texts.add(item.location);
    });

    myRequests.forEach((item) => {
      if (item?.work_description) texts.add(item.work_description);
      if (item?.location) texts.add(item.location);
      (item.acceptances || []).forEach((acc) => {
        if (acc?.cancel_reason) texts.add(acc.cancel_reason);
      });
    });

    myAccepted.forEach((acc) => {
      if (acc?.request?.work_description) texts.add(acc.request.work_description);
    });

    const missing = [...texts].filter((text) => !translatedCacheRef.current[`${language}:${text}`]);
    if (!missing.length) return;

    let active = true;
    const run = async () => {
      const translated = {};
      await Promise.all(missing.map(async (text) => {
        try {
          const result = await translateChatText({ text, target_language: language });
          translated[`${language}:${text}`] = result?.translated_text || text;
        } catch {
          translated[`${language}:${text}`] = text;
        }
      }));

      if (!active) return;
      const merged = { ...translatedCacheRef.current, ...translated };
      translatedCacheRef.current = merged;
      setTranslatedTextMap(merged);
    };

    run();
    return () => {
      active = false;
    };
  }, [language, availableWork, myRequests, myAccepted]);

  const tDynamic = (text) => {
    if (!text) return '';
    if (language === 'en') return text;
    return translatedTextMap[`${language}:${text}`] || text;
  };

  const highlightedRequest = useMemo(() => {
    if (!requestFocusId) return null;
    return myRequests.find((item) => String(item.id) === String(requestFocusId))
      || availableWork.find((item) => String(item.id) === String(requestFocusId))
      || null;
  }, [requestFocusId, myRequests, availableWork]);

  const onCreateRequest = async () => {
    if (!user?.id) return;
    const needed = Number(draft.labourNeeded);
    const pay = Number(draft.payPerPerson);
    const hours = Number(draft.hoursRequired);

    if (!needed || needed <= 0 || !pay || pay <= 0 || !hours || hours <= 0 || !draft.workDescription.trim()) {
      toast.error('Please fill all labour request details correctly');
      return;
    }

    setPosting(true);
    const { error } = await createLabourRequest({
      requesterId: user.id,
      labourNeeded: needed,
      payPerPerson: pay,
      workDescription: draft.workDescription,
      hoursRequired: hours,
      location: draft.location,
    });
    setPosting(false);

    if (error) {
      toast.error('Failed to create labour request. Check database tables.');
      return;
    }

    toast.success('Labour request posted and users notified');
    setDraft(initialDraft);
    loadData();
  };

  const onAcceptJob = async (requestId) => {
    if (!user?.id) return;
    setWorking(true);
    const { error } = await acceptLabourJob({ requestId, labourUserId: user.id });
    setWorking(false);

    if (error) {
      toast.error(error.message || 'Unable to accept request');
      return;
    }

    toast.success('Job accepted. Requester has been notified.');
    loadData();
  };

  const onCancelFromLabour = async (acceptance) => {
    if (!user?.id) return;

    const reason = cancelReasonByAcceptance[acceptance.id] || '';
    setWorking(true);
    const result = await cancelAcceptedLabourJob({
      acceptance,
      labourUserId: user.id,
      reason,
    });
    setWorking(false);

    if (result.error) {
      toast.error(result.error.message || 'Unable to process cancellation');
      return;
    }

    if (result.mode === 'direct') {
      toast.success('Accepted job cancelled');
    } else {
      toast.success('Cancellation request sent to requester');
    }

    setCancelReasonByAcceptance((prev) => ({ ...prev, [acceptance.id]: '' }));
    loadData();
  };

  const onRespondCancel = async (acceptanceId, approve) => {
    if (!user?.id) return;
    setWorking(true);
    const { error } = await respondLabourCancelRequest({ acceptanceId, approve, requesterId: user.id });
    setWorking(false);

    if (error) {
      toast.error('Unable to process cancellation response');
      return;
    }

    toast.success(approve ? 'Cancellation approved' : 'Cancellation rejected');
    loadData();
  };

  return (
    <div className="page-wrap labour-page" style={{ gap: '1rem' }}>
      <section className="panel labour-hero-panel">
        <div className="labour-hero-content">
          <h2>{isLabourView ? 'Labour Jobs' : 'Labour Requests'}</h2>
          <p className="page-muted">
          {isLabourView
            ? 'View available work and manage accepted jobs.'
            : 'Post labour needs, track acceptances, and manage cancellation requests.'}
          </p>
        </div>
      </section>

      {highlightedRequest ? (
        <section className="panel labour-highlight-panel">
          <p className="labour-highlight-title">Highlighted request from notification</p>
          <p className="page-muted labour-highlight-text">{tDynamic(highlightedRequest.work_description)}</p>
        </section>
      ) : null}

      {!isLabourView ? (
        <section className="panel labour-post-panel">
          <h3 className="labour-section-title">Post Labour Requirement</h3>
          <div className="soil-form-grid labour-form-grid">
            <label>How many labours needed
              <input value={draft.labourNeeded} type="number" min="1" onChange={(e) => setDraft((p) => ({ ...p, labourNeeded: e.target.value }))} />
            </label>
            <label>Pay per person
              <input value={draft.payPerPerson} type="number" min="1" onChange={(e) => setDraft((p) => ({ ...p, payPerPerson: e.target.value }))} />
            </label>
            <label>Work hours
              <input value={draft.hoursRequired} type="number" min="1" onChange={(e) => setDraft((p) => ({ ...p, hoursRequired: e.target.value }))} />
            </label>
            <label>Location
              <input value={draft.location} onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))} placeholder="Village / Area" />
            </label>
          </div>
          <label className="labour-description-label">Work description
            <textarea className="labour-description-area" value={draft.workDescription} rows={5} onChange={(e) => setDraft((p) => ({ ...p, workDescription: e.target.value }))} placeholder="Describe the labour work clearly, including crop type and expected task flow" />
          </label>
          <div className="labour-post-actions">
            <button type="button" className="primary-btn" onClick={onCreateRequest} disabled={posting}>
              {posting ? 'Posting...' : 'Post Labour Request'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel labour-list-panel">
        <h3 className="labour-section-title">{isLabourView ? 'Available Work' : 'My Labour Requests'}</h3>

        {loading ? (
          <p className="page-muted">Loading...</p>
        ) : null}

        {isLabourView ? (
          <div className="labour-cards-grid">
            {availableWork.length === 0 ? <p className="page-muted">No open labour jobs right now.</p> : null}
            {availableWork.map((request) => {
              const badge = statusBadge(request.status);
              return (
                <article key={request.id} className="labour-card">
                  <div className="labour-card-head">
                    <p className="labour-card-title">{tDynamic(request.work_description)}</p>
                    <span style={{ borderRadius: '999px', padding: '0.2rem 0.55rem', fontWeight: 700, fontSize: '0.76rem', background: badge.bg, color: badge.color }}>{badge.text}</span>
                  </div>
                  <p className="page-muted labour-card-meta">
                    Needed: {request.labour_needed} | Accepted: {request.accepted_count} | Pay/person: ₹{request.pay_per_person} | Hours: {request.hours_required}
                  </p>
                  <p className="page-muted labour-card-meta">
                    Posted by: {request.requester?.name || 'Farmer'} {request.location ? `| Location: ${tDynamic(request.location)}` : ''}
                  </p>
                  <div className="labour-card-actions">
                    <button type="button" className="primary-btn" onClick={() => onAcceptJob(request.id)} disabled={working}>Accept Job</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="labour-cards-grid">
            {myRequests.length === 0 ? <p className="page-muted">You have not posted any labour requests yet.</p> : null}
            {myRequests.map((request) => {
              const badge = statusBadge(request.status);
              return (
                <article key={request.id} className="labour-card">
                  <div className="labour-card-head">
                    <p className="labour-card-title">{tDynamic(request.work_description)}</p>
                    <span style={{ borderRadius: '999px', padding: '0.2rem 0.55rem', fontWeight: 700, fontSize: '0.76rem', background: badge.bg, color: badge.color }}>{badge.text}</span>
                  </div>
                  <p className="page-muted labour-card-meta">
                    Needed: {request.labour_needed} | Accepted: {request.accepted_count} | Pay/person: ₹{request.pay_per_person} | Hours: {request.hours_required}
                  </p>

                  <div className="labour-acceptance-list">
                    {request.acceptances.length === 0 ? <p className="page-muted" style={{ margin: 0 }}>No labour accepted yet.</p> : null}
                    {request.acceptances.map((acc) => (
                      <div key={acc.id} className="labour-acceptance-item">
                        <p className="labour-acceptance-title">
                          {acc.labour_user?.name || 'Labour'} - {acc.status}
                        </p>
                        <p className="page-muted labour-acceptance-meta">
                          Contact: {acc.labour_user?.phone || 'Phone not added'} | {acc.labour_user?.email || 'Email not added'}
                        </p>
                        {acc.status === 'cancel_requested' ? (
                          <div className="labour-cancel-actions">
                            <span className="page-muted" style={{ flexBasis: '100%' }}>Reason: {tDynamic(acc.cancel_reason) || 'No reason provided'}</span>
                            <button type="button" className="primary-btn" onClick={() => onRespondCancel(acc.id, true)} disabled={working}>Approve Cancel</button>
                            <button type="button" className="ghost-btn" onClick={() => onRespondCancel(acc.id, false)} disabled={working}>Reject Cancel</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isLabourView ? (
        <section className="panel labour-list-panel">
          <h3 className="labour-section-title">Accepted Jobs</h3>
          {myAccepted.length === 0 ? <p className="page-muted">No accepted jobs yet.</p> : null}
          {myAccepted.map((acc) => {
            const request = acc.request;
            const canDirectCancel = withinThirtyMinutes(acc.created_at);
            return (
              <article key={acc.id} className="labour-card">
                <p className="labour-card-title">{tDynamic(request?.work_description) || 'Labour work'}</p>
                <p className="page-muted labour-card-meta">
                  Status: {acc.status} | Pay/person: ₹{request?.pay_per_person || '-'} | Hours: {request?.hours_required || '-'}
                </p>

                {canDirectCancel ? (
                  <div className="labour-card-actions">
                    <button type="button" className="ghost-btn" onClick={() => onCancelFromLabour(acc)} disabled={working}>Cancel Accepted Job</button>
                  </div>
                ) : (
                  <div className="labour-cancel-request-box">
                    <label>Cancel reason
                      <textarea
                        rows={2}
                        className="labour-description-area"
                        value={cancelReasonByAcceptance[acc.id] || ''}
                        onChange={(e) => setCancelReasonByAcceptance((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                        placeholder="Provide proper reason"
                      />
                    </label>
                    <div>
                      <button type="button" className="ghost-btn" onClick={() => onCancelFromLabour(acc)} disabled={working || acc.status === 'cancel_requested'}>
                        {acc.status === 'cancel_requested' ? 'Cancel Request Sent' : 'Cancel Job Request'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
