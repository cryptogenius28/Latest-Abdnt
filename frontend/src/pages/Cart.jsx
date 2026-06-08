import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft, Truck, Package2, Tag, ShoppingBag, CheckCircle2, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { api, formatPrice } from '@/lib/api';
import { CART } from '@/constants/testIds';
import { toast } from 'sonner';
import { RecentlyViewedRail } from '@/components/product/RecentlyViewedRail';

const FREE_SHIP_THRESHOLD = 49;
const RECOVERY_KEY = 'am_recovery_id';
const RECOVERY_TTL_DAYS = 7;

const Cart = () => {
  const { items, subtotal, itemCount, updateQty, removeItem } = useCart();
  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => { document.title = 'Your Cart | Abundant Merchandise'; }, []);

  // Capture ?rcv= from cart-recovery email links — store + fire click
  React.useEffect(() => {
    const rcv = searchParams.get('rcv');
    if (!rcv) return;
    try {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify({ id: rcv, t: Date.now() }));
    } catch { /* noop */ }
    api.post(`/cart-recovery/click?rcv=${encodeURIComponent(rcv)}`).catch(() => {});
    // Strip the query param so reload doesn't refire
    const next = new URLSearchParams(searchParams);
    next.delete('rcv');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const applyPromo = async (e) => {
    e.preventDefault();
    if (!promo.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.post('/promo/validate', { code: promo, subtotal });
      if (data.valid) {
        setAppliedPromo(data);
        setPromo('');
        toast.success(data.description);
      } else {
        toast.error(data.message || 'Invalid or expired promo code');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      toast.error(detail || 'Could not validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const baseShipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIP_THRESHOLD ? 0 : 5.99;
  const promoDiscount = !appliedPromo
    ? 0
    : appliedPromo.type === 'percent'
      ? (subtotal * appliedPromo.amount) / 100
      : appliedPromo.type === 'flat'
        ? appliedPromo.amount
        : 0;
  const shipping = appliedPromo?.type === 'free_shipping' ? 0 : baseShipping;
  const tax = (subtotal - promoDiscount) * 0.08;
  const total = subtotal - promoDiscount + shipping + tax;

  if (items.length === 0) {
    return (
      <div data-testid={CART.page} className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-9 h-9 text-ink-400" strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-bold text-ink-900">Your cart is empty</h1>
        <p className="mt-2 text-ink-500">Looks like you haven&apos;t added anything yet.</p>
        <Link to="/shop" data-testid={CART.pageContinueShopping} className="inline-block mt-6 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div data-testid={CART.page} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">Shopping cart <span className="text-ink-400 font-normal text-lg">({itemCount} items)</span></h1>
        <Link to="/shop" data-testid={CART.pageContinueShopping} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 bg-white border border-ink-200 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-ink-50 border-b border-ink-200 text-xs font-bold uppercase tracking-widest text-ink-500">
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          {items.map((item) => {
            const variantStr = Object.entries(item.variants || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
            const FulfillIcon = item.fulfillment_type === 'dropship' ? Package2 : Truck;
            return (
              <div key={item.key} data-testid={CART.lineItem} className="grid grid-cols-12 gap-4 px-4 md:px-6 py-5 border-b border-ink-100 last:border-0 items-center">
                <div className="col-span-12 md:col-span-6 flex gap-4">
                  <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                    <img src={item.image} alt={item.title} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-md border border-ink-200 bg-ink-50" />
                  </Link>
                  <div className="min-w-0">
                    {item.brand && <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{item.brand}</p>}
                    <Link to={`/product/${item.productId}`} className="text-sm font-semibold text-ink-900 line-clamp-2 hover:text-brand">{item.title}</Link>
                    {variantStr && <p className="text-xs text-ink-500 mt-0.5">{variantStr}</p>}
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-700">
                      <FulfillIcon className="w-3 h-3" strokeWidth={1.75} /> {item.fulfillment_type === 'dropship' ? 'Dropshipped' : 'Warehouse'}
                    </div>
                    <button data-testid={CART.removeButton} onClick={() => removeItem(item.key)} className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Remove
                    </button>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2 md:text-center">
                  <p className="md:hidden text-[10px] uppercase tracking-widest text-ink-500 mb-0.5">Price</p>
                  <p className="text-sm font-semibold text-ink-900">{formatPrice(item.unitPrice)}</p>
                </div>
                <div className="col-span-4 md:col-span-2 md:flex md:justify-center">
                  <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden bg-white h-9">
                    <button data-testid={CART.qtyMinus} onClick={() => updateQty(item.key, item.qty - 1)} disabled={item.qty <= 1} className="w-8 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50 disabled:opacity-40">
                      <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button data-testid={CART.qtyPlus} onClick={() => updateQty(item.key, item.qty + 1)} className="w-8 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50">
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <p className="md:hidden text-[10px] uppercase tracking-widest text-ink-500 mb-0.5">Total</p>
                  <p className="text-sm font-bold text-ink-900">{formatPrice(item.unitPrice * item.qty)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="bg-white border border-ink-200 rounded-xl p-6 h-fit lg:sticky lg:top-32">
          <h2 className="font-heading text-lg font-bold text-ink-900">Order summary</h2>
          <form onSubmit={applyPromo} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" strokeWidth={1.75} />
              <input
                data-testid={CART.promoInput}
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Promo code"
                className="w-full h-10 pl-9 pr-3 text-sm bg-ink-50 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
            <button
              data-testid={CART.promoSubmit}
              type="submit"
              disabled={promoLoading}
              className="h-10 px-4 text-xs font-semibold text-ink-900 border border-ink-300 hover:border-brand hover:text-brand rounded-md disabled:opacity-60"
            >
              {promoLoading ? '…' : 'Apply'}
            </button>
          </form>

          {appliedPromo && (
            <div
              data-testid="cart-promo-applied"
              className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-emerald-700 font-semibold flex-1">{appliedPromo.description}</span>
              <button
                data-testid="cart-promo-clear"
                onClick={() => setAppliedPromo(null)}
                className="text-emerald-600 hover:text-red-500 transition-colors"
                aria-label="Remove promo"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">Subtotal</dt><dd data-testid={CART.subtotal} className="font-semibold text-ink-900">{formatPrice(subtotal)}</dd></div>
            {appliedPromo && (
              <div className="flex justify-between text-emerald-600">
                <dt>Discount</dt>
                <dd className="font-semibold">
                  {appliedPromo.type === 'free_shipping' ? '— free shipping' : `-${formatPrice(promoDiscount || 0)}`}
                </dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-ink-600">Shipping</dt><dd className="font-semibold text-ink-900">{shipping === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-600">Estimated tax (8%)</dt><dd className="font-semibold text-ink-900">{formatPrice(tax)}</dd></div>
          </dl>
          <div className="mt-4 pt-4 border-t border-ink-200 flex justify-between items-baseline">
            <span className="text-sm font-semibold text-ink-900">Estimated total</span>
            <span data-testid={CART.total} className="font-heading text-2xl font-bold text-ink-900">{formatPrice(total)}</span>
          </div>

          <button
            data-testid={CART.checkoutLink}
            onClick={() => navigate('/checkout')}
            className="mt-5 w-full h-12 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md transition-colors"
          >
            Proceed to checkout
          </button>
          <p className="mt-3 text-[11px] text-ink-500 text-center">Secure SSL · 30-day returns · Free shipping over $49</p>
        </aside>
      </div>

      {/* Recently viewed */}
      <div className="mt-12">
        <RecentlyViewedRail title="You might still like" variant="compact" />
      </div>
    </div>
  );
};

export default Cart;
