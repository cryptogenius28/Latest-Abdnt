import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Truck, Package2, Heart, ShoppingCart, Eye } from 'lucide-react';
import { PRODUCT_CARD, CART, WISHLIST } from '@/constants/testIds';
import { formatPrice } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { Highlight } from './Highlight';

export const ProductCard = ({ product, highlight = '', onQuickView }) => {
  const { addItem } = useCart();
  const { toggle, isWished } = useWishlist();
  const [revealRef, revealed] = useRevealOnScroll();
  if (!product) return null;
  const img1 = product.images?.[0] || 'https://placehold.co/600x600?text=No+Image';
  const img2 = product.images?.[1] || img1;
  const onSale = !!product.sale_price && product.sale_price < product.price;
  const discountPct = onSale ? Math.round(((product.price - product.sale_price) / product.price) * 100) : 0;
  const finalPrice = onSale ? product.sale_price : product.price;
  const fulfillIcon = product.fulfillment_type === 'dropship' ? <Package2 className="w-3 h-3" strokeWidth={1.75} /> : <Truck className="w-3 h-3" strokeWidth={1.75} />;
  const fulfillLabel = product.fulfillment_type === 'dropship' ? 'DROPSHIP' : product.fulfillment_type === 'digital' ? 'DIGITAL' : 'WAREHOUSE';
  const wished = isWished(product.id);
  const inStock = (product.stock_quantity ?? 1) > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem(product, 1);
  };
  const handleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };
  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) onQuickView(product);
  };

  return (
    <Link
      ref={revealRef}
      to={`/product/${product.id}`}
      data-testid={PRODUCT_CARD.link}
      className={`reveal${revealed ? ' is-visible' : ''} group relative bg-white border border-ink-100 rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-md transition-all duration-300 -translate-y-0 hover:-translate-y-1 block`}
    >
      <div className="product-image-wrap aspect-square bg-ink-50 relative" data-testid={PRODUCT_CARD.root}>
        <img src={img1} alt={product.title} className={`primary w-full h-full object-cover ${!inStock ? 'opacity-60' : ''}`} loading="lazy" />
        <img src={img2} alt="" className={`secondary w-full h-full object-cover ${!inStock ? 'opacity-60' : ''}`} aria-hidden="true" loading="lazy" />
        {!inStock && (
          <span
            data-testid="product-card-out-of-stock-overlay"
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
          >
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-900 bg-white border border-ink-300 px-3 py-1.5 rounded-full shadow-sm">
              Out of stock
            </span>
          </span>
        )}
        {onSale && inStock && (
          <span data-testid={PRODUCT_CARD.saleBadge} className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider absolute top-3 left-3 z-10">
            -{discountPct}%
          </span>
        )}
        <span data-testid={PRODUCT_CARD.fulfillmentBadge} className="inline-flex items-center gap-1 bg-ink-900 text-white text-[10px] font-semibold px-2 py-1 rounded-sm absolute top-3 right-3 z-10">
          {fulfillIcon}{fulfillLabel}
        </span>
        {onQuickView && inStock && (
          <button
            type="button"
            onClick={handleQuickView}
            data-testid={PRODUCT_CARD.quickView}
            aria-label="Quick view"
            className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold bg-white text-ink-900 rounded-full shadow-sm hover:bg-brand hover:text-white opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0 transition-all"
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={1.75} /> Quick view
          </button>
        )}
        <button
          type="button"
          onClick={handleWish}
          data-testid={WISHLIST.cardToggle}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute bottom-3 right-3 z-30 w-9 h-9 rounded-full inline-flex items-center justify-center shadow-sm transition-all ${wished ? 'bg-red-500 text-white' : 'bg-white/95 text-ink-700 hover:bg-red-500 hover:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}
        >
          <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} strokeWidth={1.75} />
        </button>
      </div>
      <div className="p-4">
        {product.brand && (
          <p className="text-[11px] uppercase tracking-widest text-ink-500 font-semibold mb-1">
            <Highlight text={product.brand} query={highlight} />
          </p>
        )}
        <h3 data-testid={PRODUCT_CARD.title} className="text-sm font-semibold text-ink-900 line-clamp-2 min-h-[2.5rem]">
          <Highlight text={product.title} query={highlight} />
        </h3>
        <div className="flex items-center gap-1 mt-2">
          <Star className="w-3.5 h-3.5 fill-brand text-brand" strokeWidth={0} />
          <span className="text-xs text-ink-700 font-medium">{(product.rating || 0).toFixed(1)}</span>
          <span className="text-xs text-ink-400">({product.review_count || 0})</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2" data-testid={PRODUCT_CARD.price}>
          <span className={`text-lg font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(finalPrice)}</span>
          {onSale && <span className="text-xs text-ink-400 line-through">{formatPrice(product.price)}</span>}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          aria-disabled={!inStock}
          data-testid={CART.addToCartCard}
          className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 text-white text-xs font-semibold rounded-md transition-colors ${inStock ? 'bg-ink-900 hover:bg-brand' : 'bg-ink-300 cursor-not-allowed'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.75} /> {inStock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </Link>
  );
};
