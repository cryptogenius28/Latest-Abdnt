import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Star } from 'lucide-react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { api } from '@/lib/api';
import { FILTER, SHOP } from '@/constants/testIds';

const Group = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink-200 py-4" data-testid={FILTER.group}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-ink-900 mb-3">
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} strokeWidth={1.75} />
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
};

const Check = ({ label, checked, onChange, count, testid }) => (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-700 hover:text-brand">
    <input type="checkbox" data-testid={testid} checked={checked} onChange={onChange} className="w-4 h-4 rounded border-ink-300 text-brand focus:ring-brand/20" />
    <span className="flex-1">{label}</span>
    {count != null && <span className="text-xs text-ink-400">{count}</span>}
  </label>
);

// ---- Phase 7B — Dual-thumb price range slider ----
const PRICE_FLOOR = 0;
const PRICE_CEILING = 500;

const PriceRange = ({ min, max, onCommit }) => {
  const initial = [
    Number.isFinite(min) ? Math.max(PRICE_FLOOR, min) : PRICE_FLOOR,
    Number.isFinite(max) && max > 0 ? Math.min(PRICE_CEILING, max) : PRICE_CEILING,
  ];
  const [value, setValue] = useState(initial);
  const timer = useRef(null);
  const lastCommitted = useRef(initial.join(','));

  // Keep slider in sync if URL is changed externally
  useEffect(() => {
    const next = [
      Number.isFinite(min) ? Math.max(PRICE_FLOOR, min) : PRICE_FLOOR,
      Number.isFinite(max) && max > 0 ? Math.min(PRICE_CEILING, max) : PRICE_CEILING,
    ];
    if (next.join(',') !== lastCommitted.current) {
      setValue(next);
      lastCommitted.current = next.join(',');
    }
  }, [min, max]);

  const handleChange = (next) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = next.join(',');
      onCommit(next[0], next[1]);
    }, 400);
  };

  return (
    <div className="pt-1 pb-2" data-testid={FILTER.priceRange}>
      <div className="flex items-center justify-between text-sm font-semibold text-ink-900 mb-3">
        <span data-testid={FILTER.priceRangeLabel}>
          ${value[0]} – ${value[1]}{value[1] >= PRICE_CEILING ? '+' : ''}
        </span>
        {(value[0] > PRICE_FLOOR || value[1] < PRICE_CEILING) && (
          <button
            type="button"
            data-testid={FILTER.priceRangeReset}
            onClick={() => { setValue([PRICE_FLOOR, PRICE_CEILING]); onCommit(PRICE_FLOOR, PRICE_CEILING); lastCommitted.current = `${PRICE_FLOOR},${PRICE_CEILING}`; }}
            className="text-xs font-semibold text-brand hover:text-brand-600"
          >
            Reset
          </button>
        )}
      </div>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center h-6"
        min={PRICE_FLOOR}
        max={PRICE_CEILING}
        step={10}
        value={value}
        onValueChange={handleChange}
        minStepsBetweenThumbs={1}
        aria-label="Price range"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-ink-200">
          <SliderPrimitive.Range className="absolute h-full bg-brand" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-testid={FILTER.priceRangeThumbMin}
          className="block h-5 w-5 rounded-full border-2 border-brand bg-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Minimum price"
        />
        <SliderPrimitive.Thumb
          data-testid={FILTER.priceRangeThumbMax}
          className="block h-5 w-5 rounded-full border-2 border-brand bg-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Maximum price"
        />
      </SliderPrimitive.Root>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-ink-400">
        <span>${PRICE_FLOOR}</span>
        <span>${PRICE_CEILING}+</span>
      </div>
    </div>
  );
};

