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
import Community from './pages/Community';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import BuyerDashboard from './pages/BuyerDashboard';
import TransporterDashboard from './pages/TransporterDashboard';
import BuyerOrders from './pages/BuyerOrders';
import TransporterAcceptedJobs from './pages/TransporterAcceptedJobs';
import TransporterRouteMap from './pages/TransporterRouteMap';
import FarmerBookingTracker from './pages/FarmerBookingTracker';
import { RoleProvider } from './context/RoleContext';

const STORAGE_KEY = 'krishimitra_language';
const SIDEBAR_PIN_KEY = 'krishimitra_sidebar_pinned';

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
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > 980);
  const [isSidebarPinned, setSidebarPinned] = useState(
    () => localStorage.getItem(SIDEBAR_PIN_KEY) !== 'false'
  );

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth > 980;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSidebar = () => {
    if (isDesktop) {
      setSidebarPinned((prev) => {
        const next = !prev;
        localStorage.setItem(SIDEBAR_PIN_KEY, String(next));
        return next;
      });
      return;
    }

    setSidebarOpen((prev) => !prev);
  };

  const isSidebarExpanded = isDesktop ? (isSidebarPinned || isSidebarHovered) : isSidebarOpen;

  return (
    <div className="app-shell">
      {isLanguageModalOpen && <LanguageSelector onSelect={onLanguageSelect} />}

      <Navbar
        onToggleSidebar={toggleSidebar}
        onOpenLanguageModal={onOpenLanguageModal}
      />

      <div className={isSidebarExpanded ? 'layout sidebar-expanded' : 'layout sidebar-collapsed'}>
        <Sidebar
          open={isSidebarExpanded}
          pinned={isSidebarPinned}
          isDesktop={isDesktop}
          onTogglePin={() => {
            setSidebarPinned((prev) => {
              const next = !prev;
              localStorage.setItem(SIDEBAR_PIN_KEY, String(next));
              return next;
            });
          }}
          onHoverChange={(hovering) => {
            if (isDesktop && !isSidebarPinned) {
              setSidebarHovered(hovering);
            }
          }}
          onClose={() => {
            if (!isDesktop) {
              setSidebarOpen(false);
            }
          }}
        />

        {!isDesktop && isSidebarOpen && (
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
              <Route path="profile" element={<Profile />} />
              <Route path="profile/:userId" element={<Profile />} />
              <Route path="chat" element={<Chat />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="farmer/bookings" element={<FarmerBookingTracker />} />
              <Route path="community" element={<Community />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="buyer" element={<BuyerDashboard />} />
              <Route path="buyer/orders" element={<BuyerOrders />} />
              <Route path="transporter" element={<TransporterDashboard />} />
              <Route path="transporter/accepted-jobs" element={<TransporterAcceptedJobs />} />
              <Route path="transporter/route-map" element={<TransporterRouteMap />} />
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
    <RoleProvider>
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
    </RoleProvider>
  );
}
