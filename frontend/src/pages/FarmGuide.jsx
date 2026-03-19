import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getCropGuide, getFarmGuideCrops } from '../services/api';

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
  cotton: '🧵',
  sugarcane: '🎋',
  turmeric: '🟡',
};

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
        const response = await getFarmGuideCrops({ language: 'en' });
        if (!ignore) {
          setCrops(response?.crops || []);
        }
      } catch (error) {
        if (!ignore) {
          setCrops([]);
          toast.error('Unable to fetch farm guide data.');
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
      const searchMatch = !search || crop.name.toLowerCase().includes(search.toLowerCase());
      const seasonMatch = season === 'all' || String(crop.season || '').toLowerCase().includes(season.toLowerCase());
      const categoryMatch = category === 'all' || crop.category === category;
      return searchMatch && seasonMatch && categoryMatch;
    });
  }, [category, crops, search, season]);

  const openGuide = async (cropName) => {
    try {
      const details = await getCropGuide(cropName.toLowerCase(), 'en');
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
            <span className="crop-icon">{cropEmojis[crop.name.toLowerCase()] || '🌱'}</span>
            <h3>{crop.name}</h3>
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
