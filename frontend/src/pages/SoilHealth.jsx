import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api, { analyzeSoil, getSoilCalendar } from '../services/api';

const statusClassMap = {
  poor: 'soil-status poor',
  moderate: 'soil-status moderate',
  good: 'soil-status good',
  excellent: 'soil-status excellent',
};

export default function SoilHealth() {
  const { t } = useTranslation();
  const tabs = [
    { key: 'soil-card', label: t('soil.tabs.soilCard') },
    { key: 'appearance', label: t('soil.tabs.appearance') },
    { key: 'location', label: t('soil.tabs.location') },
  ];
  const [activeTab, setActiveTab] = useState('soil-card');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);

  const [soilCardForm, setSoilCardForm] = useState({
    pH: '6.8',
    nitrogen: '300',
    phosphorus: '30',
    potassium: '320',
    organic_carbon: '0.9',
  });

  const [appearanceForm, setAppearanceForm] = useState({
    soil_color: 'Red',
    water_drainage: 'Moderate',
    previous_crops: '',
    state: 'Karnataka',
    district: 'Hassan',
  });

  const [locationForm, setLocationForm] = useState({ state: 'Karnataka', district: 'Hassan' });
  const [costForm, setCostForm] = useState({ crop: 'rice', area_acres: '1' });

  const normalizedStatus = String(
    report?.soil_health_status || report?.status || report?.health_status || 'moderate'
  ).toLowerCase();

  const recommendedCrops = useMemo(() => {
    if (!report) return [];
    return report.crop_recommendations || report.crops || report.crops_to_sow || [];
  }, [report]);

  const fertilizerRecommendations = useMemo(() => {
    if (!report) return [];
    if (Array.isArray(report.fertilizer_recommendations)) return report.fertilizer_recommendations;
    if (Array.isArray(report.recommendations)) return report.recommendations;
    if (Array.isArray(report.notes)) return report.notes;
    return [];
  }, [report]);

  const setForm = (setter, key, value) => {
    setter((prev) => ({ ...prev, [key]: value }));
  };

  const analyzeSoilCard = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSoil({
        pH: Number(soilCardForm.pH),
        nitrogen: Number(soilCardForm.nitrogen),
        phosphorus: Number(soilCardForm.phosphorus),
        potassium: Number(soilCardForm.potassium),
        organic_carbon: Number(soilCardForm.organic_carbon),
        micronutrients: { zinc: 1.2, boron: 0.6, iron: 4.3 },
      });
      setReport(result);
    } catch (error) {
      toast.error(t('soil.messages.cardError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeByAppearance = async () => {
    setIsAnalyzing(true);
    try {
      const response = await api.post('/soil/analyze-appearance', {
        soil_color: appearanceForm.soil_color.toLowerCase(),
        water_drainage: appearanceForm.water_drainage.toLowerCase(),
        previous_crops: appearanceForm.previous_crops
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        state: appearanceForm.state,
        district: appearanceForm.district,
      });
      setReport(response.data);
    } catch (error) {
      toast.error(t('soil.messages.appearanceError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeByLocation = async () => {
    setIsAnalyzing(true);
    try {
      const result = await getSoilCalendar({
        state: locationForm.state,
        district: locationForm.district,
      });
      setReport(result);
    } catch (error) {
      toast.error(t('soil.messages.locationError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateCost = async () => {
    try {
      const response = await api.post('/soil/cost-calculator', {
        crop: costForm.crop,
        area_acres: Number(costForm.area_acres),
        soil_health: normalizedStatus,
      });
      setCostBreakdown(response.data);
    } catch (error) {
      toast.error(t('soil.messages.costError'));
    }
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="page-wrap soil-page">
      <h2>{t('soil.title')}</h2>

      <section className="panel soil-tabs-panel">
        <div className="soil-tabs-row">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'soil-tab active' : 'soil-tab'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'soil-card' ? (
          <div className="soil-form-grid">
            <label>{t('soil.fields.ph')}<input type="number" min="0" max="14" step="0.1" value={soilCardForm.pH} onChange={(event) => setForm(setSoilCardForm, 'pH', event.target.value)} /></label>
            <label>{t('soil.fields.nitrogen')}<input type="number" value={soilCardForm.nitrogen} onChange={(event) => setForm(setSoilCardForm, 'nitrogen', event.target.value)} /></label>
            <label>{t('soil.fields.phosphorus')}<input type="number" value={soilCardForm.phosphorus} onChange={(event) => setForm(setSoilCardForm, 'phosphorus', event.target.value)} /></label>
            <label>{t('soil.fields.potassium')}<input type="number" value={soilCardForm.potassium} onChange={(event) => setForm(setSoilCardForm, 'potassium', event.target.value)} /></label>
            <label>{t('soil.fields.organicCarbon')}<input type="number" step="0.1" value={soilCardForm.organic_carbon} onChange={(event) => setForm(setSoilCardForm, 'organic_carbon', event.target.value)} /></label>
            <button type="button" className="primary-btn" onClick={analyzeSoilCard} disabled={isAnalyzing}>{t('soil.actions.analyzeSoil')}</button>
          </div>
        ) : null}

        {activeTab === 'appearance' ? (
          <div className="soil-form-grid">
            <label>{t('soil.fields.soilColor')}
              <select value={appearanceForm.soil_color} onChange={(event) => setForm(setAppearanceForm, 'soil_color', event.target.value)}>
                <option>Red</option>
                <option>Black</option>
                <option>Brown</option>
                <option>Sandy</option>
              </select>
            </label>
            <label>{t('soil.fields.waterDrainage')}
              <select value={appearanceForm.water_drainage} onChange={(event) => setForm(setAppearanceForm, 'water_drainage', event.target.value)}>
                <option>Fast</option>
                <option>Moderate</option>
                <option>Slow</option>
              </select>
            </label>
            <label>{t('soil.fields.previousCrops')}<input value={appearanceForm.previous_crops} onChange={(event) => setForm(setAppearanceForm, 'previous_crops', event.target.value)} placeholder={t('soil.fields.previousCropsPlaceholder')} /></label>
            <label>{t('common.state')}
              <select value={appearanceForm.state} onChange={(event) => setForm(setAppearanceForm, 'state', event.target.value)}>
                <option>Karnataka</option>
                <option>Maharashtra</option>
                <option>Tamil Nadu</option>
              </select>
            </label>
            <label>{t('common.district')}
              <select value={appearanceForm.district} onChange={(event) => setForm(setAppearanceForm, 'district', event.target.value)}>
                <option>Hassan</option>
                <option>Bengaluru</option>
                <option>Mysuru</option>
              </select>
            </label>
            <button type="button" className="primary-btn" onClick={analyzeByAppearance} disabled={isAnalyzing}>{t('soil.actions.analyze')}</button>
          </div>
        ) : null}

        {activeTab === 'location' ? (
          <div className="soil-form-grid">
            <label>{t('common.state')}
              <select value={locationForm.state} onChange={(event) => setForm(setLocationForm, 'state', event.target.value)}>
                <option>Karnataka</option>
                <option>Maharashtra</option>
                <option>Tamil Nadu</option>
              </select>
            </label>
            <label>{t('common.district')}
              <select value={locationForm.district} onChange={(event) => setForm(setLocationForm, 'district', event.target.value)}>
                <option>Hassan</option>
                <option>Bengaluru</option>
                <option>Mysuru</option>
              </select>
            </label>
            <button type="button" className="primary-btn" onClick={analyzeByLocation} disabled={isAnalyzing}>{t('soil.actions.getInfo')}</button>
          </div>
        ) : null}
      </section>

      {report ? (
        <section className="panel soil-results-panel">
          <h3>{t('common.results')}</h3>
          <span className={statusClassMap[normalizedStatus] || statusClassMap.moderate}>{normalizedStatus}</span>

          <div>
            <h4>{t('soil.recommendedCrops')}</h4>
            <div className="soil-tag-list">
              {recommendedCrops.map((crop) => (
                <span key={crop} className="soil-tag">{crop}</span>
              ))}
            </div>
          </div>

          <div>
            <h4>{t('soil.fertilizerRecommendations')}</h4>
            <ul className="simple-list">
              {fertilizerRecommendations.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="panel soil-cost-panel">
        <h3>{t('soil.costCalculator')}</h3>
        <div className="soil-form-grid">
          <label>{t('soil.crop')}
            <select value={costForm.crop} onChange={(event) => setForm(setCostForm, 'crop', event.target.value)}>
              <option value="rice">Rice</option>
              <option value="wheat">Wheat</option>
              <option value="maize">Maize</option>
              <option value="cotton">Cotton</option>
            </select>
          </label>
          <label>{t('soil.area')}<input type="number" step="0.1" value={costForm.area_acres} onChange={(event) => setForm(setCostForm, 'area_acres', event.target.value)} /></label>
          <button type="button" className="primary-btn" onClick={calculateCost}>{t('soil.actions.calculateCost')}</button>
        </div>

        {costBreakdown ? (
          <div className="market-table-wrap">
            <table className="market-table">
              <tbody>
                <tr><th>{t('soil.cost.seeds')}</th><td>{renderValue(costBreakdown.seeds_cost)}</td></tr>
                <tr><th>{t('soil.cost.fertilizer')}</th><td>{renderValue(costBreakdown.fertilizer_cost)}</td></tr>
                <tr><th>{t('soil.cost.pesticide')}</th><td>{renderValue(costBreakdown.pesticide_cost)}</td></tr>
                <tr><th>{t('soil.cost.irrigation')}</th><td>{renderValue(costBreakdown.irrigation_cost)}</td></tr>
                <tr><th>{t('soil.cost.labor')}</th><td>{renderValue(costBreakdown.labor_cost)}</td></tr>
                <tr><th>{t('soil.cost.total')}</th><td><strong>{renderValue(costBreakdown.total_cost)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
