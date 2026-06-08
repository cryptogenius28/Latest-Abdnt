import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Package, Users, AlertTriangle, Tag, Plus, Pencil, Trash2, Search,
  X, ChevronLeft, ChevronRight, LayoutDashboard, ShoppingBag, Star, ArrowLeft,
  Mail, MessageSquare, Receipt, DollarSign, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Image as ImageIcon, FileArchive, TrendingUp, TrendingDown, BarChart3, Eye, ShoppingCart, Target, Sparkles, Loader2, Bell,
} from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { ADMIN } from '@/constants/testIds';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import AdminAnalytics from '@/components/admin/AdminAnalytics';

const FULFILLMENT_OPTIONS = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'dropship', label: 'Dropship' },
  { value: 'digital', label: 'Digital' },
];

const FULFILLMENT_BADGE_STYLES = {
  warehouse: 'bg-blue-50 text-blue-700 border-blue-200',
  dropship: 'bg-orange-50 text-orange-700 border-orange-200',
  digital: 'bg-violet-50 text-violet-700 border-violet-200',
};

const FulfillmentBadge = ({ type, testid }) => {
  const t = (type || 'warehouse').toLowerCase();
  const label = t.charAt(0).toUpperCase() + t.slice(1);
  return (
    <span
      data-testid={testid}
      data-fulfillment={t}
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded border ${
        FULFILLMENT_BADGE_STYLES[t] || FULFILLMENT_BADGE_STYLES.warehouse
      }`}
    >
      {label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, accent = 'brand' }) => (
  <div
    data-testid={ADMIN.statsCard}
    className="p-5 bg-white border border-ink-200 rounded-xl flex items-start justify-between"
  >
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-2 font-heading text-2xl md:text-3xl font-bold text-ink-900">{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${accent}/10 text-${accent}`}>
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </div>
  </div>
);

const emptyProduct = {
  title: '',
  description: '',
  price: 0,
  sale_price: '',
  sku: '',
  brand: '',
  category: '',
  subcategory: '',
  tags: '',
  fulfillment_type: 'warehouse',
  stock_quantity: 0,
  reorder_point: 10,
  download_url: '',
  images: '',
  specs: '',
  featured: false,
};

const toForm = (p) => ({
  title: p.title || '',
  description: p.description || '',
  price: p.price ?? 0,
  sale_price: p.sale_price == null ? '' : p.sale_price,
  sku: p.sku || '',
  brand: p.brand || '',
  category: p.category || '',
  subcategory: p.subcategory || '',
  tags: (p.tags || []).join(', '),
  fulfillment_type: p.fulfillment_type || 'warehouse',
  stock_quantity: p.stock_quantity ?? 0,
  reorder_point: p.reorder_point ?? 10,
  download_url: p.download_url || '',
  images: (p.images || []).join('\n'),
  specs: p.specs ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
  featured: !!p.featured,
});

const parseSpecs = (text) => {
  const out = {};
  (text || '').split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  });
  return out;
};

const fromForm = (f) => ({
  title: f.title.trim(),
  description: f.description,
  price: parseFloat(f.price) || 0,
  sale_price: f.sale_price === '' || f.sale_price == null ? null : parseFloat(f.sale_price),
  sku: f.sku.trim(),
  brand: f.brand.trim(),
  category: f.category.trim().toLowerCase(),
  subcategory: f.subcategory.trim() || null,
  tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
  fulfillment_type: f.fulfillment_type || 'warehouse',
  stock_quantity: f.fulfillment_type === 'warehouse' ? (parseInt(f.stock_quantity, 10) || 0) : 0,
  reorder_point: f.fulfillment_type === 'warehouse' ? Math.max(0, parseInt(f.reorder_point, 10) || 0) : 10,
  download_url: f.fulfillment_type === 'digital' ? (f.download_url || '').trim() : '',
  images: f.images.split('\n').map((s) => s.trim()).filter(Boolean),
  specs: parseSpecs(f.specs),
  featured: !!f.featured,
});

