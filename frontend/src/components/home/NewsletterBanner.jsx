import React, { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export const NewsletterBanner = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/newsletter/subscribe', { email, source: 'homepage' });
      setSubmitted(true);
      toast.success('Subscribed! Check your inbox for your 10% off code.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not subscribe. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-testid="home-newsletter" className="bg-brand relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-ink-900 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur border border-white/30 rounded-full text-[11px] font-bold uppercase tracking-widest">
            <Mail className="w-3.5 h-3.5" strokeWidth={2} /> Exclusive offer
          </div>
          <h2 className="mt-4 font-heading text-3xl md:text-4xl font-bold leading-tight">
            Get 10% off your first order
          </h2>
          <p className="mt-3 text-white/85 text-sm md:text-base max-w-md">
            Join our newsletter for new arrivals, early access to flash sales, and members-only coupons.
          </p>
        </div>
        <form onSubmit={onSubmit} className="w-full">
          {!submitted ? (
            <div className="bg-white rounded-md p-1 flex items-center gap-1 shadow-xl">
              <input
                data-testid="home-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 h-12 px-4 text-sm bg-transparent focus:outline-none text-ink-900 placeholder:text-ink-400"
              />
              <button
                data-testid="home-newsletter-submit"
                type="submit"
                className="h-12 px-6 bg-ink-900 hover:bg-ink-700 text-white font-semibold text-sm rounded-md transition-colors"
              >
                Subscribe
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-md p-5 flex items-center gap-3 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-100 inline-flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">You&apos;re in! Code <span className="font-mono bg-brand/10 text-brand px-1.5 py-0.5 rounded">WELCOME10</span> sent.</p>
                <p className="text-xs text-ink-500 mt-0.5">Check your inbox (and spam folder just in case).</p>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-white/70">No spam, unsubscribe anytime.</p>
        </form>
      </div>
    </section>
  );
};
