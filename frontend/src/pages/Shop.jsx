import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Filters, AppliedPills, useBrands, useFacets } from '@/components/product/Filters';
import { ProductGrid } from '@/components/product/ProductGrid';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { SHOP } from '@/constants/testIds';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', shortLabel: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High', shortLabel: 'Price ↑' },
  { value: 'price_desc', label: 'Price: High to Low', shortLabel: 'Price ↓' },
  { value: 'rating', label: 'Top Rated', shortLabel: 'Top Rated' },
  { value: 'popular', label: 'Most Popular', shortLabel: 'Popular' },
];

const parseList = (val) => (val ? val.split(',').filter(Boolean) : []);

const Shop = ({ fixedCategory = null, headerTitle = 'All Products', headerSub = 'Discover thousands of curated finds across every department.' }) => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const selected = useMemo(() => ({
    category: fixedCategory ? [fixedCategory] : parseList(params.get('category')),
    brand: parseList(params.get('brand')),
    fulfillment: parseList(params.get('fulfillment')),
    color: parseList(params.get('color')),
    size: parseList(params.get('size')),
    min_rating: params.get('min_rating') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    on_sale: params.get('on_sale') === '1',
  }), [params, fixedCategory]);

  const sort = params.get('sort') || 'newest';
  const page = parseInt(params.get('page') || '1', 10);
  const q = params.get('q') || '';

  const brands = useBrands(fixedCategory || selected.category[0]);
  const facets = useFacets(fixedCategory || selected.category[0]);

  // Sync search input with URL query param without triggering set-state-in-effect rule
  const [lastSyncedQ, setLastSyncedQ] = useState(q);
  if (q !== lastSyncedQ) {
    setLastSyncedQ(q);
    setSearchInput(q);
  }

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (fixedCategory) {
      const meta = categories.find((c) => c.slug === fixedCategory);
      document.title = `${meta?.name || fixedCategory} | Abundant Merchandise`;
    } else {
      document.title = 'Shop All Products | Abundant Merchandise';
    }
  }, [fixedCategory, categories]);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      const qs = {
        page,
        page_size: 24,
        sort,
      };
      if (q) qs.q = q;
      const cat = fixedCategory || selected.category[0];
      if (cat) qs.category = cat;
      if (selected.brand[0]) qs.brand = selected.brand[0];
      if (selected.fulfillment[0]) qs.fulfillment_type = selected.fulfillment[0];
      if (selected.color[0]) qs.color = selected.color[0];
      if (selected.size[0]) qs.size = selected.size[0];
      if (selected.min_rating) qs.min_rating = selected.min_rating;
      if (selected.min_price) qs.min_price = selected.min_price;
      if (selected.max_price) qs.max_price = selected.max_price;
      if (selected.on_sale) qs.on_sale = true;
      try {
        const r = await api.get('/products', { params: qs });
        if (cancelled) return;
        let items = r.data?.items || [];
        if (selected.brand.length > 1) items = items.filter((p) => selected.brand.includes(p.brand));
        if (selected.fulfillment.length > 0) items = items.filter((p) => selected.fulfillment.includes(p.fulfillment_type));
        setData({ items, total: r.data?.total || 0, page: r.data?.page || 1, pages: r.data?.pages || 1 });
      } catch {
        if (!cancelled) setData({ items: [], total: 0, page: 1, pages: 1 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, [page, sort, q, fixedCategory, selected.category, selected.brand, selected.fulfillment, selected.color, selected.size, selected.min_rating, selected.min_price, selected.max_price, selected.on_sale]);

  const updateParams = (next) => {
    const nextParams = new URLSearchParams(location.search);
    const writeList = (key, list) => {
      if (list && list.length) nextParams.set(key, list.join(','));
      else nextParams.delete(key);
    };
    if (!fixedCategory) writeList('category', next.category);
    writeList('brand', next.brand);
    writeList('fulfillment', next.fulfillment);
    writeList('color', next.color);
    writeList('size', next.size);
    if (next.min_rating) nextParams.set('min_rating', String(next.min_rating)); else nextParams.delete('min_rating');
    if (next.min_price) nextParams.set('min_price', next.min_price); else nextParams.delete('min_price');
    if (next.max_price) nextParams.set('max_price', next.max_price); else nextParams.delete('max_price');
    if (next.on_sale) nextParams.set('on_sale', '1'); else nextParams.delete('on_sale');
    nextParams.delete('page');
    setParams(nextParams);
  };

  const setSort = (val) => {
    const next = new URLSearchParams(location.search);
    next.set('sort', val);
    next.delete('page');
    setParams(next);
  };

  const setPage = (p) => {
    const next = new URLSearchParams(location.search);
    next.set('page', String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(location.search);
    if (searchInput.trim()) next.set('q', searchInput.trim()); else next.delete('q');
    next.delete('page');
    setParams(next);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (params.get('q')) next.set('q', params.get('q'));
    if (params.get('sort')) next.set('sort', params.get('sort'));
    setParams(next);
  };

  const clearSearch = () => {
    setSearchInput('');
    const next = new URLSearchParams(location.search);
    next.delete('q');
    next.delete('page');
    setParams(next);
  };

  const openQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  const hasActiveFilters = !!(
    selected.brand.length || selected.fulfillment.length || selected.color.length ||
    selected.size.length || selected.min_rating || selected.min_price || selected.max_price ||
    selected.on_sale || (!fixedCategory && selected.category.length)
  );

  const activeFilterCount = (
    selected.brand.length +
    selected.fulfillment.length +
    selected.color.length +
    selected.size.length +
    (selected.min_rating ? 1 : 0) +
    (selected.min_price ? 1 : 0) +
    (selected.max_price ? 1 : 0) +
    (selected.on_sale ? 1 : 0) +
    (!fixedCategory ? selected.category.length : 0)
  );

  const NoResultsIllustration = (
    <svg
      data-testid={SHOP.emptyIllustration}
      viewBox="0 0 120 120"
      width="120"
      height="120"
      aria-hidden="true"
      className="mx-auto mb-5"
    >
      <defs>
        <linearGradient id="lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff5ed" />
          <stop offset="100%" stopColor="#ffe0cc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="32" fill="url(#lens)" stroke="#E8621A" strokeWidth="4" />
      <line x1="74" y1="74" x2="100" y2="100" stroke="#E8621A" strokeWidth="6" strokeLinecap="round" />
      {/* Sad face */}
      <circle cx="42" cy="46" r="2.5" fill="#1f1f23" />
      <circle cx="58" cy="46" r="2.5" fill="#1f1f23" />
      <path d="M40 62 Q50 54 60 62" stroke="#1f1f23" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );

  const filterEmptyState = !q && !loading && data.items.length === 0 ? (
    <div data-testid={SHOP.empty} className="text-center py-16 px-4 border border-dashed border-ink-200 rounded-xl bg-white">
      {NoResultsIllustration}
      <h3 className="font-heading text-xl font-bold text-ink-900">No products found</h3>
      <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
        Try adjusting your filters or search term.
      </p>
      {hasActiveFilters && (
        <button
          type="button"
          data-testid={SHOP.emptyClearAll}
          onClick={clearAllFilters}
          className="mt-6 inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-600 rounded-md focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none"
        >
          Clear all filters
        </button>
      )}
    </div>
  ) : null;

  const searchEmptyState = q && !loading && !data.items.length ? (
    <div data-testid={SHOP.empty} className="text-center py-16 px-4 border border-dashed border-ink-200 rounded-xl bg-white">
      {NoResultsIllustration}
      <h3 className="font-heading text-xl font-bold text-ink-900">No results for &ldquo;{q}&rdquo;</h3>
      <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
        We couldn&apos;t find any products matching your search{hasActiveFilters ? ' and applied filters' : ''}. Try a different keyword or browse all products.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          data-testid={SHOP.emptyClearSearch}
          onClick={clearSearch}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold text-ink-900 bg-white border border-ink-300 rounded-md hover:border-brand hover:text-brand"
        >
          <X className="w-4 h-4" strokeWidth={1.75} /> Clear search
        </button>
        <button
          type="button"
          data-testid={SHOP.emptyBrowseAll}
          onClick={() => navigate('/shop')}
          className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-600 rounded-md"
        >
          Browse all products
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div data-testid={SHOP.page} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <nav
          data-testid="shop-breadcrumb"
          className="flex items-center gap-1.5 text-xs text-ink-500 mb-3"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="hover:text-brand transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          {fixedCategory ? (
            <>
              <Link to="/shop" className="hover:text-brand transition-colors">Shop</Link>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-ink-900 font-medium">
                {(() => {
                  const found = categories.find((c) => c.slug === fixedCategory)?.name;
                  if (found) return found;
                  return fixedCategory
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                })()}
              </span>
            </>
          ) : (
            <span className="text-ink-900 font-medium">Shop</span>
          )}
        </nav>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink-900">{headerTitle}</h1>
        <p className="text-ink-500 mt-2 text-sm md:text-base">{headerSub}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between mb-6">
        <form onSubmit={submitSearch} className="flex-1 max-w-lg">
          <div className="relative">
            <input
              data-testid={SHOP.searchInput}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full h-11 pl-4 pr-32 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            {searchInput && (
              <button
                type="button"
                data-testid={SHOP.searchClear}
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-[6.25rem] top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center text-ink-400 hover:text-ink-900"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
            <button data-testid={SHOP.searchSubmit} type="submit" className="absolute right-1 top-1 h-9 px-4 text-xs font-semibold text-white bg-brand hover:bg-brand-600 rounded">
              Search
            </button>
          </div>
        </form>
        <div className="flex items-center gap-2">
          <button
            data-testid={SHOP.filterToggle}
            onClick={() => setDrawerOpen(true)}
            className="md:hidden relative inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-ink-900 bg-white border border-ink-300 rounded-md hover:border-brand"
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />Filters
            {activeFilterCount > 0 && (
              <span
                data-testid="shop-filter-toggle-count"
                aria-label={`${activeFilterCount} filters active`}
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center bg-brand text-white text-[10px] font-bold rounded-full leading-none"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            data-testid={SHOP.sortSelect}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="md:hidden h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div
            role="radiogroup"
            aria-label="Sort products"
            className="hidden md:flex items-center gap-1.5 flex-wrap"
          >
            {SORT_OPTIONS.map((o) => {
              const active = sort === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`${SHOP.sortPill}-${o.value}`}
                  onClick={() => setSort(o.value)}
                  className={`inline-flex items-center h-9 px-3.5 text-xs font-semibold rounded-full border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none ${
                    active
                      ? 'bg-brand border-brand text-white shadow-sm'
                      : 'bg-white border-ink-200 text-ink-700 hover:border-brand hover:text-brand'
                  }`}
                >
                  {o.shortLabel || o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
        <div className="hidden md:block">
          <Filters
            categories={categories}
            brands={brands}
            facets={facets}
            selected={selected}
            onChange={updateParams}
            hideCategory={!!fixedCategory}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p data-testid={SHOP.results} className="text-sm text-ink-500">
              {q ? (
                <>
                  <span className="font-semibold text-ink-900">{data.total}</span>
                  {data.total === 1 ? ' result ' : ' results '}for{' '}
                  <span className="font-semibold text-ink-900">&ldquo;{q}&rdquo;</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-900">{data.total}</span> products
                </>
              )}
            </p>
            {q && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} /> Clear search
              </button>
            )}
          </div>
          <AppliedPills selected={selected} categories={categories} onChange={updateParams} />

          <ProductGrid
            products={data.items}
            loading={loading}
            highlight={q}
            onQuickView={openQuickView}
            emptyState={searchEmptyState || filterEmptyState}
          />

          {data.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                data-testid={SHOP.prevPage}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 h-10 px-4 text-sm font-medium border border-ink-300 rounded-md hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />Prev
              </button>
              <span className="text-sm text-ink-700 px-3">Page {data.page} of {data.pages}</span>
              <button
                data-testid={SHOP.nextPage}
                onClick={() => setPage(Math.min(data.pages, page + 1))}
                disabled={page >= data.pages}
                className="inline-flex items-center gap-1 h-10 px-4 text-sm font-medium border border-ink-300 rounded-md hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next<ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-ink-200">
              <h3 className="font-bold text-ink-900">Filters</h3>
              <button onClick={() => setDrawerOpen(false)} className="p-2 -mr-2 text-ink-700"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-4">
              <Filters
                categories={categories}
                brands={brands}
                facets={facets}
                selected={selected}
                onChange={updateParams}
                hideCategory={!!fixedCategory}
              />
              <button onClick={() => setDrawerOpen(false)} className="mt-6 w-full h-11 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-md">View results</button>
            </div>
          </div>
        </div>
      )}

      <QuickViewModal
        productId={quickViewProduct?.id}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </div>
  );
};

export default Shop;
