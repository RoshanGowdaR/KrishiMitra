import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const STATES = [
  'all', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Puducherry',
];

const SAMPLE_LISTINGS = [
  {
    id: '1',
    farmer_name: 'Ravi Kumar',
    phone: '9876543210',
    commodity: 'Rice',
    variety: 'Sona Masuri',
    quantity_kg: 500,
    price_per_kg: 34,
    state: 'Karnataka',
    district: 'Hassan',
    description: 'Fresh harvest, premium quality',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
  {
    id: '2',
    farmer_name: 'Suresh Patil',
    phone: '9845612345',
    commodity: 'Tomato',
    variety: 'Hybrid',
    quantity_kg: 200,
    price_per_kg: 22,
    state: 'Maharashtra',
    district: 'Pune',
    description: 'Fresh tomatoes direct from farm',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
  {
    id: '3',
    farmer_name: 'Manjunath Gowda',
    phone: '9741236547',
    commodity: 'Onion',
    variety: 'Red',
    quantity_kg: 1000,
    price_per_kg: 18,
    state: 'Karnataka',
    district: 'Dharwad',
    description: 'Large red onions, good quality',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
  {
    id: '4',
    farmer_name: 'Anand Singh',
    phone: '9654123789',
    commodity: 'Wheat',
    variety: 'Sharbati',
    quantity_kg: 2000,
    price_per_kg: 28,
    state: 'Punjab',
    district: 'Ludhiana',
    description: 'Premium wheat, newly harvested',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
  {
    id: '5',
    farmer_name: 'Priya Nair',
    phone: '9812345670',
    commodity: 'Banana',
    variety: 'Robusta',
    quantity_kg: 300,
    price_per_kg: 25,
    state: 'Kerala',
    district: 'Thrissur',
    description: 'Fresh bananas ready for market',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
  {
    id: '6',
    farmer_name: 'Ramesh Reddy',
    phone: '9876501234',
    commodity: 'Chilli',
    variety: 'Teja',
    quantity_kg: 150,
    price_per_kg: 85,
    state: 'Andhra Pradesh',
    district: 'Guntur',
    description: 'Dry red chilli, high quality',
    status: 'active',
    created_at: new Date().toISOString(),
    images: [],
  },
];

const getCropImage = (cropName) => {
  const images = {
    Rice: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&h=200&fit=crop',
    Tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=200&h=200&fit=crop',
    Onion: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=200&h=200&fit=crop',
    Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop',
    Banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
    Chilli: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=200&h=200&fit=crop',
    Potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop',
    Cotton: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&h=200&fit=crop',
  };
  return images[cropName]
    || 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=200&h=200&fit=crop';
};

const sorters = {
  latest: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  low: (a, b) => Number(a.price_per_kg || 0) - Number(b.price_per_kg || 0),
  high: (a, b) => Number(b.price_per_kg || 0) - Number(a.price_per_kg || 0),
  nearest: (a, b, state) => (a.state === state ? -1 : 1) - (b.state === state ? -1 : 1),
};

export default function BuyerDashboard() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [stateFilter, setStateFilter] = useState('all');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [applied, setApplied] = useState({
    state: 'all',
    commodity: '',
    minPrice: '',
    maxPrice: '',
  });

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);

  const orders = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('buyer_orders') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        setListings(SAMPLE_LISTINGS);
      } else {
        setListings(data && data.length > 0 ? data : SAMPLE_LISTINGS);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setListings(SAMPLE_LISTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    const query = applied.commodity.trim().toLowerCase();
    const min = Number(applied.minPrice || 0);
    const max = Number(applied.maxPrice || Number.MAX_SAFE_INTEGER);

    let rows = listings.filter((item) => {
      const commodity = String(item.commodity || '').toLowerCase();
      const price = Number(item.price_per_kg || 0);
      return (applied.state === 'all' || item.state === applied.state)
        && (!query || commodity.includes(query))
        && price >= min
        && price <= max;
    });

    if (sortBy === 'nearest') {
      rows = [...rows].sort((a, b) => sorters.nearest(a, b, applied.state === 'all' ? 'Karnataka' : applied.state));
    } else {
      rows = [...rows].sort(sorters[sortBy]);
    }

    return rows;
  }, [listings, applied, sortBy]);

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #166534, #22c55e)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>Welcome, Buyer!</h2>
        <p style={{ margin: '0.35rem 0 0.8rem', opacity: 0.95 }}>Find fresh produce directly from farmers</p>
        <input
          value={commoditySearch}
          onChange={(event) => setCommoditySearch(event.target.value)}
          placeholder="Search crops, vegetables, fruits..."
          style={{
            width: '100%',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            padding: '0.75rem 0.9rem',
          }}
        />
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Browse Produce</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem', marginBottom: '0.7rem' }}>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            {STATES.map((state) => <option key={state} value={state}>{state === 'all' ? 'All States' : state}</option>)}
          </select>
          <input value={commoditySearch} onChange={(event) => setCommoditySearch(event.target.value)} placeholder="Commodity" />
          <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min price" />
          <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max price" />
          <button
            type="button"
            className="primary-btn"
            onClick={() => setApplied({
              state: stateFilter,
              commodity: commoditySearch,
              minPrice,
              maxPrice,
            })}
          >
            Filter
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
          <p className="page-muted" style={{ margin: 0 }}>{loading ? 'Loading listings...' : `${filteredListings.length} listings`}</p>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ maxWidth: 220 }}>
            <option value="latest">Latest</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
            <option value="nearest">Nearest (by state)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
          {filteredListings.map((item) => {
            const images = item.images || item.images_base64 || [];
            return (
              <article key={item.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 12px 24px rgba(15,23,42,0.07)', overflow: 'hidden' }}>
                <img
                  src={images[0] || getCropImage(item.commodity)}
                  alt={item.commodity}
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                />
                <div style={{ padding: '0.85rem' }}>
                  <p style={{ margin: 0, fontWeight: 800, color: '#166534', fontSize: '1.08rem' }}>{item.commodity}</p>
                  <p className="page-muted" style={{ margin: '0.18rem 0 0' }}>{item.variety || 'Standard variety'}</p>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 800, color: '#16a34a', fontSize: '1.2rem' }}>₹{item.price_per_kg}/kg</p>
                  <p style={{ margin: '0.3rem 0 0' }}>📦 {item.quantity_kg} kg available</p>
                  <p style={{ margin: '0.22rem 0 0' }}>📍 {item.district}, {item.state}</p>
                  <p style={{ margin: '0.22rem 0 0' }}>👨‍🌾 {item.farmer_name}</p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
                    <button type="button" className="primary-btn" style={{ background: '#f97316', flex: 1 }} onClick={() => setSelectedContact(item)}>
                      Contact Farmer
                    </button>
                    <button type="button" className="ghost-btn" style={{ flex: 1, border: '1px solid #d1d5db' }} onClick={() => setSelectedListing(item)}>
                      Details
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
          <p className="page-muted">No orders yet. Orders are stored in localStorage for now.</p>
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
            <h3 style={{ marginTop: 0 }}>Contact Farmer</h3>
            <p><strong>Name:</strong> {selectedContact.farmer_name}</p>
            <p><strong>Phone:</strong> {selectedContact.phone}</p>
            <a
              className="primary-btn"
              href={`https://wa.me/91${selectedContact.phone}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#22c55e' }}
            >
              WhatsApp 📱
            </a>
          </section>
        </div>
      ) : null}

      {selectedListing ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedListing(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 720 }}>
            <h3 style={{ marginTop: 0 }}>{selectedListing.commodity} Details</h3>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              {(selectedListing.images || selectedListing.images_base64 || []).length ? (
                (selectedListing.images || selectedListing.images_base64 || []).map((image, idx) => (
                  <img key={`img-${idx}`} src={image} alt={`crop-${idx}`} style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover' }} />
                ))
              ) : (
                <img src={getCropImage(selectedListing.commodity)} alt={selectedListing.commodity} style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover' }} />
              )}
            </div>
            <p><strong>Commodity:</strong> {selectedListing.commodity}</p>
            <p><strong>Variety:</strong> {selectedListing.variety || '-'}</p>
            <p><strong>Description:</strong> {selectedListing.description || '-'}</p>
            <p><strong>Quantity:</strong> {selectedListing.quantity_kg} kg</p>
            <p><strong>Price:</strong> ₹{selectedListing.price_per_kg}/kg</p>
            <p><strong>Location:</strong> {selectedListing.district}, {selectedListing.state}</p>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${selectedListing.commodity} farmer ${selectedListing.district} ${selectedListing.state}`)}`}
              target="_blank"
              rel="noreferrer"
              className="ghost-btn"
            >
              📍 View on Google Maps
            </a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
