import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiLeafFill, RiTranslate2 } from 'react-icons/ri';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getUnreadCounts, subscribeToMessages } from '../services/socialService';
import { useRole } from '../context/RoleContext';
import { supabase } from '../lib/supabase';

const roleMeta = {
  farmer: { label: '🌾 Farmer', color: '#16a34a', route: '/app' },
  buyer: { label: '🛒 Buyer', color: '#f97316', route: '/app/buyer' },
  transporter: { label: '🚛 Transporter', color: '#3b82f6', route: '/app/transporter' },
};

const typeColor = {
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#2563eb',
};

const timeAgo = (dateText) => {
  if (!dateText) return 'Just now';
  const diffMs = Date.now() - new Date(dateText).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function Navbar({ onToggleSidebar, onOpenLanguageModal }) {
  const { t } = useTranslation();
  const { language, supportedLanguages } = useLanguage();
  const { user, signOut } = useAuth();
  const { role, changeRole } = useRole();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef(null);
  const activeLanguage = supportedLanguages.find((item) => item.code === language);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
    };

    const loadBadges = async () => {
      const counts = await getUnreadCounts(user.id);

      setTotalUnread(Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0));
    };

    loadBadges();
    loadNotifications();

    const sub = subscribeToMessages(user.id, () => {
      setTotalUnread((prev) => prev + 1);
    });

    const notificationSub = supabase.channel(`notifications-${user.id}`).on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        toast.success(payload.new?.title || 'New notification');
      }
    ).subscribe();

    const focusReload = () => {
      loadBadges();
      loadNotifications();
    };

    window.addEventListener('focus', focusReload);

    return () => {
      if (sub?.unsubscribe) sub.unsubscribe();
      if (notificationSub?.unsubscribe) notificationSub.unsubscribe();
      window.removeEventListener('focus', focusReload);
    };
  }, [user?.id]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const markAllRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    const ids = notifications.map((item) => item.id);
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setNotifications([]);
  };

  const openNotification = async (item) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
    setNotifications((prev) => prev.filter((entry) => entry.id !== item.id));
    setNotificationOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const onRoleChange = (nextRole) => {
    changeRole(nextRole);
    navigate(roleMeta[nextRole].route);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className={isScrolled ? 'navbar scrolled' : 'navbar'}>
      <button className="mobile-menu-button" type="button" onClick={onToggleSidebar}>
        <span />
        <span />
        <span />
      </button>

      <button type="button" className="brand-block brand-button" onClick={scrollToTop}>
        <RiLeafFill className="brand-icon" />
        <div>
          <h1>{t('appName')}</h1>
          <p>{t('tagline')}</p>
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '0.2rem',
            background: '#fff',
            borderRadius: 25,
            border: '1px solid #e5e7eb',
            padding: 4,
          }}
        >
          {Object.keys(roleMeta).map((roleName) => {
            const isActive = role === roleName;
            return (
              <button
                key={roleName}
                type="button"
                onClick={() => onRoleChange(roleName)}
                style={{
                  border: 'none',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: isActive ? '#fff' : '#666',
                  background: isActive ? roleMeta[roleName].color : 'transparent',
                }}
              >
                {roleMeta[roleName].label}
              </button>
            );
          })}
        </div>

        <button className="language-switch" type="button" onClick={onOpenLanguageModal}>
          <RiTranslate2 />
          <span>{activeLanguage?.native || language.toUpperCase()}</span>
        </button>

        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setNotificationOpen((prev) => !prev)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
            }}
            title="Open notifications"
          >
            🔔
            {notifications.length > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <section
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 340,
                maxHeight: 420,
                overflowY: 'auto',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                boxShadow: '0 20px 30px rgba(15,23,42,0.12)',
                zIndex: 100,
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Notifications</h4>
                <button type="button" onClick={markAllRead} style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
                  Mark all read
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.6rem' }}>
                {notifications.length === 0 ? (
                  <p className="page-muted" style={{ margin: 0 }}>No new notifications</p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openNotification(item)}
                      style={{
                        textAlign: 'left',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${typeColor[item.type] || typeColor.info}`,
                        background: '#fff',
                        borderRadius: 10,
                        padding: '0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 700 }}>{item.title || 'Notification'}</p>
                      <p className="page-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>{item.message}</p>
                      <p className="page-muted" style={{ margin: '0.3rem 0 0', fontSize: '0.75rem' }}>
                        {timeAgo(item.created_at)}{item.link ? ' -> Open' : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>

        <div
          onClick={() => navigate('/app/chat')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/app/chat');
            }
          }}
          style={{
            position: 'relative',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            background: 'white',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
          }}
          title="Open chat"
        >
          💬
          {totalUnread > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            padding: '0.4rem 0.8rem',
            borderRadius: '25px',
            border: '1px solid #e5e7eb',
            background: 'white',
            transition: 'all 0.2s ease',
          }}
          title="Open profile"
        >
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#16a34a',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </span>

          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 500,
              color: '#1a1a1a',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User').split(' ')[0]}
          </span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          style={{
            minWidth: '38px',
            height: '38px',
            borderRadius: '10px',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
            color: '#fff',
            padding: '0 0.55rem',
            background: 'linear-gradient(135deg, #dc2626, #f97316)',
          }}
        >
          <RiLogoutBoxRLine />
          <span className="hide-mobile" style={{ fontSize: '0.76rem', fontWeight: 600 }}>Logout</span>
        </button>
      </div>
    </header>
  );
}
