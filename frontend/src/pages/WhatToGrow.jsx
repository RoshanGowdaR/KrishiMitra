import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  fetchCropMarketIntelligence,
  fetchWhatToGrowRecommendations,
} from '../services/marketService';

const DEFAULT_STATE = 'Karnataka';

const FALLBACK_EXCESS = [
  { rank: 1, crop: 'Tomato', production_index: 92, surplus_tonnes: 18500 },
  { rank: 2, crop: 'Onion', production_index: 88, surplus_tonnes: 17300 },
  { rank: 3, crop: 'Potato', production_index: 86, surplus_tonnes: 16100 },
  { rank: 4, crop: 'Paddy', production_index: 84, surplus_tonnes: 15600 },
  { rank: 5, crop: 'Sugarcane', production_index: 82, surplus_tonnes: 15000 },
  { rank: 6, crop: 'Banana', production_index: 80, surplus_tonnes: 14600 },
  { rank: 7, crop: 'Cotton', production_index: 78, surplus_tonnes: 14100 },
  { rank: 8, crop: 'Tur', production_index: 76, surplus_tonnes: 13500 },
  { rank: 9, crop: 'Groundnut', production_index: 74, surplus_tonnes: 13000 },
  { rank: 10, crop: 'Chilli', production_index: 72, surplus_tonnes: 12600 },
];

const FALLBACK_DEMAND = [
  { rank: 1, crop: 'Maize', demand_index: 95, demand_tonnes: 16200 },
  { rank: 2, crop: 'Soybean', demand_index: 93, demand_tonnes: 15700 },
  { rank: 3, crop: 'Millets', demand_index: 91, demand_tonnes: 15100 },
  { rank: 4, crop: 'Moong', demand_index: 89, demand_tonnes: 14700 },
  { rank: 5, crop: 'Black Gram', demand_index: 87, demand_tonnes: 14300 },
  { rank: 6, crop: 'Sunflower', demand_index: 85, demand_tonnes: 13900 },
  { rank: 7, crop: 'Sesame', demand_index: 83, demand_tonnes: 13600 },
  { rank: 8, crop: 'Coriander', demand_index: 81, demand_tonnes: 13200 },
  { rank: 9, crop: 'Cabbage', demand_index: 79, demand_tonnes: 12800 },
  { rank: 10, crop: 'Carrot', demand_index: 77, demand_tonnes: 12400 },
];

const FALLBACK_TREND = [
  { month: 'Apr', demand_index: 74, arrival_index: 71, price_index: 70 },
  { month: 'May', demand_index: 79, arrival_index: 66, price_index: 74 },
  { month: 'Jun', demand_index: 72, arrival_index: 76, price_index: 69 },
  { month: 'Jul', demand_index: 86, arrival_index: 70, price_index: 82 },
  { month: 'Aug', demand_index: 78, arrival_index: 83, price_index: 75 },
  { month: 'Sep', demand_index: 90, arrival_index: 74, price_index: 88 },
];

const PIE_COLORS = ['#16a34a', '#f97316', '#2563eb', '#e11d48', '#0f766e', '#ca8a04'];

const FALLBACK_RECOMMENDATIONS = FALLBACK_DEMAND.map((item, index) => ({
  rank: index + 1,
  crop: item.crop,
  demand_index: item.demand_index,
  why: `${item.crop} has consistent mandi pull from wholesalers and processors. Demand is stronger than nearby alternatives, and farmers can benefit from better offtake if crop quality and timely harvest are maintained.`,
}));

const chartCardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: '0.85rem',
  background: '#fff',
};

