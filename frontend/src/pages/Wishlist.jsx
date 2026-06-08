import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, Star } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/api';
import { WISHLIST } from '@/constants/testIds';

const Wishlist = () => {
  const { items, removeItem, clearAll } = useWishlist();
  const { addItem } = useCart();

  React.useEffect(() => { document.title = 'My Wishlist | Abundant Merchandise'; }, []);

  if (items.length === 0) {
    return (
      <div data-testid={WISHLIST.page} className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div data-testid={WISHLIST.empty} className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mx-auto">
          <Heart className="w-9 h-9 text-ink-400" strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-bold text-ink-900">Your wishlist is empty</h1>
        <p className="mt-2 text-ink-500">Save items you love to come back to later.</p>
        <Link to="/shop" className="inline-block mt-6 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">
          Start browsing
        </Link>
      </div>
    );
  }

  return (
    <div data-testid={WISHLIST.page} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">My wishlist</h1>
          <p className="text-sm text-ink-500 mt-1">{items.length} item{items.length === 1 ? '' : 's'} saved</p>
        </div>
        <button
          data-testid={WISHLIST.removeAll}
          onClick={() => { if (window.confirm('Remove all items from wishlist?')) clearAll(); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Remove all
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((p) => {
          const onSale = !!p.sale_price && p.sale_price < p.price;
          const finalPrice = onSale ? p.sale_price : p.price;
          return (
            <div key={p.productId} className="group relative bg-white border border-ink-100 rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-md transition-all">
              <Link to={`/product/${p.productId}`} className="block aspect-square bg-ink-50">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </Link>
              <button
                onClick={() => removeItem(p.productId)}
                aria-label="Remove from wishlist"
                className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/95 backdrop-blur rounded-full inline-flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-colors"
              >
                <Heart className="w-4 h-4 fill-current" strokeWidth={0} />
              </button>
              <div className="p-4">
                {p.brand && <p className="text-[11px] uppercase tracking-widest text-ink-500 font-semibold mb-1">{p.brand}</p>}
                <Link to={`/product/${p.productId}`} className="text-sm font-semibold text-ink-900 line-clamp-2 min-h-[2.5rem] hover:text-brand">{p.title}</Link>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-3.5 h-3.5 fill-brand text-brand" strokeWidth={0} />
                  <span className="text-xs text-ink-700 font-medium">{(p.rating || 0).toFixed(1)}</span>
                  <span className="text-xs text-ink-400">({p.review_count || 0})</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(finalPrice)}</span>
                  {onSale && <span className="text-xs text-ink-400 line-through">{formatPrice(p.price)}</span>}
                </div>
                <button
                  onClick={() => addItem({ id: p.productId, ...p, images: p.images?.length ? p.images : [p.image] }, 1)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 bg-brand hover:bg-brand-600 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.75} /> Add to cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
