import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowRight, Loader2, TrendingUp } from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { NAV } from '@/constants/testIds';

// Module-level cache so trending fetches only once per session
let trendingCache = null;
let trendingPromise = null;
const loadTrending = () => {
  if (trendingCache) return Promise.resolve(trendingCache);
  if (trendingPromise) return trendingPromise;
  trendingPromise = api.get('/search/trending')
    .then((r) => { trendingCache = r.data?.terms || []; return trendingCache; })
    .catch(() => { trendingCache = []; return trendingCache; });
  return trendingPromise;
};

/**
 * Lightweight autocomplete dropdown for the navbar search.
 * - When query >=2 chars: fetches /api/products?q=<query>&page_size=6 with 250ms debounce.
 * - When query empty/short: shows trending search chips (cached, fetched once).
 * Clicking a result navigates to PDP; "See all" goes to /shop?q=<query>.
 */
export const SearchAutocomplete = forwardRef(({ query, open, onSelect, onClose, onPickTerm, anchorClassName = '' }, ref) => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [trending, setTrending] = useState(trendingCache || []);
  const debounceRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (trending.length) return;
    loadTrending().then((terms) => setTrending(terms));
  }, [open, trending.length]);

  // Render-time reset when query changes (avoids set-state-in-effect)
  const [lastTrigger, setLastTrigger] = useState('');
  const trigger = `${open ? '1' : '0'}|${query || ''}`;
  if (trigger !== lastTrigger) {
    setLastTrigger(trigger);
    const q = (query || '').trim();
    if (!open || q.length < 2) {
      if (results.length) setResults([]);
      if (loading) setLoading(false);
    } else {
      if (!loading) setLoading(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = (query || '').trim();
    if (!open || q.length < 2) return;
    debounceRef.current = setTimeout(() => {
      api.get('/products', { params: { q, page_size: 6, sort: 'popular' } })
        .then((r) => { setResults(r.data?.items || []); })
        .catch(() => { setResults([]); })
        .finally(() => { setLoading(false); });
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  // Reset active index when result list changes
  const resultsKey = results.map((r) => r.id).join('|');
  const [lastResultsKey, setLastResultsKey] = useState('');
  if (resultsKey !== lastResultsKey) {
    setLastResultsKey(resultsKey);
    if (activeIdx !== -1) setActiveIdx(-1);
  }

  const trimmedQ = (query || '').trim();
  const showTrending = trimmedQ.length < 2;
  // Build the navigable list (trending chips OR product results)
  const navList = showTrending
    ? trending.map((t) => ({ kind: 'term', value: t }))
    : results.map((p) => ({ kind: 'product', value: p }));

  // Expose keyboard handler to parent input
  useImperativeHandle(ref, () => ({
    handleKeyDown: (e) => {
      if (!open) return false;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (navList.length) setActiveIdx((i) => (i + 1) % navList.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (navList.length) setActiveIdx((i) => (i <= 0 ? navList.length - 1 : i - 1));
        return true;
      }
      if (e.key === 'Enter' && activeIdx >= 0 && activeIdx < navList.length) {
        const item = navList[activeIdx];
        e.preventDefault();
        if (item.kind === 'term') {
          if (onPickTerm) onPickTerm(item.value);
          else navigate(`/shop?q=${encodeURIComponent(item.value)}`);
        } else {
          onSelect?.(item.value);
          navigate(`/product/${item.value.id}`);
        }
        onClose?.();
        return true;
      }
      return false;
    },
  }), [open, navList, activeIdx, navigate, onClose, onPickTerm, onSelect]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const pickTerm = (term) => {
    if (onPickTerm) onPickTerm(term);
    else navigate(`/shop?q=${encodeURIComponent(term)}`);
    onClose?.();
  };

  return (
    <div
      ref={listRef}
      data-testid={NAV.searchDropdown}
      className={`absolute left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-md shadow-xl z-50 overflow-hidden ${anchorClassName}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showTrending && (
        trending.length === 0 ? null : (
          <div className="px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-500 font-semibold mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} /> Trending searches
            </p>
            <div className="flex flex-wrap gap-2">
              {trending.map((term, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={term}
                    type="button"
                    data-testid={NAV.searchTrendingChip}
                    data-idx={i}
                    onClick={() => pickTerm(term)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`inline-flex items-center h-8 px-3 text-xs font-semibold rounded-full border transition-colors capitalize ${isActive ? 'bg-brand text-white border-brand' : 'text-ink-700 bg-ink-50 border-ink-200 hover:bg-brand hover:text-white hover:border-brand'}`}
                  >
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
      {!showTrending && loading && (
        <div data-testid={NAV.searchLoading} className="flex items-center gap-2 px-4 py-3 text-sm text-ink-500">
          <Loader2 className="w-4 h-4 animate-spin text-brand" /> Searching…
        </div>
      )}
      {!showTrending && !loading && results.length === 0 && (
        <div className="px-4 py-4 text-sm text-ink-500">
          No matches for <span className="font-semibold text-ink-900">&ldquo;{query}&rdquo;</span>.
        </div>
      )}
      {!showTrending && !loading && results.length > 0 && (
        <ul role="listbox" className="max-h-[420px] overflow-y-auto">
          {results.map((p, i) => {
            const img = p.images?.[0] || 'https://placehold.co/80x80?text=No+Image';
            const onSale = !!p.sale_price && p.sale_price < p.price;
            const price = onSale ? p.sale_price : p.price;
            return (
              <li key={p.id} role="option" aria-selected={i === activeIdx}>
                <Link
                  to={`/product/${p.id}`}
                  data-testid={NAV.searchResultItem}
                  data-idx={i}
                  onClick={() => { onSelect?.(p); onClose?.(); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50 transition-colors ${i === activeIdx ? 'bg-brand-50' : ''}`}
                >
                  <img src={img} alt="" className="w-12 h-12 object-cover rounded border border-ink-100 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    {p.brand && <p className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">{p.brand}</p>}
                    <p className="text-sm text-ink-900 font-medium truncate">{p.title}</p>
                    <p className="text-xs">
                      <span className={`font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(price)}</span>
                      {onSale && <span className="text-ink-400 line-through ml-1.5">{formatPrice(p.price)}</span>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!showTrending && !loading && trimmedQ && (
        <Link
          to={`/shop?q=${encodeURIComponent(trimmedQ)}`}
          data-testid={NAV.searchSeeAll}
          onClick={() => onClose?.()}
          className="flex items-center justify-between px-4 py-2.5 border-t border-ink-100 bg-ink-50/40 text-sm font-semibold text-brand hover:bg-brand-50 transition-colors"
        >
          <span className="inline-flex items-center gap-2"><SearchIcon className="w-4 h-4" strokeWidth={1.75} /> See all results for &ldquo;{trimmedQ}&rdquo;</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Link>
      )}
    </div>
  );
});

SearchAutocomplete.displayName = 'SearchAutocomplete';
