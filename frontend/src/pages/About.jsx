import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Truck, Users, ArrowRight, ShoppingBag } from 'lucide-react';

const TEAM = [
  { name: 'Daiana Brooks', role: 'Founder & CEO', img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80' },
  { name: 'Marcus Tan', role: 'Head of Operations', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { name: 'Priya Anand', role: 'Customer Experience', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
];

const STATS = [
  { v: '50,000+', l: 'Products in catalog' },
  { v: '10,000+', l: 'Happy customers' },
  { v: '2-Day', l: 'Warehouse shipping' },
  { v: '4.8/5', l: 'Average rating' },
];

const About = () => {
  React.useEffect(() => { document.title = 'About Us | Abundant Merchandise'; }, []);
  return (
  <div data-testid="about-page" className="bg-white">
    {/* Hero */}
    <section className="relative bg-ink-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <img src="https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">About us</p>
        <h1 className="mt-3 font-heading text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
          Building the everyday store, <span className="text-brand">one box at a time.</span>
        </h1>
        <p className="mt-5 text-base md:text-lg text-ink-300 max-w-2xl leading-relaxed">
          Abundant Merchandise started in a single warehouse in 2019 with a simple idea: make great products
          affordable, fulfillment honest, and shipping fast. Today we ship from 6 warehouses and partner with
          200+ trusted suppliers worldwide.
        </p>
      </div>
    </section>

    {/* Story + mission */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Our story</p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink-900">A store built for real shoppers</h2>
        <div className="mt-5 space-y-4 text-ink-700 leading-relaxed">
          <p>
            We were tired of marketplaces where you couldn&apos;t tell what was actually in stock or who was
            shipping it. So we built a store with two clear answers: <span className="font-semibold text-ink-900">Warehouse</span> (we ship in 1–2 days)
            or <span className="font-semibold text-ink-900">Dropship</span> (direct from a vetted partner in 3–7 days).
          </p>
          <p>
            That clarity, combined with a free 30-day return policy and PCI-DSS encrypted checkout, has made
            Abundant Merchandise a trusted home for over 10,000 monthly shoppers across electronics, home,
            fashion, beauty, sports, tools, toys, and office goods.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <img src="https://images.pexels.com/photos/4480505/pexels-photo-4480505.jpeg?w=600" alt="Warehouse" className="rounded-xl aspect-square object-cover" />
        <img src="https://images.pexels.com/photos/4481532/pexels-photo-4481532.jpeg?w=600" alt="Team" className="rounded-xl aspect-square object-cover mt-8" />
      </div>
    </section>

    {/* Stats */}
    <section className="bg-ink-50 border-y border-ink-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((s) => (
          <div key={s.l} className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-bold text-brand">{s.v}</p>
            <p className="mt-1 text-xs font-semibold text-ink-700">{s.l}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Values */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { icon: Award, t: 'Authentic only', d: 'Every product is vetted from a trusted brand or supplier. No knockoffs, ever.' },
        { icon: Truck, t: 'Honest fulfillment', d: 'Warehouse vs dropship labelled on every listing — so you can plan around your delivery date.' },
        { icon: Users, t: 'Real human support', d: 'Email, chat, and phone — answered by people, usually under 1 hour during business hours.' },
      ].map((v) => (
        <div key={v.t} className="p-6 border border-ink-200 rounded-xl bg-white hover:border-brand/30 hover:shadow-md transition-all">
          <v.icon className="w-7 h-7 text-brand" strokeWidth={1.5} />
          <h3 className="mt-4 font-heading text-lg font-bold text-ink-900">{v.t}</h3>
          <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{v.d}</p>
        </div>
      ))}
    </section>

    {/* Team */}
    <section className="bg-white border-t border-ink-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Meet the team</p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-ink-900">People behind the boxes</h2>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {TEAM.map((t) => (
            <div key={t.name} className="text-center">
              <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden bg-ink-100">
                <img src={t.img} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-ink-900">{t.name}</p>
              <p className="text-sm text-brand font-semibold">{t.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-ink-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
        <h2 className="font-heading text-3xl font-bold">Ready to start shopping?</h2>
        <p className="mt-2 text-ink-300">Free shipping on orders over $49 · 30-day returns · Secure checkout</p>
        <Link to="/shop" className="mt-6 inline-flex items-center gap-2 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3 transition-colors">
          <ShoppingBag className="w-4 h-4" strokeWidth={1.75} /> Browse the store <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </Link>
      </div>
    </section>
  </div>
  );
};

export default About;
