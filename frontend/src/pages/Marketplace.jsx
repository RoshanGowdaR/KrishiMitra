import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { createListing, getListings } from '../services/api';

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
  const [cropImages, setCropImages] = useState([]);
  const [previewListing, setPreviewListing] = useState(null);
  const [lightboxImage, setLightboxImage] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState('');
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
    lat: null,
    lon: null,
  });
  const [transportForm, setTransportForm] = useState({
    pickup_state: 'Karnataka',
    pickup_district: 'Bengaluru',
    destination: 'nearest_mandi',
    commodity: 'rice',
    quantity_kg: '',
    pickup_date: today,
    farmer_name: '',
    farmer_phone: '',
    detected_lat: null,
    detected_lon: null,
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
        images: [],
        lat: 13.0067,
        lon: 76.0996,
        listed_on: '2026-03-21',
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
        images: [],
        lat: 11.341,
        lon: 77.7172,
        listed_on: '2026-03-20',
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
        images: [],
        lat: 18.5204,
        lon: 73.8567,
        listed_on: '2026-03-19',
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
  const getLocalizedCommodity = (commodity) => {
    const original = String(commodity || '').trim();
    const key = original.toLowerCase().replace(/\s+/g, '_');
    return cropNameMap[language]?.[key] || original;
  };

  const openTransportModal = () => {
    setTransportResult(null);
    setLocationDetected('');
    setDetectingLocation(false);
    setTransportForm((prev) => ({
      ...prev,
      pickup_date: prev.pickup_date || today,
    }));
    setIsTransportModalOpen(true);
  };

  const closeTransportModal = () => {
    setIsTransportModalOpen(false);
    setTransportResult(null);
    setLocationDetected('');
    setDetectingLocation(false);
    setTransportForm({
      pickup_state: '',
      pickup_district: '',
      destination: 'nearest_mandi',
      commodity: 'rice',
      quantity_kg: '',
      pickup_date: today,
      farmer_name: '',
      farmer_phone: '',
      detected_lat: null,
      detected_lon: null,
    });
  };

  const submitTransportRequest = (event) => {
    event.preventDefault();
    const quantity = Number(transportForm.quantity_kg);
    if (!quantity || quantity <= 0) {
      toast.error(t('marketplace.messages.transportQuantityError'));
      return;
    }

    const estimatedCost = Math.round(500 + (quantity / 100) * 50);
    setTransportResult({
      estimatedCost,
      pickupDate: transportForm.pickup_date,
      detected_lat: transportForm.detected_lat,
      detected_lon: transportForm.detected_lon,
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'KrishiMitra-App',
              },
            }
          );

          const data = await response.json();
          const address = data.address || {};

          const state = address.state || address.state_district || address.region || '';
          const district = address.district
            || address.county
            || address.city
            || address.town
            || address.village
            || address.suburb
            || '';

          setTransportForm((prev) => ({
            ...prev,
            pickup_state: state,
            pickup_district: district,
            detected_lat: latitude,
            detected_lon: longitude,
          }));

          setLocationDetected(`${district}, ${state}`);
          setDetectingLocation(false);
        } catch (error) {
          console.error('Geocoding error:', error);
          setDetectingLocation(false);
          alert('Could not get location details. Please enter manually.');
        }
      },
      (error) => {
        setDetectingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location access denied. Please enter your location manually.');
        } else {
          alert('Could not detect location. Please enter manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (cropImages.length + files.length > 3) {
      toast.error('You can upload up to 3 images only.');
      return;
    }

    const oversized = files.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      toast.error('Each image should be up to 5MB.');
      return;
    }

    try {
      const encoded = await Promise.all(files.map((file) => toBase64(file)));
      setCropImages((prev) => [...prev, ...encoded].slice(0, 3));
    } catch (error) {
      toast.error('Failed to process selected images.');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (index) => {
    setCropImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitListing = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        quantity_kg: Number(form.quantity_kg),
        price_per_kg: Number(form.price_per_kg),
        available_from: new Date().toISOString().slice(0, 10),
        status: 'active',
        images_base64: cropImages,
        images: cropImages,
        lat: transportForm.detected_lat || form.lat || null,
        lon: transportForm.detected_lon || form.lon || null,
      };

      await createListing(payload);
      toast.success(t('marketplace.messages.postSuccess'));
      setIsModalOpen(false);
      setCropImages([]);
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
        lat: null,
        lon: null,
      });
      const refreshed = await getListings({
        commodity: searchCommodity || undefined,
        state: stateFilter === 'all' ? undefined : stateFilter,
      });

      if (refreshed?.listings?.length) {
        setListings(refreshed.listings);
      } else {
        // Keep UX responsive even if backend write delay exists.
        setListings((prev) => [
          {
            id: `local-${Date.now()}`,
            ...payload,
            listed_on: today,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      toast.error(t('marketplace.messages.postError'));
    }
  };

  const maskedPhone = (phone) => {
    const value = String(phone || '');
    const last4 = value.slice(-4) || '0000';
    return `+91 XXXXXX${last4}`;
  };

  const openMaps = (item) => {
    if (item.lat && item.lon) {
      window.open(`https://www.google.com/maps?q=${item.lat},${item.lon}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const district = encodeURIComponent(item.district || '');
    const state = encodeURIComponent(item.state || '');
    window.open(`https://www.google.com/maps/search/${district}+${state}+India`, '_blank', 'noopener,noreferrer');
  };

  const openContact = (item) => {
    window.location.href = `tel:${item.phone || '18001801551'}`;
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
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewListing(item)}
                    style={{
                      background: 'white',
                      border: '1px solid #16a34a',
                      color: '#16a34a',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      marginRight: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Preview
                  </button>
                  <a className="marketplace-contact" href={`tel:${item.phone || '18001801551'}`}>{t('marketplace.contactFarmer')}</a>
                </div>
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
        <div
          role="presentation"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              width: '100%',
              maxWidth: '560px',
              margin: '2rem auto',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'sticky',
                top: 0,
                right: 0,
                float: 'right',
                background: 'white',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                zIndex: 10,
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3>{t('marketplace.createListing')}</h3>
            <form className="soil-form-grid" onSubmit={submitListing}>
              <label>{t('marketplace.form.farmerName')}<input value={form.farmer_name} onChange={(event) => setForm((prev) => ({ ...prev, farmer_name: event.target.value }))} required /></label>
              <label>{t('marketplace.form.phone')}<input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required /></label>
              <label>{t('common.commodity')}<input value={form.commodity} onChange={(event) => setForm((prev) => ({ ...prev, commodity: event.target.value }))} required /></label>
              <label>{t('marketplace.form.variety')}<input value={form.variety} onChange={(event) => setForm((prev) => ({ ...prev, variety: event.target.value }))} required /></label>
              <label>{t('marketplace.form.quantity')}<input type="number" min={1} value={form.quantity_kg} onChange={(event) => setForm((prev) => ({ ...prev, quantity_kg: event.target.value }))} required /></label>
              <label>{t('marketplace.form.price')}<input type="number" step="0.1" value={form.price_per_kg} onChange={(event) => setForm((prev) => ({ ...prev, price_per_kg: event.target.value }))} required /></label>
              <label>{t('common.state')}<input value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} required /></label>
              <label>{t('common.district')}<input value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} required /></label>
              <label>{t('marketplace.form.description')}<textarea rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Crop Photos (up to 3 images)</label>
                <p style={{ margin: '0 0 0.6rem', color: '#6b7280', fontSize: '0.85rem' }}>Help buyers see your produce quality</p>
                <label
                  htmlFor="marketplace-image-upload"
                  style={{
                    display: 'block',
                    border: '2px dashed #16a34a',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: '#f0fdf4',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ color: '#16a34a', fontSize: '2rem', lineHeight: 1 }}>📸</div>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>Click to upload crop photos</p>
                  <p style={{ margin: '0.2rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>JPG, PNG up to 5MB each</p>
                </label>
                <input
                  id="marketplace-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {[0, 1, 2].map((slot) => {
                    const image = cropImages[slot];
                    if (!image) {
                      return (
                        <div
                          key={`slot-${slot}`}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 10,
                            border: '1px dashed #9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            fontSize: '1.3rem',
                          }}
                        >
                          +
                        </div>
                      );
                    }

                    return (
                      <div key={`img-${slot}`} style={{ position: 'relative' }}>
                        <img
                          src={image}
                          alt={`Crop ${slot + 1}`}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(slot)}
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 20,
                            height: 20,
                            borderRadius: '999px',
                            border: 'none',
                            background: '#dc2626',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="primary-btn">{t('marketplace.form.post')}</button>
            </form>
          </section>
        </div>
      ) : null}

      {isTransportModalOpen ? (
        <div
          className="scheme-modal-backdrop"
          role="presentation"
          onClick={closeTransportModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <section
            className="scheme-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              width: '100%',
              maxWidth: '560px',
              margin: '2rem auto',
              position: 'relative',
            }}
          >
            {!transportResult ? (
              <>
                <h3>{t('marketplace.transport.modalTitle')}</h3>
                <form className="soil-form-grid" onSubmit={submitTransportRequest}>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingLocation}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      border: '2px solid #16a34a',
                      borderRadius: '10px',
                      background: '#fff',
                      color: '#16a34a',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: detectingLocation ? 'not-allowed' : 'pointer',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: detectingLocation ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {detectingLocation ? (
                      <>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            border: '2px solid #16a34a',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            display: 'inline-block',
                          }}
                        />
                        Detecting location...
                      </>
                    ) : (
                      <>📍 Detect My Location</>
                    )}
                  </button>

                  {locationDetected ? (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        padding: '0.6rem 1rem',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      ✅ Location detected: <strong>{locationDetected}</strong>
                      <span style={{ color: '#6b7280', marginLeft: '0.3rem', fontSize: '0.78rem' }}>
                        (fields auto-filled below)
                      </span>
                    </div>
                  ) : null}

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
                      Pickup State
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your state e.g. Karnataka"
                      value={transportForm.pickup_state}
                      onChange={(e) => setTransportForm((prev) => ({
                        ...prev,
                        pickup_state: e.target.value,
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#16a34a';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
                      Pickup District / City
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your district e.g. Hassan"
                      value={transportForm.pickup_district}
                      onChange={(e) => setTransportForm((prev) => ({
                        ...prev,
                        pickup_district: e.target.value,
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#16a34a';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    />
                  </div>
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
                      value={transportForm.quantity_kg}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, quantity_kg: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.pickupDate')}
                    <input
                      type="date"
                      min={today}
                      value={transportForm.pickup_date}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, pickup_date: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.farmerName')}
                    <input
                      value={transportForm.farmer_name}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, farmer_name: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    {t('marketplace.transport.farmerPhone')}
                    <input
                      type="tel"
                      value={transportForm.farmer_phone}
                      onChange={(event) => setTransportForm((prev) => ({ ...prev, farmer_phone: event.target.value }))}
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

      {previewListing ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setPreviewListing(null)}>
          <section
            className="scheme-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}
          >
            <div className="scheme-modal-header" style={{ marginBottom: '1rem' }}>
              <h3>Listing Preview</h3>
              <button type="button" className="ghost-btn" onClick={() => setPreviewListing(null)}>×</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Crop Images</h4>
              {(previewListing.images || previewListing.images_base64 || []).length ? (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {(previewListing.images || previewListing.images_base64 || []).slice(0, 3).map((image, idx) => (
                    <img
                      key={`preview-image-${idx}`}
                      src={image}
                      alt={`${previewListing.commodity} ${idx + 1}`}
                      onClick={() => setLightboxImage(image)}
                      style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 12, cursor: 'zoom-in' }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 12,
                    background: '#dcfce7',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                  }}
                >
                  🌿
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#16a34a', marginBottom: '0.2rem' }}>{getLocalizedCommodity(previewListing.commodity)}</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>{previewListing.variety || t('marketplace.defaults.standardVariety')}</p>
              <p style={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.3rem' }}>₹{previewListing.price_per_kg}/kg</p>

              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <p style={{ margin: 0 }}>📦 Quantity: {previewListing.quantity_kg} kg</p>
                <p style={{ margin: 0 }}>🗓️ Listed: {previewListing.listed_on || today}</p>
                <p style={{ margin: 0 }}>👨‍🌾 Farmer: {previewListing.farmer_name}</p>
                <p style={{ margin: 0 }}>📱 Phone: {maskedPhone(previewListing.phone)}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.35rem' }}>📍 Farm Location</h4>
              <p style={{ margin: '0 0 0.6rem' }}>{previewListing.district}, {previewListing.state}</p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => openMaps(previewListing)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                🗺️ View on Google Maps
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPreviewListing(null);
                openContact(previewListing);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: '#ea580c',
                color: '#fff',
                borderRadius: '10px',
                padding: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Contact Farmer
            </button>
          </section>
        </div>
      ) : null}

      {lightboxImage ? (
        <div
          role="presentation"
          onClick={() => setLightboxImage('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem',
          }}
        >
          <img src={lightboxImage} alt="Preview" style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 12 }} />
        </div>
      ) : null}
    </div>
  );
}
