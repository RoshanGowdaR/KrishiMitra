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
  RiHammerLine,
  RiToolsLine,
} from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useRole } from '../context/RoleContext';

const farmerNavItems = [
  { to: '/app', key: 'home', icon: RiHome5Line },
  { to: '/app/chatbot', key: 'chatbot', icon: RiRobot2Line },
  { to: '/app/community', key: 'community', icon: RiTeamLine },
  { to: '/app/crop-disease', key: 'cropDisease', icon: RiMicroscopeLine },
  { to: '/app/farm-guide', key: 'farmGuide', icon: RiBookOpenLine },
  { to: '/app/forum', key: 'forum', icon: RiMessage2Line },
  { to: '/app/labour-requests', key: 'labour', icon: RiHammerLine },
  { to: '/app/machinery', key: 'machinery', icon: RiToolsLine },
  { to: '/app/market-prices', key: 'marketPrices', icon: RiLineChartLine },
  { to: '/app/marketplace', key: 'marketplace', icon: RiShoppingBag3Line },
  { to: '/app/notifications', key: 'notifications', icon: RiNotification3Line },
  { to: '/app/profile', key: 'profile', icon: RiUser3Line },
  { to: '/app/quiz', key: 'quiz', icon: RiFileList3Line },
  { to: '/app/reports', key: 'reports', icon: RiFlag2Line },
  { to: '/app/schemes', key: 'schemes', icon: RiGovernmentLine },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
  { to: '/app/soil-health', key: 'soilHealth', icon: RiPlantLine },
  { to: '/app/sos', key: 'sos', icon: RiAlarmWarningLine },
  { to: '/app/farmer/bookings', key: 'trackTransport', icon: RiTruckLine },
  { to: '/app/farmer/machinery-bookings', key: 'trackMachinery', icon: RiToolsLine },
  { to: '/app/weather', key: 'weather', icon: RiCloudy2Line },
  { to: '/app/farmer/what-to-grow', key: 'whatToGrow', icon: RiLineChartLine },
];

const buyerNavItems = [
  { to: '/app/buyer', key: 'browseProduce', icon: RiShoppingBag3Line },
  { to: '/app/chat', key: 'messages', icon: RiMessage2Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

const transporterNavItems = [
  { to: '/app/transporter', key: 'availableBookings', icon: RiFileList3Line },
  { to: '/app/transporter/accepted-jobs', key: 'myAcceptedJobs', icon: RiTruckLine },
  { to: '/app/transporter/route-map', key: 'routeMap', icon: RiMapPin2Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

const labourNavItems = [
  { to: '/app/labour', key: 'labour', icon: RiHammerLine },
  { to: '/app/chat', key: 'messages', icon: RiMessage2Line },
  { to: '/app/notifications', key: 'notifications', icon: RiNotification3Line },
  { to: '/app/profile', key: 'profile', icon: RiUser3Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

const machineryNavItems = [
  { to: '/app/machinery', key: 'machinery', icon: RiToolsLine },
  { to: '/app/chat', key: 'messages', icon: RiMessage2Line },
  { to: '/app/notifications', key: 'notifications', icon: RiNotification3Line },
  { to: '/app/profile', key: 'profile', icon: RiUser3Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

const adminNavItems = [
  { to: '/app', key: 'home', icon: RiHome5Line },
  { to: '/app/schemes', key: 'schemes', icon: RiGovernmentLine },
  { to: '/app/reports', key: 'reports', icon: RiFlag2Line },
  { to: '/app/authority', key: 'authority', icon: RiTeamLine },
  { to: '/app/forum', key: 'forum', icon: RiMessage2Line },
  { to: '/app/notifications', key: 'notifications', icon: RiNotification3Line },
  { to: '/app/profile', key: 'profile', icon: RiUser3Line },
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
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
  const navItems = role === 'buyer'
    ? buyerNavItems
    : role === 'transporter'
      ? transporterNavItems
      : role === 'labour'
        ? labourNavItems
        : role === 'machinery'
          ? machineryNavItems
          : role === 'admin'
            ? adminNavItems
        : farmerNavItems;

  const getNavLabel = (itemKey) => t(`nav.${itemKey === 'marketPrices' ? 'market' : itemKey}`, {
    defaultValue: itemKey === 'settings'
      ? 'Settings'
      : itemKey === 'profile'
        ? 'Profile'
        : itemKey === 'notifications'
          ? 'Notifications'
          : itemKey === 'community'
            ? 'Community'
            : itemKey === 'reports'
              ? 'Reports'
              : itemKey === 'trackTransport'
                ? 'Track Transport'
                : itemKey === 'trackMachinery'
                  ? 'Track Machinery'
                : itemKey === 'whatToGrow'
                  ? 'What To Grow'
                  : itemKey === 'authority'
                    ? 'Authority'
                  : itemKey === 'browseProduce'
                    ? 'Browse Produce'
                    : itemKey === 'messages'
                      ? 'Messages'
                      : itemKey === 'availableBookings'
                        ? 'Available Bookings'
                        : itemKey === 'myAcceptedJobs'
                          ? 'My Accepted Jobs'
                          : itemKey === 'routeMap'
                            ? 'Route Map'
                            : itemKey === 'labour'
                              ? 'Labour'
                              : itemKey === 'machinery'
                                ? 'Machinery'
                                : itemKey,
  });

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
                {getNavLabel(item.key)}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
