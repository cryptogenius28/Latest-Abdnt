import React from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, Globe, HardDrive, ArrowRight } from 'lucide-react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

const TILES = [
  {
    key: 'warehouse',
    icon: Warehouse,
    eyebrow: 'In Our Warehouse',
    title: 'Fast dispatch',
    sub: '~100 items shipped from Reno, NV within 1–2 business days.',
    cta: 'Shop Warehouse',
    to: '/shop?fulfillment=warehouse',
    accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    key: 'dropship',
    icon: Globe,
    eyebrow: 'Dropshipped',
    title: 'Shipped by supplier',
    sub: 'Direct from manufacturer · 3–7 day delivery on curated picks.',
    cta: 'Shop Dropship',
    to: '/shop?fulfillment=dropship',
    accent: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  {
    key: 'digital',
    icon: HardDrive,
    eyebrow: 'Digital',
    title: 'Instant delivery',
    sub: 'Software, downloads & licences — delivered the second you pay.',
    cta: 'Shop Digital',
    to: '/shop?fulfillment=digital',
    accent: 'text-violet-700 bg-violet-50 border-violet-200',
  },
];

export const FulfillmentHighlights = () => {
  const [ref, visible] = useRevealOnScroll();

  return (
    <section
      ref={ref}
      data-testid="home-fulfillment-highlights"
      className={`reveal${visible ? ' is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16`}
    >
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Shop by fulfillment</p>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">
          Choose how you want it delivered
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Every product is fulfilled one of three ways — pick the experience that fits you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {TILES.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            data-testid={`home-fulfillment-tile-${t.key}`}
            className="group relative bg-white rounded-2xl border border-ink-200 p-6 hover:border-brand hover:shadow-lg hover:-translate-y-1 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none"
          >
            <span
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${t.accent}`}
              aria-hidden="true"
            >
              <t.icon className="w-6 h-6" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-ink-500">{t.eyebrow}</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-ink-900">{t.title}</h3>
            <p className="mt-2 text-sm text-ink-500 leading-relaxed">{t.sub}</p>
            <span
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand group-hover:text-brand-600"
              data-testid={`home-fulfillment-cta-${t.key}`}
            >
              {t.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
