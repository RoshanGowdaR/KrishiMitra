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

  const getGuideSection = () => {
    if (guideDetails) {
      const section = guideDetails[activeGuideTab];
      if (!section) return t('farmGuide.messages.noSection');
      if (typeof section === 'string') return section;
      if (Array.isArray(section)) return section.join(', ');
      return section.description || section.summary || JSON.stringify(section, null, 2);
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

    return fallbackMap[activeGuideTab] || t('farmGuide.messages.noSection');
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
              <p>{getGuideSection()}</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
