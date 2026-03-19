import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const featureIcons = ['🌤️', '📈', '🏛️', '🔬', '🤖', '🛒', '📝', '🌱', '💬', '🆘', '📚', '🌍'];

function StatItem({ value, label, showDivider }) {
  return (
    <div className={showDivider ? 'stat-pill with-divider' : 'stat-pill'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const featureCards = useMemo(
    () => featureIcons.map((icon, index) => ({
      icon,
      title: t(`landing.featureCards.${index}.title`),
      description: t(`landing.featureCards.${index}.description`),
    })),
    [t]
  );
  const statsData = useMemo(
    () => [
      { value: '600M+', label: t('landing.stats.farmers') },
      { value: '12', label: t('landing.stats.languages') },
      { value: '12', label: t('landing.stats.features') },
    ],
    [t]
  );
  const quickLinks = useMemo(
    () => [
      { label: t('landing.quickLinks.features'), href: '#features' },
      { label: t('landing.quickLinks.how'), href: '#how' },
      { label: t('landing.quickLinks.github'), href: 'https://github.com', external: true },
    ],
    [t]
  );

  return (
    <div className="landing-page">
      <section className="landing-hero" id="hero">
        <header className="landing-nav">
          <div className="landing-logo">
            <span className="leaf">🌿</span>
            <span>{t('appName')}</span>
          </div>
          <button type="button" className="hero-primary" onClick={() => navigate('/app')}>
            {t('landing.getStarted')}
          </button>
        </header>

        <div className="hero-center">
          <span className="hero-badge">🌾 {t('landing.badge')}</span>

          <h1 className="hero-title">
            <span>{t('landing.heroMain')}</span>
            <span className="hero-title-accent">{t('landing.heroAccent')}</span>
          </h1>

          <p className="hero-subtitle">
            {t('landing.subtitle')}
          </p>

          <div className="hero-actions">
            <button type="button" className="hero-primary" onClick={() => navigate('/app')}>
              {t('landing.getStartedFree')} -&gt;
            </button>
            <a className="hero-secondary" href="#features">
              {t('landing.seeFeatures')}
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
          <h3>{t('landing.featuresTitle')}</h3>
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
        <h3>{t('landing.howItWorks')}</h3>
        <div className="steps-track" />
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">1</span>
            <h4>{t('landing.stepTitles.selectLanguage')}</h4>
            <p>{t('landing.steps.selectLanguage')}</p>
          </div>
          <div className="step-card">
            <span className="step-number">2</span>
            <h4>{t('landing.stepTitles.describeProblem')}</h4>
            <p>{t('landing.steps.describeProblem')}</p>
          </div>
          <div className="step-card">
            <span className="step-number">3</span>
            <h4>{t('landing.stepTitles.getHelp')}</h4>
            <p>{t('landing.steps.getHelp')}</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h3>{t('landing.ctaTitle')}</h3>
        <p>{t('landing.ctaSubtitle')}</p>
        <button type="button" className="cta-button" onClick={() => navigate('/app')}>
          {t('landing.getStartedFree')}
        </button>
      </section>

      <footer className="landing-footer">
        <div className="footer-logo-wrap">
          <div className="landing-logo footer-logo">
            <span className="leaf">🌿</span>
            <span>{t('appName')}</span>
          </div>
          <p className="footer-tagline">{t('landing.footerTagline')}</p>
        </div>

        <div className="footer-links">
          {quickLinks.map((link) => (
            <a key={link.label} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined}>
              {link.label}
            </a>
          ))}
        </div>

        <a className="footer-github" href="https://github.com" target="_blank" rel="noreferrer">{t('landing.quickLinks.github')}</a>
      </footer>
    </div>
  );
}
