import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { createListing, getListings } from '../services/api';

const transportStateDistrictMap = {
  Karnataka: ['Bengaluru', 'Hassan', 'Mysuru', 'Dharwad'],
  Maharashtra: ['Pune', 'Nashik', 'Nagpur', 'Kolhapur'],
  Punjab: ['Ludhiana', 'Amritsar', 'Patiala', 'Bathinda'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Erode'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra'],
  'Andhra Pradesh': ['Guntur', 'Vijayawada', 'Kurnool', 'Tirupati'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  Bihar: ['Patna', 'Muzaffarpur', 'Bhagalpur', 'Gaya'],
  Rajasthan: ['Jaipur', 'Kota', 'Udaipur', 'Jodhpur'],
  Gujarat: ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara'],
};

const commodityOptions = ['rice', 'wheat', 'maize', 'tomato', 'onion', 'potato', 'cotton', 'sugarcane', 'ragi', 'soybean'];

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

export default function Marketplace() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const [searchCommodity, setSearchCommodity] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [transportResult, setTransportResult] = useState(null);
  const [form, setForm] = useState({
    farmer_name: '',
    phone: '',
    commodity: '',
    variety: '',
    quantity_kg: '',
    price_per_kg: '',
    state: 'Karnataka',
    district: 'Hassan',
    description: '',
  });
  const [transportForm, setTransportForm] = useState({
    pickupState: 'Karnataka',
    pickupDistrict: 'Bengaluru',
    destination: 'nearest_mandi',
    commodity: 'rice',
    quantityKg: '',
    pickupDate: today,
    farmerName: '',
    farmerPhone: '',
  });

  const sampleListings = useMemo(
    () => [
      {
        id: 'sample-a',
        commodity: 'Rice',
        variety: 'Sona Masuri',
        price_per_kg: 34,
        quantity_kg: 1200,
        state: 'Karnataka',
        district: 'Hassan',
        farmer_name: 'Ravi Kumar',
        phone: '9876543210',
      },
      {
        id: 'sample-b',
        commodity: 'Maize',
        variety: 'HQPM-1',
        price_per_kg: 26,
        quantity_kg: 900,
        state: 'Tamil Nadu',
        district: 'Erode',
        farmer_name: 'Lakshmi',
        phone: '9123456789',
      },
      {
        id: 'sample-c',
        commodity: 'Turmeric',
        variety: 'Salem',
        price_per_kg: 72,
        quantity_kg: 500,
        state: 'Maharashtra',
        district: 'Pune',
        farmer_name: 'Suresh Patil',
        phone: '9012345678',
      },
    ],
    []
  );

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      setIsLoading(true);
      try {
        const response = await getListings({
          commodity: searchCommodity || undefined,
          state: stateFilter === 'all' ? undefined : stateFilter,
        });
        if (!ignore) {
          setListings(response?.listings || []);
        }
      } catch (error) {
        if (!ignore) {
          setListings([]);
          toast.error(t('marketplace.messages.loadError'));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadListings();
    return () => {
      ignore = true;
    };
  }, [searchCommodity, stateFilter]);

  const visibleListings = listings.length ? listings : sampleListings;
  const availableTransportDistricts = transportStateDistrictMap[transportForm.pickupState] || ['Bengaluru'];

  const getLocalizedCommodity = (commodity) => {
    const original = String(commodity || '').trim();
    const key = original.toLowerCase().replace(/\s+/g, '_');
    return cropNameMap[language]?.[key] || original;
  };

  const openTransportModal = () => {
    setTransportResult(null);
    setTransportForm((prev) => ({
      ...prev,
      pickupDate: prev.pickupDate || today,
    }));
    setIsTransportModalOpen(true);
  };

  const closeTransportModal = () => {
    setIsTransportModalOpen(false);
    setTransportResult(null);
  };

  const submitTransportRequest = (event) => {
    event.preventDefault();
    const quantity = Number(transportForm.quantityKg);
    if (!quantity || quantity <= 0) {
      toast.error(t('marketplace.messages.transportQuantityError'));
      return;
    }

    const estimatedCost = Math.round(500 + (quantity / 100) * 50);
    setTransportResult({
      estimatedCost,
      pickupDate: transportForm.pickupDate,
    });
  };

  const submitListing = async (event) => {
    event.preventDefault();
    try {
      await createListing({
        ...form,
        quantity_kg: Number(form.quantity_kg),
        price_per_kg: Number(form.price_per_kg),
        available_from: new Date().toISOString().slice(0, 10),
        status: 'active',
        images_base64: [],
      });
      toast.success(t('marketplace.messages.postSuccess'));
      setIsModalOpen(false);
      setForm({
        farmer_name: '',
        phone: '',
        commodity: '',
        variety: '',
        quantity_kg: '',
        price_per_kg: '',
        state: 'Karnataka',
        district: 'Hassan',
        description: '',
      });
      const refreshed = await getListings({
        commodity: searchCommodity || undefined,
        state: stateFilter === 'all' ? undefined : stateFilter,
      });
      setListings(refreshed?.listings || []);
    } catch (error) {
      toast.error(t('marketplace.messages.postError'));
    }
  };

  if (isLoading) return <div className="panel">{t('marketplace.loading')}</div>;

  return (
    <div className="page-wrap marketplace-page">
      <div className="section-header-row">
        <h2>{t('marketplace.title')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="primary-btn" onClick={() => setIsModalOpen(true)}>
            {t('marketplace.listProduce')}
          </button>
          <button type="button" className="primary-btn" style={{ background: '#ea580c' }} onClick={openTransportModal}>
            {t('marketplace.bookTransportBtn')}
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={activeTab === 'listings' ? 'primary-btn' : 'ghost-btn'}
            onClick={() => setActiveTab('listings')}
          >
            {t('marketplace.tabs.listings')}
          </button>
          <button
            type="button"
            className={activeTab === 'transport' ? 'primary-btn' : 'ghost-btn'}
            onClick={() => setActiveTab('transport')}
          >
            {t('marketplace.tabs.transport')}
          </button>
        </div>
      </div>

      {activeTab === 'listings' ? (
        <>
          <div className="panel marketplace-filter-row">
            <label>
              {t('marketplace.commoditySearch')}
              <input value={searchCommodity} onChange={(event) => setSearchCommodity(event.target.value)} placeholder={t('marketplace.searchPlaceholder')} />
            </label>
            <label>
              {t('common.state')}
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                <option value="all">{t('common.all')}</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
              </select>
            </label>
          </div>

          <div className="marketplace-grid">
            {visibleListings.map((item) => (
              <article key={item.id} className="marketplace-card">
                <h3>{getLocalizedCommodity(item.commodity)}</h3>
                <p className="marketplace-variety">{item.variety || t('marketplace.defaults.standardVariety')}</p>
                <p className="marketplace-price">₹{item.price_per_kg}/kg</p>
                <p>{t('common.quantity')}: {item.quantity_kg} kg</p>
                <p>{item.state}, {item.district}</p>
                <p>{t('common.farmer')}: {item.farmer_name}</p>
                <a className="marketplace-contact" href={`tel:${item.phone || '18001801551'}`}>{t('marketplace.contactFarmer')}</a>
              </article>
            ))}
          </div>

          <section className="panel" style={{ marginTop: '0.75rem' }}>
            <h3>{t('marketplace.transport.sectionTitle')}</h3>
            <p className="page-muted">{t('marketplace.transport.sectionSubtitle')}</p>
            <button type="button" className="primary-btn" style={{ background: '#ea580c', marginTop: '0.5rem' }} onClick={openTransportModal}>
              {t('marketplace.bookTransportBtn')}
            </button>
          </section>
        </>
      ) : (
        <section className="panel">
          <h3>{t('marketplace.transport.requestsTitle')}</h3>
          <p className="page-muted">{t('marketplace.transport.sectionSubtitle')}</p>
          <button type="button" className="primary-btn" style={{ background: '#ea580c', marginTop: '0.5rem' }} onClick={openTransportModal}>
            {t('marketplace.bookTransportBtn')}
          </button>
        </section>
      )}

      {isModalOpen ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{t('marketplace.createListing')}</h3>
            <form className="soil-form-grid" onSubmit={submitListing}>
              <label>{t('marketplace.form.farmerName')}<input value={form.farmer_name} onChange={(event) => setForm((prev) => ({ ...prev, farmer_name: event.target.value }))} required /></label>
              <label>{t('marketplace.form.phone')}<input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required /></label>
              <label>{t('common.commodity')}<input value={form.commodity} onChange={(event) => setForm((prev) => ({ ...prev, commodity: event.target.value }))} required /></label>
              <label>{t('marketplace.form.variety')}<input value={form.variety} onChange={(event) => setForm((prev) => ({ ...prev, variety: event.target.value }))} required /></label>
              <label>{t('marketplace.form.quantity')}<input type="number" value={form.quantity_kg} onChange={(event) => setForm((prev) => ({ ...prev, quantity_kg: event.target.value }))} required /></label>
              <label>{t('marketplace.form.price')}<input type="number" step="0.1" value={form.price_per_kg} onChange={(event) => setForm((prev) => ({ ...prev, price_per_kg: event.target.value }))} required /></label>
              <label>{t('common.state')}<input value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} required /></label>
              <label>{t('common.district')}<input value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} required /></label>
              <label>{t('marketplace.form.description')}<textarea rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
              <button type="submit" className="primary-btn">{t('marketplace.form.post')}</button>
            </form>
          </section>
        </div>
      ) : null}

      {isTransportModalOpen ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={closeTransportModal}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            {!transportResult ? (
              <>
                <h3>{t('marketplace.transport.modalTitle')}</h3>
                <form className="soil-form-grid" onSubmit={submitTransportRequest}>
                  <label>
                    {t('marketplace.transport.pickupState')}
                    <select
                      value={transportForm.pickupState}
                      onChange={(event) => {
                        const nextState = event.target.value;
                        setTransportForm((prev) => ({
                          ...prev,
                          pickupState: nextState,
                          pickupDistrict: (transportStateDistrictMap[nextState] || ['Bengaluru'])[0],
                        }));
                      }}
                    >
                      {Object.keys(transportStateDistrictMap).map((stateName) => (
                        <option key={stateName} value={stateName}>{stateName}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('marketplace.transport.pickupDistrict')}
                    <select
                      value={transportForm.pickupDistrict}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, pickupDistrict: event.target.value }))}
                    >
                      {availableTransportDistricts.map((districtName) => (
                        <option key={districtName} value={districtName}>{districtName}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('marketplace.transport.destination')}
                    <select
                      value={transportForm.destination}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, destination: event.target.value }))}
                    >
                      <option value="nearest_mandi">{t('marketplace.transport.destinations.nearestMandi')}</option>
                      <option value="storage_facility">{t('marketplace.transport.destinations.storageFacility')}</option>
                      <option value="direct_to_buyer">{t('marketplace.transport.destinations.directToBuyer')}</option>
                    </select>
                  </label>
                  <label>
                    {t('marketplace.transport.commodity')}
                    <select
                      value={transportForm.commodity}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, commodity: event.target.value }))}
                    >
                      {commodityOptions.map((commodity) => (
                        <option key={commodity} value={commodity}>{getLocalizedCommodity(commodity)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('marketplace.transport.quantityKg')}
                    <input
                      type="number"
                      min="1"
                      value={transportForm.quantityKg}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, quantityKg: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.pickupDate')}
                    <input
                      type="date"
                      min={today}
                      value={transportForm.pickupDate}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, pickupDate: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.farmerName')}
                    <input
                      value={transportForm.farmerName}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, farmerName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.farmerPhone')}
                    <input
                      type="tel"
                      value={transportForm.farmerPhone}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, farmerPhone: event.target.value }))}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-btn">{t('marketplace.transport.findTransport')}</button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#16a34a' }}>✅</div>
                <h3>{t('marketplace.transport.successTitle')}</h3>
                <p><strong>{t('marketplace.transport.estimatedCost')}:</strong> ₹{transportResult.estimatedCost.toLocaleString('en-IN')}</p>
                <p><strong>{t('marketplace.transport.pickupLabel')}:</strong> {transportResult.pickupDate}</p>
                <p className="page-muted">{t('marketplace.transport.contactNote')}</p>
                <button type="button" className="primary-btn" onClick={closeTransportModal}>{t('common.close')}</button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
