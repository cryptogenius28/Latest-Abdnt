import React from 'react';
import { Truck, Zap, RotateCcw, Globe, Package, Shield } from 'lucide-react';

const Shipping = () => {
  React.useEffect(() => { document.title = 'Shipping & Returns | Abundant Merchandise'; }, []);
  return (
  <div data-testid="shipping-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
    <div className="text-center mb-12">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Shop with confidence</p>
      <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Shipping & Returns</h1>
      <p className="mt-3 text-ink-600 max-w-2xl mx-auto">Free standard shipping on US orders over $49. 30-day no-hassle returns. Read the fine print below.</p>
    </div>

    {/* Quick stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
      {[
        { icon: Truck, t: 'Standard', s: '5–7 days · Free over $49' },
        { icon: Zap, t: 'Express', s: '2–3 days · $12.99' },
        { icon: RotateCcw, t: 'Returns', s: '30 days · no questions' },
        { icon: Shield, t: 'Protected', s: 'PCI-DSS secure' },
      ].map((q) => (
        <div key={q.t} className="p-4 border border-ink-200 rounded-xl bg-white text-center">
          <q.icon className="w-6 h-6 text-brand mx-auto" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-semibold text-ink-900">{q.t}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">{q.s}</p>
        </div>
      ))}
    </div>

    <div className="prose prose-sm max-w-none space-y-8">
      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">Shipping methods</h2>
        </div>
        <div className="space-y-3 text-ink-700 leading-relaxed text-sm">
          <p><strong className="text-ink-900">Standard Shipping</strong> — 5–7 business days. Free on orders of $49 or more (within the contiguous US); otherwise $5.99 flat. Warehouse items typically arrive 1–2 days faster than the upper bound.</p>
          <p><strong className="text-ink-900">Express Shipping</strong> — 2–3 business days. Flat $12.99 regardless of order total. Available on all in-stock products.</p>
          <p><strong className="text-ink-900">Warehouse vs Dropship</strong> — Each product page indicates whether it ships from our warehouse (1–2 day pack time) or directly from a vetted supplier (3–7 day window). Mixed-cart orders ship in separate parcels — no extra charge.</p>
        </div>
      </section>

      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">Delivery times</h2>
        </div>
        <div className="text-ink-700 leading-relaxed text-sm space-y-2">
          <p>Orders placed before 2pm EST on a business day enter fulfillment the same day. Weekend and holiday orders enter fulfillment on the next business day.</p>
          <p>You&apos;ll receive a tracking link by email the moment your package leaves the warehouse. You can also check status on the <a href="/track" className="text-brand font-semibold">Track your order</a> page or under <a href="/account/orders" className="text-brand font-semibold">My orders</a>.</p>
        </div>
      </section>

      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">Free shipping threshold</h2>
        </div>
        <p className="text-sm text-ink-700">Spend $49 or more (after promotions, before tax) and standard shipping is on us. Our checkout shows a live progress bar so you know how close you are.</p>
      </section>

      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">Return policy</h2>
        </div>
        <div className="text-sm text-ink-700 space-y-2">
          <p>You have 30 calendar days from delivery to return any item, no questions asked. Items must be unused and in their original packaging.</p>
          <p>Initiate a return from <a href="/account/orders" className="text-brand font-semibold">your orders page</a> and we&apos;ll email you a prepaid USPS label. You can drop the box at any USPS location or schedule pickup.</p>
          <p>Final-sale items (custom, perishable, or hygiene-sensitive) are clearly labelled on their product page and are not eligible for return.</p>
        </div>
      </section>

      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">Refunds</h2>
        </div>
        <p className="text-sm text-ink-700">Refunds are issued to your original payment method within 5–7 business days of us receiving the return. You&apos;ll get an email confirmation the moment the refund posts.</p>
      </section>

      <section className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-brand" strokeWidth={1.5} />
          <h2 className="font-heading text-xl font-bold text-ink-900 m-0">International shipping</h2>
        </div>
        <p className="text-sm text-ink-700">We ship to the US, Canada, and the UK. Additional countries are added quarterly. International orders may be subject to import duties and taxes calculated at checkout.</p>
      </section>
    </div>
  </div>
  );
};

export default Shipping;
