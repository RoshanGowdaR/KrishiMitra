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

  const displayName = user?.user_metadata?.full_name || user?.email || 'Farmer';
  const profilePhoto = user?.user_metadata?.avatar_url || '';
  const avatarText = String(displayName).trim().charAt(0).toUpperCase() || 'F';
  const shortDisplayName = String(displayName).length > 15 ? `${String(displayName).slice(0, 15)}...` : String(displayName);

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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(22,163,74,0.12)',
            border: '1px solid rgba(22,163,74,0.25)',
            maxWidth: '260px',
          }}
        >
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="User avatar"
              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(22,163,74,0.85)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {avatarText}
            </span>
          )}

          <span style={{ fontSize: '0.8rem', color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
            {shortDisplayName}
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
