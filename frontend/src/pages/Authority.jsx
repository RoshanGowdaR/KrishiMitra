import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../lib/supabase';
import { sendFriendRequest } from '../services/socialService';

const ADMIN_EMAIL = 'gowdaroshan49@gmail.com';

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') || message.includes('could not find');
};

const buildDerivedUid = (id) => {
  const normalized = String(id || '').replace(/-/g, '').toUpperCase();
  if (!normalized) return '';
  return `KM${normalized.slice(0, 10)}`;
};

const toIsoAfterDays = (days) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
};

export default function Authority() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRole();
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canAccess = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return role === 'admin' || email === ADMIN_EMAIL;
  }, [role, user?.email]);

  const sendNotification = async (targetUserId, title, message, type = 'warning') => {
    if (!targetUserId) return;
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        message,
        type,
        is_read: false,
        link: '/app',
      });
    } catch {
      // Notification failure should not block moderation action.
    }
  };

  const findUserByUid = async () => {
    if (!query.trim()) {
      toast.error('Enter farmer UID to search');
      return;
    }

    setLoading(true);
    try {
      const normalizedQuery = query.trim().toUpperCase();
      const queryNoKm = normalizedQuery.startsWith('KM') ? normalizedQuery.slice(2) : normalizedQuery;

      const primaryQuery = await supabase
        .from('users')
        .select('id, user_uid, name, state, district, role, account_status, suspension_until, suspension_reason, profile_photo_url')
        .ilike('user_uid', normalizedQuery)
        .maybeSingle();

      let data = primaryQuery.data;
      let error = primaryQuery.error;

      if (error && isMissingColumnError(error)) {
        const fallbackQuery = await supabase
          .from('users')
          .select('id, user_uid, name, state, district, role, account_status, profile_photo_url')
          .ilike('user_uid', normalizedQuery)
          .maybeSingle();

        data = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error) throw error;

      if (!data) {
        const listQuery = await supabase
          .from('users')
          .select('id, user_uid, name, state, district, role, account_status, suspension_until, suspension_reason, profile_photo_url')
          .limit(600);

        let rows = listQuery.data || [];
        if (listQuery.error && isMissingColumnError(listQuery.error)) {
          const fallbackList = await supabase
            .from('users')
            .select('id, name, state, district, role, account_status, profile_photo_url')
            .limit(600);

          rows = fallbackList.data || [];
        }

        data = rows.find((row) => {
          const uid = String(row.user_uid || '').toUpperCase();
          const idRaw = String(row.id || '').replace(/-/g, '').toUpperCase();
          const derived = buildDerivedUid(row.id);
          return (
            uid.includes(normalizedQuery)
            || uid.includes(queryNoKm)
            || derived.includes(normalizedQuery)
            || derived.includes(queryNoKm)
            || idRaw.includes(queryNoKm)
          );
        }) || null;
      }

      if (!data) {
        setTarget(null);
        toast.error('No user found with this UID');
        return;
      }
      setTarget({
        ...data,
        user_uid: data.user_uid || buildDerivedUid(data.id),
      });
      toast.success('User loaded');
    } catch (error) {
      toast.error(error?.message || 'Unable to search user');
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async () => {
    if (!target?.id || !user?.id) return;
    const { error } = await sendFriendRequest(user.id, target.id);
    if (error) {
      toast.error(error.message || 'Unable to send friend request');
      return;
    }
    toast.success('Friend request sent');
  };

  const moderate = async (action) => {
    if (!target?.id) {
      toast.error('Search and select user first');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a suitable reason');
      return;
    }

    setLoading(true);
    try {
      const updatePayload = action === 'warn'
        ? {
          account_status: 'active',
          suspension_reason: reason.trim(),
        }
        : action === 'suspend_temporary'
          ? {
            account_status: 'suspended_temporary',
            suspension_until: toIsoAfterDays(7),
            suspension_reason: reason.trim(),
          }
          : {
            account_status: 'suspended_permanent',
            suspension_until: null,
            suspension_reason: reason.trim(),
          };

      const primaryUpdate = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', target.id);

      if (primaryUpdate.error && isMissingColumnError(primaryUpdate.error)) {
        const fallbackUpdate = await supabase
          .from('users')
          .update({ account_status: updatePayload.account_status })
          .eq('id', target.id);

        if (fallbackUpdate.error) throw fallbackUpdate.error;
      } else if (primaryUpdate.error) {
        throw primaryUpdate.error;
      }

      if (action === 'warn') {
        await sendNotification(
          target.id,
          'Admin Warning',
          `Warning from admin: ${reason.trim()}`,
          'warning'
        );
      } else if (action === 'suspend_temporary') {
        await sendNotification(
          target.id,
          'Account Suspended Temporarily',
          `Your account is suspended temporarily for 7 days. Reason: ${reason.trim()}`,
          'error'
        );
      } else {
        await sendNotification(
          target.id,
          'Account Suspended Permanently',
          `Your account has been banned permanently. Reason: ${reason.trim()}`,
          'error'
        );
      }

      setTarget((prev) => prev ? { ...prev, ...updatePayload } : prev);
      toast.success('Authority action completed');
      setReason('');
    } catch (error) {
      toast.error(error?.message || 'Unable to perform authority action');
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="page-wrap">
        <section className="panel">
          <h3>Authority</h3>
          <p className="page-muted" style={{ marginBottom: 0 }}>
            This section is only available to the admin account.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section
        className="panel"
        style={{
          background: 'linear-gradient(120deg, #0f3d2e, #2f855a, #85d9a6)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 18px 35px rgba(15, 23, 42, 0.22)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>Authority Control</h2>
        <p style={{ margin: '0.45rem 0 0', color: 'rgba(255,255,255,0.85)', maxWidth: 640 }}>
          Search farmers by UID, review account details, and perform warnings or suspension actions with traceable reasons.
        </p>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '0.7rem' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Fast Search</p>
            <strong style={{ fontSize: '1.02rem' }}>UID + Derived UID support</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '0.7rem' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Moderation</p>
            <strong style={{ fontSize: '1.02rem' }}>Warn / Suspend / Permanent Ban</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Search Farmer by UID</h3>
        <p className="page-muted">Use UID from profile, community search, or derived KM format.</p>

        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700, color: '#1f2937' }}>
            <span style={{ fontSize: '1.05rem' }}>Farmer UID</span>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="Enter UID (example: KM2038F8139D)"
                style={{
                  flex: '1 1 360px',
                  minHeight: 46,
                  borderRadius: 12,
                  border: '1px solid #86efac',
                  padding: '0.72rem 0.9rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#111827',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
                }}
              />
              <button
                type="button"
                className="primary-btn"
                onClick={findUserByUid}
                disabled={loading}
                style={{
                  borderRadius: 12,
                  minHeight: 46,
                  paddingInline: '1.45rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxShadow: '0 10px 20px rgba(249, 115, 22, 0.28)',
                }}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </label>
        </div>
      </section>

      {target ? (
        <section className="panel" style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)' }}>
          <h3 style={{ marginTop: 0 }}>User Profile</h3>
          <div className="social-user-card" style={{ marginTop: '0.8rem', borderRadius: 16, border: '1px solid #bbf7d0', background: 'linear-gradient(180deg, #ffffff, #f5fff8)', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    border: '2px solid #bbf7d0',
                  }}
                >
                  {(target.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem' }}>{target.name || 'Unknown User'}</h4>
                  <p style={{ margin: '0.22rem 0 0', color: '#166534', fontWeight: 700 }}>{target.user_uid || 'UID unavailable'}</p>
                </div>
              </div>

              <span
                style={{
                  borderRadius: 999,
                  padding: '0.28rem 0.75rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  background: (target.account_status || 'active') === 'active' ? '#dcfce7' : '#fee2e2',
                  color: (target.account_status || 'active') === 'active' ? '#166534' : '#b91c1c',
                  border: (target.account_status || 'active') === 'active' ? '1px solid #86efac' : '1px solid #fca5a5',
                  textTransform: 'capitalize',
                }}
              >
                {target.account_status || 'active'}
              </span>
            </div>

            <div style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
              <div style={{ border: '1px solid #dcfce7', borderRadius: 10, background: '#fff', padding: '0.62rem' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>State</p>
                <strong style={{ color: '#0f172a' }}>{target.state || 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #dcfce7', borderRadius: 10, background: '#fff', padding: '0.62rem' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>District</p>
                <strong style={{ color: '#0f172a' }}>{target.district || 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #dcfce7', borderRadius: 10, background: '#fff', padding: '0.62rem' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>Role</p>
                <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{target.role || 'farmer'}</strong>
              </div>
            </div>

            {target.suspension_reason ? (
              <div style={{ marginTop: '0.75rem', border: '1px solid #fde68a', borderRadius: 10, background: '#fef9c3', padding: '0.62rem' }}>
                <p style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: '0.8rem' }}>Last Action Reason</p>
                <p style={{ margin: '0.2rem 0 0', color: '#78350f' }}>{target.suspension_reason}</p>
              </div>
            ) : null}

            <div className="machineries-actions-row" style={{ marginTop: '0.82rem' }}>
              <button type="button" className="ghost-btn" style={{ borderRadius: 10, background: '#fff' }} onClick={() => navigate(`/app/profile/${target.id}`)}>
                Open Profile
              </button>
              <button type="button" className="ghost-btn" style={{ borderRadius: 10, background: '#fff' }} onClick={addFriend}>Add Friend</button>
            </div>
          </div>

          <label style={{ display: 'grid', gap: '0.45rem', marginTop: '1rem', fontWeight: 700, color: '#1f2937' }}>
            <span>Reason (required for warning/suspension)</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter suitable reason for this action"
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '0.75rem 0.9rem',
                fontSize: '0.95rem',
                color: '#0f172a',
                minHeight: 108,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                background: '#fff',
              }}
            />
          </label>

          <div className="machineries-actions-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="ghost-btn" style={{ borderRadius: 10, borderColor: '#f59e0b', color: '#b45309' }} onClick={() => moderate('warn')} disabled={loading}>Warn Farmer</button>
            <button type="button" className="ghost-btn" style={{ borderRadius: 10, borderColor: '#fb923c', color: '#c2410c' }} onClick={() => moderate('suspend_temporary')} disabled={loading}>Suspend Temporarily</button>
            <button type="button" className="ghost-btn" style={{ borderRadius: 10, borderColor: '#ef4444', color: '#b91c1c' }} onClick={() => moderate('suspend_permanent')} disabled={loading}>Suspend Permanently</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
