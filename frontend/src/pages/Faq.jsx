import React, { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQS = [
  { q: 'How fast is shipping?', a: 'Warehouse-fulfilled items ship in 1–2 business days and typically arrive within 5–7 days (Standard) or 2–3 days (Express). Dropship items ship direct from our suppliers within 3–7 days. Each product page indicates its fulfillment type.' },
  { q: 'What is your return policy?', a: 'We offer a 30-day no-hassle return policy on all unused items in their original packaging. Initiate a return from your account orders page — we’ll email a prepaid label. Refunds post within 5–7 business days of receipt.' },
  { q: 'What is the difference between Warehouse and Dropship?', a: '"Warehouse" items ship from our own US warehouses — usually 1–2 day shipping. "Dropship" items ship directly from a vetted partner supplier — usually 3–7 days. Every product clearly labels which one it is so you can plan around your delivery.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, MasterCard, AmEx, Discover), PayPal, Apple Pay, and Google Pay. All payments are processed over 256-bit SSL encryption and are PCI-DSS compliant.' },
  { q: 'How do I track my order?', a: 'You\u2019ll get a tracking number by email as soon as your order ships. You can also enter your order number on /track for a quick status check, or sign in and visit /account/orders for full history.' },
  { q: 'Do I need an account to place an order?', a: 'No — guest checkout is fully supported. Creating an account is optional but gives you saved addresses, order history, faster repeat checkout, and exclusive member discounts.' },
  { q: 'Do you offer bulk or wholesale pricing?', a: 'Yes. For orders of 25+ units on most products, please email us at bulk@abundantmerch.com with your product list and shipping ZIP and we\u2019ll send a custom quote within 1 business day.' },
  { q: 'Do you ship internationally?', a: 'Right now we ship to the United States, Canada, and the UK. Additional regions are added quarterly — sign up for the newsletter to be notified when we expand to your country.' },
  { q: 'Is my payment information secure?', a: 'Absolutely. We never store full card numbers on our servers. All transactions are processed via PCI-DSS compliant gateways with 256-bit SSL. Your card details go directly to the payment processor.' },
  { q: 'Can I change or cancel an order?', a: 'Orders can be modified or cancelled within 1 hour of placement. After that, the order enters fulfillment and can no longer be changed — but you can always return it within 30 days of receipt.' },
];

const FAQItem = ({ q, a, open, onToggle, idx }) => (
  <div data-testid="faq-item" className="border-b border-ink-200 last:border-0">
    <button
      onClick={onToggle}
      aria-expanded={open}
      data-testid={`faq-question-${idx}`}
      className="w-full flex items-center justify-between gap-4 py-5 text-left group"
    >
      <span className="font-semibold text-ink-900 group-hover:text-brand transition-colors">{q}</span>
      <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors flex-shrink-0 ${open ? 'bg-brand text-white' : 'bg-ink-100 text-ink-700'}`}>
        {open ? <Minus className="w-4 h-4" strokeWidth={2} /> : <Plus className="w-4 h-4" strokeWidth={2} />}
      </span>
    </button>
    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="overflow-hidden">
        <p className="text-sm text-ink-600 leading-relaxed pr-12">{a}</p>
      </div>
    </div>
  </div>
);

const Faq = () => {
  const [openIdx, setOpenIdx] = useState(0);
  React.useEffect(() => { document.title = 'FAQ | Abundant Merchandise'; }, []);
  return (
    <div data-testid="faq-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="text-center mb-12">
        <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 items-center justify-center">
          <HelpCircle className="w-7 h-7 text-brand" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand">Help center</p>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Frequently asked questions</h1>
        <p className="mt-3 text-ink-600">Quick answers to the questions we get most often.</p>
      </div>

      <div className="bg-white border border-ink-200 rounded-xl px-6 md:px-8">
        {FAQS.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} idx={i} />
        ))}
      </div>

      <div className="mt-10 p-6 bg-ink-900 text-white rounded-xl text-center">
        <h3 className="font-heading text-lg font-bold">Still have questions?</h3>
        <p className="mt-1 text-sm text-ink-300">We&apos;re a real human team and we love hearing from shoppers.</p>
        <a href="/contact" className="mt-4 inline-flex bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-5 py-2.5 text-sm transition-colors">Contact support</a>
      </div>
    </div>
  );
};

export default Faq;
