import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle2 } from 'lucide-react';

const POSITIONS = [
  {
    title: 'Customer Service Representative',
    type: 'Full-time · Remote',
    location: 'Remote (US)',
    description:
      'Be the friendly voice and keyboard behind our customer experience. Handle order questions, returns, and product inquiries via email and live chat.',
    requirements: [
      '1+ year customer service experience',
      'Strong written communication',
      'Familiarity with e-commerce platforms',
    ],
  },
  {
    title: 'Warehouse Associate',
    type: 'Full-time · On-site',
    location: 'Reno, NV',
    description:
      'Pick, pack, and ship orders from our Reno distribution center. Help maintain inventory accuracy and keep our fulfillment operation running smoothly.',
    requirements: [
      'Able to lift 50 lbs',
      'Reliable transportation',
      'Detail-oriented and organized',
    ],
  },
  {
    title: 'Digital Marketing Specialist',
    type: 'Full-time · Hybrid',
    location: 'Remote / Reno, NV',
    description:
      'Drive growth through SEO, email campaigns, paid social, and content strategy. Own our marketing calendar and report on channel performance.',
    requirements: [
      '2+ years digital marketing',
      'Google Analytics proficient',
      'Experience with email platforms (Klaviyo, Mailchimp)',
    ],
  },
];

const Careers = () => {
  useEffect(() => { document.title = 'Careers | Abundant Merchandise'; }, []);

  return (
    <div data-testid="careers-page">
      {/* Hero */}
      <section className="bg-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Careers</p>
          <h1 className="mt-2 font-heading text-3xl md:text-5xl font-bold">Join Our Team</h1>
          <p className="mt-4 max-w-2xl text-ink-300 text-base md:text-lg leading-relaxed">
            We&apos;re building a curated marketplace people love. If you care about quality products,
            great service, and small teams shipping fast — we&apos;d love to hear from you.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl">
            <div>
              <p className="font-heading text-2xl md:text-3xl font-bold text-white">50,000+</p>
              <p className="text-xs md:text-sm text-ink-400 mt-1">Products</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl font-bold text-white">10,000+</p>
              <p className="text-xs md:text-sm text-ink-400 mt-1">Customers</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl font-bold text-white">Reno NV</p>
              <p className="text-xs md:text-sm text-ink-400 mt-1">HQ</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mb-8">Open Positions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="careers-positions">
          {POSITIONS.map((pos) => (
            <div
              key={pos.title}
              data-testid="career-card"
              className="border border-ink-200 rounded-xl p-6 bg-white hover:border-brand/30 hover:shadow-sm transition-all flex flex-col"
            >
              <h3 className="font-heading font-bold text-ink-900 text-lg">{pos.title}</h3>
              <span className="mt-2 inline-block w-fit text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                {pos.type}
              </span>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin className="w-4 h-4" strokeWidth={1.75} /> {pos.location}
              </p>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">{pos.description}</p>
              <ul className="mt-4 space-y-1.5">
                {pos.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-5 border-t border-ink-100">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center text-sm bg-brand hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-md transition-colors"
                  data-testid="career-apply-btn"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-500 text-center">
          Don&apos;t see a fit? Send your CV to{' '}
          <a href="mailto:careers@abundantmerchandise.com" className="text-brand font-semibold hover:underline">
            careers@abundantmerchandise.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default Careers;
