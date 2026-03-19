import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const guideTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'planting', label: 'Planting' },
  { key: 'irrigation', label: 'Irrigation' },
  { key: 'fertilization', label: 'Fertilization' },
  { key: 'pest_management', label: 'Pest Control' },
  { key: 'harvesting', label: 'Harvesting' },
  { key: 'market_info', label: 'Market' },
];

const cropEmojis = {
  rice: '🌾',
  wheat: '🌿',
  maize: '🌽',
  tomato: '🍅',
  onion: '🧅',
  potato: '🥔',
  cotton: '🧵',
  sugarcane: '🎋',
  ragi: '🌾',
  soybean: '🫘',
  turmeric: '🟡',
};

const sampleCrops = [
  { name: 'rice', category: 'cereal', season: 'kharif', difficulty: 'beginner', profit_potential: 'high', water_requirement: 'high' },
  { name: 'wheat', category: 'cereal', season: 'rabi', difficulty: 'beginner', profit_potential: 'medium', water_requirement: 'moderate' },
  { name: 'maize', category: 'cereal', season: 'kharif', difficulty: 'intermediate', profit_potential: 'medium', water_requirement: 'moderate' },
  { name: 'tomato', category: 'vegetable', season: 'zaid', difficulty: 'intermediate', profit_potential: 'high', water_requirement: 'moderate' },
  { name: 'onion', category: 'vegetable', season: 'rabi', difficulty: 'intermediate', profit_potential: 'high', water_requirement: 'moderate' },
  { name: 'potato', category: 'vegetable', season: 'rabi', difficulty: 'beginner', profit_potential: 'medium', water_requirement: 'moderate' },
  { name: 'cotton', category: 'cash_crop', season: 'kharif', difficulty: 'advanced', profit_potential: 'high', water_requirement: 'moderate' },
  { name: 'sugarcane', category: 'cash_crop', season: 'all', difficulty: 'advanced', profit_potential: 'high', water_requirement: 'high' },
  { name: 'ragi', category: 'cereal', season: 'kharif', difficulty: 'beginner', profit_potential: 'medium', water_requirement: 'low' },
  { name: 'soybean', category: 'pulse', season: 'kharif', difficulty: 'intermediate', profit_potential: 'high', water_requirement: 'moderate' },
];

export default function FarmGuide() {
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('all');
  const [category, setCategory] = useState('all');
  const [crops, setCrops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [guideDetails, setGuideDetails] = useState(null);
  const [activeGuideTab, setActiveGuideTab] = useState('overview');

  useEffect(() => {
    let ignore = false;

    async function loadCrops() {
      setIsLoading(true);
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/farm-guide/crops?language=en');
        const data = await response.json();
        const cropList = data?.crops || [];

        if (!ignore) {
          setCrops(cropList.length ? cropList : sampleCrops);
        }
      } catch (error) {
        if (!ignore) {
          setCrops(sampleCrops);
          toast.error('Unable to fetch farm guide data. Showing sample crops.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadCrops();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      const cropName = String(crop.name || '').toLowerCase();
      const cropSeason = String(crop.season || '').toLowerCase();
      const cropCategory = String(crop.category || '').toLowerCase();
      const searchMatch = !search || cropName.includes(search.toLowerCase());
      const seasonMatch = season === 'all' || cropSeason.includes(season.toLowerCase());
      const categoryMatch = category === 'all' || cropCategory === category.toLowerCase();
      return searchMatch && seasonMatch && categoryMatch;
    });
  }, [category, crops, search, season]);

  const openGuide = async (cropName) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/farm-guide/crops/${cropName.toLowerCase()}?language=en`);
      const details = await response.json();

      setGuideDetails(details);
      setActiveGuideTab('overview');
    } catch (error) {
      toast.error('Unable to load this crop guide.');
    }
  };

  const getGuideSection = () => {
    if (!guideDetails) return null;
    const section = guideDetails[activeGuideTab];
    if (!section) return 'No information available for this section.';
    if (typeof section === 'string') return section;
    if (Array.isArray(section)) return section.join(', ');
    return section.description || section.summary || JSON.stringify(section, null, 2);
  };

  if (isLoading) return <div className="panel">Loading farm guide...</div>;

  return (
    <div className="page-wrap farm-guide-page">
      <h2>Farm Guide</h2>

      <div className="panel farm-guide-search-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crops" />
      </div>

      <div className="panel farm-guide-filter-row">
        <label>
          Season
          <select value={season} onChange={(event) => setSeason(event.target.value)}>
            <option value="all">All</option>
            <option value="kharif">Kharif</option>
            <option value="rabi">Rabi</option>
            <option value="zaid">Zaid</option>
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All</option>
            <option value="cereal">Cereal</option>
            <option value="pulse">Pulse</option>
            <option value="cash_crop">Cash Crop</option>
          </select>
        </label>
      </div>

      <div className="farm-guide-grid">
        {filteredCrops.map((crop) => (
          <article key={crop.name} className="farm-crop-card">
            <span className="crop-icon">{cropEmojis[String(crop.name).toLowerCase()] || '🌱'}</span>
            <h3>{String(crop.name).charAt(0).toUpperCase() + String(crop.name).slice(1)}</h3>
            <div className="crop-tag-row">
              <span className="scheme-ministry">{crop.season || 'All Season'}</span>
              <span className={crop.difficulty === 'advanced' ? 'difficulty-badge advanced' : crop.difficulty === 'intermediate' ? 'difficulty-badge intermediate' : 'difficulty-badge beginner'}>
                {crop.difficulty || 'beginner'}
              </span>
            </div>
            <p>Water: {crop.water_requirement || 'Moderate'}</p>
            <p className="profit-tag">Profit: {crop.profit_potential || 'Medium'}</p>
            <button type="button" className="primary-btn" onClick={() => openGuide(crop.name)}>
              View Guide
            </button>
          </article>
        ))}
      </div>

      {filteredCrops.length === 0 ? (
        <div className="panel">
          <p className="page-muted">No crops found for selected filters.</p>
        </div>
      ) : null}

      {guideDetails ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setGuideDetails(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="scheme-modal-header">
              <h3>{guideDetails.name || 'Crop Guide'}</h3>
              <button type="button" className="ghost-btn" onClick={() => setGuideDetails(null)}>Close</button>
            </div>

            <div className="guide-tabs-row">
              {guideTabs.map((tab) => (
                <button key={tab.key} type="button" className={activeGuideTab === tab.key ? 'soil-tab active' : 'soil-tab'} onClick={() => setActiveGuideTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="guide-content-block">
              <p>{getGuideSection()}</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