const ProductFormModal = ({ open, onClose, onSaved, editing }) => {
  // Initialized lazily from props on mount. Parent uses `key` to remount on change.
  const [form, setForm] = useState(() => (editing ? toForm(editing) : emptyProduct));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  const set = (k) => (e) => {
    const v = e.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const generateDescription = async () => {
    if (!form.title?.trim()) {
      toast.error('Add a title first');
      return;
    }
    setGenerating(true);
    try {
      const specsObj = {};
      (form.specs || '').split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) specsObj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
      const { data } = await api.post('/ai/generate-description', {
        title: form.title,
        category: form.category,
        brand: form.brand,
        price: Number(form.price) || 0,
        specs: specsObj,
      });
      if (data?.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
        toast.success('Description generated');
      } else {
        toast.error('Could not generate description');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'AI is unavailable right now');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = fromForm(form);
    if (!payload.title || !payload.sku || !payload.category) {
      setError('Title, SKU and Category are required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const res = await api.put(`/admin/products/${editing.id}`, payload);
        toast.success(`Updated "${res.data.title}"`);
        onSaved(res.data, 'update');
      } else {
        const res = await api.post('/admin/products', payload);
        toast.success(`Created "${res.data.title}"`);
        onSaved(res.data, 'create');
      }
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Save failed. Check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm" onClick={onClose} />
      <div
        data-testid={ADMIN.modal}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-ink-200"
      >
        <div className="sticky top-0 bg-white border-b border-ink-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-heading text-xl font-bold text-ink-900">
            {editing ? 'Edit product' : 'Create new product'}
          </h2>
          <button
            data-testid={ADMIN.modalCancel}
            onClick={onClose}
            className="p-2 -mr-2 text-ink-500 hover:text-ink-900"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input
              data-testid={ADMIN.modalTitle}
              value={form.title}
              onChange={set('title')}
              className="form-input"
              required
            />
          </Field>
          <Field label="SKU" required>
            <input
              data-testid={ADMIN.modalSku}
              value={form.sku}
              onChange={set('sku')}
              className="form-input"
              required
            />
          </Field>

          <Field label="Price (USD)" required>
            <input
              data-testid={ADMIN.modalPrice}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={set('price')}
              className="form-input"
              required
            />
          </Field>
          <Field label="Sale price (USD)" hint="Leave empty for no sale">
            <input
              data-testid={ADMIN.modalSalePrice}
              type="number"
              min="0"
              step="0.01"
              value={form.sale_price}
              onChange={set('sale_price')}
              className="form-input"
            />
          </Field>

          <Field label="Category" required hint="lowercase slug e.g. electronics">
            <input
              data-testid={ADMIN.modalCategory}
              value={form.category}
              onChange={set('category')}
              className="form-input"
              required
            />
          </Field>
          <Field label="Brand">
            <input
              data-testid={ADMIN.modalBrand}
              value={form.brand}
              onChange={set('brand')}
              className="form-input"
            />
          </Field>

          <Field label="Subcategory" className="md:col-span-1">
            <input value={form.subcategory} onChange={set('subcategory')} className="form-input" />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input value={form.tags} onChange={set('tags')} className="form-input" placeholder="wireless, gaming" />
          </Field>

          {/* ===== Fulfillment section (Phase 5B) ===== */}
          <div className="md:col-span-2 mt-2 rounded-lg border border-ink-200 bg-ink-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-700">Fulfillment</p>
              <FulfillmentBadge type={form.fulfillment_type} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Fulfillment type">
                <select
                  data-testid={ADMIN.modalFulfillment}
                  value={form.fulfillment_type}
                  onChange={set('fulfillment_type')}
                  className="form-input"
                >
                  {FULFILLMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              {form.fulfillment_type === 'warehouse' && (
                <>
                  <Field label="Stock quantity" hint="Units on hand">
                    <input
                      data-testid={ADMIN.modalStock}
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_quantity}
                      onChange={set('stock_quantity')}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Reorder point" hint="Low-stock alert threshold">
                    <input
                      data-testid={ADMIN.modalReorderPoint}
                      type="number"
                      min="0"
                      step="1"
                      value={form.reorder_point}
                      onChange={set('reorder_point')}
                      className="form-input"
                    />
                  </Field>
                </>
              )}

              {form.fulfillment_type === 'dropship' && (
                <div className="md:col-span-1 flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span>Stock managed by supplier. Orders route automatically.</span>
                </div>
              )}

              {form.fulfillment_type === 'digital' && (
                <Field label="Download URL" hint="Optional — delivered post-purchase">
                  <input
                    data-testid={ADMIN.modalDownloadUrl}
                    type="url"
                    value={form.download_url}
                    onChange={set('download_url')}
                    placeholder="https://…"
                    className="form-input"
                  />
                </Field>
              )}
            </div>
          </div>

          <Field label="Description" className="md:col-span-2">
            <div className="relative">
              <textarea
                data-testid={ADMIN.modalDescription}
                value={form.description}
                onChange={set('description')}
                rows={4}
                className="form-input pr-2"
              />
              <button
                type="button"
                data-testid="admin-ai-generate-description"
                onClick={generateDescription}
                disabled={generating || !form.title?.trim()}
                className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} /> Generate with AI
                  </>
                )}
              </button>
            </div>
          </Field>

          <Field label="Image URLs" hint="One per line" className="md:col-span-2">
            <textarea
              data-testid={ADMIN.modalImages}
              value={form.images}
              onChange={set('images')}
              rows={3}
              className="form-input font-mono text-xs"
              placeholder="https://…"
            />
          </Field>

          <Field label="Specifications" hint="One per line as key: value" className="md:col-span-2">
            <textarea
              value={form.specs}
              onChange={set('specs')}
              rows={3}
              className="form-input font-mono text-xs"
              placeholder="weight: 1.2kg"
            />
          </Field>

          <label className="md:col-span-2 inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              data-testid={ADMIN.modalFeatured}
              type="checkbox"
              checked={form.featured}
              onChange={set('featured')}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-sm text-ink-700">Feature this product on the homepage</span>
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2 border-t border-ink-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 text-sm font-semibold text-ink-700 border border-ink-300 rounded-md hover:border-ink-500"
            >
              Cancel
            </button>
            <button
              data-testid={ADMIN.modalSave}
              type="submit"
              disabled={submitting}
              className="h-10 px-5 text-sm font-semibold bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white rounded-md"
            >
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, hint, required, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-semibold text-ink-700 uppercase tracking-wider">
      {label} {required && <span className="text-brand">*</span>}
    </span>
    <div className="mt-1.5">{children}</div>
    {hint && <span className="block mt-1 text-xs text-ink-400">{hint}</span>}
  </label>
);

