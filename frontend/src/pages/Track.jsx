import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle2, Package, Truck, MapPin, Home as HomeIcon, Clock, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const STEP_ICONS = {
  1: CheckCircle2,
  2: Package,
  3: Truck,
  4: MapPin,
  5: HomeIcon,
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
};
const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};
const fmtEta = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const StatusPill = ({ status }) => {
  const map = {
    pending: { label: 'Awaiting Payment', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    paid: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    shipped: { label: 'Shipped', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    out_for_delivery: { label: 'Out for Delivery', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  };
  const v = map[status] || { label: status, cls: 'bg-ink-100 text-ink-700 border-ink-200' };
  return (
    <span data-testid="track-status-pill" className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${v.cls}`}>
      {v.label}
    </span>
  );
};

const Track = () => {
  const [params, setParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('o') || '');
  const [email, setEmail] = useState(params.get('e') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { document.title = 'Track My Order | Abundant Merchandise'; }, []);

  const lookup = async (on, em) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.get('/orders/track', { params: { order_number: on, email: em } });
      setResult(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || "We couldn't find an order matching that number and email";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!orderNumber || !email) {
      toast.error('Please enter both your order number and email');
      return;
    }
    const on = orderNumber.trim().toUpperCase();
    const em = email.trim();
    setParams({ o: on, e: em });
    lookup(on, em);
  };

  // Auto-lookup if query params were provided (e.g. arriving from Account page)
  useEffect(() => {
    const o = params.get('o');
    const e = params.get('e');
    if (o && e && !result && !loading) {
      lookup(o.toUpperCase(), e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelled = result?.status === 'cancelled';
  const stepsRendered = result?.timeline || [];
  const currentStep = result?.current_step || 0;

  return (
    <div data-testid="track-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Order tracking</p>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Where&apos;s my order?</h1>
        <p className="mt-3 text-ink-600">Enter your order number and email to get a live status.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-ink-200 rounded-xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-ink-700 mb-1">Order number</label>
          <input
            data-testid="track-order-input"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="AM-XXXXXX"
            className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-ink-700 mb-1">Email used at checkout</label>
          <input
            data-testid="track-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
        <button
          data-testid="track-submit"
          type="submit"
          disabled={loading}
          className="h-11 inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} /> : <Search className="w-4 h-4" strokeWidth={1.75} />}
          {loading ? 'Looking up' : 'Track'}
        </button>
      </form>

      {error && !loading && (
        <div data-testid="track-error" className="mt-8 bg-white border border-rose-200 rounded-xl p-6 md:p-8 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-ink-900">No order found</p>
            <p className="text-xs text-ink-600 mt-1">{error}</p>
            <p className="text-xs text-ink-500 mt-2">Double-check your order number (format: <span className="font-mono">AM-XXXXXX</span>) and the email used at checkout.</p>
          </div>
        </div>
      )}

      {result && (
        <div data-testid="track-result" className="mt-8 bg-white border border-ink-200 rounded-xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Order</p>
                <StatusPill status={result.status} />
              </div>
              <p data-testid="track-order-number" className="font-heading text-xl font-bold text-ink-900 mt-1">#{result.order_number}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Placed {fmtDate(result.placed_at)}
                {result.tracking_carrier && ` · ${result.tracking_carrier}`}
                {result.tracking_code && (
                  <> · <span className="font-mono">{result.tracking_code}</span></>
                )}
              </p>
            </div>
            <div className="text-right">
              {cancelled ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-600">Status</p>
                  <p className="font-heading text-lg font-bold text-ink-900 mt-0.5">Order cancelled</p>
                </>
              ) : result.status === 'delivered' ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Delivered</p>
                  <p className="font-heading text-lg font-bold text-ink-900 mt-0.5">{fmtDate(stepsRendered.find(s => s.step === 5)?.at)}</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Estimated delivery</p>
                  <p className="font-heading text-lg font-bold text-ink-900 mt-0.5">{result.eta ? fmtEta(result.eta) : '—'}</p>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          {!cancelled && (
            <div className="relative">
              {/* Mobile vertical */}
              <ol className="md:hidden space-y-4">
                {stepsRendered.map((s) => {
                  const Icon = STEP_ICONS[s.step];
                  return (
                    <li key={s.step} className="flex items-start gap-3" data-testid={`track-step-${s.step}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${s.reached ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="pt-1">
                        <p className={`text-sm font-semibold ${s.reached ? 'text-ink-900' : 'text-ink-400'}`}>{s.label}</p>
                        <p className="text-xs text-ink-500">{s.sub}</p>
                        {s.at && <p className="text-[11px] text-ink-400 mt-0.5">{fmtDateTime(s.at)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Desktop horizontal */}
              <ol className="hidden md:flex items-start justify-between relative">
                <div className="absolute left-0 right-0 top-5 h-0.5 bg-ink-200 -z-0" />
                <div className="absolute left-0 top-5 h-0.5 bg-brand -z-0 transition-all duration-500" style={{ width: `${Math.max(0, ((currentStep - 1) / (stepsRendered.length - 1)) * 100)}%` }} />
                {stepsRendered.map((s) => {
                  const Icon = STEP_ICONS[s.step];
                  return (
                    <li key={s.step} className="relative z-10 flex flex-col items-center text-center flex-1 px-1" data-testid={`track-step-${s.step}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${s.reached ? 'bg-brand text-white' : 'bg-white border-2 border-ink-200 text-ink-400'}`}>
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <p className={`mt-3 text-xs font-semibold ${s.reached ? 'text-ink-900' : 'text-ink-400'}`}>{s.label}</p>
                      <p className="text-[10px] text-ink-500 mt-0.5 max-w-[120px]">{s.sub}</p>
                      {s.at && <p className="text-[10px] text-ink-400 mt-1">{fmtDateTime(s.at)}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Items */}
          <div className="mt-8 pt-6 border-t border-ink-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-3">Items ({result.items?.length || 0})</p>
            <ul className="space-y-2">
              {(result.items || []).map((it, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700 truncate pr-3">
                    {it.title}{' '}
                    <span className="text-ink-400">× {it.qty}</span>
                  </span>
                  <span className="text-ink-900 font-semibold">${(it.unit_price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total</span>
              <span className="font-heading text-base font-bold text-ink-900">${Number(result.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Latest update */}
          {result.latest_note && (
            <div data-testid="track-latest-note" className={`mt-6 p-4 rounded-md flex items-start gap-3 border ${cancelled ? 'bg-rose-50 border-rose-200' : 'bg-brand/5 border-brand/20'}`}>
              {cancelled
                ? <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                : <Clock className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" strokeWidth={1.75} />}
              <div>
                <p className="text-sm font-semibold text-ink-900">Latest update</p>
                <p className="text-xs text-ink-600 mt-0.5">{result.latest_note}</p>
              </div>
            </div>
          )}

          {/* History */}
          {result.history && result.history.length > 1 && (
            <details className="mt-6 group" data-testid="track-history-toggle">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ink-600 hover:text-brand">
                Full history ({result.history.length})
              </summary>
              <ol className="mt-3 space-y-2 pl-2 border-l-2 border-ink-100">
                {[...result.history].reverse().map((h, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute left-[-7px] top-1.5 w-3 h-3 rounded-full bg-brand/60" />
                    <p className="text-sm text-ink-800">{h.note}</p>
                    <p className="text-[11px] text-ink-500">{fmtDateTime(h.at)}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default Track;