export const Filters = ({
  categories = [],
  brands = [],
  facets = { colors: [], sizes: [] },
  selected,
  onChange,
  hideCategory = false,
}) => {
  const toggle = (key, value) => {
    const cur = new Set(selected[key] || []);
    if (cur.has(value)) cur.delete(value); else cur.add(value);
    onChange({ ...selected, [key]: Array.from(cur) });
  };
  const setOnSale = (val) => onChange({ ...selected, on_sale: val });
  const setRating = (val) => onChange({ ...selected, min_rating: selected.min_rating === val ? '' : val });

  return (
    <aside className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-ink-900">Filters</h3>
        <button
          data-testid={SHOP.clearAll}
          className="text-xs font-semibold text-brand hover:text-brand-600"
          onClick={() => onChange({ category: [], brand: [], fulfillment: [], color: [], size: [], min_rating: '', min_price: '', max_price: '', on_sale: false })}
        >
          Clear all
        </button>
      </div>

      {!hideCategory && (
        <Group title="Category">
          {categories.map((c) => (
            <Check
              key={c.slug}
              testid={FILTER.categoryCheckbox}
              label={c.name}
              count={c.count}
              checked={selected.category?.includes(c.slug) || false}
              onChange={() => toggle('category', c.slug)}
            />
          ))}
        </Group>
      )}

      <Group title="Price">
        <PriceRange
          min={Number(selected.min_price || 0)}
          max={Number(selected.max_price || 500)}
          onCommit={(lo, hi) => onChange({ ...selected, min_price: lo > 0 ? String(lo) : '', max_price: hi < 500 ? String(hi) : '' })}
        />
      </Group>

      {brands.length > 0 && (
        <Group title="Brand">
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {brands.map((b) => (
              <Check
                key={b}
                testid={FILTER.brandCheckbox}
                label={b}
                checked={selected.brand?.includes(b) || false}
                onChange={() => toggle('brand', b)}
              />
            ))}
          </div>
        </Group>
      )}

      <Group title="Fulfillment">
        {['warehouse', 'dropship', 'digital'].map((f) => (
          <Check
            key={f}
            testid={FILTER.fulfillmentCheckbox}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            checked={selected.fulfillment?.includes(f) || false}
            onChange={() => toggle('fulfillment', f)}
          />
        ))}
      </Group>

      <Group title="Promotions">
        <Check
          label="On sale only"
          testid={FILTER.onSale}
          checked={!!selected.on_sale}
          onChange={() => setOnSale(!selected.on_sale)}
        />
      </Group>

      {facets.colors?.length > 0 && (
        <Group title="Color">
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {facets.colors.map((c) => (
              <Check
                key={c}
                testid={`filter-color-checkbox-${c}`}
                label={c}
                checked={selected.color?.includes(c) || false}
                onChange={() => toggle('color', c)}
              />
            ))}
          </div>
        </Group>
      )}

      {facets.sizes?.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => {
              const active = selected.size?.includes(s);
              return (
                <button
                  key={s}
                  data-testid={`filter-size-chip-${s}`}
                  type="button"
                  onClick={() => toggle('size', s)}
                  className={`min-w-[36px] h-9 px-2.5 text-xs font-semibold border rounded-md transition-colors ${active ? 'bg-brand border-brand text-white' : 'bg-white border-ink-300 text-ink-700 hover:border-brand'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title="Customer rating">
        {[4, 3].map((r) => {
          const active = String(selected.min_rating) === String(r);
          return (
            <button
              key={r}
              type="button"
              data-testid={`filter-rating-${r}`}
              onClick={() => setRating(r)}
              className={`flex items-center gap-2 w-full text-left text-sm py-1 px-2 rounded-md transition-colors ${active ? 'bg-brand/10 text-ink-900' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              <span className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= r ? 'fill-brand text-brand' : 'fill-ink-200 text-ink-200'}`} strokeWidth={0} />
                ))}
              </span>
              <span className="text-xs">{r}+ stars</span>
            </button>
          );
        })}
      </Group>
    </aside>
  );
};

export const useFacets = (category) => {
  const [facets, setFacets] = useState({ colors: [], sizes: [], brands: [] });
  useEffect(() => {
    api.get('/products/facets', { params: category ? { category } : {} })
      .then((r) => setFacets(r.data || { colors: [], sizes: [], brands: [] }))
      .catch(() => setFacets({ colors: [], sizes: [], brands: [] }));
  }, [category]);
  return facets;
};

export const useBrands = (category) => {
  const [brands, setBrands] = useState([]);
  useEffect(() => {
    api.get('/brands', { params: category ? { category } : {} }).then((r) => setBrands(r.data || [])).catch(() => setBrands([]));
  }, [category]);
  return brands;
};

export const AppliedPills = ({ selected, categories, onChange }) => {
  const pills = [];
  (selected.category || []).forEach((slug) => {
    const c = categories.find((cc) => cc.slug === slug);
    pills.push({ key: `category-${slug}`, label: c?.name || slug, remove: () => onChange({ ...selected, category: selected.category.filter((s) => s !== slug) }) });
  });
  (selected.brand || []).forEach((b) => pills.push({ key: `brand-${b}`, label: b, remove: () => onChange({ ...selected, brand: selected.brand.filter((s) => s !== b) }) }));
  (selected.fulfillment || []).forEach((f) => pills.push({ key: `ful-${f}`, label: f, remove: () => onChange({ ...selected, fulfillment: selected.fulfillment.filter((s) => s !== f) }) }));
  (selected.color || []).forEach((c) => pills.push({ key: `color-${c}`, label: c, remove: () => onChange({ ...selected, color: selected.color.filter((s) => s !== c) }) }));
  (selected.size || []).forEach((s) => pills.push({ key: `size-${s}`, label: `Size ${s}`, remove: () => onChange({ ...selected, size: selected.size.filter((x) => x !== s) }) }));
  if (selected.min_rating) pills.push({ key: 'rating', label: `${selected.min_rating}+ stars`, remove: () => onChange({ ...selected, min_rating: '' }) });
  if (selected.min_price) pills.push({ key: 'min', label: `Min $${selected.min_price}`, remove: () => onChange({ ...selected, min_price: '' }) });
  if (selected.max_price) pills.push({ key: 'max', label: `Max $${selected.max_price}`, remove: () => onChange({ ...selected, max_price: '' }) });
  if (selected.on_sale) pills.push({ key: 'sale', label: 'On sale', remove: () => onChange({ ...selected, on_sale: false }) });

  if (!pills.length) return null;
  return (
    <div data-testid={SHOP.appliedPills} className="flex flex-wrap items-center gap-2 mb-4">
      {pills.map((p) => (
        <button key={p.key} onClick={p.remove} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand border border-brand/20 rounded-full hover:bg-brand hover:text-white transition-colors">
          {p.label}<X className="w-3 h-3" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
};
