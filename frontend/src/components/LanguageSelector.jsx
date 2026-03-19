import { motion } from 'framer-motion';
import { RiLeafFill } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector({ onSelect }) {
  const { t } = useTranslation();
  const { supportedLanguages } = useLanguage();

  return (
    <div className="language-overlay">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="language-modal"
      >
        <div className="language-header">
          <RiLeafFill className="brand-icon" />
          <h1>{t('appName')}</h1>
          <p>{t('common.selectLanguageSubtitle')}</p>
        </div>

        <div className="language-grid">
          {supportedLanguages.map((language) => (
            <button
              key={language.code}
              type="button"
              className="language-card"
              onClick={() => onSelect(language.code)}
            >
              <span className="language-native">{language.native}</span>
              <span className="language-label">{language.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
