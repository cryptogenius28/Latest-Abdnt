import React, { useState, useMemo, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CreditCard, Lock, Truck, Zap, Check, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api, formatPrice } from '@/lib/api';
import { CHECKOUT } from '@/constants/testIds';
import { toast } from 'sonner';

const FREE_SHIP_THRESHOLD = 49;

const StepDot = ({ n, label, step }) => (
  <div className="flex items-center gap-2">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= n ? 'bg-brand text-white' : 'bg-ink-100 text-ink-500'}`}>
      {step > n ? <Check className="w-4 h-4" strokeWidth={2.5} /> : n}
    </div>
    <span className={`text-xs font-semibold uppercase tracking-widest ${step >= n ? 'text-ink-900' : 'text-ink-400'}`}>{label}</span>
  </div>
);

const Checkout = () => {
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  useEffect(() => { document.title = 'Checkout | Abundant Merchandise'; }, []);

  const [form, setForm] = useState({
    email: user?.email || '',
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardHolder: '',
  });

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load saved addresses (logged in only) and auto-select the default
  useEffect(() => {
    if (!user) { setSavedAddresses([]); return; }
    api.get('/account/addresses')
      .then((r) => {
        const list = r.data || [];
        setSavedAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) {
          setSelectedAddressId(def.id);
          setForm((f) => ({
            ...f,
            email: f.email || user.email || '',
            firstName: def.first_name, lastName: def.last_name,
            address1: def.address1, address2: def.address2 || '',
            city: def.city, state: def.state, zip: def.zip, country: def.country || 'United States',
          }));
        }
      })
      .catch(() => {});
  }, [user]);

  const applyAddress = (a) => {
    setSelectedAddressId(a.id);
    setForm((f) => ({
      ...f,
      firstName: a.first_name, lastName: a.last_name,
      address1: a.address1, address2: a.address2 || '',
      city: a.city, state: a.state, zip: a.zip, country: a.country || 'United States',
    }));
  };

  const shippingCost = useMemo(() => {
    if (shippingMethod === 'express') return 12.99;
    return subtotal >= FREE_SHIP_THRESHOLD ? 0 : 5.99;
  }, [shippingMethod, subtotal]);
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  if (items.length === 0 && !submitting) {
    return <Navigate to="/cart" replace />;
  }

  const placeOrder = async (e) => {
    e.preventDefault();
    if (paymentMethod !== 'card') {
      toast.info(`${paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'apple' ? 'Apple Pay' : 'Google Pay'} is coming soon. Please use card to complete checkout.`);
      return;
    }
    setSubmitting(true);
    try {
      const cartItems = items.map((i) => ({
        product_id: i.productId,
        qty: i.qty,
        variants: i.variants && Object.keys(i.variants).length ? i.variants : null,
      }));
      // Read recovery attribution from localStorage (set when user clicked recovery email)
      let recovery_id = null;
      try {
        const raw = localStorage.getItem('am_recovery_id');
        if (raw) {
          const parsed = JSON.parse(raw);
          const ageDays = (Date.now() - (parsed.t || 0)) / (1000 * 60 * 60 * 24);
          if (parsed.id && ageDays < 7) recovery_id = parsed.id;
        }
      } catch { /* noop */ }
      const { data } = await api.post('/checkout/session', {
        items: cartItems,
        shipping_address: {
          email: form.email,
          first_name: form.firstName,
          last_name: form.lastName,
          address1: form.address1,
          address2: form.address2 || '',
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country || 'United States',
        },
        shipping_method: shippingMethod,
        origin_url: window.location.origin,
        recovery_id,
      });
      if (data?.url) {
        // Clear the attribution cookie once consumed so future orders aren't double-counted
        try { localStorage.removeItem('am_recovery_id'); } catch { /* noop */ }
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Could not start checkout. Please try again.';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const canContinueShipping = form.email && form.firstName && form.lastName && form.address1 && form.city && form.state && form.zip;
  const canPlaceOrder = paymentMethod !== 'card' || true; // Stripe handles card form — local card fields no longer required

  return (
    <div data-testid={CHECKOUT.page} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">Checkout</h1>
        <Link to="/cart" className="text-sm font-semibold text-ink-700 hover:text-brand inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" strokeWidth={1.75} /> Back to cart
        </Link>
      </div>

      {/* Step indicator */}
      <div data-testid={CHECKOUT.stepIndicator} className="flex items-center gap-3 md:gap-6 mb-8 overflow-x-auto pb-1">
        <StepDot n={1} label="Shipping" step={step} />
        <div className="h-px flex-1 bg-ink-200 min-w-[20px]" />
        <StepDot n={2} label="Payment" step={step} />
        <div className="h-px flex-1 bg-ink-200 min-w-[20px]" />
        <StepDot n={3} label="Confirmation" step={step} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={placeOrder} className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <section className="bg-white border border-ink-200 rounded-xl p-6">
              <h2 className="font-heading text-lg font-bold text-ink-900 mb-1">Shipping information</h2>
              <p className="text-xs text-ink-500 mb-5">{user ? `Signed in as ${user.email}` : 'Guest checkout — no account required.'}</p>

              {savedAddresses.length > 0 && (
                <div data-testid="checkout-saved-addresses" className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-700 mb-2">Use a saved address</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {savedAddresses.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        data-testid={`checkout-saved-address-${a.id}`}
                        onClick={() => applyAddress(a)}
                        className={`text-left p-3 border rounded-md text-xs transition-colors ${selectedAddressId === a.id ? 'border-brand bg-brand/5' : 'border-ink-200 hover:border-ink-400'}`}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-700">
                          <MapPin className="w-3 h-3 text-brand" strokeWidth={1.75} /> {a.label}{a.is_default ? ' · Default' : ''}
                        </span>
                        <p className="mt-1 text-ink-900 font-semibold">{a.first_name} {a.last_name}</p>
                        <p className="text-ink-600">{a.address1}, {a.city}, {a.state} {a.zip}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Email</label>
                  <input data-testid={CHECKOUT.guestEmail} type="email" required value={form.email} onChange={change('email')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">First name</label>
                  <input data-testid={CHECKOUT.firstName} required value={form.firstName} onChange={change('firstName')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Last name</label>
                  <input data-testid={CHECKOUT.lastName} required value={form.lastName} onChange={change('lastName')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Address line 1</label>
                  <input data-testid={CHECKOUT.address1} required value={form.address1} onChange={change('address1')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Address line 2 (optional)</label>
                  <input data-testid={CHECKOUT.address2} value={form.address2} onChange={change('address2')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">City</label>
                  <input data-testid={CHECKOUT.city} required value={form.city} onChange={change('city')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">State</label>
                  <input data-testid={CHECKOUT.state} required value={form.state} onChange={change('state')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">ZIP</label>
                  <input data-testid={CHECKOUT.zip} required value={form.zip} onChange={change('zip')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Country</label>
                  <input data-testid={CHECKOUT.country} value={form.country} onChange={change('country')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                </div>
              </div>

              <h3 className="mt-8 font-heading text-base font-bold text-ink-900 mb-3">Shipping method</h3>
              <div className="space-y-2">
                <label data-testid={CHECKOUT.shippingMethodStandard} className={`flex items-center justify-between gap-3 p-4 border rounded-md cursor-pointer transition-colors ${shippingMethod === 'standard' ? 'border-brand bg-brand/5' : 'border-ink-200 hover:border-ink-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="ship" checked={shippingMethod === 'standard'} onChange={() => setShippingMethod('standard')} className="accent-brand" />
                    <Truck className="w-5 h-5 text-ink-700" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Standard Shipping</p>
                      <p className="text-xs text-ink-500">5–7 business days · 1–2 day faster on warehouse items</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-ink-900">{subtotal >= FREE_SHIP_THRESHOLD ? 'FREE' : formatPrice(5.99)}</span>
                </label>
                <label data-testid={CHECKOUT.shippingMethodExpress} className={`flex items-center justify-between gap-3 p-4 border rounded-md cursor-pointer transition-colors ${shippingMethod === 'express' ? 'border-brand bg-brand/5' : 'border-ink-200 hover:border-ink-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="ship" checked={shippingMethod === 'express'} onChange={() => setShippingMethod('express')} className="accent-brand" />
                    <Zap className="w-5 h-5 text-brand" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Express Shipping</p>
                      <p className="text-xs text-ink-500">2–3 business days</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-ink-900">{formatPrice(12.99)}</span>
                </label>
              </div>

              <button
                data-testid={CHECKOUT.continueToPayment}
                type="button"
                disabled={!canContinueShipping}
                onClick={() => setStep(2)}
                className="mt-6 w-full h-12 bg-brand hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2"
              >
                Continue to payment <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="bg-white border border-ink-200 rounded-xl p-6">
              <h2 className="font-heading text-lg font-bold text-ink-900 mb-1">Payment</h2>
              <p className="text-xs text-ink-500 mb-5 inline-flex items-center gap-1"><Lock className="w-3 h-3" strokeWidth={1.75} /> Secured by 256-bit SSL encryption</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {[
                  { id: 'card', label: 'Card', testid: CHECKOUT.paymentMethodCard, icon: CreditCard },
                  { id: 'paypal', label: 'PayPal', testid: CHECKOUT.paymentMethodPaypal },
                  { id: 'apple', label: 'Apple Pay', testid: CHECKOUT.paymentMethodApple },
                  { id: 'google', label: 'Google Pay', testid: CHECKOUT.paymentMethodGoogle },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={m.testid}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`h-12 inline-flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-md transition-colors ${paymentMethod === m.id ? 'border-brand bg-brand/5 text-ink-900' : 'border-ink-200 text-ink-700 hover:border-ink-400'}`}
                  >
                    {m.icon && <m.icon className="w-4 h-4" strokeWidth={1.5} />} {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-3">
                  <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-sm text-ink-700">
                    <p className="font-semibold text-ink-900">Secure Stripe checkout</p>
                    <p className="mt-1">When you click <span className="font-semibold">Pay securely</span> below, you&apos;ll be redirected to Stripe&apos;s PCI-DSS compliant payment page to complete your purchase. We never touch your card details.</p>
                    <p className="mt-2 text-xs text-ink-500">Test card: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-ink-200">4242 4242 4242 4242</span> · any future date · any CVC</p>
                  </div>
                </div>
              )}
              {paymentMethod !== 'card' && (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-3">
                  <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-sm text-ink-700">
                    <p className="font-semibold text-ink-900">Pay with <span className="capitalize">{paymentMethod}</span></p>
                    <p className="mt-1">You&apos;ll continue on Stripe&apos;s secure page where you can pay with {paymentMethod === 'paypal' ? 'your PayPal account' : paymentMethod === 'apple' ? 'Apple Pay' : 'Google Pay'} or change method.</p>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button data-testid={CHECKOUT.backToShipping} type="button" onClick={() => setStep(1)} className="h-12 border border-ink-300 hover:border-brand hover:text-brand text-ink-900 font-semibold rounded-md text-sm transition-colors inline-flex items-center justify-center gap-1.5">
                  <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Back
                </button>
                <button
                  data-testid={CHECKOUT.placeOrder}
                  type="submit"
                  disabled={!canPlaceOrder || submitting}
                  className="h-12 bg-brand hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" strokeWidth={1.75} /> {submitting ? 'Redirecting…' : `Pay securely · ${formatPrice(total)}`}
                </button>
              </div>
            </section>
          )}
        </form>

        {/* Summary */}
        <aside className="bg-white border border-ink-200 rounded-xl p-6 h-fit lg:sticky lg:top-32">
          <h2 className="font-heading text-lg font-bold text-ink-900 mb-4">Order summary</h2>
          <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.key} className="flex gap-3">
                <div className="relative">
                  <img src={i.image} alt={i.title} className="w-14 h-14 object-cover rounded-md border border-ink-200 bg-ink-50" />
                  <span className="absolute -top-1.5 -right-1.5 bg-ink-900 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{i.qty}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 line-clamp-2">{i.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{formatPrice(i.unitPrice * i.qty)}</p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 pt-4 border-t border-ink-200 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">Subtotal</dt><dd className="font-semibold text-ink-900">{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-600">Shipping</dt><dd className="font-semibold text-ink-900">{shippingCost === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(shippingCost)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-600">Tax (8%)</dt><dd className="font-semibold text-ink-900">{formatPrice(tax)}</dd></div>
            <div className="flex justify-between pt-2 border-t border-ink-200 mt-2 text-base">
              <dt className="font-bold text-ink-900">Total</dt><dd className="font-heading text-xl font-bold text-ink-900">{formatPrice(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
