import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export default function BuyerOrders() {
  const orders = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('buyer_orders') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <div className="page-wrap" style={{ gap: '1rem' }}>
      <section className="panel" style={{ background: 'linear-gradient(135deg, #14532d, #22c55e)', color: '#fff', border: 'none' }}>
        <h2 style={{ margin: 0 }}>My Orders</h2>
        <p style={{ margin: '0.35rem 0 0' }}>Track all your enquiries and bookings in one place.</p>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Orders List</h3>
          <Link to="/app/buyer" className="ghost-btn" style={{ textDecoration: 'none' }}>Browse Produce</Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ marginTop: '0.9rem', border: '1px dashed #d1d5db', borderRadius: 12, padding: '1rem' }}>
            <p className="page-muted" style={{ margin: 0 }}>No orders yet. Place an enquiry from Browse Produce to see it here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.9rem' }}>
            {orders.map((order, index) => (
              <article key={`${order.commodity || 'order'}-${index}`} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>{order.commodity || 'Commodity'} · {order.quantity || 0} kg</p>
                  <span style={{ background: '#ecfeff', color: '#0e7490', borderRadius: 999, padding: '0.2rem 0.7rem', fontWeight: 700 }}>
                    {order.status || 'Enquired'}
                  </span>
                </div>
                <p className="page-muted" style={{ margin: '0.35rem 0 0' }}>Farmer: {order.farmer || 'Unknown'}</p>
                <p className="page-muted" style={{ margin: '0.2rem 0 0' }}>Date: {order.date || '-'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
