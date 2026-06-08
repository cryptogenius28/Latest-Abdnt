import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

export const WarehousePicks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [ref, visible] = useRevealOnScroll();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/products', { params: { fulfillment_type: 'warehouse', sort: 'rating', page_size: 8 } })
      .then((r) => {
        if (!cancelled) setItems(r.data?.items || []);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && items.length === 0) return null;

  const openQuickView = (p) => { setQuickViewProduct(p); setQuickViewOpen(true); };

  return (
    <section
      ref={ref}
      data-testid="home-warehouse-picks"
      className={`reveal${visible ? ' is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16`}
    >
      <div className="flex items-end justify-between mb-8 gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 flex-shrink-0">
            <Warehouse className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Top rated · In stock</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">Warehouse Picks</h2>
            <p className="mt-1 text-sm text-ink-500 max-w-xl">
              Ships from our Reno, NV facility — faster delivery guaranteed.
            </p>
          </div>
        </div>
        <Link
          to="/shop?fulfillment=warehouse&sort=rating"
          data-testid="home-warehouse-picks-view-all"
          className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600 flex-shrink-0"
        >
          View all <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </Link>
      </div>

      <ProductGrid products={items} loading={loading} skeletonCount={8} onQuickView={openQuickView} />

      <QuickViewModal
        productId={quickViewProduct?.id}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </section>
  );
};
