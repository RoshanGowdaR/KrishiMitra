import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const guideTabs = ['overview', 'planting', 'irrigation', 'fertilization', 'pest_management', 'harvesting', 'market_info'];

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

const calendarStates = ['Karnataka', 'Maharashtra', 'Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Andhra Pradesh', 'Telangana', 'Bihar', 'Rajasthan', 'Gujarat'];
const compareCropOptions = ['rice', 'wheat', 'maize', 'tomato', 'onion', 'potato', 'cotton', 'sugarcane', 'ragi', 'soybean'];
const monthOptions = [
  { value: 1, key: 'january' },
  { value: 2, key: 'february' },
  { value: 3, key: 'march' },
  { value: 4, key: 'april' },
  { value: 5, key: 'may' },
  { value: 6, key: 'june' },
  { value: 7, key: 'july' },
  { value: 8, key: 'august' },
  { value: 9, key: 'september' },
  { value: 10, key: 'october' },
  { value: 11, key: 'november' },
  { value: 12, key: 'december' },
];

const cropCompareMeta = {
  rice: { days_to_harvest: 125, cost_per_acre: 32000 },
  wheat: { days_to_harvest: 115, cost_per_acre: 28000 },
  maize: { days_to_harvest: 105, cost_per_acre: 26000 },
  tomato: { days_to_harvest: 90, cost_per_acre: 65000 },
  onion: { days_to_harvest: 120, cost_per_acre: 48000 },
  potato: { days_to_harvest: 105, cost_per_acre: 52000 },
  cotton: { days_to_harvest: 170, cost_per_acre: 42000 },
  sugarcane: { days_to_harvest: 330, cost_per_acre: 75000 },
  ragi: { days_to_harvest: 105, cost_per_acre: 22000 },
  soybean: { days_to_harvest: 110, cost_per_acre: 30000 },
};

const difficultyScore = { easy: 1, medium: 2, hard: 3 };
const waterScore = { low: 1, medium: 2, high: 3 };
const profitScore = { low: 1, medium: 2, high: 3 };

const cropNameMap = {
  kn: {
    rice: 'ಅಕ್ಕಿ',
    wheat: 'ಗೋಧಿ',
    maize: 'ಮೆಕ್ಕೆಜೋಳ',
    tomato: 'ಟೊಮೇಟೊ',
    onion: 'ಈರುಳ್ಳಿ',
    potato: 'ಆಲೂಗಡ್ಡೆ',
    cotton: 'ಹತ್ತಿ',
    sugarcane: 'ಕಬ್ಬು',
    ragi: 'ರಾಗಿ',
    soybean: 'ಸೋಯಾಬೀನ್',
    turmeric: 'ಅರಿಶಿನ',
  },
  hi: {
    rice: 'धान',
    wheat: 'गेहूं',
    maize: 'मक्का',
    tomato: 'टमाटर',
    onion: 'प्याज',
    potato: 'आलू',
    cotton: 'कपास',
    sugarcane: 'गन्ना',
    ragi: 'रागी',
    soybean: 'सोयाबीन',
    turmeric: 'हल्दी',
  },
};

