import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCropImage } from './FarmGuide';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Cereals', 'Pulses', 'Spices', 'Cash Crops'];

const CATEGORY_MAP = {
  Vegetables: ['tomato', 'onion', 'potato', 'brinjal', 'cabbage', 'cauliflower', 'carrot', 'spinach', 'pumpkin', 'cucumber', 'lady finger', 'okra'],
  Fruits: ['mango', 'banana', 'apple', 'grapes', 'orange', 'lemon', 'guava', 'papaya', 'pomegranate', 'watermelon'],
  Cereals: ['rice', 'wheat', 'maize', 'jowar', 'bajra', 'ragi', 'barley'],
  Pulses: ['chickpea', 'lentil', 'green gram', 'black gram', 'pigeon pea', 'soybean'],
  Spices: ['turmeric', 'chilli', 'coriander', 'cumin', 'cardamom', 'pepper'],
  'Cash Crops': ['cotton', 'sugarcane', 'jute', 'tobacco', 'coffee', 'tea'],
};

const sorters = {
  Latest: (a, b) => new Date(b.created_at || b.listed_on || 0) - new Date(a.created_at || a.listed_on || 0),
  'Price: Low to High': (a, b) => Number(a.price_per_kg || 0) - Number(b.price_per_kg || 0),
  'Price: High to Low': (a, b) => Number(b.price_per_kg || 0) - Number(a.price_per_kg || 0),
  Nearest: (a, b, state) => (a.state === state ? -1 : 1) - (b.state === state ? -1 : 1),
};

