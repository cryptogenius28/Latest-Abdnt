import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Truck, RotateCcw, ShieldCheck, Star, Plus, Minus, Heart, Share2, Package2, ZoomIn, HardDrive, Warehouse, Globe } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api, formatPrice } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { ReviewSection } from '@/components/product/ReviewSection';
import { PDP, WISHLIST, CART } from '@/constants/testIds';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { RecentlyViewedRail } from '@/components/product/RecentlyViewedRail';
import { LiveViewingBadge } from '@/components/product/LiveViewingBadge';
import { LowStockBadge } from '@/components/product/LowStockBadge';
import { ImageLightbox } from '@/components/product/ImageLightbox';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';
import { getSessionId } from '@/lib/sessionId';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [variants, setVariants] = useState({});
  const [related, setRelated] = useState([]);
  const [tab, setTab] = useState('description');
  const [notFound, setNotFound] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const buyBoxRef = useRef(null);
  const { addItem } = useCart();
  const { toggle, isWished } = useWishlist();
  const { track } = useRecentlyViewed();

  useEffect(() => {
    if (product?.title) document.title = `${product.title} | Abundant Merchandise`;
  }, [product?.title]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      setActiveImg(0);
      setQty(1);
      setVariants({});
      try {
        const r = await api.get(`/products/${id}`);
        if (cancelled) return;
        setProduct(r.data);
        if (r.data?.id) {
          track(r.data.id);
          // Fire-and-forget analytics view tracking (don't await, swallow errors)
          api.post(`/products/${r.data.id}/track`, { type: 'view', session_id: getSessionId() }).catch(() => {});
        }
        const initial = {};
        (r.data?.variants || []).forEach((v) => { if (v.options?.length) initial[v.name] = v.options[0]; });
        if (!cancelled) setVariants(initial);
        // Related: same category — keep up to 7 for the rail (exclude current product)
        if (r.data?.category) {
          try {
            const rr = await api.get('/products', { params: { category: r.data.category, page_size: 8 } });
            if (!cancelled) setRelated((rr.data?.items || []).filter((p) => p.id !== id).slice(0, 7));
          } catch { /* noop */ }
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, track]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="space-y-4">
            <div className="skeleton h-6 w-24 rounded" />
            <div className="skeleton h-10 w-3/4 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-32 w-full rounded" />
            <div className="skeleton h-12 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Product not found</h1>
        <p className="mt-3 text-ink-500">The product you’re looking for may have been removed.</p>
        <Link to="/shop" className="inline-block mt-6 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">Continue shopping</Link>
      </div>
    );
  }

  const onSale = !!product.sale_price && product.sale_price < product.price;
  const finalPrice = onSale ? product.sale_price : product.price;
  const discountPct = onSale ? Math.round(((product.price - product.sale_price) / product.price) * 100) : 0;
  // Phase 5/8 — only warehouse products gate purchase on stock_quantity.
  // Dropship & digital are always purchasable (supplier-managed / instant delivery).
  const isWarehouse = (product.fulfillment_type || 'warehouse') === 'warehouse';
  const inStock = isWarehouse ? (product.stock_quantity || 0) > 0 : true;
  const images = product.images?.length ? product.images : ['https://placehold.co/800x800?text=No+Image'];

  const fulfillmentMeta = {
    warehouse: {
      icon: Warehouse,
      label: 'Warehouse fulfillment',
      sub: 'Ships in 1-2 business days',
      banner: { headline: 'In Stock · Ships in 1-2 days', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    },
    dropship: {
      icon: Globe,
      label: 'Dropship',
      sub: 'Direct from supplier · 3-7 days',
      banner: { headline: 'Ships from Supplier · 3-7 days', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    },
    digital: {
      icon: HardDrive,
      label: 'Digital delivery',
      sub: 'Instant access on purchase',
      banner: { headline: 'Digital Download · Instant', tone: 'bg-violet-50 text-violet-800 border-violet-200' },
    },
  }[product.fulfillment_type] || {
    icon: Truck,
    label: 'Standard delivery',
    sub: '',
    banner: { headline: 'Standard delivery', tone: 'bg-ink-50 text-ink-700 border-ink-200' },
  };

  const fulfillmentBanner = fulfillmentMeta.banner;
  const warehouseOutOfStock = product.fulfillment_type === 'warehouse' && !inStock;

  const addToCart = () => {
    if (!inStock) return;
    addItem(product, qty, Object.keys(variants).length ? variants : null);
  };

  const wished = isWished(product.id);

  return (
    <div data-testid={PDP.page} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumbs — Phase 8A */}
      <nav data-testid={PDP.breadcrumb} className="flex items-center gap-1.5 text-xs text-ink-500 mb-6" aria-label="Breadcrumb">
        <Link to="/" data-testid={PDP.breadcrumbHome} className="hover:text-brand transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" strokeWidth={2} />
        <Link
          to={`/category/${product.category}`}
          data-testid={PDP.breadcrumbCategory}
          className="hover:text-brand transition-colors capitalize"
        >
          {product.category.replace(/-/g, ' ')}
        </Link>
        <ChevronRight className="w-3 h-3" strokeWidth={2} />
        <span className="text-ink-900 font-medium truncate max-w-xs" title={product.title}>
          {product.title.length > 40 ? `${product.title.slice(0, 40)}…` : product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <button
            type="button"
            data-testid="pdp-image-main-button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Zoom image"
            className="relative aspect-square bg-ink-50 rounded-xl overflow-hidden border border-ink-200 w-full group cursor-zoom-in block"
          >
            <img
              data-testid={PDP.imageMain}
              src={images[activeImg]}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {onSale && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider">
                -{discountPct}%
              </span>
            )}
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/90 text-ink-900 text-[11px] font-semibold rounded-full shadow-sm opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.75} /> Zoom
            </span>
          </button>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  data-testid={PDP.thumb}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-brand' : 'border-ink-200 hover:border-ink-400'}`}
                >
                  <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">{product.brand}</p>
          )}
          <h1 data-testid={PDP.title} className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-ink-900 leading-tight">
            {product.title}
          </h1>

          <LiveViewingBadge productId={product.id} className="mt-3" />

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`w-4 h-4 ${n <= Math.round(product.rating || 0) ? 'fill-brand text-brand' : 'text-ink-300'}`} strokeWidth={0} />
              ))}
            </div>
            <span className="text-sm text-ink-700 font-medium">{(product.rating || 0).toFixed(1)}</span>
            <span className="text-sm text-ink-400">·</span>
            <span className="text-sm text-ink-500">{product.review_count || 0} reviews</span>
            <span className="text-sm text-ink-400">·</span>
            <span className="text-sm text-ink-500">SKU: {product.sku}</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3" data-testid={PDP.price}>
            <span className={`text-3xl md:text-4xl font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(finalPrice)}</span>
            {onSale && <span className="text-lg text-ink-400 line-through">{formatPrice(product.price)}</span>}
            {onSale && <span className="ml-2 px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded">SAVE {formatPrice(product.price - product.sale_price)}</span>}
          </div>

          {/* Phase 8C — Prominent fulfillment banner */}
          <div
            data-testid={PDP.fulfillmentBanner}
            data-fulfillment={product.fulfillment_type || 'warehouse'}
            className={`mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-md border ${fulfillmentBanner.tone}`}
          >
            <fulfillmentMeta.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            <span className="text-sm font-semibold">
              {warehouseOutOfStock ? 'Out of stock — restocking soon' : fulfillmentBanner.headline}
            </span>
            {product.fulfillment_type === 'warehouse' && inStock && (
              <span className="text-xs font-medium opacity-80">· {product.stock_quantity} in stock</span>
            )}
          </div>

          {isWarehouse && (
            <LowStockBadge stock={product.stock_quantity || 0} viewCount={product.view_count || 0} />
          )}

          <p data-testid={PDP.description} className="mt-5 text-ink-600 text-sm md:text-base leading-relaxed">
            {product.description}
          </p>

          {/* Variants */}
          {(product.variants || []).map((v) => (
            <div key={v.name} className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-900 mb-2">{v.name}</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((opt) => {
                  const active = variants[v.name] === opt;
                  return (
                    <button
                      key={opt}
                      data-testid={PDP.variantSelect}
                      onClick={() => setVariants((prev) => ({ ...prev, [v.name]: opt }))}
                      className={`min-w-[44px] min-h-[44px] px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                        active ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Qty + ATC */}
          <div ref={buyBoxRef} className="mt-8 flex flex-col sm:flex-row gap-3">
            <div className="inline-flex items-center border border-ink-300 rounded-md h-12 overflow-hidden bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50 disabled:opacity-40" disabled={qty <= 1}>
                <Minus className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <input
                data-testid={PDP.qtyInput}
                type="number"
                value={qty}
                min={1}
                max={isWarehouse ? (product.stock_quantity || 99) : 99}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-14 h-full text-center text-sm font-semibold focus:outline-none"
              />
              <button onClick={() => setQty((q) => Math.min(isWarehouse ? (product.stock_quantity || 99) : 99, q + 1))} className="w-11 h-full flex items-center justify-center text-ink-700 hover:bg-ink-50">
                <Plus className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
            <button
              data-testid={CART.addToCartPDP}
              onClick={addToCart}
              disabled={!inStock}
              className="flex-1 h-12 bg-brand hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
            >
              {inStock ? 'Add to cart' : 'Out of stock'}
            </button>
            <button
              aria-label="Wishlist"
              data-testid={WISHLIST.pdpToggle}
              onClick={() => toggle(product)}
              className={`h-12 w-12 inline-flex items-center justify-center border rounded-md transition-colors ${wished ? 'bg-red-500 border-red-500 text-white' : 'border-ink-300 text-ink-700 hover:border-brand hover:text-brand'}`}
            >
              <Heart className={`w-5 h-5 ${wished ? 'fill-current' : ''}`} strokeWidth={1.5} />
            </button>
            <button
              aria-label="Share"
              onClick={() => {
                if (navigator.share) navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
                else { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); }
              }}
              className="h-12 w-12 inline-flex items-center justify-center border border-ink-300 rounded-md text-ink-700 hover:border-brand hover:text-brand"
            >
              <Share2 className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-ink-50 rounded-lg border border-ink-200">
            <div className="flex items-start gap-2">
              <fulfillmentMeta.icon className="w-5 h-5 text-brand mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-ink-900">{fulfillmentMeta.label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{fulfillmentMeta.sub}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RotateCcw className="w-5 h-5 text-brand mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-ink-900">30-day returns</p>
                <p className="text-xs text-ink-500 mt-0.5">No-hassle refunds</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-brand mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-ink-900">Secure checkout</p>
                <p className="text-xs text-ink-500 mt-0.5">256-bit encryption</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — Phase 8B */}
      <div className="mt-16">
        <Tabs value={tab} onValueChange={setTab} data-testid={PDP.tabs}>
          <TabsList className="h-auto p-0 bg-transparent border-b border-ink-200 w-full justify-start gap-6 rounded-none flex-wrap">
            {[
              { id: 'description', label: 'Description' },
              { id: 'specs', label: 'Specifications' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'shipping', label: 'Shipping & Returns' },
            ].map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                data-testid={`${PDP.tabTrigger}-${t.id}`}
                className="relative h-auto rounded-none border-0 px-0 pb-3 text-sm font-semibold text-ink-500 hover:text-ink-900 data-[state=active]:text-brand data-[state=active]:shadow-none data-[state=active]:bg-transparent transition-colors after:absolute after:-bottom-px after:left-0 after:right-0 after:h-0.5 after:bg-brand after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-300"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="description" className="pt-6 max-w-3xl" data-testid={`${PDP.tabContent}-description`}>
            <div className="prose prose-sm max-w-none text-ink-700 leading-relaxed">
              <p>{product.description || 'No description provided.'}</p>
              {product.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-xs bg-ink-100 text-ink-700 rounded">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="pt-6 max-w-3xl" data-testid={`${PDP.tabContent}-specs`}>
            {product.specs && Object.keys(product.specs).length ? (
              <dl className="divide-y divide-ink-100 border border-ink-200 rounded-md overflow-hidden">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 px-4 py-3 text-sm">
                    <dt className="font-semibold text-ink-900 col-span-1 capitalize">{k.replace(/_/g, ' ')}</dt>
                    <dd className="text-ink-700 col-span-2">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-sm text-ink-500">No specifications listed.</p>}
          </TabsContent>

          <TabsContent value="reviews" className="pt-6" data-testid={`${PDP.tabContent}-reviews`}>
            <ReviewSection productId={product.id} />
          </TabsContent>

          <TabsContent value="shipping" className="pt-6 max-w-3xl" data-testid={`${PDP.tabContent}-shipping`}>
            <div className="text-sm text-ink-700 space-y-3 leading-relaxed">
              <p>
                <strong>Warehouse items</strong> ship within 1-2 business days from Reno, NV.{' '}
                <strong>Dropship items</strong> ship within 3-7 days from the supplier.
                <strong> Digital items</strong> are delivered instantly via email after payment.
              </p>
              <p><strong>Returns:</strong> 30-day hassle-free returns on physical goods. Items must be unused and in original packaging.</p>
              <p><strong>Warranty:</strong> Manufacturer warranty applies where indicated.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Phase 8D — Related products horizontal rail */}
      {(loading || related.length > 0) && (
        <section className="mt-20" data-testid={PDP.relatedRail}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">More to explore</p>
              <h2 className="font-heading text-2xl font-bold text-ink-900 mt-1">You might also like</h2>
            </div>
            <Link
              to={`/category/${product.category}`}
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600"
            >
              View category <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
          <div className="-mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-64 flex-shrink-0">
                      <div className="skeleton aspect-square rounded-xl" />
                      <div className="skeleton h-4 w-3/4 rounded mt-3" />
                      <div className="skeleton h-4 w-1/3 rounded mt-2" />
                    </div>
                  ))
                : related.map((p) => (
                    <div key={p.id} data-testid={PDP.relatedCard} className="w-64 flex-shrink-0 snap-start">
                      <ProductCard product={p} />
                    </div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently viewed (exclude current) */}
      <div className="mt-16 -mx-4 md:-mx-0">
        <RecentlyViewedRail excludeId={product.id} variant="compact" />
      </div>

      <ImageLightbox
        images={images}
        startIndex={activeImg}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <StickyAddToCart
        targetRef={buyBoxRef}
        product={product}
        finalPrice={finalPrice}
        onSale={onSale}
        inStock={inStock}
        onAdd={addToCart}
      />
    </div>
  );
};

export default ProductDetail;
