import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getFriendRequests,
  getSentFriendRequestUpdates,
  getUnreadCounts,
  subscribeToFriendRequestChanges,
  subscribeToMessages,
} from '../services/socialService';
import { formatDateTimeIST } from '../utils/istTime';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatDateTime = (dateText) => {
  return formatDateTimeIST(dateText);
};

const avatarLetter = (name) => (name || 'F').trim().charAt(0).toUpperCase();

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [messageAlerts, setMessageAlerts] = useState([]);
  const [requestUpdates, setRequestUpdates] = useState([]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [incomingRequests, unreadCounts, sentUpdates, friendsRows] = await Promise.all([
        getFriendRequests(user.id),
        getUnreadCounts(user.id),
        getSentFriendRequestUpdates(user.id),
        getFriends(user.id),
      ]);

      setPendingRequests(incomingRequests || []);
      setRequestUpdates(sentUpdates || []);

      const senderIds = Object.entries(unreadCounts || {})
        .filter(([, count]) => Number(count || 0) > 0)
        .map(([senderId]) => senderId);

      const validSenderIds = senderIds.filter((senderId) => uuidRegex.test(String(senderId || '').trim()));
      const friendMap = {};

      (incomingRequests || []).forEach((request) => {
        if (request?.sender_id && request?.sender) {
          friendMap[request.sender_id] = request.sender;
        }
      });

      (friendsRows || []).forEach((row) => {
        if (row?.friend?.id) {
          friendMap[row.friend.id] = row.friend;
        }
      });

      if (senderIds.length === 0) {
        setMessageAlerts([]);
        return;
      }

      const [{ data: senderProfiles }, { data: unreadMessages }] = await Promise.all([
        validSenderIds.length > 0
          ? supabase
            .from('users')
            .select('*')
            .in('id', validSenderIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('messages')
          .select('sender_id, content, media_url, created_at')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .in('sender_id', validSenderIds.length > 0 ? validSenderIds : ['00000000-0000-0000-0000-000000000000'])
          .order('created_at', { ascending: false }),
      ]);

      const profileMap = {};
      (senderProfiles || []).forEach((row) => {
        profileMap[row.id] = row;
      });

      const latestBySender = {};
      (unreadMessages || []).forEach((message) => {
        if (!latestBySender[message.sender_id]) {
          latestBySender[message.sender_id] = message;
        }
      });

      const alerts = senderIds.map((senderId) => ({
        senderId,
        count: Number(unreadCounts[senderId] || 0),
        profile: profileMap[senderId] || friendMap[senderId] || { id: senderId, name: 'Farmer', state: 'Unknown', district: '-' },
        latest: latestBySender[senderId],
      }));

      alerts.sort((a, b) => {
        const aTime = a.latest?.created_at ? new Date(a.latest.created_at).getTime() : 0;
        const bTime = b.latest?.created_at ? new Date(b.latest.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setMessageAlerts(alerts);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const msgSub = subscribeToMessages(user.id, () => {
      loadNotifications();
    });

    const requestSub = subscribeToFriendRequestChanges(user.id, () => {
      loadNotifications();
    });

    return () => {
      if (msgSub?.unsubscribe) msgSub.unsubscribe();
      if (requestSub?.unsubscribe) requestSub.unsubscribe();
    };
  }, [loadNotifications, user?.id]);

  const totalCount = useMemo(() => {
    return pendingRequests.length + messageAlerts.reduce((sum, item) => sum + item.count, 0);
  }, [messageAlerts, pendingRequests.length]);

  const onAccept = async (request) => {
    await acceptFriendRequest(request.id, request.sender_id, request.receiver_id);
    toast.success('Friend request accepted');
    loadNotifications();
  };

  const onDecline = async (request) => {
    await declineFriendRequest(request.id);
    toast.success('Friend request declined');
    loadNotifications();
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          <p className="page-muted" style={{ margin: '0.35rem 0 0' }}>
            {loading ? 'Loading updates...' : `You have ${totalCount} active updates`}
          </p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadNotifications}>Refresh</button>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Friend Requests</h3>
        {pendingRequests.length === 0 ? (
          <p className="page-muted">No pending friend requests.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {pendingRequests.map((request) => (
              <article key={request.id} style={{ border: '1px solid #fed7aa', borderRadius: '12px', padding: '0.75rem', background: '#fff7ed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                      {avatarLetter(request.sender?.name)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{request.sender?.name || 'Farmer'}</p>
                      <p className="page-muted" style={{ margin: 0, fontSize: '0.8rem' }}>{request.sender?.state || 'Unknown'}, {request.sender?.district || '-'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="primary-btn" onClick={() => onAccept(request)}>Accept</button>
                    <button type="button" className="ghost-btn" onClick={() => onDecline(request)}>Decline</button>
                    <button type="button" className="ghost-btn" onClick={() => navigate(`/app/profile/${request.sender_id}`)}>View Profile</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Unread Messages</h3>
        {messageAlerts.length === 0 ? (
          <p className="page-muted">No unread messages.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {messageAlerts.map((alert) => (
              <article key={alert.senderId} style={{ border: '1px solid #dcfce7', borderRadius: '12px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{alert.profile?.name || 'Farmer'}</p>
                    <p className="page-muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                      {alert.latest?.content || (alert.latest?.media_url ? 'Media message' : 'New message')} · {formatDateTime(alert.latest?.created_at)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ background: '#16a34a', color: '#fff', borderRadius: '999px', padding: '0.22rem 0.55rem', fontWeight: 700, fontSize: '0.76rem' }}>
                      {alert.count} unread
                    </span>
                    <button type="button" className="ghost-btn" onClick={() => navigate(`/app/chat?user=${alert.senderId}`)}>Open Chat</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Request Updates</h3>
        {requestUpdates.length === 0 ? (
          <p className="page-muted">No recent request updates.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {requestUpdates.map((item) => (
              <article key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.7rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{item.receiver?.name || 'Farmer'}</strong> {item.status === 'accepted' ? 'accepted' : 'declined'} your friend request.
                </p>
                <p className="page-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{formatDateTime(item.created_at)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
