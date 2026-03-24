import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const LANG_KEY = 'krishimitra_language';

const fallbackFromUser = (user) => ({
  id: user?.id,
  name: user?.user_metadata?.full_name || user?.email || 'Farmer',
  email: user?.email || '-',
  avatar_url: user?.user_metadata?.avatar_url || '',
  preferred_language: localStorage.getItem(LANG_KEY) || 'en',
  state: '',
  district: '',
  taluk: '',
  village: '',
  user_uid: user?.id?.slice(0, 8)?.toUpperCase() || '-',
});

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', state: '', district: '', taluk: '', village: '' });

  const locationText = useMemo(
    () => [profile?.state, profile?.district].filter(Boolean).join(', ') || '-',
    [profile?.state, profile?.district]
  );

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          const normalized = {
            ...fallbackFromUser(user),
            ...data,
            email: data.email || user.email,
            avatar_url: data.avatar_url || user.user_metadata?.avatar_url || '',
          };
          setProfile(normalized);
          setDraft({
            name: normalized.name || '',
            state: normalized.state || '',
            district: normalized.district || '',
            taluk: normalized.taluk || '',
            village: normalized.village || '',
          });
        } else {
          const fallback = fallbackFromUser(user);
          setProfile(fallback);
          setDraft({ name: fallback.name, state: '', district: '', taluk: '', village: '' });
        }
      } catch {
        const fallback = fallbackFromUser(user);
        setProfile(fallback);
        setDraft({ name: fallback.name, state: '', district: '', taluk: '', village: '' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        name: draft.name,
        state: draft.state,
        district: draft.district,
        taluk: draft.taluk,
        village: draft.village,
        preferred_language: localStorage.getItem(LANG_KEY) || profile?.preferred_language || 'en',
        email: user.email,
      };
      const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' }).select('*').single();

      if (error) throw error;
      setProfile((prev) => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const avatarText = (profile?.name || user?.email || 'F').trim().charAt(0).toUpperCase();

  return (
    <div className="page-wrap">
      <h2>My Profile</h2>
      {loading ? <div className="panel">Loading profile...</div> : null}

      {!loading ? (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <p><strong>User UID:</strong> {profile?.user_uid || '-'}</p>
              <p><strong>Name:</strong> {profile?.name || '-'}</p>
              <p><strong>Email:</strong> {user?.email || profile?.email || '-'}</p>
              <p><strong>Language preference:</strong> {localStorage.getItem(LANG_KEY) || profile?.preferred_language || 'en'}</p>
              <p><strong>Location:</strong> {locationText}</p>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="button" className="ghost-btn" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? 'Cancel' : 'Edit Profile'}
                </button>
                {editing ? (
                  <button type="button" className="primary-btn" onClick={onSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                <img
                  src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                  alt="Profile"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #d1d5db' }}
                />
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                  }}
                >
                  {avatarText}
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="soil-form-grid" style={{ marginTop: '1rem' }}>
              <label>Name
                <input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
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
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
