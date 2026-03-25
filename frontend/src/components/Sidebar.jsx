import { NavLink } from 'react-router-dom';
import {
  RiCloudy2Line,
  RiLineChartLine,
  RiGovernmentLine,
  RiMicroscopeLine,
  RiRobot2Line,
  RiShoppingBag3Line,
  RiFileList3Line,
  RiPlantLine,
  RiMessage2Line,
  RiAlarmWarningLine,
  RiBookOpenLine,
  RiHome5Line,
  RiSettings3Line,
  RiPushpin2Line,
  RiUser3Line,
  RiTeamLine,
  RiFlag2Line,
  RiNotification3Line,
  RiTruckLine,
  RiMapPin2Line,
} from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';

const farmerNavItems = [
  { to: '/app', key: 'home', icon: RiHome5Line },
  { to: '/app/farmer/bookings', label: 'Track Transport', icon: RiTruckLine },
  { to: '/app/weather', key: 'weather', icon: RiCloudy2Line },
  { to: '/app/market-prices', key: 'marketPrices', icon: RiLineChartLine },
  { to: '/app/schemes', key: 'schemes', icon: RiGovernmentLine },
  { to: '/app/crop-disease', key: 'cropDisease', icon: RiMicroscopeLine },
  { to: '/app/chatbot', key: 'chatbot', icon: RiRobot2Line },
  { to: '/app/marketplace', key: 'marketplace', icon: RiShoppingBag3Line },
  { to: '/app/quiz', key: 'quiz', icon: RiFileList3Line },
  { to: '/app/soil-health', key: 'soilHealth', icon: RiPlantLine },
  { to: '/app/forum', key: 'forum', icon: RiMessage2Line },
  { to: '/app/sos', key: 'sos', icon: RiAlarmWarningLine },
  { to: '/app/farm-guide', key: 'farmGuide', icon: RiBookOpenLine },
  { to: '/app/profile', key: 'profile', icon: RiUser3Line },
  { to: '/app/notifications', key: 'notifications', icon: RiNotification3Line },
  { to: '/app/community', key: 'community', icon: RiTeamLine },
  { to: '/app/reports', key: 'reports', icon: RiFlag2Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

const buyerNavItems = [
  { to: '/app/buyer', label: 'Browse Produce', icon: RiShoppingBag3Line },
  { to: '/app/buyer/orders', label: 'My Orders', icon: RiFileList3Line },
  { to: '/app/chat', label: 'Messages', icon: RiMessage2Line },
  { to: '/app/settings', label: 'Settings', icon: RiSettings3Line },
];

const transporterNavItems = [
  { to: '/app/transporter', label: 'Available Bookings', icon: RiFileList3Line },
  { to: '/app/transporter/accepted-jobs', label: 'My Accepted Jobs', icon: RiTruckLine },
  { to: '/app/transporter/route-map', label: 'Route Map', icon: RiMapPin2Line },
  { to: '/app/settings', label: 'Settings', icon: RiSettings3Line },
];

export default function Sidebar({
  open,
  onClose,
  pinned,
  isDesktop,
  onTogglePin,
  onHoverChange,
}) {
  const { t } = useTranslation();
  const { role } = useRole();
  const navItems = role === 'buyer' ? buyerNavItems : role === 'transporter' ? transporterNavItems : farmerNavItems;

  return (
    <aside
      className={open ? 'sidebar open expanded' : 'sidebar collapsed'}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <div className="sidebar-header">
        <h2>{t('common.dashboard')}</h2>
        {isDesktop ? (
          <button
            type="button"
            className={pinned ? 'sidebar-pin pinned' : 'sidebar-pin'}
            onClick={onTogglePin}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            <RiPushpin2Line />
          </button>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={onClose}
            >
              <Icon />
              <span>
                {item.label || (item.key === 'settings'
                  ? 'Settings'
                  : item.key === 'profile'
                    ? 'Profile'
                    : item.key === 'notifications'
                      ? 'Notifications'
                    : item.key === 'community'
                      ? 'Community'
                      : item.key === 'reports'
                        ? 'Reports'
                        : t(`nav.${item.key === 'marketPrices' ? 'market' : item.key}`))}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
