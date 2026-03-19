import { useEffect, useState } from 'react';
import { RiLeafFill, RiTranslate2 } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ onToggleSidebar, onOpenLanguageModal }) {
  const { t } = useTranslation();
  const { language, supportedLanguages } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      <button className="language-switch" type="button" onClick={onOpenLanguageModal}>
        <RiTranslate2 />
        <span>{activeLanguage?.native || language.toUpperCase()}</span>
      </button>
    </header>
  );
}