const DeleteConfirm = ({ open, product, onClose, onConfirm, busy }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
        <h3 className="font-heading text-lg font-bold text-ink-900">Delete product?</h3>
        <p className="mt-2 text-sm text-ink-500">
          “{product?.title}” will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            data-testid={ADMIN.confirmCancel}
            onClick={onClose}
            disabled={busy}
            className="h-10 px-4 text-sm font-semibold border border-ink-300 rounded-md hover:border-ink-500"
          >
            Cancel
          </button>
          <button
            data-testid={ADMIN.confirmDelete}
            onClick={onConfirm}
            disabled={busy}
            className="h-10 px-4 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:bg-ink-300 text-white rounded-md"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductsList = () => {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const location = useLocation();

  // Open editor when navigated here with state.editProductId (e.g. from low-stock card)
  useEffect(() => {
    const editId = location.state?.editProductId;
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: prod } = await api.get(`/products/${editId}`);
        if (!cancelled && prod) {
          setEditing(prod);
          setModalOpen(true);
        }
      } catch (_e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [location.state]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 25 };
      if (q.trim()) params.q = q.trim();
      const res = await api.get('/admin/products', { params });
      setData(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { page, page_size: 25 };
        if (q.trim()) params.q = q.trim();
        const res = await api.get('/admin/products', { params });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) toast.error(err?.response?.data?.detail || 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, page]);

  const onSaved = () => { load(); };

  const onDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/admin/products/${deleting.id}`);
      toast.success(`Deleted "${deleting.title}"`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-900">Products</h2>
          <p className="text-sm text-ink-500 mt-0.5">{data.total} total · Page {data.page} of {data.pages}</p>
        </div>
        <div className="flex items-center gap-2">
          <form
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
            <input
              data-testid={ADMIN.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, SKU, brand…"
              className="h-10 pl-9 pr-3 w-72 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </form>
          <button
            data-testid={ADMIN.newProductButton}
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New product
          </button>
        </div>
      </div>

      <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid={ADMIN.productsTable} className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200 text-ink-500 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading && data.items.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="skeleton h-8 w-full rounded" />
                    </td>
                  </tr>
                ))
              )}
              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                    No products match your search.
                  </td>
                </tr>
              )}
              {data.items.map((p) => {
                const onSale = !!p.sale_price && p.sale_price < p.price;
                const stockColor = p.stock_quantity <= 0 ? 'text-red-600' : p.stock_quantity < 10 ? 'text-amber-600' : 'text-emerald-600';
                return (
                  <tr key={p.id} data-testid={ADMIN.productRow} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
                          {p.images?.[0] && (
                            <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900 truncate max-w-xs">{p.title}</p>
                          <p className="text-xs text-ink-500 truncate max-w-xs">{p.brand || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{p.sku}</td>
                    <td className="px-4 py-3 capitalize">{p.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className={onSale ? 'text-red-600 font-semibold' : 'text-ink-900 font-semibold'}>
                          {formatPrice(onSale ? p.sale_price : p.price)}
                        </span>
                        {onSale && <span className="text-xs line-through text-ink-400">{formatPrice(p.price)}</span>}
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${stockColor}`}>{p.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.featured && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-brand/10 text-brand rounded">
                            <Star className="w-3 h-3" strokeWidth={2} /> Featured
                          </span>
                        )}
                        {onSale && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600 rounded">
                            Sale
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          data-testid={ADMIN.editButton}
                          onClick={() => { setEditing(p); setModalOpen(true); }}
                          className="p-2 text-ink-500 hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                          aria-label={`Edit ${p.title}`}
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                        <button
                          data-testid={ADMIN.deleteButton}
                          onClick={() => setDeleting(p)}
                          className="p-2 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          aria-label={`Delete ${p.title}`}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200 bg-ink-50">
            <p className="text-xs text-ink-500">Page {data.page} of {data.pages}</p>
            <div className="inline-flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm font-medium border border-ink-300 rounded-md hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.75} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={data.page >= data.pages}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm font-medium border border-ink-300 rounded-md hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                Next <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductFormModal
        key={modalOpen ? (editing?.id || 'new') : 'closed'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        editing={editing}
      />
      <DeleteConfirm
        open={!!deleting}
        product={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        busy={deleteBusy}
      />
    </>
  );
};

const Overview = ({ stats }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={Package} label="Total products" value={stats.products ?? '—'} />
    <StatCard icon={Users} label="Registered users" value={stats.users ?? '—'} />
    <StatCard icon={AlertTriangle} label="Out of stock" value={stats.out_of_stock ?? '—'} />
    <StatCard icon={Tag} label="On sale" value={stats.on_sale ?? '—'} />
    <StatCard icon={Receipt} label="Total orders" value={stats.total_orders ?? '—'} />
    <StatCard icon={DollarSign} label="Revenue (paid)" value={formatPrice(stats.total_revenue || 0)} />
    <StatCard icon={Mail} label="Subscribers" value={stats.total_subscribers ?? '—'} />
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({});

  useEffect(() => { document.title = 'Admin Dashboard | Abundant Merchandise'; }, []);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/admin/products', icon: ShoppingBag, label: 'Products' },
    { to: '/admin/orders', icon: Receipt, label: 'Orders' },
    { to: '/admin/subscribers', icon: Mail, label: 'Subscribers' },
    { to: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/admin/import', icon: Upload, label: 'Bulk Import' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div data-testid={ADMIN.dashboard} className="bg-ink-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Admin</p>
            <h1 className="mt-1 font-heading text-3xl md:text-4xl font-bold text-ink-900">Control panel</h1>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            Back to store
          </Link>
        </div>

        <div className="mb-8">
          <Overview stats={stats} />
        </div>

        <div className="bg-white border border-ink-200 rounded-xl p-1.5 inline-flex items-center gap-1 mb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md transition-colors ${
                  isActive ? 'bg-brand text-white' : 'text-ink-700 hover:text-brand'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <Routes>
          <Route index element={<AdminOverviewBody stats={stats} />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="subscribers" element={<AdminSubscribers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="import" element={<AdminBulkImport />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="*" element={<ProductsList />} />
        </Routes>
      </div>
    </div>
  );
};

const AdminOverviewBody = ({ stats }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LowStockCard />
      <RestockAlertsCard />
    </div>
    <div className="bg-white border border-ink-200 rounded-xl p-8">
      <h2 className="font-heading text-2xl font-bold text-ink-900">Welcome back, admin.</h2>
      <p className="mt-2 text-ink-500 max-w-2xl">
        Manage your catalog from one place. Create, edit, and delete products — feature them on the homepage,
        adjust pricing, and monitor inventory. Orders and customer management arrive in Phase 2.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 h-10 px-5 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md"
        >
          <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
          Manage products ({stats.products ?? 0})
        </Link>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 h-10 px-5 text-sm font-semibold text-ink-700 border border-ink-300 rounded-md hover:border-brand hover:text-brand"
        >
          View storefront
        </Link>
      </div>
    </div>
  </div>
);

// ---- Phase 5C — Low Stock card ----
const LowStockCard = () => {
  const [data, setData] = useState({ count: 0, items: [], threshold_default: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/inventory/low-stock')
      .then((r) => { if (!cancelled) setData(r.data || { count: 0, items: [] }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const items = data.items || [];
  const count = data.count ?? items.length;

  return (
    <div
      data-testid={ADMIN.lowStockCard}
      className="bg-white border border-ink-200 rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
          <h2 className="font-heading text-lg font-bold text-ink-900">Low Stock</h2>
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
              {count}
            </span>
          )}
        </div>
        <Link
          to="/admin/products"
          className="text-xs font-semibold text-ink-500 hover:text-brand"
        >
          Manage inventory →
        </Link>
      </div>

      {loading ? (
        <div className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          data-testid={ADMIN.lowStockEmpty}
          className="px-6 py-10 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            <span className="text-sm font-semibold">All stocked ✓</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            No warehouse products are at or below their reorder point.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left">
              <tr>
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest">Product</th>
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest">SKU</th>
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest">Qty</th>
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest">Reorder pt</th>
                <th className="px-6 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((it) => (
                <tr key={it.id} data-testid={ADMIN.lowStockRow}>
                  <td className="px-6 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {it.image && (
                        <div className="w-8 h-8 rounded bg-ink-100 overflow-hidden flex-shrink-0">
                          <img src={it.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="font-semibold text-ink-900 truncate max-w-xs">{it.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-2.5 font-mono text-xs text-ink-500" title={it.sku}>
                    {(it.sku || '').length > 18 ? `${it.sku.slice(0, 16)}…` : it.sku}
                  </td>
                  <td className="px-6 py-2.5">
                    <span className={`font-bold ${it.stock_quantity <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                      {it.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 text-ink-700">{it.reorder_point}</td>
                  <td className="px-6 py-2.5 text-right">
                    <Link
                      to="/admin/products"
                      state={{ editProductId: it.id }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.75} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---- Restock alerts card (admin Overview) ----
const RestockAlertsCard = () => {
  const [data, setData] = useState({ items: [], total_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/admin/restock-alerts');
      return r.data || { items: [], total_pending: 0 };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await load();
      if (cancelled) return;
      if (next) setData(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const dispatchNow = async () => {
    if (sending) return;
    setSending(true);
    try {
      const r = await api.post('/admin/restock-alerts/run');
      const { sent = 0, failed = 0, ready = 0 } = r.data || {};
      if (sent > 0) {
        toast.success(`Sent ${sent} restock email${sent === 1 ? '' : 's'}.`);
      } else if (ready === 0) {
        toast.info('No products are back in stock yet — nothing to send.');
      } else if (failed > 0) {
        toast.warning(`${failed} email${failed === 1 ? '' : 's'} skipped (RESEND_API_KEY not configured).`);
      }
      const next = await load();
      if (next) setData(next);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not dispatch alerts.');
    } finally {
      setSending(false);
    }
  };

  const items = data.items || [];

  return (
    <div
      data-testid="admin-restock-alerts-card"
      className="bg-white border border-ink-200 rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand" strokeWidth={1.75} />
          <h2 className="font-heading text-lg font-bold text-ink-900">Restock Waitlist</h2>
          {data.total_pending > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold bg-brand/10 text-brand rounded-full">
              {data.total_pending}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="admin-restock-alerts-send"
          onClick={dispatchNow}
          disabled={sending || data.total_pending === 0}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-600 disabled:text-ink-400 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" strokeWidth={2} />}
          {sending ? 'Sending…' : 'Send ready alerts'}
        </button>
      </div>

      {loading ? (
        <div className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div data-testid="admin-restock-alerts-empty" className="px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink-50 border border-ink-200 text-ink-600">
            <Bell className="w-4 h-4" strokeWidth={2} />
            <span className="text-sm font-semibold">No one waiting</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Customers can subscribe to restock alerts from any out-of-stock product page.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {items.slice(0, 5).map((it) => (
            <li
              key={it.product_id}
              data-testid="admin-restock-alerts-row"
              className="flex items-center justify-between px-6 py-3 hover:bg-ink-50/60"
            >
              <span className="font-semibold text-sm text-ink-900 truncate flex-1 mr-3">
                {it.product_title}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand whitespace-nowrap">
                <Users className="w-3.5 h-3.5" strokeWidth={2} /> {it.subscribers}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================ Admin tabs: subscribers, messages, orders ============================
const AdminTable = ({ title, columns, rows, empty, testid, onRowClick, footer }) => (
  <div data-testid={testid} className="bg-white border border-ink-200 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
      <h2 className="font-heading text-lg font-bold text-ink-900">{title} <span className="text-ink-400 font-normal text-sm">({rows.length})</span></h2>
    </div>
    {rows.length === 0 ? (
      <div className="py-12 text-center text-sm text-ink-500">{empty}</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-ink-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r, idx) => (
              <tr
                key={idx}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`hover:bg-ink-50/50 ${onRowClick ? 'cursor-pointer hover:bg-ink-50' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-6 py-3 text-ink-900 align-top">{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {footer && (
      <div className="px-6 py-3 border-t border-ink-200 bg-ink-50">{footer}</div>
    )}
  </div>
);

const AdminSubscribers = () => {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/admin/newsletter-subscribers').then((r) => setRows(r.data || [])).catch(() => {}); }, []);
  return (
    <AdminTable
      title="Newsletter subscribers"
      testid="admin-subscribers-table"
      empty="No subscribers yet."
      columns={[
        { key: 'email', label: 'Email' },
        { key: 'source', label: 'Source' },
        { key: 'created_at', label: 'Subscribed', render: (r) => new Date(r.created_at).toLocaleString() },
      ]}
      rows={rows}
    />
  );
};

const AdminMessages = () => {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { api.get('/admin/contact-messages').then((r) => setRows(r.data || [])).catch(() => {}); }, []);
  return (
    <>
      <AdminTable
        title="Contact messages"
        testid="admin-messages-table"
        empty="No messages yet."
        onRowClick={setSelected}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'subject', label: 'Subject', render: (r) => r.subject || <span className="text-ink-400">—</span> },
          { key: 'message', label: 'Message', render: (r) => <span className="line-clamp-2 max-w-md">{r.message}</span> },
          { key: 'created_at', label: 'Received', render: (r) => new Date(r.created_at).toLocaleString() },
        ]}
        rows={rows}
      />
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" data-testid="admin-message-sheet">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-ink-200">
                <SheetTitle className="text-ink-900 font-heading text-left">
                  {selected.subject || '(No subject)'}
                </SheetTitle>
                <SheetDescription className="text-ink-500 text-sm text-left">
                  From: <span className="font-semibold text-ink-700">{selected.name}</span>
                  {' '}·{' '}
                  <a href={`mailto:${selected.email}`} className="text-brand hover:underline">{selected.email}</a>
                  <br />
                  {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap" data-testid="admin-message-body">
                  {selected.message}
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-ink-200">
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-md transition-colors"
                  data-testid="admin-message-reply"
                >
                  Reply via email
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid / Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const OrderStatusModal = ({ order, onClose, onSaved }) => {
  const [status, setStatus] = useState(order.status || 'pending');
  const [carrier, setCarrier] = useState(order.tracking_carrier || '');
  const [code, setCode] = useState(order.tracking_code || '');
  const [eta, setEta] = useState(order.eta || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { status };
      if (note) payload.note = note;
      if (carrier) payload.tracking_carrier = carrier;
      if (code) payload.tracking_code = code;
      if (eta) payload.eta = eta;
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, payload);
      toast.success(`Order ${data.order_number} → ${data.status}`);
      onSaved(data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="admin-order-status-modal" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Update status</p>
            <p className="font-heading text-lg font-bold text-ink-900 mt-0.5">#{order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink-100 rounded-md text-ink-600" data-testid="admin-order-status-close">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Phase 5D — Line items with fulfillment badges */}
        {(order.items?.length || 0) > 0 && (
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Line items</p>
              <div className="flex items-center gap-1.5">
                {order.has_warehouse && <FulfillmentBadge type="warehouse" />}
                {order.has_dropship && <FulfillmentBadge type="dropship" />}
              </div>
            </div>
            <div className="rounded-lg border border-ink-200 divide-y divide-ink-100">
              {order.items.map((it, idx) => (
                <div
                  key={idx}
                  data-testid={ADMIN.orderLineItem}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="w-10 h-10 rounded bg-ink-100 overflow-hidden flex-shrink-0">
                    {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{it.title}</p>
                    <p className="text-xs text-ink-500">Qty {it.qty} · {formatPrice(it.unit_price)}</p>
                  </div>
                  <FulfillmentBadge
                    type={it.fulfillment_type}
                    testid={ADMIN.orderFulfillmentBadge}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Status</label>
            <select
              data-testid="admin-order-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Carrier</label>
              <input data-testid="admin-order-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="UPS, USPS, FedEx" className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Tracking code</label>
              <input data-testid="admin-order-tracking-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1Z..." className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">ETA (date)</label>
            <input data-testid="admin-order-eta" type="date" value={eta} onChange={(e) => setEta(e.target.value)} className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Note (optional)</label>
            <textarea data-testid="admin-order-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Default note will be used if blank" className="w-full px-3 py-2 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-ink-100">
          <button onClick={onClose} className="h-10 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-100 rounded-md transition-colors">Cancel</button>
          <button data-testid="admin-order-status-save" disabled={saving} onClick={save} className="h-10 px-4 inline-flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const PAGE_SIZE = 20;

  const reload = useCallback(() => {
    api.get('/admin/orders', { params: { page, page_size: PAGE_SIZE } })
      .then((r) => {
        setRows(r.data?.items || []);
        setTotal(r.data?.total || 0);
        setPages(r.data?.pages || 1);
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <>
      <p className="text-sm text-ink-500 mb-3" data-testid="admin-orders-total">{total} total orders</p>
      <AdminTable
        title="All orders"
        testid="admin-orders-table"
        empty="No orders yet."
        columns={[
          { key: 'order_number', label: 'Order #', render: (r) => <span className="font-mono text-xs font-semibold">{r.order_number}</span> },
          { key: 'email', label: 'Customer' },
          { key: 'total', label: 'Total', render: (r) => formatPrice(r.total) },
          { key: 'fulfillment', label: 'Fulfillment', render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.has_warehouse && <FulfillmentBadge type="warehouse" />}
              {r.has_dropship && <FulfillmentBadge type="dropship" />}
              {!r.has_warehouse && !r.has_dropship && <span className="text-xs text-ink-400">—</span>}
            </div>
          ) },
          { key: 'status', label: 'Status', render: (r) => (
            <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${STATUS_STYLES[r.status] || 'bg-ink-100 text-ink-700'}`}>
              {r.status.replace(/_/g, ' ')}
            </span>
          ) },
          { key: 'created_at', label: 'Placed', render: (r) => new Date(r.created_at).toLocaleString() },
          { key: 'actions', label: '', render: (r) => (
            <button
              data-testid={`admin-order-update-${r.order_number}`}
              onClick={(e) => { e.stopPropagation(); setEditing(r); }}
              className="text-xs font-semibold text-brand hover:text-brand-600 inline-flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /> Update
            </button>
          ) },
        ]}
        rows={rows}
      />
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-ink-200" data-testid="admin-orders-pagination">
          <button
            data-testid="admin-orders-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-9 px-3 text-sm font-semibold border border-ink-300 rounded-md disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-ink-700">Page {page} of {pages}</span>
          <button
            data-testid="admin-orders-next"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="h-9 px-3 text-sm font-semibold border border-ink-300 rounded-md disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
          >
            Next →
          </button>
        </div>
      )}
      {editing && (
        <OrderStatusModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }}
        />
      )}
    </>
  );
};

// ============================ Bulk CSV Import ============================
const AdminBulkImport = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError('');
    const input = document.getElementById('admin-import-file');
    if (input) input.value = '';
  };

  const upload = async (dry_run) => {
    if (!file) {
      toast.error('Please choose a CSV file first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('dry_run', dry_run ? 'true' : 'false');
      const { data } = await api.post('/admin/products/bulk-import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      if (!dry_run) {
        toast.success(`Imported ${data.new_count} new, updated ${data.updated_count} existing products`);
      } else {
        toast.success(`Preview ready — ${data.format} format detected`);
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="admin-bulk-import" className="space-y-6">
      <div className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-ink-900">Bulk import from CSV</h2>
            <p className="mt-1 text-sm text-ink-500 max-w-2xl">
              Upload a <span className="font-semibold text-ink-700">Shopify</span> (with <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">Handle</code>) or
              <span className="font-semibold text-ink-700"> WooCommerce</span> (with <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">Slug</code>) export.
              Run a dry-run preview first, then commit. Matching is by SKU — existing products update in place.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-stretch">
          <label
            htmlFor="admin-import-file"
            className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-ink-300 rounded-md cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
          >
            <Upload className="w-5 h-5 text-ink-500" strokeWidth={1.75} />
            <span className="text-sm text-ink-700 truncate">
              {file ? file.name : 'Choose a .csv file to upload'}
            </span>
            <input
              id="admin-import-file"
              data-testid="admin-import-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setError('');
              }}
            />
          </label>
          {file && (
            <button
              data-testid="admin-import-clear"
              onClick={reset}
              className="h-11 px-4 text-sm font-semibold text-ink-700 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            data-testid="admin-import-preview-btn"
            onClick={() => upload(true)}
            disabled={!file || busy}
            className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" strokeWidth={1.75} />
            {busy && !preview ? 'Analyzing…' : 'Preview (dry run)'}
          </button>
          <button
            data-testid="admin-import-commit-btn"
            onClick={() => upload(false)}
            disabled={!file || busy || !preview}
            className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
            {busy && preview ? 'Importing…' : 'Commit import'}
          </button>
          {preview && !preview.dry_run && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> Committed
            </span>
          )}
        </div>

        {error && (
          <div data-testid="admin-import-error" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {preview && (
        <div data-testid="admin-import-preview" className="bg-white border border-ink-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-ink-200">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
              {preview.dry_run ? 'Dry run preview' : 'Import result'} · {preview.format}
            </p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <PreviewStat label="Rows in file" value={preview.total_rows} />
              <PreviewStat label="New" value={preview.new_count} tone="emerald" />
              <PreviewStat label="Updates" value={preview.updated_count} tone="amber" />
              <PreviewStat label="Skipped" value={preview.skipped_count} tone="ink" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">SKU</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Title</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Brand</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Price</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {preview.samples.map((s, i) => (
                  <tr key={i} data-testid={`admin-import-sample-${i}`}>
                    <td className="px-6 py-3 font-mono text-xs">{s.sku}</td>
                    <td className="px-6 py-3 font-semibold text-ink-900">{s.title}</td>
                    <td className="px-6 py-3 text-ink-700">{s.brand || '—'}</td>
                    <td className="px-6 py-3 text-ink-700">{formatPrice(s.price)}</td>
                    <td className="px-6 py-3">
                      {s.is_new ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-emerald-100 text-emerald-800">New</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-amber-100 text-amber-800">Update</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-ink-50 text-xs text-ink-500">
            Showing first {preview.samples.length} of {preview.new_count + preview.updated_count} products
          </div>
        </div>
      )}

      <ImageBundleCard />
    </div>
  );
};

// ---- Image bundle (.zip) upload ----
const ImageBundleCard = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('append');
  const [error, setError] = useState('');

  const upload = async (dry_run) => {
    if (!file) {
      toast.error('Please choose a .zip file first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('dry_run', dry_run ? 'true' : 'false');
      form.append('mode', mode);
      const { data } = await api.post('/admin/products/bulk-import-images', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      if (!dry_run) {
        toast.success(`Imported ${data.matched_files} images across ${data.matched_skus} products (${mode})`);
      } else {
        toast.success(`Preview: ${data.matched_files} images match ${data.matched_skus} products`);
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Image upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError('');
    const input = document.getElementById('admin-image-file');
    if (input) input.value = '';
  };

  return (
    <div data-testid="admin-image-import" className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-bold text-ink-900">Bulk upload product images (.zip)</h2>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Drop a zip of <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">.jpg</code> /
            <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">.png</code> /
            <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">.webp</code> files. Each file is
            matched to a product by SKU — either filename without extension
            (<code className="px-1 py-0.5 text-xs bg-ink-100 rounded">SHP-001.jpg</code>,
            <code className="px-1 py-0.5 text-xs bg-ink-100 rounded">SHP-001_2.jpg</code>) or a folder
            named after the SKU. Images stream from Mongo with long-lived browser caching.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-stretch">
        <label
          htmlFor="admin-image-file"
          className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-ink-300 rounded-md cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
        >
          <FileArchive className="w-5 h-5 text-ink-500" strokeWidth={1.75} />
          <span className="text-sm text-ink-700 truncate">
            {file ? file.name : 'Choose a .zip of product images'}
          </span>
          <input
            id="admin-image-file"
            data-testid="admin-image-file"
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              setError('');
            }}
          />
        </label>
        {file && (
          <button
            data-testid="admin-image-clear"
            onClick={reset}
            className="h-11 px-4 text-sm font-semibold text-ink-700 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Mode</span>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="image-mode"
            value="append"
            checked={mode === 'append'}
            onChange={() => setMode('append')}
            data-testid="admin-image-mode-append"
            className="accent-brand"
          />
          <span className="text-ink-700"><strong>Append</strong> to existing images</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="image-mode"
            value="replace"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
            data-testid="admin-image-mode-replace"
            className="accent-brand"
          />
          <span className="text-ink-700"><strong>Replace</strong> product images entirely</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          data-testid="admin-image-preview-btn"
          onClick={() => upload(true)}
          disabled={!file || busy}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" strokeWidth={1.75} />
          {busy && !preview ? 'Analyzing…' : 'Preview matches'}
        </button>
        <button
          data-testid="admin-image-commit-btn"
          onClick={() => upload(false)}
          disabled={!file || busy || !preview}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
          {busy && preview ? 'Uploading…' : 'Commit upload'}
        </button>
      </div>

      {error && (
        <div data-testid="admin-image-error" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div data-testid="admin-image-preview" className="mt-6 border-t border-ink-200 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PreviewStat label="Images in zip" value={preview.image_files} />
            <PreviewStat label="Matched" value={preview.matched_files} tone="emerald" />
            <PreviewStat label="Products" value={preview.matched_skus} tone="brand" />
            <PreviewStat label="Unmatched" value={preview.skipped_files} tone="ink" />
          </div>

          {preview.samples.length > 0 && (
            <div className="mt-5 overflow-x-auto border border-ink-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">SKU</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500"># files</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Files matched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {preview.samples.map((s, i) => (
                    <tr key={i} data-testid={`admin-image-sample-${i}`}>
                      <td className="px-4 py-2 font-mono text-xs">{s.sku}</td>
                      <td className="px-4 py-2 font-semibold">{s.file_count}</td>
                      <td className="px-4 py-2 text-ink-700 text-xs font-mono truncate max-w-md">
                        {s.files.join(', ')}{s.file_count > s.files.length ? ', …' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.missed_files.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs">
              <p className="font-bold text-amber-900 mb-1">{preview.missed_files.length} files had no matching SKU:</p>
              <p className="text-amber-800 font-mono">{preview.missed_files.slice(0, 5).join(', ')}{preview.missed_files.length > 5 ? `, +${preview.missed_files.length - 5} more` : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PreviewStat = ({ label, value, tone = 'brand' }) => {
  const toneClass = {
    brand: 'bg-brand/10 text-brand',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    ink: 'bg-ink-100 text-ink-700',
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
    </div>
  );
};

export default AdminDashboard;