const badgeFor = (description = '') => {
  const text = description.toLowerCase();
  if (text.includes('organic')) return 'ORGANIC';
  return 'FRESH';
};

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [stateFilter, setStateFilter] = useState('all');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Latest');
  const [appliedFilters, setAppliedFilters] = useState({
    stateFilter: 'all',
    commoditySearch: '',
    minPrice: '',
    maxPrice: '',
    category: 'All',
  });
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);

  const orders = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('buyer_orders') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchListings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!ignore) {
        if (error) {
          setListings([]);
        } else {
          setListings(data || []);
        }
        setLoading(false);
      }
    }

    fetchListings();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredListings = useMemo(() => {
    const stateValue = appliedFilters.stateFilter;
    const commodityValue = appliedFilters.commoditySearch.trim().toLowerCase();
    const min = Number(appliedFilters.minPrice || 0);
    const max = Number(appliedFilters.maxPrice || Number.MAX_SAFE_INTEGER);

    let result = (listings || []).filter((item) => {
      const commodity = String(item.commodity || '').toLowerCase();
      const stateMatch = stateValue === 'all' || item.state === stateValue;
      const commodityMatch = !commodityValue || commodity.includes(commodityValue);
      const price = Number(item.price_per_kg || 0);
      const priceMatch = price >= min && price <= max;

      let categoryMatch = true;
      if (appliedFilters.category !== 'All') {
        categoryMatch = (CATEGORY_MAP[appliedFilters.category] || []).some((name) => commodity.includes(name));
      }

      return stateMatch && commodityMatch && priceMatch && categoryMatch;
    });

    const sorter = sorters[sortBy];
    if (sortBy === 'Nearest') {
      result = [...result].sort((a, b) => sorter(a, b, user?.user_metadata?.state || 'Karnataka'));
    } else {
      result = [...result].sort(sorter);
    }

    return result;
  }, [appliedFilters, listings, sortBy, user?.user_metadata?.state]);

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section
        className="panel"
        style={{
          background: 'linear-gradient(135deg, #166534, #16a34a)',
          color: '#fff',
          border: 'none',
        }}
      >
        <h2 style={{ margin: 0 }}>Welcome, Buyer!</h2>
        <p style={{ margin: '0.35rem 0 0.8rem', opacity: 0.94 }}>Find fresh produce directly from farmers</p>
        <input
          value={commoditySearch}
          onChange={(event) => setCommoditySearch(event.target.value)}
          placeholder="Search crops, vegetables, fruits..."
          style={{
            width: '100%',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            padding: '0.75rem 0.9rem',
          }}
        />
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Browse Produce</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem', marginBottom: '0.75rem' }}>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">All States</option>
            {STATES.map((stateName) => (
              <option key={stateName} value={stateName}>{stateName}</option>
            ))}
          </select>
          <input value={commoditySearch} onChange={(event) => setCommoditySearch(event.target.value)} placeholder="Commodity search" />
          <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min price" />
          <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max price" />
          <button
            type="button"
            className="primary-btn"
            onClick={() => setAppliedFilters({ stateFilter, commoditySearch, minPrice, maxPrice, category })}
          >
            Filter
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setCategory(name);
                setAppliedFilters((prev) => ({ ...prev, category: name }));
              }}
              style={{
                border: name === category ? '1px solid #16a34a' : '1px solid #d1d5db',
                background: name === category ? '#dcfce7' : '#fff',
                color: '#14532d',
                borderRadius: '999px',
                padding: '0.35rem 0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p className="page-muted" style={{ margin: 0 }}>{loading ? 'Loading listings...' : `${filteredListings.length} listings found`}</p>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ maxWidth: 220 }}>
            {Object.keys(sorters).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
          {filteredListings.map((item) => {
            const phone = String(item.phone || '');
            const images = item.images || item.images_base64 || [];
            return (
              <article key={item.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(15,23,42,0.08)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <img src={images[0] || getCropImage(item.commodity)} alt={item.commodity} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                <div style={{ padding: '0.8rem' }}>
                  <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', background: '#dcfce7', borderRadius: 999, padding: '0.18rem 0.55rem' }}>
                    {badgeFor(item.description)}
                  </span>
                  <p style={{ margin: '0.45rem 0 0', fontWeight: 700, fontSize: '1.1rem', color: '#166534' }}>{item.commodity}</p>
                  <p className="page-muted" style={{ margin: '0.15rem 0 0' }}>{item.variety || 'Standard variety'}</p>
                  <p style={{ margin: '0.4rem 0 0', fontWeight: 800, color: '#15803d', fontSize: '1.2rem' }}>₹{item.price_per_kg}/kg</p>
                  <p style={{ margin: '0.3rem 0 0' }}>📦 {item.quantity_kg} kg available</p>
                  <p style={{ margin: '0.25rem 0 0' }}>📍 {item.district}, {item.state}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>👨‍🌾 {item.farmer_name || 'Farmer'}</p>
                  <p style={{ margin: '0.2rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>📱 +91 XXXXXX{phone.slice(-4) || '0000'}</p>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.8rem' }}>Listed: {new Date(item.created_at || item.listed_on || Date.now()).toLocaleDateString('en-IN')}</p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
                    <button type="button" className="primary-btn" style={{ background: '#f97316', flex: 1 }} onClick={() => setSelectedContact(item)}>
                      Contact Farmer
                    </button>
                    <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => setSelectedListing(item)}>
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>My Orders</h3>
        {orders.length === 0 ? (
          <p className="page-muted">No orders yet. Orders are saved locally once you start enquiries.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {orders.map((order, index) => (
              <article key={`${order.commodity}-${index}`} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.7rem' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{order.commodity} · {order.quantity} kg</p>
                <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>Farmer: {order.farmer}</p>
                <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>Date: {order.date}</p>
                <p style={{ margin: '0.2rem 0 0' }}>Status: <strong>{order.status || 'Enquired'}</strong></p>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedContact ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedContact(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Farmer Contact</h3>
            <p><strong>Name:</strong> {selectedContact.farmer_name || 'Farmer'}</p>
            <p><strong>Phone:</strong> {selectedContact.phone || '-'}</p>
            <button
              type="button"
              className="primary-btn"
              style={{ background: '#22c55e' }}
              onClick={() => window.open(`https://wa.me/91${selectedContact.phone || ''}`, '_blank', 'noopener,noreferrer')}
            >
              Open WhatsApp
            </button>
          </section>
        </div>
      ) : null}

      {selectedListing ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedListing(null)}>
          <section
            className="scheme-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 720 }}
          >
            <h3 style={{ marginTop: 0 }}>{selectedListing.commodity} Details</h3>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              {(selectedListing.images || selectedListing.images_base64 || []).length ? (
                (selectedListing.images || selectedListing.images_base64 || []).map((image, idx) => (
                  <img key={`listing-image-${idx}`} src={image} alt={`crop-${idx}`} style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover' }} />
                ))
              ) : (
                <img src={getCropImage(selectedListing.commodity)} alt={selectedListing.commodity} style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover' }} />
              )}
            </div>
            <p><strong>Description:</strong> {selectedListing.description || 'No additional description.'}</p>
            <p><strong>Complete Location:</strong> {selectedListing.district}, {selectedListing.state}, India</p>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(`${selectedListing.district}, ${selectedListing.state}, India`)}`, '_blank', 'noopener,noreferrer')}
            >
              📍 View on Maps
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
