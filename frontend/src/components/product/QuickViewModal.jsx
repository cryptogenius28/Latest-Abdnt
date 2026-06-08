import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Truck, Package2, ShoppingCart, Plus, Minus, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api, formatPrice } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { QUICK_VIEW } from '@/constants/testIds';

export const QuickViewModal = ({ productId, open, onOpenChange }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const { addItem, openDrawer } = useCart();
  const { track } = useRecentlyViewed();

  // Reset state when modal opens via a render-time check (avoids set-state-in-effect)
  const [lastKey, setLastKey] = useState('');
  const currentKey = open && productId ? `${productId}` : '';
  if (currentKey && currentKey !== lastKey) {
    setLastKey(currentKey);
    setProduct(null);
    setImgIdx(0);
    setQty(1);
    setSelectedVariants({});
    setLoading(true);
  }
  if (!open && lastKey) {
    setLastKey('');
  }

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    api.get(`/products/${productId}`)
      .then((r) => {
        if (cancelled) return;
        setProduct(r.data);
        if (r.data?.id) track(r.data.id);
        const initial = {};
        (r.data?.variants || []).forEach((v) => {
          if (v.options?.length) initial[v.name] = v.options[0];
        });
        setSelectedVariants(initial);
      })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, productId]);

  const onSale = !!product?.sale_price && product.sale_price < product.price;
  const finalPrice = onSale ? product?.sale_price : product?.price;
  const discountPct = onSale ? Math.round(((product.price - product.sale_price) / product.price) * 100) : 0;
  const images = useMemo(() => (product?.images?.length ? product.images : ['https://placehold.co/600x600?text=No+Image']), [product]);

  const missingVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return product.variants.find((v) => v.options?.length && !selectedVariants[v.name])?.name || null;
  }, [product, selectedVariants]);

  const handleAdd = () => {
    if (!product) return;
    if ((product.stock_quantity ?? 1) <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    if (missingVariant) {
      toast.error(`Please select a ${missingVariant.toLowerCase()}`);
      return;
    }
    addItem(product, qty, Object.keys(selectedVariants).length ? selectedVariants : null);
    onOpenChange(false);
    setTimeout(() => openDrawer && openDrawer(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={QUICK_VIEW.modal}
        className="max-w-4xl w-[95vw] p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <DialogTitle className="sr-only">{product?.title || 'Quick view'}</DialogTitle>
        <DialogDescription className="sr-only">Product quick view with images, price, and add to cart.</DialogDescription>
        {loading && (
          <div data-testid={QUICK_VIEW.loading} className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        )}
        {!loading && product && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Image section */}
            <div className="bg-ink-50 relative">
              <div className="aspect-square">
                <img
                  data-testid={QUICK_VIEW.image}
                  src={images[imgIdx]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {onSale && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider">
                  -{discountPct}%
                </span>
              )}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto pb-1">
                  {images.slice(0, 5).map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      data-testid={QUICK_VIEW.thumb}
                      onClick={() => setImgIdx(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-brand' : 'border-white/70 hover:border-white'}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details section */}
            <div className="p-6 md:p-8 flex flex-col">
              {product.brand && (
                <p className="text-[11px] uppercase tracking-widest text-ink-500 font-semibold mb-2">{product.brand}</p>
              )}
              <h2 data-testid={QUICK_VIEW.title} className="font-heading text-2xl font-bold text-ink-900 leading-tight">
                {product.title}
              </h2>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-brand text-brand" strokeWidth={0} />
                  <span className="text-sm font-semibold text-ink-900">{(product.rating || 0).toFixed(1)}</span>
                </div>
                <span className="text-sm text-ink-500">({product.review_count || 0} reviews)</span>
                <span className="text-ink-300">·</span>
                <span className="inline-flex items-center gap-1 text-xs text-ink-600 font-medium">
                  {product.fulfillment_type === 'dropship'
                    ? <><Package2 className="w-3 h-3" strokeWidth={1.75} />Dropship</>
                    : product.fulfillment_type === 'digital'
                      ? <>Digital</>
                      : <><Truck className="w-3 h-3" strokeWidth={1.75} />Warehouse</>}
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-3" data-testid={QUICK_VIEW.price}>
                <span className={`text-3xl font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>
                  {formatPrice(finalPrice)}
                </span>
                {onSale && (
                  <span className="text-base text-ink-400 line-through">{formatPrice(product.price)}</span>
                )}
              </div>

              {product.description && (
                <p data-testid={QUICK_VIEW.description} className="text-sm text-ink-600 mt-4 line-clamp-4 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Variants */}
              {product.variants?.length > 0 && (
                <div className="mt-5 space-y-4">
                  {product.variants.map((v) => (
                    <div key={v.name}>
                      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold mb-2">{v.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {(v.options || []).map((opt) => {
                          const selected = selectedVariants[v.name] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              data-testid={QUICK_VIEW.variantOption}
                              onClick={() => setSelectedVariants((s) => ({ ...s, [v.name]: opt }))}
                              className={`h-9 px-3 text-xs font-semibold rounded-md border transition-all ${selected ? 'border-brand bg-brand text-white' : 'border-ink-300 text-ink-700 hover:border-ink-900'}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity + actions */}
              <div className="mt-6 flex items-center gap-3">
                <div className="inline-flex items-center border border-ink-300 rounded-md">
                  <button
                    type="button"
                    data-testid={QUICK_VIEW.qtyMinus}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-10 inline-flex items-center justify-center text-ink-700 hover:text-brand"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <input
                    data-testid={QUICK_VIEW.qtyInput}
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-12 h-10 text-center text-sm font-semibold border-x border-ink-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    data-testid={QUICK_VIEW.qtyPlus}
                    onClick={() => setQty((q) => q + 1)}
                    className="w-9 h-10 inline-flex items-center justify-center text-ink-700 hover:text-brand"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <button
                  type="button"
                  data-testid={QUICK_VIEW.addToCart}
                  onClick={handleAdd}
                  disabled={(product.stock_quantity ?? 1) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 bg-ink-900 hover:bg-brand disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" strokeWidth={1.75} /> {(product.stock_quantity ?? 1) > 0 ? 'Add to cart' : 'Out of stock'}
                </button>
              </div>

              <Link
                to={`/product/${product.id}`}
                data-testid={QUICK_VIEW.fullDetails}
                onClick={() => onOpenChange(false)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600 self-start"
              >
                View full details <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
