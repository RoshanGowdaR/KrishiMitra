import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const featureCards = [
  { icon: '🌤️', title: 'Weather Forecast', description: 'Hyperlocal 5-day predictions for your village.' },
  { icon: '📈', title: 'Live Mandi Prices', description: 'Track real-time market prices before you sell.' },
  { icon: '🏛️', title: 'Govt Schemes', description: 'Find subsidies and support programs quickly.' },
  { icon: '🔬', title: 'Crop Disease AI', description: 'Upload a photo and get instant guidance.' },
  { icon: '🤖', title: 'AI Chatbot', description: 'Ask farming questions in your own language.' },
  { icon: '🛒', title: 'Marketplace', description: 'Connect directly with buyers and suppliers.' },
  { icon: '📝', title: 'Farming Quiz', description: 'Learn practical tips with simple daily quizzes.' },
  { icon: '🌱', title: 'Soil Health', description: 'Check soil status and improve yield planning.' },
  { icon: '💬', title: 'Community Forum', description: 'Discuss problems and solutions with farmers.' },
  { icon: '🆘', title: 'SOS Connect', description: 'Reach experts quickly in urgent crop issues.' },
  { icon: '📚', title: 'Farm Guide', description: 'Step-by-step guidance for major crop cycles.' },
  { icon: '🌍', title: 'Multilingual', description: 'Access all features across 22 Indian languages.' },
];

const statsData = [
  { value: '600M+', label: 'Farmers' },
  { value: '22', label: 'Languages' },
  { value: '12', label: 'Features' },
];

function StatItem({ value, label, showDivider }) {
  return (
    <div className={showDivider ? 'stat-pill with-divider' : 'stat-pill'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const quickLinks = useMemo(
    () => [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'GitHub', href: 'https://github.com', external: true },
    ],
    []
  );

  return (
    <div className="landing-page">
      <section className="landing-hero" id="hero">
        <header className="landing-nav">
          <div className="landing-logo">
            <span className="leaf">🌿</span>
            <span>KrishiMitra</span>
          </div>
          <button type="button" className="hero-primary" onClick={() => navigate('/app')}>
            Get Started
          </button>
        </header>

        <div className="hero-center">
          <span className="hero-badge">🌾 AI for Indian Agriculture</span>

          <h1 className="hero-title">
            <span>Your Smart Farming</span>
            <span className="hero-title-accent">Companion</span>
          </h1>

          <p className="hero-subtitle">
            AI-powered tools for weather, crop disease, market prices and more in your
            language, for free.
          </p>

          <div className="hero-actions">
            <button type="button" className="hero-primary" onClick={() => navigate('/app')}>
              Get Started Free -&gt;
            </button>
            <a className="hero-secondary" href="#features">
              See Features
            </a>
          </div>
        </div>
      </section>

      <section className="landing-statsbar">
        <div className="statsbar-inner">
          {statsData.map((stat, index) => (
            <StatItem key={stat.label} value={stat.value} label={stat.label} showDivider={index < statsData.length - 1} />
          ))}
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="section-header">
          <h3>Everything you need to farm smarter</h3>
        </div>

        <div className="landing-feature-grid">
          {featureCards.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <div className="feature-icon-wrap">
                <span className="feature-emoji">{feature.icon}</span>
              </div>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-how" id="how">
        <h3>How it works</h3>
        <div className="steps-track" />
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">1</span>
            <h4>Select Language</h4>
            <p>Choose from 22 Indian languages for a familiar experience.</p>
          </div>
          <div className="step-card">
            <span className="step-number">2</span>
            <h4>Describe Problem</h4>
            <p>Type, speak, or upload a crop photo to explain your issue.</p>
          </div>
          <div className="step-card">
            <span className="step-number">3</span>
            <h4>Get Help</h4>
            <p>Receive clear AI guidance with practical next steps instantly.</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h3>Start farming smarter today</h3>
        <p>Trusted tools for weather, disease detection, prices and guidance.</p>
        <button type="button" className="cta-button" onClick={() => navigate('/app')}>
          Get Started Free
        </button>
      </section>

      <footer className="landing-footer">
        <div className="footer-logo-wrap">
          <div className="landing-logo footer-logo">
            <span className="leaf">🌿</span>
            <span>KrishiMitra</span>
          </div>
          <p className="footer-tagline">Built for Indian Farmers</p>
        </div>

        <div className="footer-links">
          {quickLinks.map((link) => (
            <a key={link.label} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined}>
              {link.label}
            </a>
          ))}
        </div>

        <a className="footer-github" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </div>
  );
}
