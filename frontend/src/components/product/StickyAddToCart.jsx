import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/lib/api';

/**
 * Mobile-only sticky Add-to-cart bar.
 * Appears once `targetRef` (the main buy box) scrolls out of view.
 */
export const StickyAddToCart = ({ targetRef, product, finalPrice, onSale, inStock, onAdd }) => {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef(null);

  useEffect(() => {
    if (!targetRef?.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Show sticky bar when target buy box is NOT visible
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' },
    );
    observer.observe(targetRef.current);
    obsRef.current = observer;
    return () => observer.disconnect();
  }, [targetRef]);

  if (!product) return null;

  return (
    <div
      data-testid="pdp-sticky-atc"
      aria-hidden={!visible}
      className={`fixed bottom-14 left-0 right-0 z-30 lg:hidden bg-white border-t border-ink-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 flex-shrink-0 bg-ink-50 border border-ink-200 rounded-md overflow-hidden">
          {product.images?.[0] && (
            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink-900 line-clamp-1">{product.title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-sm font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(finalPrice)}</span>
            {onSale && <span className="text-[10px] text-ink-400 line-through">{formatPrice(product.price)}</span>}
          </div>
        </div>
        <button
          type="button"
          data-testid="pdp-sticky-atc-button"
          onClick={onAdd}
          disabled={!inStock}
          className="inline-flex items-center gap-1.5 h-11 px-4 bg-brand hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
        >
          <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
          {inStock ? 'Add' : 'Out of stock'}
        </button>
      </div>
    </div>
  );
};

export default StickyAddToCart;