export default function WhatToGrow() {
  const [stateName, setStateName] = useState(DEFAULT_STATE);
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [excessCrops, setExcessCrops] = useState([]);
  const [demandCrops, setDemandCrops] = useState([]);
  const [demandTrend, setDemandTrend] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const loadInsights = async (requestedState) => {
    const normalizedState = String(requestedState || '').trim() || DEFAULT_STATE;
    setLoadingInsights(true);
    try {
      const response = await fetchCropMarketIntelligence({ state: normalizedState });
      const excessRows = Array.isArray(response?.excessCrops) && response.excessCrops.length ? response.excessCrops : FALLBACK_EXCESS;
      const demandRows = Array.isArray(response?.demandCrops) && response.demandCrops.length ? response.demandCrops : FALLBACK_DEMAND;
      const trendRows = Array.isArray(response?.demandTrend) && response.demandTrend.length ? response.demandTrend : FALLBACK_TREND;
      setExcessCrops(excessRows.slice(0, 10));
      setDemandCrops(demandRows.slice(0, 10));
      setDemandTrend(trendRows.slice(0, 6));
      setSelectedState(normalizedState);
      setLastUpdatedAt(response?.fetchedAt || new Date().toISOString());
      setRecommendations([]);
    } catch {
      setExcessCrops(FALLBACK_EXCESS);
      setDemandCrops(FALLBACK_DEMAND);
      setDemandTrend(FALLBACK_TREND);
      setSelectedState(normalizedState);
      setLastUpdatedAt(new Date().toISOString());
      toast.error('Could not fetch live crop intelligence, showing fallback insights.');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights(DEFAULT_STATE);
  }, []);

  const onKnowWhatToGrow = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await fetchWhatToGrowRecommendations({ state: selectedState });
      const rows = Array.isArray(response) && response.length ? response : FALLBACK_RECOMMENDATIONS;
      setRecommendations(rows.slice(0, 10));
      toast.success('Top demand crops ready.');
    } catch {
      setRecommendations(FALLBACK_RECOMMENDATIONS);
      toast.error('Could not fetch live recommendations, showing fallback suggestions.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const chartExcess = useMemo(
    () => excessCrops.map((row) => ({ crop: row.crop, value: row.production_index })),
    [excessCrops]
  );

  const chartDemand = useMemo(
    () => demandCrops.map((row) => ({ crop: row.crop, value: row.demand_index })),
    [demandCrops]
  );

  const chartTrend = useMemo(
    () => demandTrend.map((row) => ({
      month: row.month,
      demandIndex: row.demand_index,
      arrivalIndex: row.arrival_index,
      priceIndex: row.price_index,
    })),
    [demandTrend]
  );

  const demandPieData = useMemo(
    () => chartDemand.slice(0, 6).map((row) => ({ name: row.crop, value: row.value })),
    [chartDemand]
  );

  const demandTrendDomain = useMemo(() => {
    const values = chartTrend.map((item) => Number(item.demandIndex)).filter((value) => Number.isFinite(value));
    if (!values.length) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(0, min - 8), Math.min(100, max + 8)];
  }, [chartTrend]);

  const handleRefresh = () => {
    loadInsights(stateName);
  };

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>What To Grow</h2>
        <p style={{ margin: '0.35rem 0 0.8rem' }}>
          Discover crop surplus and demand trends, then get AI-backed suggestions for what to cultivate next.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={stateName}
            onChange={(event) => setStateName(event.target.value)}
            placeholder="Enter state"
            style={{ maxWidth: 240 }}
          />
          <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={loadingInsights}>
            {loadingInsights ? 'Loading...' : 'Refresh Market Data'}
          </button>
          <button type="button" className="primary-btn" onClick={onKnowWhatToGrow} disabled={loadingRecommendations}>
            {loadingRecommendations ? 'Finding Best Crops...' : 'Know What To Grow'}
          </button>
        </div>
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
          State: {selectedState} | Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '--'} IST
        </p>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Top 10 Excess Production Crops</h3>
        <div style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartExcess}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="crop" interval={0} angle={-30} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Production Index" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>State Demand Trend (Last 6 Months)</h3>
        <div style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={demandTrendDomain} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="demandIndex" name="Demand Index" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="arrivalIndex" name="Arrival Index" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="priceIndex" name="Price Index" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Demand Share by Crop (Top 6)</h3>
        <div style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={demandPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={112}
                label
              >
                {demandPieData.map((item, index) => (
                  <Cell key={`${item.name}-${item.value}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Top 10 Most Demanded Crops</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {chartDemand.map((item, index) => (
            <div key={`${item.crop}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.55rem 0.7rem' }}>
              <strong>{index + 1}. {item.crop}</strong>
              <span>Demand Index: {item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>AI Recommendations: Top 10 Crops To Grow</h3>
        {recommendations.length === 0 ? (
          <p className="page-muted" style={{ margin: 0 }}>
            Click Know What To Grow to get demand-ordered crop suggestions with explanations.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recommendations.map((item) => (
              <article key={`${item.rank}-${item.crop}`} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>
                    #{item.rank} {item.crop}
                  </p>
                  <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '0.2rem 0.65rem', fontWeight: 700 }}>
                    Demand Index: {item.demand_index}
                  </span>
                </div>
                <p style={{ margin: '0.45rem 0 0', color: '#334155' }}>{item.why}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
