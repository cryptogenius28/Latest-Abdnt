import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, ArrowLeft } from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const OrderCard = ({ o, email }) => {
  const placed = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const trackTo = `/track?o=${encodeURIComponent(o.order_number)}${email ? `&e=${encodeURIComponent(email)}` : ''}`;
  return (
    <div data-testid="order-card" className="bg-white border border-ink-200 rounded-xl p-5 hover:border-brand/30 hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Order #{o.order_number}</p>
          <p className="text-xs text-ink-500 mt-0.5">Placed {placed}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${STATUS_STYLES[o.status] || 'bg-ink-100 text-ink-700'}`}>
          {o.status}
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
        {o.items.slice(0, 5).map((i, idx) => (
          <img key={idx} src={i.image} alt={i.title} className="w-14 h-14 object-cover rounded-md border border-ink-200 bg-ink-50 flex-shrink-0" />
        ))}
        {o.items.length > 5 && (
          <div className="w-14 h-14 rounded-md border border-ink-200 bg-ink-50 inline-flex items-center justify-center text-xs font-semibold text-ink-600 flex-shrink-0">
            +{o.items.length - 5}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-ink-100">
        <div>
          <p className="text-xs text-ink-500">Total</p>
          <p className="font-heading text-lg font-bold text-ink-900">{formatPrice(o.total)}</p>
        </div>
        <Link to={trackTo} data-testid={`order-card-track-${o.order_number}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600">
          Track <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
};

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'My Orders | Abundant Merchandise'; }, []);

  useEffect(() => {
    api.get('/orders/mine')
      .then((r) => setOrders(r.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="my-orders-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">My Account</p>
          <h1 className="mt-1 font-heading text-3xl font-bold text-ink-900">My orders</h1>
        </div>
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Back to account
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div data-testid="my-orders-empty" className="text-center py-16 border border-dashed border-ink-300 rounded-xl">
          <Package className="w-12 h-12 text-ink-300 mx-auto" strokeWidth={1.25} />
          <p className="mt-3 font-semibold text-ink-900">No orders yet</p>
          <p className="text-sm text-ink-500 mt-1">When you place your first order, it&apos;ll show up here.</p>
          <Link to="/shop" className="mt-5 inline-flex bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-5 py-2.5 text-sm">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((o) => <OrderCard key={o.id} o={o} email={user?.email} />)}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
