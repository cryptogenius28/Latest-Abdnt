import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

// Featured tile imagery per category slug — falls back to category.image
const FEATURED_TILE = {
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80',
  'home-garden': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',
  fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
  beauty: 'https://images.pexels.com/photos/7256102/pexels-photo-7256102.jpeg?w=600',
  sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
  tools: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
  toys: 'https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg?w=600',
  office: 'https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg?w=600',
};

const FALLBACK_SUBS = {
  electronics: ['Laptops & Computers', 'Headphones & Audio', 'Smartwatches', 'Cameras'],
  'home-garden': ['Furniture', 'Kitchen & Dining', 'Decor & Lighting', 'Outdoor & Garden'],
  fashion: ["Men's Clothing", "Women's Clothing", 'Shoes', 'Bags & Accessories'],
  beauty: ['Skincare', 'Makeup', 'Fragrance', 'Hair Care'],
  sports: ['Fitness Equipment', 'Outdoor Recreation', 'Cycling', 'Team Sports'],
  tools: ['Power Tools', 'Hand Tools', 'Hardware', 'Automotive'],
  toys: ['Action Figures', 'Building Sets', 'Educational', 'Plush & Dolls'],
  office: ['Stationery', 'Desk & Organization', 'Printers & Ink', 'Office Furniture'],
};

export const MegaMenuBar = () => {
  const [categories, setCategories] = useState([]);
  const [activeSlug, setActiveSlug] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/categories').then((r) => { if (!cancelled) setCategories(r.data || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleEnter = (slug) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveSlug(slug);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveSlug(null), 120);
  };

  const active = categories.find((c) => c.slug === activeSlug);

  return (
    <div className="hidden lg:block relative bg-white border-t border-ink-100" onMouseLeave={handleLeave}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 h-11 overflow-x-auto" data-testid="mega-menu-bar">
          {categories.slice(0, 8).map((c) => (
            <button
              key={c.slug}
              onMouseEnter={() => handleEnter(c.slug)}
              onClick={() => { window.location.href = `/category/${c.slug}`; }}
              data-testid={`mega-menu-trigger-${c.slug}`}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeSlug === c.slug ? 'text-brand' : 'text-ink-700 hover:text-brand'}`}
            >
              {c.name}
            </button>
          ))}
        </nav>
      </div>
      {active && (
        <div
          data-testid="mega-menu-panel"
          onMouseEnter={() => handleEnter(active.slug)}
          className="absolute left-0 right-0 top-full bg-white border-t border-ink-100 border-b border-ink-200 shadow-lg z-30"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-12 gap-8">
            {/* Subcategory columns */}
            <div className="col-span-8 grid grid-cols-4 gap-6">
              {(FALLBACK_SUBS[active.slug] || []).map((sub) => (
                <div key={sub}>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-900 mb-2">{sub}</p>
                  <ul className="space-y-1.5">
                    {['Top sellers', 'New arrivals', 'On sale', 'View all'].map((label, i) => (
                      <li key={label}>
                        <Link
                          to={`/category/${active.slug}${i === 2 ? '?on_sale=1' : ''}`}
                          className="text-sm text-ink-600 hover:text-brand transition-colors"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {/* Featured image tile */}
            <Link
              to={`/category/${active.slug}`}
              className="col-span-4 relative aspect-[4/3] rounded-xl overflow-hidden group bg-ink-100"
            >
              <img
                src={FEATURED_TILE[active.slug] || active.image}
                alt={active.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand">{active.count} items</p>
                <p className="text-white font-heading text-xl font-bold mt-0.5">Shop {active.name}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white">View all <ChevronRight className="w-3 h-3" strokeWidth={2} /></p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
