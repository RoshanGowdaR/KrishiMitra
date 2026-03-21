import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n';

const STORAGE_KEY = 'krishimitra_language';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', icon: 'GB' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', icon: 'IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', icon: 'IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', icon: 'IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', icon: 'IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', icon: 'IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', icon: 'IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', icon: 'IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', icon: 'IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', icon: 'IN' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', icon: 'IN' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', icon: 'IN' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (!SUPPORTED_LANGUAGES.some((item) => item.code === code)) {
      return;
    }
    setLanguageState(code);
    localStorage.setItem(STORAGE_KEY, code);
    i18n.changeLanguage(code);
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
