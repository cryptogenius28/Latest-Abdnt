import React, { useEffect, useState } from 'react';
import { ChevronDown, X, Star } from 'lucide-react';
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
  const setPrice = (which, val) => onChange({ ...selected, [which]: val });
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
        <div className="flex items-center gap-2">
          <input
            data-testid={FILTER.priceMin}
            type="number" min="0" placeholder="Min"
            value={selected.min_price || ''}
            onChange={(e) => setPrice('min_price', e.target.value)}
            className="w-full h-9 px-2 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <span className="text-ink-400">—</span>
          <input
            data-testid={FILTER.priceMax}
            type="number" min="0" placeholder="Max"
            value={selected.max_price || ''}
            onChange={(e) => setPrice('max_price', e.target.value)}
            className="w-full h-9 px-2 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
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
