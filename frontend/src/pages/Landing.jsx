import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const tickerItems = [
  '🌤️ Weather AI',
  '📈 Mandi Prices',
  '🔬 Crop Disease',
  '🤖 AI Chatbot',
  '🛒 Marketplace',
  '📚 Farm Guide',
  '🌱 Soil Health',
  '🆘 SOS Connect',
  '📝 Quiz',
];

const featureCards = [
  { icon: '🌤️', title: 'Weather AI' },
  { icon: '📈', title: 'Mandi Prices' },
  { icon: '🏛️', title: 'Govt Schemes' },
  { icon: '🔬', title: 'Crop Disease Scan' },
  { icon: '🤖', title: 'AI Chatbot' },
  { icon: '🛒', title: 'Marketplace' },
  { icon: '📝', title: 'Farming Quiz' },
  { icon: '🌱', title: 'Soil Health' },
  { icon: '💬', title: 'Forum' },
  { icon: '🆘', title: 'SOS Connect' },
  { icon: '📚', title: 'Farm Guide' },
  { icon: '🌍', title: '22 Languages' },
];

const cards = [
  {
    icon: '🌾',
    title: 'Free Forever',
    subtitle: 'All features completely free',
    points: ['Unlimited weather checks', 'Unlimited disease scans', 'Daily mandi data', 'Community support', 'No hidden costs'],
    featured: false,
  },
  {
    icon: '🌍',
    title: '22 Languages',
    subtitle: 'Works in your regional language',
    points: ['Voice + text support', 'Local crop naming', 'Regional farming tips', 'Rural-first design', 'Fast translation'],
    featured: true,
  },
  {
    icon: '🤖',
    title: 'AI Powered',
    subtitle: 'Google Gemini AI integration',
    points: ['Instant crop guidance', 'Weather-aware suggestions', 'Symptom analysis', 'Stepwise action plans', 'Smart multilingual answers'],
    featured: false,
  },
];

const floatingEmojis = ['🌾', '🍃', '🌱', '🌾', '🍃', '🌱', '🌾', '🌱', '🍃', '🌾', '🍃', '🌱'];

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

