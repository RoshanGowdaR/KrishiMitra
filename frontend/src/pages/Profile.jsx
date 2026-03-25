import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendshipStatus,
  getUserById,
  removeFriend,
  sendFriendRequest,
} from '../services/socialService';
import { formatDateIST } from '../utils/istTime';

const API = 'http://127.0.0.1:8000/api/v1';

const languageLabel = (code) => {
  const normalized = (code || 'en').toLowerCase();
  if (normalized === 'hi') return 'Hindi';
  if (normalized === 'kn') return 'Kannada';
  if (normalized === 'ta') return 'Tamil';
  if (normalized === 'te') return 'Telugu';
  return 'English';
};

const formatJoinDate = (dateText) => {
  return formatDateIST(dateText, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const fallbackProfile = (user) => ({
  id: user?.id,
  user_uid: user?.id?.slice(0, 8)?.toUpperCase(),
  name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Farmer',
  email: user?.email || '-',
  phone: '',
  state: 'Karnataka',
  district: 'Hassan',
  taluk: '',
  village: '',
  preferred_language: 'en',
  avatar_url: user?.user_metadata?.avatar_url || '',
});

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', padding: '0.45rem 0', borderBottom: '1px dashed #e5e7eb' }}>
      <span style={{ color: '#4b5563', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 600, textAlign: 'right' }}>{value || 'Not added'}</span>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();

  const queryUserName = searchParams.get('user') || '';

  const isOwnByParam = !userId || userId === user?.id;
  const isLegacyNameProfile = Boolean(queryUserName);
  const isOwnProfile = isOwnByParam && !isLegacyNameProfile;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [friendship, setFriendship] = useState({ status: 'none' });

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    state: '',
    district: '',
    taluk: '',
    village: '',
    preferred_language: 'en',
  });

  const loadFriendship = async (targetId) => {
    if (!user?.id || !targetId || targetId === user.id) {
      setFriendship({ status: 'none' });
      return;
    }

    const status = await getFriendshipStatus(user.id, targetId);
    setFriendship(status || { status: 'none' });
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const forumResponse = await fetch(`${API}/forum/posts`);
        const forumData = await forumResponse.json();
        const allPosts = forumResponse.ok ? (forumData?.posts || []) : [];

        if (isLegacyNameProfile) {
          const lookup = decodeURIComponent(queryUserName);
          const byName = allPosts.filter((post) => (post.author_name || '').toLowerCase() === lookup.toLowerCase());
          setPosts(byName.slice(0, 3));
          setProfile({
            id: '',
            user_uid: '',
            name: lookup,
            email: 'Public farmer profile',
            phone: '',
            state: byName[0]?.state || 'Karnataka',
            district: byName[0]?.district || 'Hassan',
            taluk: '',
            village: '',
            preferred_language: byName[0]?.language || 'en',
            avatar_url: '',
            created_at: byName[0]?.created_at || '',
          });
          setImageFailed(false);
          setFriendship({ status: 'none' });
          return;
        }

        if (isOwnProfile) {
          const base = fallbackProfile(user);
          let merged = { ...base };

          if (user?.id) {
            const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
            if (!error && data) {
              merged = {
                ...merged,
                ...data,
                email: data.email || base.email,
                avatar_url: user?.user_metadata?.avatar_url || data.avatar_url || '',
              };
            }
          }

          const mine = allPosts
            .filter((post) => {
              const postAuthor = (post.author_name || '').toLowerCase();
              const myName = (merged.name || '').toLowerCase();
              const byId = user?.id && (post.author_id === user.id || post.user_id === user.id || post.author_user_id === user.id);
              return byId || postAuthor === myName;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setProfile(merged);
          setPosts(mine.slice(0, 3));
          setDraft({
            name: merged.name || '',
            phone: merged.phone || '',
            state: merged.state || '',
            district: merged.district || '',
            taluk: merged.taluk || '',
            village: merged.village || '',
            preferred_language: merged.preferred_language || 'en',
          });
          setImageFailed(false);
          setFriendship({ status: 'none' });
          return;
        }

        // Public user profile by userId.
        const target = await getUserById(userId);
        if (!target) {
          toast.error('User profile not found');
          setProfile(fallbackProfile(user));
          setPosts([]);
          return;
        }

        const publicPosts = allPosts
          .filter((post) => {
            const byId = post.author_id === target.id || post.user_id === target.id || post.author_user_id === target.id;
            const byName = (post.author_name || '').toLowerCase() === (target.name || '').toLowerCase();
            return byId || byName;
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setProfile({
          ...target,
          avatar_url: target.avatar_url || '',
        });
        setPosts(publicPosts.slice(0, 3));
        setImageFailed(false);
        await loadFriendship(target.id);
      } catch {
        toast.error('Unable to load profile right now');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isLegacyNameProfile, isOwnProfile, queryUserName, user, userId]);

  const onSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        email: user.email,
        name: draft.name,
        phone: draft.phone,
        state: draft.state,
        district: draft.district,
        taluk: draft.taluk,
        village: draft.village,
        preferred_language: draft.preferred_language,
      };

      const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) throw error;

      setProfile((prev) => ({
        ...prev,
        ...data,
        avatar_url: user?.user_metadata?.avatar_url || data?.avatar_url || prev?.avatar_url || '',
      }));
      setShowEdit(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onAddFriend = async () => {
    if (!user?.id || !profile?.id) return;
    const result = await sendFriendRequest(user.id, profile.id);
    if (result.error) {
      toast.error(result.error.message || 'Unable to send friend request');
      return;
    }
    toast.success('Friend request sent');
    setFriendship({ status: 'request_sent' });
  };

  const onAcceptFriend = async () => {
    if (!friendship.requestId || !user?.id || !profile?.id) return;
    await acceptFriendRequest(friendship.requestId, profile.id, user.id);
    toast.success('Friend request accepted');
    await loadFriendship(profile.id);
  };

  const onDeclineFriend = async () => {
    if (!friendship.requestId || !profile?.id) return;
    await declineFriendRequest(friendship.requestId);
    toast.success('Friend request declined');
    await loadFriendship(profile.id);
  };

  const onCancelRequest = async () => {
    if (!friendship.requestId || !profile?.id) return;
    await cancelFriendRequest(friendship.requestId);
    toast.success('Request canceled');
    await loadFriendship(profile.id);
  };

  const onRemoveFriend = async () => {
    if (!user?.id || !profile?.id) return;
    await removeFriend(user.id, profile.id);
    toast.success('Friend removed');
    await loadFriendship(profile.id);
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const avatarText = (profile?.name || user?.email || 'F').trim().charAt(0).toUpperCase();
  const languageCode = profile?.preferred_language || 'en';
  const locationText = `${profile?.state || 'Karnataka'}, ${profile?.district || 'Hassan'}`;

  const joinedLabel = useMemo(() => formatJoinDate(profile?.created_at || user?.created_at), [profile?.created_at, user?.created_at]);

  if (loading) {
    return (
      <div className="page-wrap">
        <section className="panel">Loading profile...</section>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ gap: '1.1rem' }}>
      <section className="panel" style={{ padding: '1.4rem', background: '#fff' }}>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <div>
                {avatarUrl && !imageFailed ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.name || 'Profile'}
                    onError={() => setImageFailed(true)}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      border: '3px solid #16a34a',
                      objectFit: 'cover',
                      background: '#fff',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      border: '3px solid #16a34a',
                      background: '#16a34a',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {avatarText}
                  </div>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#111827' }}>{profile?.name || 'Farmer'}</h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>{profile?.email || '-'}</p>
              <span
                style={{
                  width: 'fit-content',
                  background: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '999px',
                  padding: '0.25rem 0.65rem',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                📍 {locationText}
              </span>
            </div>

            {!isOwnProfile && !isLegacyNameProfile ? (
              <div style={{ display: 'grid', gap: '0.5rem', minWidth: '220px' }}>
                {friendship.status === 'none' ? (
                  <button type="button" className="primary-btn" onClick={onAddFriend}>➕ Add Friend</button>
                ) : null}

                {friendship.status === 'request_sent' ? (
                  <>
                    <button type="button" className="ghost-btn" disabled>Request Sent ⏳</button>
                    <button type="button" className="ghost-btn" onClick={onCancelRequest}>Cancel Request</button>
                  </>
                ) : null}

                {friendship.status === 'request_received' ? (
                  <>
                    <button type="button" className="primary-btn" onClick={onAcceptFriend}>✅ Accept Friend Request</button>
                    <button type="button" className="ghost-btn" style={{ borderColor: '#ef4444', color: '#b91c1c' }} onClick={onDeclineFriend}>❌ Decline</button>
                  </>
                ) : null}

                {friendship.status === 'friends' ? (
                  <>
                    <button type="button" className="ghost-btn" style={{ borderColor: '#16a34a', color: '#166534' }} disabled>👥 Friends ✓</button>
                    <button type="button" className="primary-btn" style={{ background: '#f97316' }} onClick={() => navigate(`/app/chat?user=${profile?.id}`)}>💬 Send Message</button>
                    <button type="button" className="ghost-btn" style={{ borderColor: '#ef4444', color: '#b91c1c' }} onClick={onRemoveFriend}>Remove Friend</button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: '0.4rem', display: 'grid', gap: '0.7rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div style={{ border: '1px solid #d1fae5', borderRadius: '10px', padding: '0.65rem', background: '#f0fdf4' }}>
              <p style={{ margin: 0, color: '#166534', fontSize: '0.8rem' }}>Posts</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{posts.length}</p>
            </div>
            <div style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '0.65rem', background: '#fff' }}>
              <p style={{ margin: 0, color: '#166534', fontSize: '0.8rem' }}>Joined</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{joinedLabel}</p>
            </div>
            <div style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '0.65rem', background: '#fff' }}>
              <p style={{ margin: 0, color: '#166534', fontSize: '0.8rem' }}>Language</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{languageLabel(languageCode)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <article style={{ border: '1px solid #d1fae5', borderRadius: '12px', padding: '1rem', background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.6rem' }}>👤 Personal Information</h3>
          <InfoRow label="Full Name" value={profile?.name} />
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Phone" value={profile?.phone || 'Not added'} />
          <InfoRow label="Preferred Language" value={languageLabel(languageCode)} />
          {profile?.user_uid ? <InfoRow label="User ID" value={profile?.user_uid} /> : null}
        </article>

        <article style={{ border: '1px solid #d1fae5', borderRadius: '12px', padding: '1rem', background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.6rem' }}>🌾 Farm Details</h3>
          <InfoRow label="State" value={profile?.state || 'Karnataka'} />
          <InfoRow label="District" value={profile?.district || 'Hassan'} />
          <InfoRow label="Taluk" value={profile?.taluk || 'Not added'} />
          <InfoRow label="Village" value={profile?.village || 'Not added'} />
        </article>
      </section>

      {isOwnProfile ? (
        <section className="panel" style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            style={{
              border: '1px solid #16a34a',
              color: '#166534',
              background: '#fff',
              borderRadius: '999px',
              padding: '0.55rem 1.2rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✏️ Edit Profile
          </button>
        </section>
      ) : null}

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Recent Forum Posts</h3>
        {posts.length === 0 ? (
          <p className="page-muted">No posts yet. Share your farming experience!</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {posts.map((post) => (
              <article key={post.id} style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '0.75rem' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{post.title}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', gap: '0.7rem', flexWrap: 'wrap' }}>
                  <span className="forum-category-badge">{post.category || 'general'}</span>
                  <span className="page-muted">{formatJoinDate(post.created_at)}</span>
                  <button type="button" className="ghost-btn" onClick={() => navigate('/app/community')} style={{ color: '#15803d', borderColor: '#bbf7d0' }}>
                    View Post
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showEdit ? (
        <div
          role="presentation"
          onClick={() => setShowEdit(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', zIndex: 200, padding: '1rem' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', background: '#fff', borderRadius: '14px', padding: '1rem', border: '1px solid #dcfce7' }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Profile</h3>
            <div className="soil-form-grid">
              <label>Full name
                <input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label>Phone
                <input value={draft.phone} onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))} />
              </label>
              <label>State
                <input value={draft.state} onChange={(event) => setDraft((prev) => ({ ...prev, state: event.target.value }))} />
              </label>
              <label>District
                <input value={draft.district} onChange={(event) => setDraft((prev) => ({ ...prev, district: event.target.value }))} />
              </label>
              <label>Taluk
                <input value={draft.taluk} onChange={(event) => setDraft((prev) => ({ ...prev, taluk: event.target.value }))} />
              </label>
              <label>Village
                <input value={draft.village} onChange={(event) => setDraft((prev) => ({ ...prev, village: event.target.value }))} />
              </label>
              <label>Language
                <select value={draft.preferred_language} onChange={(event) => setDraft((prev) => ({ ...prev, preferred_language: event.target.value }))}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="kn">Kannada</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.55rem' }}>
              <button type="button" className="ghost-btn" onClick={() => setShowEdit(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
