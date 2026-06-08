import React from 'react';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    city: 'Brooklyn, NY',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    quote: "Honestly the smoothest online order I've placed all year. The packaging was great, delivery was 2 days, and customer support actually replied within an hour.",
  },
  {
    name: 'Marcus Lee',
    city: 'Austin, TX',
    avatar: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=200&q=80',
    quote: "Loaded up on workout gear during their flash sale — saved a ton, and everything was exactly as described. Already coming back for more.",
  },
  {
    name: 'Priya Anand',
    city: 'San Jose, CA',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    quote: "I love that they show warehouse vs dropship up front. Knowing the difference helped me plan my move-in. The kitchen items arrived in 36 hours.",
  },
];

export const Testimonials = () => (
  <section data-testid="home-testimonials" className="bg-ink-50 border-y border-ink-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">What customers say</p>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 mt-1">Loved by 10,000+ shoppers</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="relative bg-white border border-ink-100 rounded-xl p-6 hover:border-brand/30 hover:shadow-md transition-all">
            <Quote className="absolute top-5 right-5 w-10 h-10 text-brand/10" strokeWidth={1.5} />
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className="w-4 h-4 fill-brand text-brand" strokeWidth={0} />
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-ink-100">
              <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover bg-ink-100" />
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-500">{t.city}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