function TiltCard({ card }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setRotateX(-y * 20);
    setRotateY(x * 20);
  };

  const reset = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div className="km-tilt-wrap" onMouseMove={handleMouseMove} onMouseLeave={reset}>
      <motion.article
        className={card.featured ? 'km-pricing-card featured' : 'km-pricing-card'}
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <p className="km-pricing-icon">{card.icon}</p>
        <h3>{card.title}</h3>
        <p className="km-pricing-subtitle">{card.subtitle}</p>
        <ul>
          {card.points.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
      </motion.article>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
      return;
    }
    navigate('/login');
  };

  const heroRef = useRef(null);
  const parallaxRef = useRef(null);

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mockupY = useTransform(heroProgress, [0, 1], [130, -20]);
  const mockupRotate = useTransform(heroProgress, [0, 1], [8, 0]);

  const { scrollYProgress: productProgress } = useScroll({ target: parallaxRef, offset: ['start end', 'end start'] });
  const rowOneX = useTransform(productProgress, [0, 1], [-180, 160]);
  const rowTwoX = useTransform(productProgress, [0, 1], [180, -140]);
  const rowThreeX = useTransform(productProgress, [0, 1], [-160, 200]);

  const heroParticles = useMemo(
    () => floatingEmojis.map((emoji, index) => ({
      id: `hero-emoji-${index + 1}`,
      emoji,
      left: `${(index * 17) % 100}%`,
      delay: `${(index % 7) * 0.7}s`,
      duration: `${8 + (index % 4)}s`,
      size: `${16 + (index % 3) * 5}px`,
    })),
    []
  );

  const ctaParticles = useMemo(
    () => Array.from({ length: 20 }, (_, index) => ({
      id: `cta-emoji-${index + 1}`,
      left: `${(index * 37) % 100}%`,
      delay: `${(index % 10) * 0.5}s`,
      duration: `${7 + (index % 5)}s`,
    })),
    []
  );

  const brandLetters = 'KRISHIMITRA'.split('');

  return (
    <div className="km-landing">
      <section className="km-hero" ref={heroRef}>
        <div className="km-grain" />
        <div className="km-hero-emoji-field">
          {heroParticles.map((particle) => (
            <span
              key={particle.id}
              className="km-hero-emoji"
              style={{
                left: particle.left,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                fontSize: particle.size,
              }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>

        <motion.header className="km-hero-head" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="km-brand">🌿 KrishiMitra</div>
          <button type="button" className="km-nav-btn" onClick={handleGetStarted}>Login</button>
        </motion.header>

        <div className="km-hero-center">
          <motion.button
            type="button"
            className="km-pill"
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            onClick={handleGetStarted}
          >
            🌾 Start For Free Today
          </motion.button>

          <motion.h1 className="km-title" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
            Empower Your Farm With AI
          </motion.h1>

          <motion.div
            className="km-stroke"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            style={{ textAlign: 'center' }}
          >
            {brandLetters.map((letter, index) => (
              <motion.span
                key={`${letter}-${index + 1}`}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                whileHover={{ color: '#16a34a', scale: 1.2 }}
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 'clamp(3rem, 7vw, 6rem)',
                  fontWeight: 900,
                  color: 'transparent',
                  WebkitTextStroke: '1.5px #16a34a',
                  display: 'inline-block',
                  letterSpacing: '0.2em',
                  transition: 'all 0.2s ease',
                }}
              >
                {letter}
              </motion.span>
            ))}
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #16a34a, #f97316, #16a34a, transparent)',
                width: '60%',
                margin: '0.5rem auto 0',
              }}
            />
          </motion.div>

          <motion.p className="km-subtitle" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }}>
            Hyperlocal crop intelligence, market timing, disease detection, and multilingual guidance in one powerful farming cockpit.
          </motion.p>

          <div className="km-scroll-indicator">
            <span>Scroll</span>
            <i />
          </div>

          <motion.div className="km-mockup" style={{ y: mockupY, rotateX: mockupRotate }}>
            <div className="km-mockup-top">
              <span>KrishiMitra Dashboard</span>
              <span className="km-ai-badge">AI LIVE</span>
            </div>
            <div className="km-mockup-grid">
              <article>
                <h4>Weather</h4>
                <p>31°C Clear sky</p>
                <small>Rain probability: 14%</small>
              </article>
              <article>
                <h4>Crop Disease</h4>
                <p>Leaf Spot Risk: Medium</p>
                <small>Action in 24h</small>
              </article>
              <article>
                <h4>Mandi Prices</h4>
                <p>Tomato ₹24/kg</p>
                <small>+3.2% from yesterday</small>
              </article>
            </div>
          </motion.div>
        </div>
      </section>

      <Reveal>
        <section className="km-ticker-wrap">
          <div className="km-ticker">
            <div className="km-ticker-track">
              {[...tickerItems, ...tickerItems].map((item, idx) => (
                <span key={`ticker-${idx + 1}`} className="km-ticker-item">{item}</span>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <section className="km-parallax" ref={parallaxRef}>
        <div className="km-wheat-pattern" />
        <Reveal>
          <h2>Smart Stack For Every Acre</h2>
        </Reveal>

        <motion.div className="km-parallax-row" style={{ x: rowOneX }}>
          {featureCards.slice(0, 4).map((item) => (
            <article className="km-product-card" key={item.title}>
              <p>{item.icon}</p>
              <h3>{item.title}</h3>
            </article>
          ))}
        </motion.div>

        <motion.div className="km-parallax-row mid" style={{ x: rowTwoX }}>
          {featureCards.slice(4, 8).map((item) => (
            <article className="km-product-card" key={item.title}>
              <p>{item.icon}</p>
              <h3>{item.title}</h3>
            </article>
          ))}
        </motion.div>

        <motion.div className="km-parallax-row" style={{ x: rowThreeX }}>
          {featureCards.slice(8, 12).map((item) => (
            <article className="km-product-card" key={item.title}>
              <p>{item.icon}</p>
              <h3>{item.title}</h3>
            </article>
          ))}
        </motion.div>
      </section>

      <section className="km-lamp-section">
        <div className="km-lamp">
          <div className="km-lamp-glow" />
          <div className="km-lamp-cone" />
        </div>

        <Reveal>
          <h2 className="km-lamp-title">Everything a Farmer Needs</h2>
        </Reveal>

        <div className="km-pricing-grid">
          {cards.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.08}>
              <TiltCard card={card} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="km-cta">
        <div className="km-cta-particles">
          {ctaParticles.map((particle) => (
            <span
              key={particle.id}
              className="km-particle"
              style={{ left: particle.left, animationDelay: particle.delay, animationDuration: particle.duration }}
            >
              🌾
            </span>
          ))}
        </div>
        <h2>Ready to transform your farm?</h2>
        <motion.button type="button" className="km-cta-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} onClick={handleGetStarted}>
          Get Started Free
        </motion.button>
      </section>
    </div>
  );
}
