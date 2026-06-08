import React, { useState } from 'react';
import { Bell, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Restock-alert subscription form.
 * Renders inside the PDP buy-box when a warehouse product is out of stock.
 */
export const RestockAlertForm = ({ productId }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("That email doesn't look right.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post('/restock-alerts', { product_id: productId, email: trimmed });
      setDone(true);
      toast.success(r.data?.message || "We'll let you know.");
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not save your alert. Try again in a moment.';
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        data-testid="pdp-restock-alert-success"
        className="mt-6 flex items-start gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900"
      >
        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" strokeWidth={2} />
        <div>
          <p className="font-semibold text-sm">You&apos;re on the list.</p>
          <p className="text-xs text-emerald-700/90 mt-0.5">
            We&apos;ll email <span className="font-semibold">{email}</span> the moment this product is back in stock — usually within 5-7 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      data-testid="pdp-restock-alert"
      className="mt-6 p-4 rounded-lg border border-ink-200 bg-ink-50/60"
    >
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-brand" strokeWidth={1.75} />
        <p className="text-sm font-bold text-ink-900">Notify me when it&apos;s back</p>
      </div>
      <p className="text-xs text-ink-500 mb-3">
        One email when we restock — no marketing, no follow-ups. Unsubscribe with a click.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            data-testid="pdp-restock-alert-email"
            className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          data-testid="pdp-restock-alert-submit"
          disabled={submitting}
          className="h-11 px-5 inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-brand hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md transition-colors min-w-[120px]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify me'}
        </button>
      </div>
    </form>
  );
};
