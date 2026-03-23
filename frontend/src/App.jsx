import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from './context/LanguageContext';
import LanguageSelector from './components/LanguageSelector';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import LanguageSelect from './pages/LanguageSelect';
import SelectLanguage from './pages/SelectLanguage';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import Weather from './pages/Weather';
import MarketPrices from './pages/MarketPrices';
import Schemes from './pages/Schemes';
import CropDisease from './pages/CropDisease';
import Chatbot from './pages/Chatbot';
import Marketplace from './pages/Marketplace';
import Quiz from './pages/Quiz';
import SoilHealth from './pages/SoilHealth';
import Forum from './pages/Forum';
import SOS from './pages/SOS';
import FarmGuide from './pages/FarmGuide';
import Settings from './pages/Settings';

const STORAGE_KEY = 'krishimitra_language';

function PageTransition({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.24 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function DashboardLayout({ isLanguageModalOpen, onLanguageSelect, onOpenLanguageModal }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {isLanguageModalOpen && <LanguageSelector onSelect={onLanguageSelect} />}

      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenLanguageModal={onOpenLanguageModal}
      />

      <div className="layout">
        <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

        {isSidebarOpen && (
          <button
            className="overlay"
            aria-label="Close sidebar"
            type="button"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="content">
          <PageTransition>
            <Routes>
              <Route index element={<Home />} />
              <Route path="weather" element={<Weather />} />
              <Route path="market-prices" element={<MarketPrices />} />
              <Route path="market" element={<MarketPrices />} />
              <Route path="schemes" element={<Schemes />} />
              <Route path="crop-disease" element={<CropDisease />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="soil-health" element={<SoilHealth />} />
              <Route path="forum" element={<Forum />} />
              <Route path="sos" element={<SOS />} />
              <Route path="farm-guide" element={<FarmGuide />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { setLanguage } = useLanguage();
  const { user, loading } = useAuth();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLanguage(saved);
    }
  }, [setLanguage]);

  useEffect(() => {
    if (location.pathname.startsWith('/app') && !localStorage.getItem(STORAGE_KEY)) {
      setIsLanguageModalOpen(true);
    }
  }, [location.pathname]);

  const handleLanguageSelect = (languageCode) => {
    setLanguage(languageCode);
    setIsLanguageModalOpen(false);
  };

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/language-select" element={<LanguageSelect />} />
      <Route
        path="/select-language"
        element={(
          <ProtectedRoute>
            <SelectLanguage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/profile-setup"
        element={(
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/app/*"
        element={(
          <ProtectedRoute>
            <DashboardLayout
              isLanguageModalOpen={isLanguageModalOpen}
              onLanguageSelect={handleLanguageSelect}
              onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
            />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={loading ? '/' : (user ? '/app' : '/login')} replace />} />
    </Routes>
  );
}
