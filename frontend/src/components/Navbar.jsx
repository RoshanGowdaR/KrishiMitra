import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiLeafFill, RiTranslate2 } from 'react-icons/ri';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar, onOpenLanguageModal }) {
  const { t } = useTranslation();
  const { language, supportedLanguages } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
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
