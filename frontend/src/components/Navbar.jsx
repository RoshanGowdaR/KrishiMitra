import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiLeafFill, RiTranslate2 } from 'react-icons/ri';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getNotificationSummary, getUnreadCounts, subscribeToFriendRequestChanges, subscribeToMessages } from '../services/socialService';

export default function Navbar({ onToggleSidebar, onOpenLanguageModal }) {
  const { t } = useTranslation();
  const { language, supportedLanguages } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const activeLanguage = supportedLanguages.find((item) => item.code === language);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.charAt(0).toUpperCase();

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

    const loadBadges = async () => {
      const [counts, summary] = await Promise.all([
        getUnreadCounts(user.id),
        getNotificationSummary(user.id),
      ]);

      setTotalUnread(Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0));
      setNotificationCount(Number(summary?.total || 0));
    };

    loadBadges();

    const sub = subscribeToMessages(user.id, () => {
      setTotalUnread((prev) => prev + 1);
      setNotificationCount((prev) => prev + 1);
    });

    const requestSub = subscribeToFriendRequestChanges(user.id, () => {
      loadBadges();
    });

    return () => {
      if (sub?.unsubscribe) sub.unsubscribe();
      if (requestSub?.unsubscribe) requestSub.unsubscribe();
    };
  }, [user?.id]);

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
        <button className="language-switch" type="button" onClick={onOpenLanguageModal}>
          <RiTranslate2 />
          <span>{activeLanguage?.native || language.toUpperCase()}</span>
        </button>

        <div
          onClick={() => navigate('/app/notifications')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/app/notifications');
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
          title="Open notifications"
        >
          🔔
          {notificationCount > 0 ? (
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
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
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

        <div
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
          onMouseEnter={(event) => {
            event.currentTarget.style.background = '#f0fdf4';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'white';
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/app/profile');
            }
          }}
          title="Open profile"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #16a34a',
              }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                const fallback = event.currentTarget.nextSibling;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#16a34a',
              color: 'white',
              display: avatarUrl ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

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
            {userName.split(' ')[0]}
          </span>
        </div>

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
