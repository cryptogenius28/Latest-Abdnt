import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { HOME_PAGE } from '@/constants/testIds';
import { FlashSale } from '@/components/home/FlashSale';
import { TopBrands } from '@/components/home/TopBrands';
import { Testimonials } from '@/components/home/Testimonials';
import { NewsletterBanner } from '@/components/home/NewsletterBanner';
import { FulfillmentHighlights } from '@/components/home/FulfillmentHighlights';
import { WarehousePicks } from '@/components/home/WarehousePicks';
import { RecentlyViewedRail } from '@/components/product/RecentlyViewedRail';
import { QuickViewModal } from '@/components/product/QuickViewModal';

const TRUST = [
  { icon: Truck, title: 'Free shipping', sub: 'On orders over $49' },
  { icon: RotateCcw, title: '30-day returns', sub: 'Hassle-free refunds' },
  { icon: ShieldCheck, title: 'Secure checkout', sub: 'PCI-DSS encrypted' },
  { icon: Headphones, title: '24/7 support', sub: 'We are here to help' },
];

const BLOG_POSTS = [
  {
    category: 'Buying Guide',
    title: 'The 10 Best Smart Home Gadgets of 2026',
    excerpt: 'From voice-controlled lights to robotic vacuums, we break down the gadgets worth your money.',
    date: 'June 3, 2026',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
  },
  {
    category: 'Home Tips',
    title: '5 Kitchen Upgrades That Actually Save You Time',
    excerpt: "Small swaps in your kitchen can cut meal-prep time in half. Here's what our editors swear by.",
    date: 'May 28, 2026',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',
  },
  {
    category: 'Tech',
    title: 'What to Look for in a Wireless Headphone in 2026',
    excerpt: 'Noise cancellation, battery life, codec support — we rank what matters most.',
    date: 'May 20, 2026',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
  },
];

