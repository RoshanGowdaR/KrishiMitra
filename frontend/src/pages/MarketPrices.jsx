import { useEffect, useState } from 'react';
import { fetchMarketLocationSuggestions, fetchMarketPrices } from '../services/marketService';

const QUICK_COMMODITIES = [
  'Rice', 'Wheat', 'Tomato', 'Onion', 'Potato',
  'Cotton', 'Maize', 'Soybean', 'Groundnut', 'Turmeric',
];

const getPriceTier = (modalPrice, unit) => {
  const normalizedUnit = String(unit || '').toLowerCase();
  if (normalizedUnit.includes('kg')) {
    if (modalPrice > 90) return 'high';
    if (modalPrice >= 35) return 'medium';
    return 'low';
  }
  if (modalPrice > 5000) return 'high';
  if (modalPrice >= 2000) return 'medium';
  return 'low';
};

const formatUnit = (unit) => {
  if (!unit) return 'per quintal';
  const cleaned = String(unit).trim().toLowerCase();
  if (cleaned === 'per kg' || cleaned === 'kg') return 'per kg';
  if (cleaned === 'per quintal' || cleaned === 'quintal' || cleaned === 'qtl') return 'per quintal';
  return cleaned;
};

export default function MarketPrices() {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [commodity, setCommodity] = useState('');
  const [prices, setPrices] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      if (!state.trim() || !commodity.trim()) {
        if (isMounted) {
          setLocationSuggestions([]);
          setLoadingSuggestions(false);
        }
        return;
      }

      setLoadingSuggestions(true);
      try {
        const rows = await fetchMarketLocationSuggestions(state, commodity);
        if (isMounted) setLocationSuggestions(rows);
      } catch {
        if (isMounted) setLocationSuggestions([]);
      } finally {
        if (isMounted) setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
    return () => { isMounted = false; };
  }, [state, commodity]);

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
    <div className="page-wrap market-prices-page">
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }
          .market-prices-page { background: #f7faf8; gap: 1rem; }
          .market-hero { position: relative; overflow: hidden; border: 1px solid #bfd8c6; border-radius: 16px; background: radial-gradient(circle at 82% 12%, rgba(255,255,255,0.34) 0, rgba(255,255,255,0) 44%), linear-gradient(140deg, #166534 0%, #22c55e 52%, #86efac 100%); box-shadow: 0 14px 34px rgba(22, 101, 52, 0.2); padding: 1.15rem; display: flex; justify-content: space-between; gap: 0.75rem; }
          .market-hero::after { content: ''; position: absolute; right: -42px; bottom: -66px; width: 210px; height: 210px; border-radius: 50%; background: rgba(255,255,255,0.14); }
          .market-hero-content { position: relative; z-index: 1; }
          .market-hero-content h2 { margin: 0; color: #fff; font-size: 2rem; }
          .market-hero-content p { margin: 0.45rem 0 0; color: rgba(240, 253, 244, 0.95); }
          .market-hero-stats { margin-top: 0.75rem; display: flex; gap: 0.45rem; flex-wrap: wrap; }
          .market-hero-stats span { border: 1px solid rgba(255,255,255,0.26); border-radius: 999px; padding: 0.26rem 0.62rem; color: rgba(240, 253, 244, 0.96); background: rgba(255,255,255,0.16); font-size: 0.8rem; font-weight: 600; }
          .market-search-panel { border: 1px solid #dce9df; border-radius: 16px; background: linear-gradient(180deg, #ffffff 0%, #f8fffb 100%); box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05); padding: 1rem; }
          .market-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem; }
          .market-field { display: grid; gap: 0.35rem; }
          .market-field label { font-size: 0.9rem; color: #374151; font-weight: 600; }
          .market-input { width: 100%; border: 1px solid #cdd9d2; border-radius: 12px; padding: 0.72rem 0.84rem; background: #fff; color: #1f2937; font-size: 0.95rem; transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box; }
          .market-input:focus { outline: none; border-color: #86efac; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12); }
          .market-help { margin: 0.35rem 0 0; color: #64748b; font-size: 0.82rem; }
          .market-suggestion-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.45rem; }
          .market-suggestion-btn { border: 1px solid #cdd9d2; border-radius: 999px; padding: 0.24rem 0.64rem; font-size: 0.78rem; background: #f8fffb; color: #2f5140; cursor: pointer; }
          .market-search-btn { width: 100%; border: 0; border-radius: 999px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; padding: 0.85rem; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 10px 20px rgba(22, 163, 74, 0.22); }
          .market-search-btn:disabled { opacity: 0.75; cursor: not-allowed; }
          .market-chip-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
          .market-chip { border: 1px solid #d5e4da; border-radius: 999px; padding: 0.32rem 0.76rem; font-size: 0.8rem; cursor: pointer; background: #fff; color: #334155; }
          .market-chip.active { border-color: #16a34a; background: #16a34a; color: #fff; }
          .market-results-block { margin-top: 0.2rem; }
          .market-loading, .market-error, .market-empty, .market-note-box { border-radius: 14px; padding: 1rem; }
          .market-loading { border: 1px solid #dce9df; background: #fff; text-align: center; }
          .market-spinner { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #16a34a; border-top-color: transparent; margin: 0 auto 0.7rem; animation: spin 1s linear infinite; }
          .market-error { background: #fff1f2; border: 1px solid #fecdd3; }
          .market-error p { margin: 0; color: #be123c; font-weight: 600; }
          .market-summary { border: 1px solid #bfd8c6; border-radius: 12px; background: linear-gradient(120deg, #f0fdf4 0%, #e7f9ef 100%); color: #14532d; padding: 0.85rem 0.92rem; display: flex; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; margin-bottom: 0.9rem; }
          .market-results-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.82rem; }
          .market-price-card { border: 1px solid #d7e4db; border-radius: 14px; padding: 0.95rem; background: #fff; box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05); }
          .market-price-card.low { background: #f0fdf4; }
          .market-price-card.medium { background: #fff7ed; }
          .market-price-card.high { background: #fff1f2; }
          .market-price-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
          .market-price-head h4 { margin: 0; color: #162433; }
          .market-variety-badge { background: #dcfce7; color: #166534; border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.75rem; font-weight: 600; }
          .market-location { color: #6b7280; margin: 0.5rem 0 0.7rem; }
          .market-price-row { margin-bottom: 0.55rem; }
          .market-price-value { font-size: 1.7rem; font-weight: 800; color: #166534; }
          .market-price-unit { color: #6b7280; margin-left: 0.35rem; }
          .market-range { margin: 0 0 0.56rem; color: #4b5563; font-size: 0.9rem; }
          .market-updated { margin: 0; color: #9ca3af; font-size: 0.82rem; }
          .market-note-box { margin-top: 0.9rem; background: #f3f4f6; color: #4b5563; }
          .market-meta-row { margin-top: 0.7rem; color: #6b7280; font-size: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
          .market-meta-row button { border: none; background: none; color: #16a34a; cursor: pointer; text-decoration: underline; }
          .market-empty { background: #fffbeb; border: 1px solid #fde68a; }
          .market-empty p { margin: 0; }
          .market-empty p:first-child { color: #92400e; font-weight: 700; }
          .market-empty p:last-child { margin-top: 0.5rem; color: #a16207; }
          @media (max-width: 980px) {
            .market-hero { flex-direction: column; }
            .market-hero-content h2 { font-size: 1.7rem; }
            .market-results-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 700px) { .market-search-grid { grid-template-columns: 1fr; } }
        `}
      </style>

      <section className="market-hero">
        <div className="market-hero-content">
          <h2>Market Prices</h2>
          <p>Compare mandi rates quickly and choose better selling decisions with confidence.</p>
          <div className="market-hero-stats">
            <span>{prices.length} current records</span>
            <span>{searched ? 'Latest query active' : 'Search to load data'}</span>
            <span>Official mandi datasets</span>
          </div>
        </div>
      </section>

      <section className="market-search-panel">
        <div className="market-search-grid">
          <div className="market-field">
            <label>State</label>
            <input
              className="market-input"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Karnataka"
            />
          </div>
          <div className="market-field">
            <label>District</label>
            <input
              className="market-input"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Mysuru, Hassan"
            />
            {loadingSuggestions ? (
              <p className="market-help">
                Loading district and market suggestions...
              </p>
            ) : null}
            {!loadingSuggestions && locationSuggestions.length > 0 ? (
              <div className="market-suggestion-row">
                {locationSuggestions.map((item) => (
                  <button
                    key={`${item.district}-${item.market}`}
                    type="button"
                    onClick={() => setDistrict(item.district || item.market)}
                    className="market-suggestion-btn"
                    title={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="market-field">
          <label>Commodity</label>
          <input
            className="market-input"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            placeholder="e.g. Rice, Wheat, Tomato, Onion"
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="market-search-btn"
        >
          {loading ? 'Searching...' : '🔍 Search Mandi Prices'}
        </button>

        <div className="market-chip-row">
          {QUICK_COMMODITIES.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setCommodity(chip)}
              className={`market-chip ${commodity === chip ? 'active' : ''}`}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {searched ? (
        <section className="market-results-block">
          {loading ? (
            <div className="market-loading">
              <div className="market-spinner" />
              <p style={{ margin: 0, fontWeight: 600 }}>Fetching prices from official mandi API...</p>
              <p className="market-help">
                Searching availability for {commodity} in {district}, {state}
              </p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="market-error">
              <p>{error}</p>
              <button type="button" className="ghost-btn" onClick={handleSearch} style={{ marginTop: '0.7rem' }}>Retry</button>
            </div>
          ) : null}

          {!loading && !error && prices.length > 0 ? (
            <>
              <div className="market-summary">
                <span>Showing prices for: {commodity} in {district}, {state}</span>
                <strong>{prices.length} markets found</strong>
              </div>

              <div className="market-results-grid">
                {prices.map((item, idx) => {
                  const modal = Number(item.modal_price || 0);
                  const unit = formatUnit(item.unit);
                  const tier = getPriceTier(modal, unit);
                  return (
                    <article
                      key={`${item.market || 'market'}-${idx}`}
                      className={`market-price-card ${tier}`}
                    >
                      <div className="market-price-head">
                        <h4>{item.commodity || commodity}</h4>
                        <span className="market-variety-badge">
                          {item.variety || 'Standard'}
                        </span>
                      </div>

                      <p className="market-location">{item.market || `${district} Mandi`}</p>

                      <div className="market-price-row">
                        <span className="market-price-value">₹{item.modal_price ?? '-'}</span>
                        <span className="market-price-unit">/ {unit}</span>
                      </div>

                      <p className="market-range">
                        Min: ₹{item.min_price ?? '-'} - Max: ₹{item.max_price ?? '-'}
                      </p>

                      <p className="market-updated">Updated: {item.date || '-'}</p>
                    </article>
                  );
                })}
              </div>

              <div className="market-note-box">
                <p style={{ margin: 0 }}>
                  ℹ️ Prices are AI-generated estimates based on current market trends. For official prices visit agmarknet.gov.in
                </p>
              </div>

              <div className="market-meta-row">
                <span>Searched: {commodity} | {district}, {state}</span>
                <button type="button" onClick={clearSearch}>
                  Search Again
                </button>
              </div>
            </>
          ) : null}

          {!loading && !error && searched && prices.length === 0 ? (
            <div className="market-empty">
              <p>
                No price records found for {commodity} in {district}, {state}.
              </p>
              <p>
                This usually means the crop is not currently listed in the selected market area. Try another district or crop.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
