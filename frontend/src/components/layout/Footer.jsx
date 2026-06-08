import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { FOOTER } from '@/constants/testIds';
import { api } from '@/lib/api';
import { PaymentBadges } from './PaymentBadges';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    try {
      await api.post('/newsletter/subscribe', { email, source: 'footer' });
      setSubscribed(true);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      if (err?.response?.status === 409 || (typeof msg === 'string' && msg.toLowerCase().includes('already'))) {
        setSubscribed(true);
      } else {
        toast.error('Subscription failed — please try again');
      }
    } finally {
      setSubscribing(false);
    }
  };

  const cols = [
    { title: 'Shop', links: [['All Products', '/shop'], ['Electronics', '/category/electronics'], ['Home & Garden', '/category/home-garden'], ['Fashion', '/category/fashion'], ['Beauty', '/category/beauty']] },
    { title: 'Help', links: [['Contact Us', '/contact'], ['Shipping & Returns', '/shipping'], ['Track Order', '/track'], ['FAQ', '/faq']] },
    { title: 'Company', links: [['About Us', '/about'], ['Blog', '/blog'], ['Careers', '/careers'], ['Privacy Policy', '/privacy']] },
  ];

  return (
    <footer data-testid={FOOTER.root} className="bg-ink-900 text-ink-200 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <Logo inverted />
            <p className="mt-4 text-sm text-ink-400 leading-relaxed max-w-sm">
              Your one-stop destination for quality merchandise across home, tech, fashion and beyond. Curated value, every day.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" strokeWidth={1.75} /><a href="mailto:hello@abundantmerchandise.com" className="hover:text-white">hello@abundantmerchandise.com</a></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" strokeWidth={1.75} /><span>+1 (555) 010-2030</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" strokeWidth={1.75} /><span>Distribution HQ, Reno NV</span></div>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map(([label, to]) => (
                  <li key={label}><Link to={to} className="text-ink-400 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Newsletter</h4>
            <p className="text-sm text-ink-400 mb-3">10% off your first order.</p>
            {subscribed ? (
              <p data-testid="footer-newsletter-success" className="text-sm text-brand">Thanks — check your inbox!</p>
            ) : (
              <form onSubmit={subscribe} className="space-y-2">
                <input
                  data-testid={FOOTER.newsletterInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 text-sm bg-ink-800 border border-ink-700 rounded-md text-white placeholder:text-ink-500 focus:outline-none focus:border-brand"
                />
                <button
                  data-testid={FOOTER.newsletterSubmit}
                  type="submit"
                  disabled={subscribing}
                  className="w-full h-10 bg-brand hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors"
                >
                  {subscribing ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ink-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500">© {new Date().getFullYear()} Abundant Merchandise. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-ink-500 font-semibold mr-1">
                <ShieldCheck className="w-3 h-3 text-brand" strokeWidth={2} /> Secure pay
              </span>
              <PaymentBadges />
            </div>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-ink-800 hover:bg-brand transition-colors"><Facebook className="w-4 h-4" strokeWidth={1.5} /></a>
              <a href="#" aria-label="Instagram" className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-ink-800 hover:bg-brand transition-colors"><Instagram className="w-4 h-4" strokeWidth={1.5} /></a>
              <a href="#" aria-label="Twitter" className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-ink-800 hover:bg-brand transition-colors"><Twitter className="w-4 h-4" strokeWidth={1.5} /></a>
              <a href="#" aria-label="Youtube" className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-ink-800 hover:bg-brand transition-colors"><Youtube className="w-4 h-4" strokeWidth={1.5} /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
