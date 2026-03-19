import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createListing, getListings } from '../services/api';

export default function Marketplace() {
  const [searchCommodity, setSearchCommodity] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          toast.error('Unable to load listings. Showing sample data.');
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
      toast.success('Listing posted successfully.');
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
      toast.error('Unable to post listing.');
    }
  };

  if (isLoading) return <div className="panel">Loading marketplace listings...</div>;

  return (
    <div className="page-wrap marketplace-page">
      <div className="section-header-row">
        <h2>Marketplace</h2>
        <button type="button" className="primary-btn" onClick={() => setIsModalOpen(true)}>
          List Your Produce
        </button>
      </div>

      <div className="panel marketplace-filter-row">
        <label>
          Commodity Search
          <input value={searchCommodity} onChange={(event) => setSearchCommodity(event.target.value)} placeholder="Rice, maize, cotton..." />
        </label>
        <label>
          State
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
          </select>
        </label>
      </div>

      <div className="marketplace-grid">
        {visibleListings.map((item) => (
          <article key={item.id} className="marketplace-card">
            <h3>{item.commodity}</h3>
            <p className="marketplace-variety">{item.variety || 'Standard Variety'}</p>
            <p className="marketplace-price">₹{item.price_per_kg}/kg</p>
            <p>Quantity: {item.quantity_kg} kg</p>
            <p>{item.state}, {item.district}</p>
            <p>Farmer: {item.farmer_name}</p>
            <a className="marketplace-contact" href={`tel:${item.phone || '18001801551'}`}>Contact Farmer</a>
          </article>
        ))}
      </div>

      {isModalOpen ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Create Listing</h3>
            <form className="soil-form-grid" onSubmit={submitListing}>
              <label>Farmer Name<input value={form.farmer_name} onChange={(event) => setForm((prev) => ({ ...prev, farmer_name: event.target.value }))} required /></label>
              <label>Phone<input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required /></label>
              <label>Commodity<input value={form.commodity} onChange={(event) => setForm((prev) => ({ ...prev, commodity: event.target.value }))} required /></label>
              <label>Variety<input value={form.variety} onChange={(event) => setForm((prev) => ({ ...prev, variety: event.target.value }))} required /></label>
              <label>Quantity (kg)<input type="number" value={form.quantity_kg} onChange={(event) => setForm((prev) => ({ ...prev, quantity_kg: event.target.value }))} required /></label>
              <label>Price per kg<input type="number" step="0.1" value={form.price_per_kg} onChange={(event) => setForm((prev) => ({ ...prev, price_per_kg: event.target.value }))} required /></label>
              <label>State<input value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} required /></label>
              <label>District<input value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} required /></label>
              <label>Description<textarea rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
              <button type="submit" className="primary-btn">Post Listing</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
