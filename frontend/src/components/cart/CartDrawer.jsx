import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, Truck, Package2, ShoppingBag, Tag, History } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { api, formatPrice } from '@/lib/api';
import { CART } from '@/constants/testIds';
import { toast } from 'sonner';

const FREE_SHIP_THRESHOLD = 49;

const LineItem = ({ item }) => {
  const { updateQty, removeItem } = useCart();
  const variantStr = Object.entries(item.variants || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const fulfillBadge = item.fulfillment_type === 'dropship'
    ? { icon: Package2, label: 'Dropshipped', cls: 'bg-ink-100 text-ink-700' }
    : { icon: Truck, label: 'Warehouse', cls: 'bg-emerald-50 text-emerald-700' };
  return (
    <div data-testid={CART.lineItem} className="flex gap-3 py-4 border-b border-ink-100 last:border-0">
      <Link to={`/product/${item.productId}`} className="flex-shrink-0">
        <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-md border border-ink-200 bg-ink-50" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${item.productId}`} className="text-sm font-semibold text-ink-900 line-clamp-2 hover:text-brand">{item.title}</Link>
          <button data-testid={CART.removeButton} onClick={() => removeItem(item.key)} aria-label="Remove" className="text-ink-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1">
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        {variantStr && <p className="text-xs text-ink-500 mt-0.5">{variantStr}</p>}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${fulfillBadge.cls}`}>
            <fulfillBadge.icon className="w-3 h-3" strokeWidth={1.75} /> {fulfillBadge.label}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="inline-flex items-center border border-ink-200 rounded-md overflow-hidden bg-white h-8">
            <button data-testid={CART.qtyMinus} onClick={() => updateQty(item.key, item.qty - 1)} className="w-7 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50 disabled:opacity-40" disabled={item.qty <= 1}>
              <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
            <button data-testid={CART.qtyPlus} onClick={() => updateQty(item.key, item.qty + 1)} className="w-7 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50">
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
          <p className="text-sm font-bold text-ink-900">{formatPrice(item.unitPrice * item.qty)}</p>
        </div>
      </div>
    </div>
  );
};

const RecentlyViewedMini = ({ excludeIds = [] }) => {
  const { ids } = useRecentlyViewed();
  const { addItem } = useCart();
  const eligible = ids.filter((id) => !excludeIds.includes(id)).slice(0, 6);
  const idsKey = eligible.join(',');
  const [products, setProducts] = useState([]);
  const [lastIdsKey, setLastIdsKey] = useState('');
  if (idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    if (!idsKey && products.length) setProducts([]);
  }
  useEffect(() => {
    if (!idsKey) return;
    api.get('/products/by-ids', { params: { ids: idsKey } })
      .then((r) => setProducts((r.data || []).slice(0, 3)))
      .catch(() => setProducts([]));
  }, [idsKey]);
  if (!products.length) return null;
  return (
    <div data-testid="cart-recently-viewed" className="border-t border-ink-200 pt-4 mt-2">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-700 mb-3">
        <History className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} /> Recently viewed
      </p>
      <div className="grid grid-cols-3 gap-2">
        {products.map((p) => {
          const finalPrice = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
          return (
            <div key={p.id} className="group text-left">
              <Link to={`/product/${p.id}`} className="block aspect-square bg-ink-50 rounded-md overflow-hidden border border-ink-200">
                <img src={p.images?.[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </Link>
              <p className="mt-1 text-[11px] text-ink-700 line-clamp-1">{p.title}</p>
              <p className="text-xs font-bold text-ink-900">{formatPrice(finalPrice)}</p>
              <button
                data-testid="cart-recently-viewed-add"
                onClick={() => { addItem(p, 1); toast.success('Added to cart'); }}
                className="mt-1 w-full text-[10px] font-semibold text-brand border border-brand/30 hover:bg-brand hover:text-white rounded py-1 transition-colors"
              >
                Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Upsell = () => {
  const [products, setProducts] = useState([]);
  const { addItem } = useCart();
  useEffect(() => {
    api.get('/products', { params: { featured: true, page_size: 12 } })
      .then((r) => {
        const items = r.data?.items || [];
        const shuffled = items.sort(() => 0.5 - Math.random()).slice(0, 3);
        setProducts(shuffled);
      })
      .catch(() => {});
  }, []);
  if (!products.length) return null;
  return (
    <div data-testid={CART.upsellRow} className="border-t border-ink-200 pt-4 mt-2">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-700 mb-3">Customers also bought</p>
      <div className="grid grid-cols-3 gap-2">
        {products.map((p) => {
          const finalPrice = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
          return (
            <div key={p.id} className="group text-left">
              <Link to={`/product/${p.id}`} className="block aspect-square bg-ink-50 rounded-md overflow-hidden border border-ink-200">
                <img src={p.images?.[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </Link>
              <p className="mt-1 text-[11px] text-ink-700 line-clamp-1">{p.title}</p>
              <p className="text-xs font-bold text-ink-900">{formatPrice(finalPrice)}</p>
              <button
                onClick={() => addItem(p, 1)}
                className="mt-1 w-full text-[10px] font-semibold text-brand border border-brand/30 hover:bg-brand hover:text-white rounded py-1 transition-colors"
              >
                Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CartDrawer = () => {
  const { drawerOpen, closeDrawer, items, itemCount, subtotal } = useCart();
  const [promo, setPromo] = useState('');
  const [touchStartY, setTouchStartY] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const navigate = useNavigate();

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeDrawer(); };
    if (drawerOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen, closeDrawer]);

  // Lock body scroll
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  // --- Mobile swipe-down on the drawer header to close ---
  const onTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
    setDragOffset(0);
  };
  const onTouchMove = (e) => {
    if (touchStartY == null) return;
    const delta = e.touches[0].clientY - touchStartY;
    if (delta > 0) setDragOffset(Math.min(delta, 320));
  };
  const onTouchEnd = () => {
    if (dragOffset > 80) closeDrawer();
    setTouchStartY(null);
    setDragOffset(0);
  };

  const applyPromo = async (e) => {
    e.preventDefault();
    if (!promo.trim()) return;
    try {
      const { data } = await api.post('/promo/validate', { code: promo, subtotal });
      if (data?.valid) {
        toast.success(data.description || 'Promo applied', {
          description: 'Open the cart page to see your discount.',
        });
        setPromo('');
      } else {
        toast.error(data?.message || 'Invalid or expired promo code');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      toast.error(detail || 'Could not validate promo code');
    }
  };

  const freeShipRemaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

  return (
    <>
      {/* Overlay */}
      <div
        data-testid={CART.drawerOverlay}
        onClick={closeDrawer}
        className={`fixed inset-0 bg-ink-900/50 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        data-testid={CART.drawer}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Shopping cart"
      >
        <div
          className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink-200 touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* mobile grab handle */}
          <span aria-hidden className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-ink-200 rounded-full sm:hidden" />
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-ink-900" strokeWidth={1.75} />
            <h2 className="font-heading text-lg font-bold text-ink-900">Your cart</h2>
            <span className="text-xs text-ink-500">({itemCount})</span>
          </div>
          <button data-testid={CART.drawerClose} onClick={closeDrawer} aria-label="Close cart" className="p-1.5 text-ink-700 hover:bg-ink-100 rounded-md">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Free shipping progress */}
        {items.length > 0 && (
          <div className="px-5 py-3 bg-ink-50 border-b border-ink-100">
            {freeShipRemaining > 0 ? (
              <>
                <p className="text-xs text-ink-700">Add <span className="font-bold text-brand">{formatPrice(freeShipRemaining)}</span> more for free shipping</p>
                <div className="mt-2 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : (
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" strokeWidth={1.75} /> You unlocked free shipping!</p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div data-testid={CART.empty} className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-ink-400" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-ink-900">Your cart is empty</p>
              <p className="text-sm text-ink-500 mt-1">Discover thousands of deals across our store.</p>
              <button onClick={() => { closeDrawer(); navigate('/shop'); }} className="mt-5 inline-flex bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-5 py-2.5 text-sm">
                Start shopping
              </button>
              <div className="w-full mt-8">
                <RecentlyViewedMini excludeIds={[]} />
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-ink-100">
                {items.map((i) => <LineItem key={i.key} item={i} />)}
              </div>
              <RecentlyViewedMini excludeIds={items.map((i) => i.productId)} />
              <Upsell />
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-ink-200 px-5 py-4 space-y-3 bg-white">
            <form onSubmit={applyPromo} className="flex gap-2">
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
              <button data-testid={CART.promoSubmit} type="submit" className="h-10 px-4 text-xs font-semibold text-ink-900 border border-ink-300 hover:border-brand hover:text-brand rounded-md">Apply</button>
            </form>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">Subtotal</span>
              <span data-testid={CART.subtotal} className="font-semibold text-ink-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-ink-500">Free shipping on orders over $49 · Taxes calculated at checkout</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                data-testid={CART.viewCartLink}
                to="/cart"
                onClick={closeDrawer}
                className="text-center h-11 inline-flex items-center justify-center border border-ink-300 hover:border-brand hover:text-brand text-ink-900 font-semibold rounded-md text-sm transition-colors"
              >
                View cart
              </Link>
              <Link
                data-testid={CART.checkoutLink}
                to="/checkout"
                onClick={closeDrawer}
                className="text-center h-11 inline-flex items-center justify-center bg-brand hover:bg-brand-600 text-white font-semibold rounded-md text-sm transition-colors"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
