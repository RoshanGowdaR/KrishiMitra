import { useNavigate } from 'react-router-dom';

const dashboardStats = [
  { icon: '🌤️', title: 'Weather', value: '30°C Clear Sky', subtext: 'Bengaluru' },
  { icon: '📈', title: "Today's Rice Price", value: '₹2,100/q', subtext: '↑ 2.3%' },
  { icon: '🏛️', title: 'Active Schemes', value: '8 Available', subtext: '2 new' },
  { icon: '🆘', title: 'Expert Status', value: '3 Online', subtext: 'Ready to help' },
];

const quickActions = [
  {
    icon: '🔬',
    title: 'Diagnose Crop',
    description: 'Upload crop images to detect disease instantly.',
    path: '/app/crop-disease',
  },
  {
    icon: '🤖',
    title: 'Ask Chatbot',
    description: 'Chat in your language for farming advice.',
    path: '/app/chatbot',
  },
  {
    icon: '📈',
    title: 'Check Prices',
    description: 'See mandi prices with filters and trends.',
    path: '/app/market',
  },
  {
    icon: '🌤️',
    title: 'Weather',
    description: 'Track live conditions and 5-day forecast.',
    path: '/app/weather',
  },
  {
    icon: '🆘',
    title: 'SOS Help',
    description: 'Connect to experts for urgent assistance.',
    path: '/app/sos',
  },
  {
    icon: '🛒',
    title: 'Marketplace',
    description: 'Buy and sell produce and farm inputs.',
    path: '/app/marketplace',
  },
];

const recentUpdates = [
  {
    text: 'Rain expected in Bengaluru over the next 24 hours.',
    time: '10 min ago',
  },
  {
    text: 'PM-KISAN application window opened for this month.',
    time: '1 hour ago',
  },
  {
    text: 'Rice modal price moved up by 2.3% in nearby mandis.',
    time: '3 hours ago',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-home">
      <section className="dashboard-home-header">
        <h2>Good Morning, Farmer 👋</h2>
        <p>Here&apos;s what&apos;s happening on your farm today</p>
      </section>

      <section className="dashboard-stat-grid">
        {dashboardStats.map((card) => (
          <article key={card.title} className="dashboard-stat-card">
            <p className="dashboard-stat-title">{card.icon} {card.title}</p>
            <h3>{card.value}</h3>
            <span>{card.subtext}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-quick-actions">
        <h3>Quick Actions</h3>
        <div className="dashboard-actions-grid">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              className="dashboard-action-card"
              onClick={() => navigate(action.path)}
            >
              <span className="dashboard-action-icon">{action.icon}</span>
              <strong>{action.title}</strong>
              <p>{action.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-updates">
        <h3>Recent Updates</h3>
        <div className="dashboard-update-list">
          {recentUpdates.map((item) => (
            <article key={item.text} className="dashboard-update-item">
              <span className="dashboard-update-dot" aria-hidden="true" />
              <div>
                <p>{item.text}</p>
                <time>{item.time}</time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
