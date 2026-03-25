import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getConversation,
  getFriendRequests,
  getFriends,
  getUnreadCounts,
  markMessagesRead,
  sendMessage,
  subscribeToMessages,
  uploadChatMedia,
} from '../services/socialService';
import {
  formatDateIST,
  formatTimeIST,
  getDateKeyIST,
  getRelativeDateKeyIST,
} from '../utils/istTime';

const formatTime = (dateText) => formatTimeIST(dateText);

const groupDateLabel = (dateText) => {
  const dateKey = getDateKeyIST(dateText);
  const todayKey = getRelativeDateKeyIST(0);
  const yesterdayKey = getRelativeDateKeyIST(-1);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  return formatDateIST(dateText, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isImage = (type) => String(type || '').toLowerCase().includes('image');
const isVideo = (type) => String(type || '').toLowerCase().includes('video');

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [lastByFriend, setLastByFriend] = useState({});
  const [imageViewer, setImageViewer] = useState('');
  const messagesEndRef = useRef(null);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((item) => (item.friend?.name || '').toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const loadFriends = async () => {
    if (!user?.id) return;
    const rows = await getFriends(user.id);
    setFriends(rows || []);
  };

  const loadFriendRequests = async () => {
    if (!user?.id) return;
    const rows = await getFriendRequests(user.id);
    setFriendRequests(rows || []);
  };

  const loadUnread = async () => {
    if (!user?.id) return;
    const counts = await getUnreadCounts(user.id);
    setUnreadCounts(counts || {});
  };

  const loadLastMessages = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);

    const map = {};
    (data || []).forEach((message) => {
      const friendId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
      if (!map[friendId]) {
        map[friendId] = message;
      }
    });
    setLastByFriend(map);
  };

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    loadUnread();
    loadLastMessages();
  }, [user?.id]);

  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (!targetUserId || !friends.length) return;
    const found = friends.find((item) => item.friend?.id === targetUserId);
    if (found) {
      setSelectedFriend(found.friend);
    }
  }, [searchParams, friends]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!user?.id || !selectedFriend?.id) return;
      const conversation = await getConversation(user.id, selectedFriend.id);
      setMessages(conversation || []);
      await markMessagesRead(user.id, selectedFriend.id);
      setUnreadCounts((prev) => ({ ...prev, [selectedFriend.id]: 0 }));
      loadLastMessages();
    };

    loadConversation();
  }, [selectedFriend?.id, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const sub = subscribeToMessages(user.id, async (payload) => {
      const newMsg = payload.new;

      if (newMsg.sender_id === selectedFriend?.id) {
        setMessages((prev) => [...prev, newMsg]);
        await markMessagesRead(user.id, newMsg.sender_id);
        setUnreadCounts((prev) => ({ ...prev, [newMsg.sender_id]: 0 }));
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1,
        }));
      }

      loadLastMessages();
    });

    return () => {
      if (sub?.unsubscribe) sub.unsubscribe();
    };
  }, [selectedFriend?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onAcceptRequest = async (request) => {
    await acceptFriendRequest(request.id, request.sender_id, request.receiver_id);
    toast.success('Friend request accepted');
    loadFriendRequests();
    loadFriends();
  };

  const onDeclineRequest = async (request) => {
    await declineFriendRequest(request.id);
    toast.success('Request declined');
    loadFriendRequests();
  };

  const onPickMedia = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const onSendMessage = async () => {
    if (!user?.id || !selectedFriend?.id) return;
    const text = newMessage.trim();
    if (!text && !mediaFile) return;

    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      const uploaded = await uploadChatMedia(mediaFile, user.id);
      if (uploaded.error || !uploaded.url) {
        toast.error('Failed to upload media');
        return;
      }
      mediaUrl = uploaded.url;
      mediaType = mediaFile.type;
    }

    const sent = await sendMessage(user.id, selectedFriend.id, text, mediaUrl, mediaType);
    if (sent.error) {
      toast.error('Failed to send message');
      return;
    }

    setMessages((prev) => [...prev, sent.data]);
    setNewMessage('');
    setMediaFile(null);
    setMediaPreview(null);
    loadLastMessages();
  };

  const onKeyDownMessage = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  const renderMessageList = () => {
    let lastDateLabel = '';
    return messages.map((message) => {
      const dateLabel = groupDateLabel(message.created_at);
      const showDate = dateLabel !== lastDateLabel;
      lastDateLabel = dateLabel;
      const isMine = message.sender_id === user?.id;

      return (
        <div key={message.id}>
          {showDate ? (
            <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
              <span style={{ background: '#e5e7eb', borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.72rem', color: '#374151' }}>
                {dateLabel}
              </span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
            <div
              style={{
                maxWidth: '70%',
                background: isMine ? '#16a34a' : '#f3f4f6',
                color: isMine ? '#fff' : '#1a1a1a',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '0.7rem 1rem',
              }}
            >
              {message.content ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p> : null}

              {message.media_url && isImage(message.media_type) ? (
                <img
                  src={message.media_url}
                  alt="attachment"
                  onClick={() => setImageViewer(message.media_url)}
                  style={{ maxWidth: '200px', marginTop: '0.45rem', borderRadius: '10px', cursor: 'pointer' }}
                />
              ) : null}

              {message.media_url && isVideo(message.media_type) ? (
                <video controls style={{ maxWidth: '220px', marginTop: '0.45rem', borderRadius: '10px' }}>
                  <source src={message.media_url} />
                </video>
              ) : null}

              <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', fontSize: '0.68rem', opacity: 0.9 }}>
                <span>{formatTime(message.created_at)}</span>
                {isMine ? <span>{message.is_read ? '✓✓' : '✓'}</span> : null}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="page-wrap" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="panel" style={{ height: '100%', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
          <aside style={{ borderRight: '1px solid #e5e7eb', display: 'grid', gridTemplateRows: 'auto auto 1fr' }}>
            <div style={{ padding: '0.9rem 0.9rem 0.5rem' }}>
              <h3 style={{ margin: 0 }}>💬 Messages</h3>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search friends..."
                style={{ marginTop: '0.65rem', width: '100%' }}
              />
            </div>

            <div style={{ padding: '0 0.9rem 0.6rem' }}>
              {friendRequests.length > 0 ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRequests((prev) => !prev)}
                    style={{ width: '100%', border: '1px solid #fdba74', background: '#ffedd5', color: '#9a3412', borderRadius: '10px', padding: '0.45rem', fontWeight: 700 }}
                  >
                    {friendRequests.length} friend requests
                  </button>

                  {showRequests ? (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.45rem' }}>
                      {friendRequests.map((request) => (
                        <article key={request.id} style={{ border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.5rem' }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{request.sender?.name || 'Farmer'}</p>
                          <p className="page-muted" style={{ margin: 0 }}>{request.sender?.state || 'Unknown'}</p>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem' }}>
                            <button type="button" className="primary-btn" onClick={() => onAcceptRequest(request)}>Accept ✅</button>
                            <button type="button" className="ghost-btn" onClick={() => onDeclineRequest(request)}>Decline ❌</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={{ overflowY: 'auto', padding: '0 0.45rem 0.6rem' }}>
              {filteredFriends.length === 0 ? (
                <div style={{ padding: '0.7rem' }}>
                  <p className="page-muted">No friends yet. Find farmers to connect with!</p>
                  <button type="button" className="ghost-btn" onClick={() => navigate('/app/community')}>Find Farmers</button>
                </div>
              ) : filteredFriends.map((item) => {
                const friend = item.friend;
                const active = selectedFriend?.id === friend?.id;
                const last = lastByFriend[friend?.id];
                const unread = unreadCounts[friend?.id] || 0;

                return (
                  <button
                    key={friend?.id}
                    type="button"
                    onClick={() => setSelectedFriend(friend)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: active ? '#ecfdf3' : 'transparent',
                      borderRadius: '10px',
                      padding: '0.55rem',
                      display: 'grid',
                      gridTemplateColumns: '42px 1fr auto',
                      gap: '0.55rem',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #16a34a', background: '#dcfce7', overflow: 'hidden', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#166534' }}>
                      {friend?.avatar_url ? <img src={friend.avatar_url} alt={friend.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (friend?.name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend?.name || 'Farmer'}</p>
                      <p className="page-muted" style={{ margin: 0, fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last?.content || (last?.media_url ? 'Media message' : 'No messages yet')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {last?.created_at ? <p className="page-muted" style={{ margin: 0, fontSize: '0.68rem' }}>{formatTime(last.created_at)}</p> : null}
                      {unread > 0 ? (
                        <span style={{ marginTop: '0.25rem', background: '#16a34a', color: '#fff', borderRadius: '999px', minWidth: '20px', height: '20px', display: 'inline-grid', placeItems: 'center', fontSize: '0.68rem', fontWeight: 700, padding: '0 0.35rem' }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section style={{ display: 'grid', gridTemplateRows: selectedFriend ? 'auto 1fr auto' : '1fr', height: '100%' }}>
            {!selectedFriend ? (
              <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '2.2rem', margin: 0 }}>💬</p>
                  <h3 style={{ margin: '0.35rem 0' }}>Select a conversation</h3>
                  <p className="page-muted" style={{ margin: 0 }}>Connect with farmers and share knowledge</p>
                </div>
              </div>
            ) : (
              <>
                <header style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                      {(selectedFriend.name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{selectedFriend.name}</p>
                      <p className="page-muted" style={{ margin: 0, fontSize: '0.76rem' }}>📍 {selectedFriend.state || 'Unknown'}</p>
                    </div>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => navigate(`/app/profile/${selectedFriend.id}`)}>View Profile</button>
                </header>

                <div style={{ padding: '0.9rem', overflowY: 'auto', background: '#f9fafb' }}>
                  {renderMessageList()}
                  <div ref={messagesEndRef} />
                </div>

                <footer style={{ padding: '0.7rem', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                  {mediaPreview ? (
                    <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {isImage(mediaFile?.type) ? <img src={mediaPreview} alt="preview" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} /> : null}
                      {isVideo(mediaFile?.type) ? <video src={mediaPreview} style={{ width: '110px', borderRadius: '8px' }} controls /> : null}
                      <button type="button" className="ghost-btn" onClick={() => { setMediaFile(null); setMediaPreview(null); }}>Remove</button>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.55rem', alignItems: 'end' }}>
                    <label style={{ cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center' }}>
                      📎
                      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={onPickMedia} />
                    </label>

                    <textarea
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={onKeyDownMessage}
                      placeholder="Type a message..."
                      rows={1}
                      style={{
                        minHeight: '42px',
                        maxHeight: '120px',
                        borderRadius: '25px',
                        border: '1px solid #d1d5db',
                        padding: '0.65rem 0.9rem',
                        resize: 'vertical',
                      }}
                    />

                    <button
                      type="button"
                      onClick={onSendMessage}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      ➤
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </div>

      {imageViewer ? (
        <div
          role="presentation"
          onClick={() => setImageViewer('')}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.85)', zIndex: 400, display: 'grid', placeItems: 'center', padding: '1rem' }}
        >
          <img src={imageViewer} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '10px' }} />
        </div>
      ) : null}
    </div>
  );
}
