import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const PaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get('/account/payment-methods')
      .then((r) => setMethods(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addCard = async () => {
    setAdding(true);
    try {
      const { data } = await api.post('/account/payment-methods/setup', {
        origin_url: window.location.origin,
      });
      if (data?.status === 'stub') {
        toast.info('Saved card flow comes online in production', { description: data.message });
      } else if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      toast.error('Could not start card setup');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div data-testid="payment-methods-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">My Account</p>
          <h1 className="mt-1 font-heading text-3xl font-bold text-ink-900">Payment methods</h1>
        </div>
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Back to account
        </Link>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Your cards are stored by Stripe</p>
          <p className="mt-0.5 text-xs">We never see or store full card numbers. Only the brand and last 4 digits are kept on our side for display.</p>
        </div>
      </div>

      <button
        data-testid="payment-method-add"
        onClick={addCard}
        disabled={adding}
        className="mb-6 inline-flex items-center gap-1.5 h-11 px-5 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold rounded-md transition-colors"
      >
        <Plus className="w-4 h-4" strokeWidth={1.75} /> {adding ? 'Opening Stripe…' : 'Add a card via Stripe'}
      </button>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      ) : methods.length === 0 ? (
        <div data-testid="payment-methods-empty" className="text-center py-16 border border-dashed border-ink-300 rounded-xl">
          <CreditCard className="w-12 h-12 text-ink-300 mx-auto" strokeWidth={1.25} />
          <p className="mt-3 font-semibold text-ink-900">No saved cards</p>
          <p className="text-sm text-ink-500 mt-1">Save a card during your next checkout for faster payment.</p>
          <p className="mt-3 text-[11px] text-ink-400 inline-flex items-center gap-1"><Lock className="w-3 h-3" strokeWidth={1.75} /> Tokenised by Stripe — PCI-DSS compliant</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((m) => (
            <div key={m.id} className="bg-white border border-ink-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-8 bg-ink-900 rounded text-white text-[10px] font-bold uppercase flex items-center justify-center">
                {m.brand || '••••'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-900">•••• {m.last4 || '••••'}</p>
                <p className="text-xs text-ink-500">Expires {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}</p>
              </div>
              {m.is_default && <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Default</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
