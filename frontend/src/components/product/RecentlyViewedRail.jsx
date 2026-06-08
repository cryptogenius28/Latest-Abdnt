import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { QuickViewModal } from './QuickViewModal';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export const RecentlyViewedRail = ({
  excludeId = '',
  title = 'Recently viewed',
  variant = 'section',
  limit = 8,
}) => {
  const { ids, clear } = useRecentlyViewed();
  const filteredIds = ids.filter((id) => id !== excludeId).slice(0, limit);
  const [products, setProducts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const idsKey = filteredIds.join(',');
  // Render-time cleanup when ids change to empty (avoids set-state-in-effect)
  const [lastIdsKey, setLastIdsKey] = useState('');
  if (idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    if (!idsKey && products.length) setProducts([]);
  }

  useEffect(() => {
    if (!idsKey) return;
    api.get('/products/by-ids', { params: { ids: idsKey } })
      .then((r) => setProducts(r.data || []))
      .catch(() => setProducts([]));
  }, [idsKey]);

  if (!products.length) return null;

  const isCompact = variant === 'compact';

  return (
    <section data-testid="recently-viewed-rail" className={isCompact ? '' : 'py-12 md:py-16 bg-white border-t border-ink-100'}>
      <div className={isCompact ? '' : 'container mx-auto px-4'}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-brand font-semibold mb-1">
              <History className="w-3.5 h-3.5" strokeWidth={1.75} /> Your trail
            </p>
            <h2 className={`font-heading font-bold text-ink-900 ${isCompact ? 'text-lg' : 'text-2xl md:text-3xl'}`}>{title}</h2>
          </div>
          <button
            type="button"
            data-testid="recently-viewed-clear"
            onClick={clear}
            className="text-xs font-semibold text-ink-500 hover:text-brand"
          >
            Clear
          </button>
        </div>
        <div className="-mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((p) => (
              <div key={p.id} className="snap-start flex-shrink-0 w-[200px] md:w-[240px]">
                <ProductCard
                  product={p}
                  onQuickView={(prod) => { setQuickViewProduct(prod); setQuickViewOpen(true); }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <QuickViewModal
        productId={quickViewProduct?.id}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </section>
  );
};
