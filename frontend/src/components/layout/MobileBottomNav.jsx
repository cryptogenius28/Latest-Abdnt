import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, LayoutGrid, Search, Heart, ShoppingCart, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

const SearchModal = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    onClose();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[60] bg-white">
      <div className="px-4 py-3 border-b border-ink-200 flex items-center gap-2">
        <form onSubmit={submit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, brands…"
              className="w-full h-11 pl-10 pr-3 text-sm bg-ink-50 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </form>
        <button onClick={onClose} aria-label="Close search" className="p-2 -mr-1 text-ink-700 hover:bg-ink-100 rounded-md">
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Popular searches</p>
        <div className="flex flex-wrap gap-2">
          {['Headphones', 'Smart Watch', 'Lego', 'Coffee Maker', 'Yoga Mat', 'Tools'].map((t) => (
            <button
              key={t}
              onClick={() => { onClose(); navigate(`/shop?q=${encodeURIComponent(t)}`); }}
              className="px-3 py-1.5 text-xs font-medium bg-ink-50 hover:bg-brand hover:text-white border border-ink-200 rounded-full transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount, openDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon, path: '/', active: location.pathname === '/' },
    { id: 'categories', label: 'Shop', icon: LayoutGrid, path: '/shop', active: location.pathname.startsWith('/shop') || location.pathname.startsWith('/category') },
    { id: 'search', label: 'Search', icon: Search, action: () => setSearchOpen(true), active: false },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, path: '/wishlist', active: location.pathname.startsWith('/wishlist'), badge: wishlistCount },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, action: openDrawer, active: false, badge: itemCount },
  ];

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <nav
        data-testid="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-14">
          {tabs.map((t) => {
            const Inner = (
              <>
                <div className="relative">
                  <t.icon className={`w-5 h-5 transition-colors ${t.active ? 'text-brand' : 'text-ink-700'}`} strokeWidth={1.75} />
                  {t.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-brand text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center leading-none">
                      {t.badge > 9 ? '9+' : t.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${t.active ? 'text-brand' : 'text-ink-700'}`}>{t.label}</span>
              </>
            );
            if (t.action) {
              return (
                <button
                  key={t.id}
                  onClick={t.action}
                  data-testid={`mobile-nav-${t.id}`}
                  className="flex flex-col items-center justify-center gap-0.5"
                >
                  {Inner}
                </button>
              );
            }
            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                data-testid={`mobile-nav-${t.id}`}
                className="flex flex-col items-center justify-center gap-0.5"
              >
                {Inner}
              </button>
            );
          })}
        </div>
      </nav>
      {/* Spacer to avoid content overlap */}
      <div className="lg:hidden h-14" aria-hidden="true" />
    </>
  );
};
