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
} from 'react-icons/ri';
import { useTranslation } from 'react-i18next';

const navItems = [
  { to: '/app', key: 'home', icon: RiHome5Line },
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
  { to: '/app/settings', key: 'settings', icon: RiSettings3Line },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-header">
        <h2>{t('common.dashboard')}</h2>
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
              <span>{item.key === 'settings' ? 'Settings' : t(`nav.${item.key === 'marketPrices' ? 'market' : item.key}`)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