const HERO_HEADLINE_TOP = ['Abundant', 'deals.'];
const HERO_HEADLINE_BOTTOM = ['Every', 'day,', 'every', 'aisle.'];
const TOTAL_HERO_WORDS = HERO_HEADLINE_TOP.length + HERO_HEADLINE_BOTTOM.length;

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const categoryRowRef = useRef(null);

  useEffect(() => { document.title = 'Abundant Merchandise — Quality Deals, Every Day'; }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/categories'),
      api.get('/products', { params: { featured: true, page_size: 8 } }),
      api.get('/products', { params: { sort: 'newest', page_size: 8 } }),
    ])
      .then(([cRes, fRes, naRes]) => {
        if (cancelled) return;
        setCategories(cRes.data || []);
        setFeatured(fRes.data?.items || []);
        setNewArrivals(naRes.data?.items || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openQuickView = (p) => { setQuickViewProduct(p); setQuickViewOpen(true); };

  const scrollCategories = (direction) => {
    const row = categoryRowRef.current;
    if (!row) return;
    const card = row.querySelector('[data-testid="home-category-tile"]');
    const step = card ? card.clientWidth + 16 : 200;
    row.scrollBy({ left: direction === 'left' ? -step * 2 : step * 2, behavior: 'smooth' });
  };

  return (
    <div data-testid={HOME_PAGE.root}>
      {/* ============= HERO — Phase 6A ============= */}
      <section
        data-testid="home-hero"
        className="relative bg-ink-900 text-white overflow-hidden min-h-[85svh] md:min-h-[80vh] flex items-center"
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/5625003/pexels-photo-5625003.jpeg"
            alt=""
            className="w-full h-full object-cover opacity-40"
            loading="eager"
          />
        </div>
        {/* Dark overlay (left 55%) */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/20 md:to-transparent" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-[55%_45%] gap-10 items-center">
          <div>
            <span
              className="animate-hero-fade inline-block px-3 py-1 bg-brand/15 border border-brand/30 text-brand text-[11px] font-bold uppercase tracking-widest rounded-full"
              style={{ animationDelay: `${TOTAL_HERO_WORDS * 80 + 100}ms` }}
            >
              Flash Sale · Limited Time
            </span>
            <h1
              data-testid="home-hero-headline"
              className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
            >
              {HERO_HEADLINE_TOP.map((w, i) => (
                <span
                  key={`top-${i}`}
                  className="animate-hero-word"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {w}{i < HERO_HEADLINE_TOP.length - 1 ? '\u00A0' : ''}
                </span>
              ))}
              <br />
              {HERO_HEADLINE_BOTTOM.map((w, i) => (
                <span
                  key={`bot-${i}`}
                  className="animate-hero-word text-brand"
                  style={{ animationDelay: `${(HERO_HEADLINE_TOP.length + i) * 80}ms` }}
                >
                  {w}{i < HERO_HEADLINE_BOTTOM.length - 1 ? '\u00A0' : ''}
                </span>
              ))}
            </h1>
            <p
              className="animate-hero-fade mt-5 text-base md:text-lg text-ink-300 max-w-lg leading-relaxed"
              style={{ animationDelay: `${TOTAL_HERO_WORDS * 80 + 200}ms` }}
            >
              Shop thousands of products across electronics, home, fashion, and more — with up to 40% off
              this week and free shipping on orders over $49.
            </p>
            <div
              className="animate-hero-fade mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: `${TOTAL_HERO_WORDS * 80 + 300}ms` }}
            >
              <Link
                to="/shop"
                data-testid={HOME_PAGE.heroCta}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none"
              >
                Shop the sale <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
              <Link
                to="/category/electronics"
                data-testid={HOME_PAGE.heroSecondaryCta}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold rounded-md px-6 py-3 transition-colors border border-white/20 min-h-[44px]"
              >
                Browse Electronics
              </Link>
            </div>
          </div>

          {/* Right mosaic (desktop only) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.pexels.com/photos/705164/computer-laptop-work-place-camera-705164.jpeg"
                alt=""
                className="animate-hero-mosaic rounded-2xl aspect-[4/5] object-cover shadow-2xl"
                style={{ animationDelay: '500ms' }}
                loading="lazy"
              />
              <div className="space-y-4 pt-10">
                <img
                  src="https://images.unsplash.com/photo-1724582586529-62622e50c0b3"
                  alt=""
                  className="animate-hero-mosaic rounded-2xl aspect-square object-cover shadow-2xl"
                  style={{ animationDelay: '650ms' }}
                  loading="lazy"
                />
                <img
                  src="https://images.pexels.com/photos/13158675/pexels-photo-13158675.jpeg"
                  alt=""
                  className="animate-hero-mosaic rounded-2xl aspect-square object-cover shadow-2xl"
                  style={{ animationDelay: '800ms' }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-down chevron */}
        <div
          aria-hidden="true"
          className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center text-white/60 animate-bounce"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4 mt-0.5" strokeWidth={2} />
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-ink-200 bg-ink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <t.icon className="w-6 h-6 text-brand" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                <p className="text-xs text-ink-500">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============= 6C — Fulfillment Highlights ============= */}
      <FulfillmentHighlights />

      {/* FLASH SALE */}
      <FlashSale />

      {/* ============= 6B — Categories (horizontal scroll on mobile) ============= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Shop by department</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">Explore categories</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Scroll categories left"
              data-testid="home-categories-scroll-left"
              onClick={() => scrollCategories('left')}
              className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-full border border-ink-300 text-ink-700 hover:border-brand hover:text-brand transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Scroll categories right"
              data-testid="home-categories-scroll-right"
              onClick={() => scrollCategories('right')}
              className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-full border border-ink-300 text-ink-700 hover:border-brand hover:text-brand transition-colors"
            >
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <Link to="/shop" data-testid={HOME_PAGE.shopAllCta} className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600 ml-2">
              View all <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Mobile: horizontal scroll. Desktop: 4-col grid */}
        <div
          ref={categoryRowRef}
          className="
            lg:grid lg:grid-cols-4 lg:gap-6
            flex lg:flex-wrap gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide
            -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible
          "
          data-testid={HOME_PAGE.categoriesGrid}
        >
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              data-testid={HOME_PAGE.categoryTile}
              className="category-tile group relative aspect-[5/6] rounded-xl overflow-hidden border border-ink-100 hover:border-brand/30 hover:shadow-md transition-all w-40 lg:w-auto flex-shrink-0 snap-start"
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
                <h3 className="text-white font-semibold text-sm md:text-base">{c.name}</h3>
                <p className="text-white/70 text-[11px] md:text-xs mt-0.5">{c.count} items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Hand-picked for you</p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">Featured products</h2>
            </div>
            <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600">
              Shop all <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
          <div data-testid={HOME_PAGE.featuredGrid}>
            <ProductGrid products={featured} loading={loading} skeletonCount={8} onQuickView={openQuickView} />
          </div>
        </div>
      </section>

      {/* ============= 6E — Warehouse Picks ============= */}
      <WarehousePicks />

      {/* PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 relative rounded-xl overflow-hidden bg-ink-900 text-white p-8 md:p-12 min-h-[260px] flex items-end">
            <img src="https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" loading="lazy" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">New arrivals</p>
              <h3 className="font-heading text-2xl md:text-3xl font-bold mt-2">Fresh picks for your workspace</h3>
              <p className="text-ink-300 text-sm mt-2 max-w-md">Tech, gear, and office essentials — updated weekly.</p>
              <Link to="/category/office" className="inline-flex mt-5 items-center gap-2 bg-white text-ink-900 hover:bg-brand hover:text-white font-semibold rounded-md px-5 py-2.5 text-sm transition-colors">
                Shop now <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className="md:col-span-4 relative rounded-xl overflow-hidden bg-brand text-white p-8 min-h-[260px] flex flex-col justify-end">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">Member exclusive</p>
            <h3 className="font-heading text-2xl font-bold mt-2">Save 10%</h3>
            <p className="text-white/90 text-sm mt-2">Sign up & unlock first-order savings.</p>
            <Link to="/register" className="inline-flex mt-5 items-center gap-2 bg-white text-brand hover:bg-ink-900 hover:text-white font-semibold rounded-md px-5 py-2.5 text-sm transition-colors w-fit">
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="home-new-arrivals">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Just dropped</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">New Arrivals</h2>
          </div>
          <Link to="/shop?sort=newest" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600">
            View all <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
        <ProductGrid products={newArrivals} loading={loading} skeletonCount={8} onQuickView={openQuickView} />
      </section>

      {/* BLOG PREVIEW */}
      <section className="bg-ink-50 border-y border-ink-200" data-testid="home-blog-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">From our blog</p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">Tips & Inspiration</h2>
            </div>
            <Link to="/blog" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-600">
              View all posts <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <Link
                to="/blog"
                key={post.title}
                className="bg-white border border-ink-100 rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-md transition-all group"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                    {post.category}
                  </span>
                  <h3 className="mt-3 font-heading font-bold text-ink-900 text-base line-clamp-2 group-hover:text-brand transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-500 line-clamp-2">{post.excerpt}</p>
                  <p className="mt-3 text-xs text-ink-400">{post.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TopBrands />
      <RecentlyViewedRail title="Pick up where you left off" />
      <Testimonials />
      <NewsletterBanner />

      <QuickViewModal
        productId={quickViewProduct?.id}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </div>
  );
};

export default Home;
