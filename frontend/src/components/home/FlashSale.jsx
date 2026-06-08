import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Zap, Truck, Package2, Star } from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Heart } from 'lucide-react';

const useCountdownToMidnight = () => {
  const [h, setH] = useState('00');
  const [m, setM] = useState('00');
  const [s, setS] = useState('00');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      let diff = Math.max(0, midnight.getTime() - now.getTime());
      const hh = Math.floor(diff / 3600000); diff -= hh * 3600000;
      const mm = Math.floor(diff / 60000); diff -= mm * 60000;
      const ss = Math.floor(diff / 1000);
      setH(String(hh).padStart(2, '0'));
      setM(String(mm).padStart(2, '0'));
      setS(String(ss).padStart(2, '0'));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { h, m, s };
};

const DealCard = ({ product }) => {
  const { addItem } = useCart();
  const { toggle, isWished } = useWishlist();
  const onSale = !!product.sale_price && product.sale_price < product.price;
  const finalPrice = onSale ? product.sale_price : product.price;
  const discountPct = onSale ? Math.round(((product.price - product.sale_price) / product.price) * 100) : 0;
  const wished = isWished(product.id);
  return (
    <div className="w-[220px] sm:w-[240px] flex-shrink-0 snap-start bg-white border border-ink-100 rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-md transition-all">
      <Link to={`/product/${product.id}`} className="block relative aspect-square bg-ink-50 overflow-hidden group">
        <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {onSale && (
          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[11px] font-extrabold px-2 py-1 rounded uppercase tracking-wider">
            -{discountPct}%
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product); }}
          aria-label="Wishlist"
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full inline-flex items-center justify-center shadow-sm transition-colors ${wished ? 'bg-red-500 text-white' : 'bg-white/95 text-ink-700 hover:bg-red-500 hover:text-white'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${wished ? 'fill-current' : ''}`} strokeWidth={1.75} />
        </button>
      </Link>
      <div className="p-3">
        <Link to={`/product/${product.id}`} className="block text-xs font-semibold text-ink-900 line-clamp-2 min-h-[2.2rem] hover:text-brand">{product.title}</Link>
        <div className="flex items-center gap-1 mt-1.5">
          <Star className="w-3 h-3 fill-brand text-brand" strokeWidth={0} />
          <span className="text-[11px] text-ink-700 font-medium">{(product.rating || 0).toFixed(1)}</span>
          <span className="text-[11px] text-ink-400">({product.review_count || 0})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-red-600">{formatPrice(finalPrice)}</span>
          {onSale && <span className="text-[11px] text-ink-400 line-through">{formatPrice(product.price)}</span>}
        </div>
        <button
          onClick={() => addItem(product, 1)}
          className="mt-2 w-full h-8 inline-flex items-center justify-center bg-ink-900 hover:bg-brand text-white text-[11px] font-semibold rounded-md transition-colors"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
};

export const FlashSale = () => {
  const { h, m, s } = useCountdownToMidnight();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    api.get('/products', { params: { on_sale: true, page_size: 12, sort: 'rating' } })
      .then((r) => setDeals(r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  if (!loading && deals.length === 0) return null;

  return (
    <section data-testid="home-flash-sale" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Zap className="w-7 h-7 text-brand" strokeWidth={2} fill="currentColor" />
            <span className="absolute inset-0 animate-ping opacity-30">
              <Zap className="w-7 h-7 text-brand" strokeWidth={2} fill="currentColor" />
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Limited time</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">Flash Sale</h2>
            <p className="mt-1 hidden sm:block text-sm text-ink-500">Hand-picked deals refreshed daily — gone at midnight.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {[h, m, s].map((v, i) => (
              <React.Fragment key={i}>
                <div className="bg-ink-900 text-white rounded-md min-w-[44px] h-10 inline-flex items-center justify-center font-heading font-bold text-lg tabular-nums">
                  {v}
                </div>
                {i < 2 && <span className="text-ink-400 font-bold">:</span>}
              </React.Fragment>
            ))}
            <span className="text-[10px] text-ink-500 ml-2 hidden md:block">until midnight</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollBy(-1)} aria-label="Previous" className="hidden md:inline-flex w-10 h-10 items-center justify-center border border-ink-200 hover:border-brand hover:text-brand rounded-md text-ink-700"><ArrowLeft className="w-4 h-4" strokeWidth={1.75} /></button>
          <button onClick={() => scrollBy(1)} aria-label="Next" className="hidden md:inline-flex w-10 h-10 items-center justify-center border border-ink-200 hover:border-brand hover:text-brand rounded-md text-ink-700"><ArrowRight className="w-4 h-4" strokeWidth={1.75} /></button>
          <Link to="/shop?on_sale=1" data-testid="home-flash-sale-view-all" className="ml-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600">View all deals <ArrowRight className="w-4 h-4" strokeWidth={2} /></Link>
        </div>
      </div>

      {/* mobile timer */}
      <div className="sm:hidden flex items-center gap-1.5 mb-4">
        {[h, m, s].map((v, i) => (
          <React.Fragment key={i}>
            <div className="bg-ink-900 text-white rounded-md w-12 h-10 inline-flex items-center justify-center font-heading font-bold tabular-nums">
              {v}
            </div>
            {i < 2 && <span className="text-ink-400 font-bold">:</span>}
          </React.Fragment>
        ))}
        <span className="text-[10px] text-ink-500 ml-2">until midnight</span>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[240px] flex-shrink-0">
              <div className="skeleton aspect-square rounded-xl" />
              <div className="skeleton h-4 mt-3 rounded" />
              <div className="skeleton h-4 mt-2 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div ref={scrollerRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {deals.slice(0, 8).map((p) => <DealCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
};
