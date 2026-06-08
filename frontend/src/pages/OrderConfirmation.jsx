import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { CHECKOUT } from '@/constants/testIds';

const Confetti = () => {
  const colors = ['#E8621A', '#10B981', '#1a1a2e', '#F59E0B', '#3B82F6'];
  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 2,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-10">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-20px] block animate-[confetti_3s_ease-out_forwards]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: i % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}
      <style>{`@keyframes confetti { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
};

const OrderConfirmation = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState({ status: 'loading', order: null, error: '' });
  const { clearCart } = useCart();
  const cartCleared = useRef(false);

  useEffect(() => { document.title = 'Order Confirmed | Abundant Merchandise'; }, []);

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'missing', order: null, error: '' });
      return;
    }
    let attempts = 0;
    const maxAttempts = 6;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data } = await api.get(`/checkout/status/${sessionId}`);
        if (data.payment_status === 'paid') {
          if (!cartCleared.current) { clearCart(); cartCleared.current = true; }
          setState({ status: 'paid', order: data.order, error: '' });
          return;
        }
        if (data.status === 'expired' || data.payment_status === 'failed' || data.payment_status === 'expired') {
          setState({ status: 'failed', order: data.order, error: 'Your payment session expired or failed. Please try again.' });
          return;
        }
        if (attempts >= maxAttempts) {
          setState({ status: 'pending', order: data.order, error: 'Payment is taking longer than expected. Refresh to check again.' });
          return;
        }
        setTimeout(poll, 2000);
      } catch (err) {
        setState({ status: 'error', order: null, error: err?.response?.data?.detail || err.message || 'Could not verify payment.' });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, clearCart]);

  if (state.status === 'missing') {
    return (
      <div data-testid={CHECKOUT.confirmationPage} className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-ink-400 mx-auto" strokeWidth={1.5} />
        <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">No active order</h1>
        <p className="mt-2 text-ink-500">It looks like you arrived here without completing a checkout.</p>
        <Link to="/shop" className="mt-6 inline-flex bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">Browse the store</Link>
      </div>
    );
  }

  if (state.status === 'loading' || state.status === 'pending') {
    return (
      <div data-testid={CHECKOUT.confirmationPage} className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-12 h-12 text-brand mx-auto animate-spin" strokeWidth={1.5} />
        <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">Confirming your payment…</h1>
        <p className="mt-2 text-ink-500">Hang tight — this usually takes 2–5 seconds.</p>
        {state.error && <p className="mt-3 text-sm text-amber-600">{state.error}</p>}
      </div>
    );
  }

  if (state.status === 'failed' || state.status === 'error') {
    return (
      <div data-testid={CHECKOUT.confirmationPage} className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" strokeWidth={1.5} />
        <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">Payment couldn&apos;t be completed</h1>
        <p className="mt-2 text-ink-600 max-w-md mx-auto">{state.error || 'Something went wrong with your payment. Your cart is still saved — please try again.'}</p>
        <Link to="/checkout" className="mt-6 inline-flex bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">Try again</Link>
      </div>
    );
  }

  const order = state.order;
  if (!order) return null;

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (order.shipping_method === 'express' ? 3 : 6));
  const deliveryStr = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const addr = order.shipping_address || {};
  const fullName = `${addr.first_name || ''} ${addr.last_name || ''}`.trim();

  return (
    <div data-testid={CHECKOUT.confirmationPage} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Confetti />
      <div className="relative z-20 text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600">Order confirmed</p>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Thanks for your order!</h1>
        <p className="mt-2 text-ink-600">A receipt has been sent to <span className="font-semibold text-ink-900">{addr.email}</span></p>
        <p className="mt-4 inline-block px-4 py-2 bg-ink-900 text-white text-sm font-bold rounded-md tracking-wider">
          Order #<span data-testid={CHECKOUT.orderNumber}>{order.order_number}</span>
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-brand" strokeWidth={1.75} />
            <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-ink-900">Shipping to</h3>
          </div>
          <p className="text-sm font-semibold text-ink-900">{fullName}</p>
          <p className="text-sm text-ink-600">{addr.address1}</p>
          {addr.address2 && <p className="text-sm text-ink-600">{addr.address2}</p>}
          <p className="text-sm text-ink-600">{addr.city}, {addr.state} {addr.zip}</p>
          <p className="text-sm text-ink-600">{addr.country}</p>
        </div>

        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-brand" strokeWidth={1.75} />
            <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-ink-900">Estimated delivery</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-ink-900">{deliveryStr}</p>
          <p className="text-sm text-ink-500 mt-1">via {order.shipping_method === 'express' ? 'Express (2–3 days)' : 'Standard (5–7 days)'} shipping</p>
        </div>
      </div>

      <div className="mt-6 bg-white border border-ink-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-brand" strokeWidth={1.75} />
          <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-ink-900">Items ordered ({order.items.length})</h3>
        </div>
        <ul className="divide-y divide-ink-100">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-4 py-3">
              <img src={i.image} alt={i.title} className="w-14 h-14 object-cover rounded-md border border-ink-200 bg-ink-50" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 line-clamp-1">{i.title}</p>
                <p className="text-xs text-ink-500">Qty: {i.qty}</p>
              </div>
              <p className="text-sm font-bold text-ink-900">{formatPrice(i.unit_price * i.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-ink-200 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-600">Subtotal</dt><dd className="text-ink-900">{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-600">Shipping</dt><dd className="text-ink-900">{order.shipping_cost === 0 ? 'FREE' : formatPrice(order.shipping_cost)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-600">Tax</dt><dd className="text-ink-900">{formatPrice(order.tax)}</dd></div>
          <div className="flex justify-between pt-2 border-t border-ink-200 mt-2"><dt className="font-bold text-ink-900">Total paid</dt><dd className="font-heading text-xl font-bold text-ink-900">{formatPrice(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link data-testid={CHECKOUT.continueShopping} to="/shop" className="h-12 inline-flex items-center justify-center bg-brand hover:bg-brand-600 text-white font-semibold rounded-md transition-colors">
          Continue shopping
        </Link>
        <Link data-testid={CHECKOUT.viewOrders} to="/account/orders" className="h-12 inline-flex items-center justify-center border border-ink-300 hover:border-brand hover:text-brand text-ink-900 font-semibold rounded-md transition-colors">
          View my orders
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
