import React, { useEffect } from 'react';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body:
      'We collect information you provide directly (name, email, shipping address, payment details processed by Stripe) and automatically (browser type, pages visited, IP address via standard web logs).',
  },
  {
    title: 'How We Use Your Information',
    body:
      'Your information is used to process orders, send transactional emails (order receipts, shipping updates), respond to support inquiries, and improve our services. We do not use your data for unrelated advertising.',
  },
  {
    title: 'Sharing Your Information',
    body:
      'We share necessary data with trusted service providers: Stripe for payment processing, shipping carriers for delivery, and MongoDB Atlas for data storage. We never sell your personal information.',
  },
  {
    title: 'Cookies & Tracking',
    body:
      'We use cookies to maintain your session and remember your cart. No third-party advertising cookies are used. You may disable cookies in your browser settings, though some features may not function correctly.',
  },
  {
    title: 'Data Security',
    body:
      'All data is transmitted over HTTPS. Payment details are handled exclusively by Stripe and are never stored on our servers. We apply industry-standard security practices to protect your account data.',
  },
  {
    title: 'Your Rights',
    body:
      'You may request access to, correction of, or deletion of your personal data by emailing hello@abundantmerchandise.com. We will respond within 30 days.',
  },
  {
    title: 'Contact Us',
    body: 'Abundant Merchandise · hello@abundantmerchandise.com · Reno, NV',
  },
];

const Privacy = () => {
  useEffect(() => { document.title = 'Privacy Policy | Abundant Merchandise'; }, []);

  return (
    <div data-testid="privacy-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Legal</p>
      <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Privacy Policy</h1>
      <p className="mt-3 text-ink-500 text-sm">Last updated: June 1, 2026</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s, idx) => (
          <section key={s.title}>
            <h2 className="font-heading text-xl font-bold text-ink-900">
              {idx + 1}. {s.title}
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed text-[15px]">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Privacy;
