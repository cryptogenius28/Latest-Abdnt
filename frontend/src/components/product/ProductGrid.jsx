import React from 'react';
import { ProductCard } from './ProductCard';
import { SHOP } from '@/constants/testIds';

const Skeleton = () => (
  <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
    <div className="skeleton aspect-square" />
    <div className="p-4 space-y-2">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-5 w-24 rounded mt-2" />
    </div>
  </div>
);

export const ProductGrid = ({
  products,
  loading,
  columns = 'lg:grid-cols-4',
  skeletonCount = 8,
  highlight = '',
  onQuickView,
  emptyState = null,
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 ${columns} gap-6`} data-testid={SHOP.grid}>
        {Array.from({ length: skeletonCount }).map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }
  if (!products?.length) {
    if (emptyState) return emptyState;
    return (
      <div data-testid={SHOP.empty} className="text-center py-20 border border-dashed border-ink-200 rounded-xl">
        <p className="text-ink-700 font-semibold">No products match your filters.</p>
        <p className="text-sm text-ink-500 mt-1">Try adjusting filters or clearing them all.</p>
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${columns} gap-6`} data-testid={SHOP.grid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} highlight={highlight} onQuickView={onQuickView} />
      ))}
    </div>
  );
};
