import { useState } from 'react';
import { fetchMarketPrices } from '../services/marketService';

const QUICK_COMMODITIES = [
  'Rice', 'Wheat', 'Tomato', 'Onion', 'Potato',
  'Cotton', 'Maize', 'Soybean', 'Groundnut', 'Turmeric',
];

const inputStyle = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const getTint = (modalPrice) => {
  if (modalPrice > 5000) return '#fff1f2';
  if (modalPrice >= 2000) return '#fff7ed';
  return '#f0fdf4';
};

export default function MarketPrices() {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [commodity, setCommodity] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!state.trim() || !district.trim() || !commodity.trim()) {
      setError('Please fill in all three fields');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const data = await fetchMarketPrices(state, district, commodity);
      setPrices(data);
    } catch {
      setError('Could not fetch prices. Please try again.');
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setPrices([]);
    setSearched(false);
    setError('');
  };

  return (
    <div className="page-wrap" style={{ background: '#fff' }}>
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }
          .market-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .market-results-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
          @media (max-width: 900px) { .market-results-grid { grid-template-columns: 1fr; } }
          @media (max-width: 700px) { .market-search-grid { grid-template-columns: 1fr; } }
        `}
      </style>

      <h2 style={{ marginBottom: '0.4rem' }}>Market Prices</h2>
      <p style={{ marginTop: 0, color: '#6b7280' }}>Get live mandi prices powered by AI</p>

      <section style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="market-search-grid" style={{ marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>State</label>
            <input
              style={inputStyle}
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Karnataka"
              onFocus={(e) => { e.target.style.borderColor = '#16a34a'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>District</label>
            <input
              style={inputStyle}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Mysuru, Hassan"
              onFocus={(e) => { e.target.style.borderColor = '#16a34a'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Commodity</label>
          <input
            style={inputStyle}
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            placeholder="e.g. Rice, Wheat, Tomato, Onion"
            onFocus={(e) => { e.target.style.borderColor = '#16a34a'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          style={{
            width: '100%',
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.9rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? 'Searching...' : '🔍 Search Mandi Prices'}
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          {QUICK_COMMODITIES.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setCommodity(chip)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                padding: '0.3rem 0.8rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                background: commodity === chip ? '#16a34a' : '#fff',
                color: commodity === chip ? '#fff' : '#374151',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {searched ? (
        <section style={{ marginTop: '1.5rem' }}>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '3px solid #16a34a',
                  borderTopColor: 'transparent',
                  margin: '0 auto 0.7rem',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ margin: 0, fontWeight: 600 }}>Fetching prices from AI market database...</p>
              <p style={{ margin: '0.3rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                Analyzing current mandi trends for {commodity} in {district}, {state}
              </p>
            </div>
          ) : null}

          {!loading && error ? (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '1rem' }}>
              <p style={{ margin: 0, color: '#be123c', fontWeight: 600 }}>{error}</p>
              <button type="button" className="ghost-btn" onClick={handleSearch} style={{ marginTop: '0.7rem' }}>Retry</button>
            </div>
          ) : null}

          {!loading && !error && prices.length > 0 ? (
            <>
              <div
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                }}
              >
                <span>Showing prices for: {commodity} in {district}, {state}</span>
                <strong>{prices.length} markets found</strong>
              </div>

              <div className="market-results-grid">
                {prices.map((item, idx) => {
                  const modal = Number(item.modal_price || 0);
                  return (
                    <article
                      key={`${item.market || 'market'}-${idx}`}
                      style={{
                        background: getTint(modal),
                        borderRadius: '12px',
                        padding: '1.2rem',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                        border: '1px solid #eef2f7',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>{item.commodity || commodity}</h4>
                        <span style={{ background: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.variety || 'Standard'}
                        </span>
                      </div>

                      <p style={{ color: '#6b7280', margin: '0.5rem 0 0.7rem' }}>📍 {item.market || `${district} Mandi`}</p>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }}>₹{item.modal_price ?? '-'}</span>
                        <span style={{ color: '#6b7280', marginLeft: '0.35rem' }}>/ {item.unit || 'per quintal'}</span>
                      </div>

                      <p style={{ margin: '0 0 0.6rem', color: '#4b5563', fontSize: '0.9rem' }}>
                        Min: ₹{item.min_price ?? '-'} - Max: ₹{item.max_price ?? '-'}
                      </p>

                      <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem' }}>Updated: {item.date || '-'}</p>
                    </article>
                  );
                })}
              </div>

              <div style={{ marginTop: '1rem', background: '#f3f4f6', borderRadius: '8px', padding: '0.8rem', color: '#4b5563' }}>
                <p style={{ margin: 0 }}>
                  ℹ️ Prices are AI-generated estimates based on current market trends. For official prices visit agmarknet.gov.in
                </p>
              </div>

              <div style={{ marginTop: '0.8rem', color: '#6b7280', fontSize: '0.9rem' }}>
                <span>Searched: {commodity} | {district}, {state}</span>
                <button
                  type="button"
                  onClick={clearSearch}
                  style={{ border: 'none', background: 'none', color: '#16a34a', cursor: 'pointer', marginLeft: '0.6rem', textDecoration: 'underline' }}
                >
                  Search Again
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
