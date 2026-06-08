import React, { useEffect, useMemo, useState } from 'react';
import { api, formatPrice } from '@/lib/api';
import {
  Eye, ShoppingCart, Target, TrendingUp, TrendingDown, BarChart3, Mail, Send, Clock, MailCheck, PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

const pct = (v) => `${(v * 100).toFixed(1)}%`;

// ---- Inline SVG sparkline (no chart lib) ----
const Sparkline = ({ data = [], width = 80, height = 24, color = '#E8621A' }) => {
  if (!data.length) return <div className="text-ink-300 text-xs">—</div>;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  const last = data[data.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 0 && (
        <circle cx={(data.length - 1) * step} cy={height - (last / max) * height} r="2" fill={color} />
      )}
    </svg>
  );
};

const MetricCard = ({ icon: Icon, label, value, hint }) => (
  <div className="bg-white border border-ink-200 rounded-xl p-5">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{label}</p>
      <div className="w-8 h-8 rounded-md bg-brand/10 text-brand flex items-center justify-center">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
    </div>
    <p className="mt-2 font-heading text-2xl md:text-3xl font-bold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
  </div>
);

const ProductRow = ({ row, onClick }) => (
  <div
    onClick={() => onClick(row)}
    className="flex items-center gap-3 p-3 rounded-md hover:bg-ink-50 cursor-pointer transition-colors"
    data-testid={`analytics-mini-row-${row.id}`}
  >
    <div className="w-10 h-10 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
      {row.images?.[0] && <img src={row.images[0]} alt="" className="w-full h-full object-cover" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-ink-900 truncate">{row.title}</p>
      <p className="text-xs text-ink-500">{row.brand || '—'}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-ink-900">{row.views}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink-500">views</p>
    </div>
    <Sparkline data={row.sparkline} width={60} height={20} />
  </div>
);

const SORT_OPTIONS = [
  { value: 'views', label: 'Views' },
  { value: 'cart_adds', label: 'Cart adds' },
  { value: 'sold', label: 'Units sold' },
  { value: 'conversion', label: 'Conversion rate' },
  { value: 'sell_through', label: 'Sell-through' },
  { value: 'title', label: 'Title (A-Z)' },
];

const ProductDetailDrawer = ({ productId, window, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/admin/analytics/products/${productId}`, { params: { window } });
        if (!cancelled) setData(r.data);
      } catch {
        if (!cancelled) toast.error('Failed to load product analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, window]);

  return (
    <Sheet open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" data-testid="analytics-product-drawer">
        <SheetHeader>
          <SheetTitle className="font-heading">Product analytics</SheetTitle>
          <SheetDescription>30-day breakdown of views, cart adds, and sales.</SheetDescription>
        </SheetHeader>
        {loading && <div className="p-6 text-sm text-ink-500">Loading…</div>}
        {data && (
          <div className="mt-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
                {data.product.images?.[0] && <img src={data.product.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900 truncate" data-testid="drawer-product-title">{data.product.title}</p>
                <p className="text-xs text-ink-500">{data.product.brand} · <span className="font-mono">{data.product.sku}</span></p>
                <p className="text-sm font-bold text-brand mt-0.5">{formatPrice(data.product.price)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={Eye} label="Views" value={data.metrics.views} />
              <MetricCard icon={ShoppingCart} label="Cart adds" value={data.metrics.cart_adds} />
              <MetricCard icon={Target} label="Units sold" value={data.metrics.units_sold} />
              <MetricCard icon={TrendingUp} label="Conversion" value={pct(data.metrics.conversion_rate)} hint="cart adds / views" />
            </div>

            <div className="p-4 border border-ink-200 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-2">Sell-through</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, data.metrics.sell_through * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-ink-900">{pct(data.metrics.sell_through)}</span>
              </div>
              <p className="text-xs text-ink-500 mt-2">
                {data.metrics.units_sold} sold / {data.product.stock_quantity} in stock
              </p>
            </div>

            <div className="p-4 border border-ink-200 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-3">30-day views</p>
              <Sparkline data={data.daily_views} width={460} height={48} />
              <p className="text-[10px] uppercase tracking-widest text-ink-500 mt-4 mb-2 font-bold">30-day cart adds</p>
              <Sparkline data={data.daily_cart_adds} width={460} height={48} color="#10b981" />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const AdminAnalytics = () => {
  const [window, setWindow] = useState('all'); // 'all' | '30d'
  const [overview, setOverview] = useState(null);
  const [table, setTable] = useState({ items: [], total: 0, pages: 1 });
  const [sort, setSort] = useState('views');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);

  useEffect(() => { document.title = 'Analytics | Admin'; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOverview(true);
      try {
        const r = await api.get('/admin/analytics/overview', { params: { window } });
        if (!cancelled) setOverview(r.data);
      } catch {
        if (!cancelled) toast.error('Failed to load overview');
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    })();
    return () => { cancelled = true; };
  }, [window]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTable(true);
      try {
        const r = await api.get('/admin/analytics/products', {
          params: { window, sort, page, page_size: 25, q: q.trim() || undefined },
        });
        if (!cancelled) setTable(r.data);
      } catch {
        if (!cancelled) toast.error('Failed to load analytics table');
      } finally {
        if (!cancelled) setLoadingTable(false);
      }
    })();
    return () => { cancelled = true; };
  }, [window, sort, page, q]);

  const trafficShare = useMemo(() => {
    if (!overview?.totals?.views) return '0%';
    const share = overview.totals.products_with_traffic;
    return `${share} products`;
  }, [overview]);

  return (
    <div data-testid="admin-analytics" className="space-y-6">
      {/* Header + window toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Performance</p>
          <h2 className="font-heading text-2xl font-bold text-ink-900">Product analytics</h2>
        </div>
        <div className="inline-flex items-center gap-1 bg-white border border-ink-200 rounded-md p-1">
          {[
            { v: 'all', label: 'All-time' },
            { v: '30d', label: 'Last 30 days' },
          ].map((w) => (
            <button
              key={w.v}
              data-testid={`analytics-window-${w.v}`}
              onClick={() => { setWindow(w.v); setPage(1); }}
              className={`h-8 px-3 text-xs font-semibold rounded transition-colors ${
                window === w.v ? 'bg-brand text-white' : 'text-ink-700 hover:text-brand'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="analytics-totals">
          <MetricCard icon={Eye} label="Total views" value={overview.totals.views.toLocaleString()} />
          <MetricCard icon={ShoppingCart} label="Cart adds" value={overview.totals.cart_adds.toLocaleString()} />
          <MetricCard icon={Target} label="Units sold" value={overview.totals.units_sold.toLocaleString()} />
          <MetricCard icon={BarChart3} label="Products with traffic" value={trafficShare} />
        </div>
      )}

      {/* Winners + underperformers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-200 rounded-xl overflow-hidden" data-testid="analytics-winners">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 bg-emerald-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-700" strokeWidth={1.75} />
              <h3 className="font-heading font-bold text-emerald-900">Top winners</h3>
            </div>
            <span className="text-xs text-emerald-800 font-semibold">by sales · then cart adds</span>
          </div>
          <div className="divide-y divide-ink-100">
            {(overview?.winners || []).length === 0 ? (
              <p className="p-6 text-sm text-ink-500">{loadingOverview ? 'Loading…' : 'No data yet.'}</p>
            ) : (
              overview.winners.map((w) => <ProductRow key={w.id} row={w} onClick={(r) => setDrawerId(r.id)} />)
            )}
          </div>
        </div>

        <div className="bg-white border border-ink-200 rounded-xl overflow-hidden" data-testid="analytics-underperformers">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 bg-amber-50">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
              <h3 className="font-heading font-bold text-amber-900">Underperformers</h3>
            </div>
            <span className="text-xs text-amber-800 font-semibold">5+ views · 0 conversions</span>
          </div>
          <div className="divide-y divide-ink-100">
            {(overview?.underperformers || []).length === 0 ? (
              <p className="p-6 text-sm text-ink-500">
                {loadingOverview ? 'Loading…' : 'None — every viewed product converted at least once.'}
              </p>
            ) : (
              overview.underperformers.map((u) => <ProductRow key={u.id} row={u} onClick={(r) => setDrawerId(r.id)} />)
            )}
          </div>
        </div>
      </div>

      {/* Daily digest settings */}
      <DigestSettingsCard />

      {/* Abandoned-cart recovery settings */}
      <CartRecoveryCard />

      {/* Recovery performance */}
      <RecoveryPerformanceCard window={window} />

      {/* Full table */}
      <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-ink-200">
          <h3 className="font-heading font-bold text-ink-900">All products · {table.total}</h3>
          <div className="flex items-center gap-2">
            <input
              data-testid="analytics-search"
              type="search"
              placeholder="Search title, brand, SKU…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="h-9 px-3 text-sm bg-white border border-ink-300 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            <select
              data-testid="analytics-sort"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="h-9 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort by: {o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Product</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Views</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Cart adds</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Sold</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Conv</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Sell-through</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">14d views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loadingTable && table.items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-500">Loading…</td></tr>
              )}
              {!loadingTable && table.items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-500">No products match.</td></tr>
              )}
              {table.items.map((r) => (
                <tr
                  key={r.id}
                  data-testid={`analytics-row-${r.id}`}
                  onClick={() => setDrawerId(r.id)}
                  className="hover:bg-ink-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-ink-100 overflow-hidden flex-shrink-0">
                        {r.images?.[0] && <img src={r.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900 truncate max-w-[220px]">{r.title}</p>
                        <p className="text-xs text-ink-500 font-mono">{r.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.views}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.cart_adds}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.units_sold}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={r.conversion_rate >= 0.2 ? 'text-emerald-700 font-bold' : 'text-ink-700'}>
                      {pct(r.conversion_rate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{pct(r.sell_through)}</td>
                  <td className="px-4 py-3"><Sparkline data={r.sparkline} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {table.pages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-ink-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-9 px-3 text-sm font-semibold border border-ink-300 rounded-md disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
              data-testid="analytics-prev"
            >
              ← Prev
            </button>
            <span className="text-sm text-ink-700">Page {page} of {table.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(table.pages, p + 1))}
              disabled={page >= table.pages}
              className="h-9 px-3 text-sm font-semibold border border-ink-300 rounded-md disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
              data-testid="analytics-next"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <ProductDetailDrawer productId={drawerId} window={window} onClose={() => setDrawerId(null)} />
    </div>
  );
};


// ---- Daily digest settings ----
const DigestSettingsCard = () => {
  const [settings, setSettings] = useState(null);
  const [recipientsInput, setRecipientsInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/admin/analytics/digest/settings');
        if (cancelled) return;
        setSettings(r.data);
        setRecipientsInput((r.data?.recipients || []).join(', '));
      } catch {
        if (!cancelled) toast.error('Failed to load digest settings');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!settings) return;
    const recipients = recipientsInput
      .split(/[,\s\n]+/).map((s) => s.trim()).filter(Boolean);
    setSavingSettings(true);
    try {
      const r = await api.put('/admin/analytics/digest/settings', {
        enabled: settings.enabled,
        hour_utc: settings.hour_utc,
        recipients,
      });
      setSettings(r.data);
      setRecipientsInput((r.data.recipients || []).join(', '));
      toast.success(settings.enabled ? 'Daily digest enabled' : 'Settings saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const r = await api.post('/admin/analytics/digest/send?test=true');
      if (r.data.sent) {
        toast.success(`Digest sent to ${r.data.recipients.join(', ')}`);
      } else {
        toast.error(`Skipped: ${r.data.skipped_reason || 'unknown'}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send digest');
    } finally {
      setSending(false);
    }
  };

  if (!settings) {
    return (
      <div className="bg-white border border-ink-200 rounded-xl p-6 text-sm text-ink-500">
        Loading digest settings…
      </div>
    );
  }

  return (
    <div data-testid="digest-settings" className="bg-white border border-ink-200 rounded-xl p-6 md:p-7">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-heading text-lg font-bold text-ink-900">Daily email digest</h3>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-ink-700">
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                role="switch"
                aria-checked={settings.enabled}
                data-testid="digest-toggle"
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-brand' : 'bg-ink-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Once a day at your chosen UTC hour, recipients receive a summary of yesterday&rsquo;s
            views, cart adds, orders, revenue, and top performers + underperformers.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
            Recipients (comma or newline separated)
          </label>
          <input
            data-testid="digest-recipients"
            type="text"
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            placeholder="ops@example.com, founder@example.com"
            className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <p className="mt-1 text-xs text-ink-500">Leave blank to send to all admin accounts.</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
            <Clock className="w-3 h-3 inline mr-1" strokeWidth={2} /> Hour (UTC)
          </label>
          <input
            data-testid="digest-hour"
            type="number"
            min={0}
            max={23}
            value={settings.hour_utc}
            onChange={(e) => setSettings({ ...settings, hour_utc: Number(e.target.value) || 0 })}
            className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          data-testid="digest-save"
          onClick={save}
          disabled={savingSettings}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md transition-colors disabled:opacity-60"
        >
          {savingSettings ? 'Saving…' : 'Save settings'}
        </button>
        <button
          data-testid="digest-send-now"
          onClick={sendNow}
          disabled={sending}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors disabled:opacity-60"
        >
          <Send className="w-4 h-4" strokeWidth={1.75} />
          {sending ? 'Sending…' : 'Send test now'}
        </button>
        {settings.last_sent_date && (
          <span className="text-xs text-ink-500 ml-2">
            Last sent: <span className="font-semibold text-ink-700">{settings.last_sent_date}</span>
          </span>
        )}
      </div>
    </div>
  );
};


// ---- Abandoned-cart recovery settings ----
const PROMO_OPTIONS = [
  { value: '', label: 'No promo' },
  { value: 'WELCOME10', label: 'WELCOME10 — 10% off' },
  { value: 'FREESHIP', label: 'FREESHIP — Free shipping' },
  { value: 'SAVE20', label: 'SAVE20 — $20 off $100+' },
];

const CartRecoveryCard = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/admin/cart-recovery/settings');
        if (!cancelled) setSettings(r.data);
      } catch {
        if (!cancelled) toast.error('Failed to load cart-recovery settings');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await api.put('/admin/cart-recovery/settings', {
        enabled: settings.enabled,
        delay_hours: settings.delay_hours,
        cooldown_days: settings.cooldown_days,
        promo_code: settings.promo_code || null,
      });
      setSettings(r.data);
      toast.success(r.data.enabled ? 'Cart recovery enabled' : 'Settings saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (dryRun) => {
    setRunning(true);
    try {
      const r = await api.post(`/admin/cart-recovery/run-now?dry_run=${dryRun}`);
      setPreview(r.data);
      if (dryRun) {
        toast.success(`${r.data.candidates} candidate${r.data.candidates === 1 ? '' : 's'} found`);
      } else {
        toast.success(`Sent ${r.data.sent} of ${r.data.candidates} recovery email${r.data.candidates === 1 ? '' : 's'}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  if (!settings) {
    return (
      <div className="bg-white border border-ink-200 rounded-xl p-6 text-sm text-ink-500">
        Loading cart-recovery settings…
      </div>
    );
  }

  return (
    <div data-testid="cart-recovery-settings" className="bg-white border border-ink-200 rounded-xl p-6 md:p-7">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
          <MailCheck className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-heading text-lg font-bold text-ink-900">Abandoned-cart recovery</h3>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-ink-700">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
              <button
                role="switch"
                aria-checked={settings.enabled}
                data-testid="cart-recovery-toggle"
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-brand' : 'bg-ink-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            When an authenticated shopper adds to cart but doesn&rsquo;t check out within your delay window,
            we send them a gentle reminder with their cart preview &mdash; optionally with a promo code.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
            <Clock className="w-3 h-3 inline mr-1" strokeWidth={2} /> Delay (hours)
          </label>
          <input
            data-testid="cart-recovery-delay"
            type="number"
            min={1}
            max={72}
            value={settings.delay_hours}
            onChange={(e) => setSettings({ ...settings, delay_hours: Number(e.target.value) || 1 })}
            className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <p className="mt-1 text-xs text-ink-500">Send N hours after last cart add (1–72)</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
            Cooldown (days)
          </label>
          <input
            data-testid="cart-recovery-cooldown"
            type="number"
            min={1}
            max={30}
            value={settings.cooldown_days}
            onChange={(e) => setSettings({ ...settings, cooldown_days: Number(e.target.value) || 1 })}
            className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <p className="mt-1 text-xs text-ink-500">Min days between emails per user (1–30)</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
            Promo code
          </label>
          <select
            data-testid="cart-recovery-promo"
            value={settings.promo_code || ''}
            onChange={(e) => setSettings({ ...settings, promo_code: e.target.value || null })}
            className="w-full h-10 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            {PROMO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-ink-500">Auto-applied incentive (optional)</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          data-testid="cart-recovery-save"
          onClick={save}
          disabled={saving}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold bg-brand hover:bg-brand-600 text-white rounded-md transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <button
          data-testid="cart-recovery-dryrun"
          onClick={() => runNow(true)}
          disabled={running}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors disabled:opacity-60"
        >
          <PlayCircle className="w-4 h-4" strokeWidth={1.75} />
          {running ? 'Checking…' : 'Preview candidates'}
        </button>
        <button
          data-testid="cart-recovery-run"
          onClick={() => runNow(false)}
          disabled={running}
          className="h-10 px-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 border border-ink-300 rounded-md hover:border-brand hover:text-brand transition-colors disabled:opacity-60"
        >
          <Send className="w-4 h-4" strokeWidth={1.75} />
          {running ? 'Running…' : 'Run now'}
        </button>
      </div>

      {preview && (
        <div data-testid="cart-recovery-preview" className="mt-5 border-t border-ink-200 pt-5">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-ink-900">
              {preview.dry_run ? 'Dry-run preview' : 'Last run'}:
            </span>
            <span className="text-ink-700">
              {preview.candidates} candidate{preview.candidates === 1 ? '' : 's'}
              {!preview.dry_run && ` · ${preview.sent} sent`}
            </span>
          </div>
          {preview.candidates_preview.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              No abandoned carts match right now. Once shoppers add items and don&rsquo;t check out within
              your {settings.delay_hours}h window, they&rsquo;ll appear here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto border border-ink-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Recipient</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Items</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Last cart add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {preview.candidates_preview.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-semibold text-ink-900">{c.email}{c.name ? ` · ${c.name}` : ''}</td>
                      <td className="px-4 py-2 text-right">{c.products}</td>
                      <td className="px-4 py-2 text-xs text-ink-500">{new Date(c.last_cart_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ---- Recovery email performance (sent / clicked / converted / revenue) ----
const RecoveryPerformanceCard = ({ window: timeWindow }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/admin/analytics/recovery', { params: { window: timeWindow } });
        if (!cancelled) setData(r.data);
      } catch {
        if (!cancelled) toast.error('Failed to load recovery metrics');
      }
    })();
    return () => { cancelled = true; };
  }, [timeWindow]);

  if (!data) {
    return (
      <div className="bg-white border border-ink-200 rounded-xl p-6 text-sm text-ink-500">
        Loading recovery performance…
      </div>
    );
  }

  return (
    <div data-testid="recovery-performance" className="bg-white border border-ink-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Recovery performance</p>
          <h3 className="font-heading font-bold text-ink-900">Email attribution &amp; revenue recovered</h3>
        </div>
        <span className="text-xs text-ink-500">{timeWindow === '30d' ? 'Last 30 days' : 'All-time'}</span>
      </div>

      <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard icon={Send} label="Sent" value={data.sent} />
        <MetricCard icon={MailCheck} label="Clicked" value={data.clicked} hint={pct(data.click_rate)} />
        <MetricCard icon={Target} label="Converted" value={data.converted} hint={pct(data.conversion_rate)} />
        <MetricCard icon={TrendingUp} label="Revenue recovered" value={formatPrice(data.revenue)} />
        <MetricCard icon={BarChart3} label="Avg order" value={data.converted ? formatPrice(data.revenue / data.converted) : '—'} />
      </div>

      {data.recent.length > 0 && (
        <div className="overflow-x-auto border-t border-ink-200">
          <table className="min-w-full text-sm">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Recipient</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Sent</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Status</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-ink-500">Revenue</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-ink-500">Promo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.recent.map((row) => {
                let statusLabel = 'Sent';
                let statusColor = 'bg-ink-100 text-ink-700';
                if (row.converted_at) { statusLabel = 'Converted'; statusColor = 'bg-emerald-100 text-emerald-800'; }
                else if (row.clicked_at) { statusLabel = 'Clicked'; statusColor = 'bg-blue-100 text-blue-800'; }
                return (
                  <tr key={row.id} data-testid={`recovery-row-${row.id}`}>
                    <td className="px-4 py-2 font-semibold text-ink-900 truncate max-w-[220px]">{row.email}</td>
                    <td className="px-4 py-2 text-xs text-ink-500">{new Date(row.sent_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {row.revenue > 0 ? formatPrice(row.revenue) : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-700 font-mono">{row.promo_code || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data.recent.length === 0 && (
        <p className="p-6 text-sm text-ink-500">No recovery emails sent yet.</p>
      )}
    </div>
  );
};

export default AdminAnalytics;