export default function FarmGuide() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('all');
  const [category, setCategory] = useState('all');
  const [crops, setCrops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [guideDetails, setGuideDetails] = useState(null);
  const [activeGuideTab, setActiveGuideTab] = useState('overview');
  const [calendarState, setCalendarState] = useState('Karnataka');
  const [calendarMonth, setCalendarMonth] = useState(3);
  const [calendarData, setCalendarData] = useState(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [compareCrop1, setCompareCrop1] = useState('rice');
  const [compareCrop2, setCompareCrop2] = useState('wheat');
  const [comparisonData, setComparisonData] = useState(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadCrops() {
      setIsLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/farm-guide/crops?language=${language}`);
        const data = await response.json();
        const cropList = data?.crops || [];

        if (!ignore) {
          setCrops(cropList.length ? cropList : sampleCrops);
        }
      } catch (error) {
        if (!ignore) {
          setCrops(sampleCrops);
          toast.error(t('farmGuide.messages.fetchError'));
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
  }, [language, t]);

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

  const toCropKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

  const getLocalizedCropName = (name) => {
    const original = String(name || '').trim();
    const normalized = toCropKey(original);
    const langMap = cropNameMap[language] || {};
    return langMap[normalized] || original.charAt(0).toUpperCase() + original.slice(1);
  };

  const getLocalizedSeason = (seasonValue) => {
    const normalized = toCropKey(seasonValue);
    const seasonKeyMap = {
      kharif: 'kharif',
      rabi: 'rabi',
      annual: 'annual',
      all: 'all_season',
      all_season: 'all_season',
      zaid: 'all_season',
    };
    const key = seasonKeyMap[normalized];
    if (!key) {
      return seasonValue || t('farmGuide.defaults.allSeason');
    }
    return t(`farmGuide.seasons.${key}`, { defaultValue: seasonValue || t('farmGuide.defaults.allSeason') });
  };

  const getLocalizedDifficulty = (difficultyValue) => {
    const normalized = toCropKey(difficultyValue);
    const difficultyKeyMap = {
      easy: 'easy',
      medium: 'medium',
      hard: 'hard',
      beginner: 'easy',
      intermediate: 'medium',
      advanced: 'hard',
    };
    const key = difficultyKeyMap[normalized];
    if (!key) {
      return difficultyValue || t('farmGuide.defaults.beginner');
    }
    return t(`farmGuide.difficulty.${key}`, { defaultValue: difficultyValue || t('farmGuide.defaults.beginner') });
  };

  const getCompareMeta = (crop) => cropCompareMeta[toCropKey(crop)] || { days_to_harvest: 0, cost_per_acre: 0 };

  const shouldMarkLeftBetter = (row) => {
    if (!comparisonData) return false;

    const left = comparisonData.crop1;
    const right = comparisonData.crop2;
    if (!left || !right) return false;

    if (row === 'difficulty') return (difficultyScore[toCropKey(left.difficulty)] || 99) < (difficultyScore[toCropKey(right.difficulty)] || 99);
    if (row === 'water') return (waterScore[toCropKey(left.water_requirement)] || 99) < (waterScore[toCropKey(right.water_requirement)] || 99);
    if (row === 'days') return getCompareMeta(left.name).days_to_harvest < getCompareMeta(right.name).days_to_harvest;
    if (row === 'cost') return getCompareMeta(left.name).cost_per_acre < getCompareMeta(right.name).cost_per_acre;
    if (row === 'profit') return (profitScore[toCropKey(left.profit_potential)] || 0) > (profitScore[toCropKey(right.profit_potential)] || 0);
    return false;
  };

  const shouldMarkRightBetter = (row) => {
    if (!comparisonData) return false;

    const left = comparisonData.crop1;
    const right = comparisonData.crop2;
    if (!left || !right) return false;

    if (row === 'difficulty') return (difficultyScore[toCropKey(right.difficulty)] || 99) < (difficultyScore[toCropKey(left.difficulty)] || 99);
    if (row === 'water') return (waterScore[toCropKey(right.water_requirement)] || 99) < (waterScore[toCropKey(left.water_requirement)] || 99);
    if (row === 'days') return getCompareMeta(right.name).days_to_harvest < getCompareMeta(left.name).days_to_harvest;
    if (row === 'cost') return getCompareMeta(right.name).cost_per_acre < getCompareMeta(left.name).cost_per_acre;
    if (row === 'profit') return (profitScore[toCropKey(right.profit_potential)] || 0) > (profitScore[toCropKey(left.profit_potential)] || 0);
    return false;
  };

  const checkSeasonalCalendar = async () => {
    setIsCalendarLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/farm-guide/seasonal-calendar?state=${encodeURIComponent(calendarState)}&month=${calendarMonth}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'calendar_error');
      }
      setCalendarData(data);
    } catch (error) {
      toast.error(t('farmGuide.messages.calendarError'));
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const compareCrops = async () => {
    if (compareCrop1 === compareCrop2) {
      toast.error(t('farmGuide.messages.compareSameCrop'));
      return;
    }

    setIsCompareLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/farm-guide/compare?crop1=${encodeURIComponent(compareCrop1)}&crop2=${encodeURIComponent(compareCrop2)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'compare_error');
      }
      setComparisonData(data);
    } catch (error) {
      toast.error(t('farmGuide.messages.compareError'));
    } finally {
      setIsCompareLoading(false);
    }
  };

  const openGuide = async (crop) => {
    setSelectedCrop(crop);
    setGuideDetails(null);
    setActiveGuideTab('overview');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/farm-guide/crops/${crop.name.toLowerCase()}?language=${language}`);

      const details = await response.json();

      if (response.ok) {
        setGuideDetails(details);
      }
    } catch (error) {
      toast.error(t('farmGuide.messages.guideError'));
    }
  };

  const renderSection = (data) => {
    if (!data) {
      return <p>Information not available</p>;
    }

    if (typeof data === 'string') {
      return <p>{data}</p>;
    }

    if (typeof data === 'object') {
      return (
        <div>
          {Object.entries(data).map(([key, value]) => (
            value ? (
              <div
                key={key}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    minWidth: 160,
                    color: '#16a34a',
                    textTransform: 'capitalize',
                  }}
                >
                  {key.replace(/_/g, ' ')}:
                </span>
                <span style={{ color: '#444' }}>
                  {typeof value === 'object'
                    ? Object.values(value).join(', ')
                    : String(value)}
                </span>
              </div>
            ) : null
          ))}
        </div>
      );
    }

    return <p>Information not available</p>;
  };

  const getGuideSection = () => {
    if (guideDetails) {
      const section = guideDetails[activeGuideTab];
      if (!section) return 'Information not available';
      return section;
    }

    if (!selectedCrop) return null;

    const fallbackMap = {
      overview: t('farmGuide.fallback.overview', {
        crop: getLocalizedCropName(selectedCrop.name),
        season: getLocalizedSeason(selectedCrop.season),
        category: selectedCrop.category || t('farmGuide.defaults.general'),
        difficulty: getLocalizedDifficulty(selectedCrop.difficulty),
      }),
      planting: t('farmGuide.fallback.planting'),
      irrigation: t('farmGuide.fallback.irrigation', { water: selectedCrop.water_requirement || t('farmGuide.defaults.moderate') }),
      fertilization: t('farmGuide.fallback.fertilization'),
      pest_management: t('farmGuide.fallback.pestManagement'),
      harvesting: t('farmGuide.fallback.harvesting'),
      market_info: t('farmGuide.fallback.marketInfo', { profit: selectedCrop.profit_potential || t('farmGuide.defaults.medium') }),
    };

    return fallbackMap[activeGuideTab] || 'Information not available';
  };

  if (isLoading) return <div className="panel">{t('farmGuide.loading')}</div>;

  return (
    <div className="page-wrap farm-guide-page">
      <h2>{t('farmGuide.title')}</h2>

      <div className="panel farm-guide-search-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('farmGuide.searchPlaceholder')} />
      </div>

      <div className="panel farm-guide-filter-row">
        <label>
          {t('farmGuide.season')}
          <select value={season} onChange={(event) => setSeason(event.target.value)}>
            <option value="all">{t('common.all')}</option>
            <option value="kharif">Kharif</option>
            <option value="rabi">Rabi</option>
            <option value="zaid">Zaid</option>
          </select>
        </label>
        <label>
          {t('farmGuide.category')}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t('common.all')}</option>
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
            <h3>{getLocalizedCropName(crop.name)}</h3>
            <div className="crop-tag-row">
              <span className="scheme-ministry">{getLocalizedSeason(crop.season)}</span>
              <span className={crop.difficulty === 'advanced' ? 'difficulty-badge advanced' : crop.difficulty === 'intermediate' ? 'difficulty-badge intermediate' : 'difficulty-badge beginner'}>
                {getLocalizedDifficulty(crop.difficulty)}
              </span>
            </div>
            <p>{t('farmGuide.water')}: {crop.water_requirement || t('farmGuide.defaults.moderate')}</p>
            <p className="profit-tag">{t('farmGuide.profit')}: {crop.profit_potential || t('farmGuide.defaults.medium')}</p>
            <button type="button" className="primary-btn" onClick={() => openGuide(crop)}>
              {t('common.viewGuide')}
            </button>
          </article>
        ))}
      </div>

      {filteredCrops.length === 0 ? (
        <div className="panel">
          <p className="page-muted">{t('farmGuide.messages.noCrops')}</p>
        </div>
      ) : null}

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h3>{t('farmGuide.seasonalCalendar')}</h3>
        <div className="soil-form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            {t('common.state')}
            <select value={calendarState} onChange={(event) => setCalendarState(event.target.value)}>
              {calendarStates.map((stateName) => (
                <option key={stateName} value={stateName}>{stateName}</option>
              ))}
            </select>
          </label>
          <label>
            {t('farmGuide.month')}
            <select value={calendarMonth} onChange={(event) => setCalendarMonth(Number(event.target.value))}>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{t(`farmGuide.months.${month.key}`)}</option>
              ))}
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={checkSeasonalCalendar} disabled={isCalendarLoading}>
            {isCalendarLoading ? t('common.loading') : t('farmGuide.checkCalendar')}
          </button>
        </div>

        {calendarData ? (
          <div style={{ marginTop: '1rem' }}>
            <h4>{t('farmGuide.cropsToSow')}</h4>
            <div className="soil-tag-list">
              {(calendarData.crops_to_sow || []).map((crop) => (
                <span key={`sow-${crop}`} className="soil-tag">{getLocalizedCropName(crop)}</span>
              ))}
            </div>

            <h4 style={{ marginTop: '0.75rem' }}>{t('farmGuide.cropsToHarvest')}</h4>
            <div className="soil-tag-list">
              {(calendarData.crops_to_harvest || []).map((crop) => (
                <span key={`harvest-${crop}`} className="soil-tag" style={{ background: '#ffedd5', color: '#9a3412' }}>{getLocalizedCropName(crop)}</span>
              ))}
            </div>

            <h4 style={{ marginTop: '0.75rem' }}>{t('farmGuide.activitiesThisMonth')}</h4>
            <ul className="simple-list">
              {(calendarData.important_activities || []).map((activity) => (
                <li key={activity}>{activity}</li>
              ))}
            </ul>

            <h4 style={{ marginTop: '0.75rem' }}>{t('farmGuide.weatherAdvisory')}</h4>
            <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', borderRadius: '10px', padding: '0.75rem' }}>
              {calendarData.weather_advisory}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h3>{t('farmGuide.compareTwoCrops')}</h3>
        <div className="soil-form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            {t('farmGuide.cropOne')}
            <select value={compareCrop1} onChange={(event) => setCompareCrop1(event.target.value)}>
              {compareCropOptions.map((crop) => (
                <option key={`left-${crop}`} value={crop}>{getLocalizedCropName(crop)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('farmGuide.cropTwo')}
            <select value={compareCrop2} onChange={(event) => setCompareCrop2(event.target.value)}>
              {compareCropOptions.map((crop) => (
                <option key={`right-${crop}`} value={crop}>{getLocalizedCropName(crop)}</option>
              ))}
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={compareCrops} disabled={isCompareLoading}>
            {isCompareLoading ? t('common.loading') : t('farmGuide.compare')}
          </button>
        </div>

        {comparisonData ? (
          <div className="market-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="market-table">
              <thead>
                <tr>
                  <th>{t('farmGuide.metric')}</th>
                  <th style={{ color: '#166534' }}>{getLocalizedCropName(comparisonData.crop1.name)}</th>
                  <th style={{ color: '#c2410c' }}>{getLocalizedCropName(comparisonData.crop2.name)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>{t('farmGuide.season')}</th>
                  <td>{getLocalizedSeason(comparisonData.crop1.season)}</td>
                  <td>{getLocalizedSeason(comparisonData.crop2.season)}</td>
                </tr>
                <tr>
                  <th>{t('farmGuide.difficultyLabel')}</th>
                  <td>{getLocalizedDifficulty(comparisonData.crop1.difficulty)}{shouldMarkLeftBetter('difficulty') ? ' ✅' : ''}</td>
                  <td>{getLocalizedDifficulty(comparisonData.crop2.difficulty)}{shouldMarkRightBetter('difficulty') ? ' ✅' : ''}</td>
                </tr>
                <tr>
                  <th>{t('farmGuide.waterNeed')}</th>
                  <td>{comparisonData.crop1.water_requirement}{shouldMarkLeftBetter('water') ? ' ✅' : ''}</td>
                  <td>{comparisonData.crop2.water_requirement}{shouldMarkRightBetter('water') ? ' ✅' : ''}</td>
                </tr>
                <tr>
                  <th>{t('farmGuide.daysToHarvest')}</th>
                  <td>{getCompareMeta(comparisonData.crop1.name).days_to_harvest}{shouldMarkLeftBetter('days') ? ' ✅' : ''}</td>
                  <td>{getCompareMeta(comparisonData.crop2.name).days_to_harvest}{shouldMarkRightBetter('days') ? ' ✅' : ''}</td>
                </tr>
                <tr>
                  <th>{t('farmGuide.costPerAcre')}</th>
                  <td>₹{getCompareMeta(comparisonData.crop1.name).cost_per_acre.toLocaleString('en-IN')}{shouldMarkLeftBetter('cost') ? ' ✅' : ''}</td>
                  <td>₹{getCompareMeta(comparisonData.crop2.name).cost_per_acre.toLocaleString('en-IN')}{shouldMarkRightBetter('cost') ? ' ✅' : ''}</td>
                </tr>
                <tr>
                  <th>{t('farmGuide.profitPotential')}</th>
                  <td>{comparisonData.crop1.profit_potential}{shouldMarkLeftBetter('profit') ? ' ✅' : ''}</td>
                  <td>{comparisonData.crop2.profit_potential}{shouldMarkRightBetter('profit') ? ' ✅' : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {selectedCrop ? (
        <div
          role="presentation"
          onClick={() => setSelectedCrop(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflowY: 'auto',
              width: '100%',
              border: '1px solid #e5e7eb',
              padding: '1rem',
            }}
          >
            <div className="scheme-modal-header">
              <h3>{getLocalizedCropName(selectedCrop.name || guideDetails?.name || t('farmGuide.cropGuide'))}</h3>
              <button type="button" className="ghost-btn" onClick={() => setSelectedCrop(null)}>X</button>
            </div>

            <div className="guide-tabs-row">
              {guideTabs.map((tab) => (
                <button key={tab} type="button" className={activeGuideTab === tab ? 'soil-tab active' : 'soil-tab'} onClick={() => setActiveGuideTab(tab)}>
                  {t(`farmGuide.tabs.${tab}`)}
                </button>
              ))}
            </div>

            <div className="guide-content-block">
              {renderSection(getGuideSection())}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
