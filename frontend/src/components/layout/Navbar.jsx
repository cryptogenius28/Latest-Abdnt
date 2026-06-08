import React, { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, ChevronDown, LogOut, LayoutDashboard, Package, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { AnnouncementBar } from './AnnouncementBar';
import { MegaMenuBar } from './MegaMenuBar';
import { SearchAutocomplete } from './SearchAutocomplete';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { NAV, CART, WISHLIST } from '@/constants/testIds';

const useCategories = () => {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    let cancelled = false;
    api.get('/categories').then((r) => { if (!cancelled) setCats(r.data || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return cats;
};

const AccountMenu = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); onClose?.(); navigate('/'); };
  if (!user) {
    return (
      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-ink-200 rounded-md shadow-lg py-2 z-50">
        <Link to="/login" data-testid={NAV.loginLink} onClick={onClose} className="block px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand">Sign in</Link>
        <Link to="/register" data-testid={NAV.registerLink} onClick={onClose} className="block px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand">Create account</Link>
      </div>
    );
  }
  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-ink-200 rounded-md shadow-lg py-2 z-50">
      <div className="px-4 py-2 border-b border-ink-100">
        <p className="text-xs text-ink-500">Signed in as</p>
        <p className="text-sm font-medium text-ink-900 truncate">{user.email}</p>
      </div>
      <Link to="/account" data-testid={NAV.accountLink} onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand"><User className="w-4 h-4" strokeWidth={1.5} />My Account</Link>
      <Link to="/account/orders" onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand"><Package className="w-4 h-4" strokeWidth={1.5} />Orders</Link>
      {user.role === 'admin' && (
        <Link to="/admin" data-testid={NAV.adminLink} onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand"><LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />Admin</Link>
      )}
      <button data-testid={NAV.logoutButton} onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand"><LogOut className="w-4 h-4" strokeWidth={1.5} />Sign out</button>
    </div>
  );
};

export const Navbar = () => {
  const categories = useCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const autoRef = useRef(null);
  const mobileAutoRef = useRef(null);
  const { itemCount, openDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      const inDesktop = searchRef.current && searchRef.current.contains(e.target);
      const inMobile = mobileSearchRef.current && mobileSearchRef.current.contains(e.target);
      if (!inDesktop && !inMobile) setSearchOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Close menus on route change (render-time check to avoid set-state-in-effect lint)
  const [lastRouteKey, setLastRouteKey] = useState(`${location.pathname}${location.search}`);
  const currentRouteKey = `${location.pathname}${location.search}`;
  if (currentRouteKey !== lastRouteKey) {
    setLastRouteKey(currentRouteKey);
    setSearchOpen(false);
    setAccountOpen(false);
    setDeptOpen(false);
    setMobileOpen(false);
  }

  const submitSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return (
    <header data-testid={NAV.root} className="sticky top-0 z-40 bg-white border-b border-ink-200">
      <AnnouncementBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center gap-4">
          <button data-testid={NAV.mobileToggle} className="lg:hidden p-2 -ml-2 text-ink-700" onClick={() => setMobileOpen((v) => !v)} aria-label="Open menu">
            {mobileOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>
          <Logo />
          <button
            data-testid={NAV.departmentsToggle}
            onClick={() => setDeptOpen((v) => !v)}
            className="hidden lg:inline-flex items-center gap-1.5 ml-4 px-3 py-2 text-sm font-medium text-ink-700 hover:text-brand transition-colors"
          >
            <Menu className="w-4 h-4" strokeWidth={1.75} />All Departments<ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <form onSubmit={submitSearch} className="flex-1 max-w-xl hidden md:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
              <input
                data-testid={NAV.searchInput}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => { autoRef.current?.handleKeyDown(e); }}
                type="text"
                placeholder="Search products, brands and more…"
                className="w-full h-10 pl-9 pr-20 text-sm bg-ink-50 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                autoComplete="off"
              />
              <button data-testid={NAV.searchSubmit} type="submit" className="absolute right-1 top-1 h-8 px-3 text-xs font-semibold text-white bg-brand hover:bg-brand-600 rounded">Search</button>
              <SearchAutocomplete
                ref={autoRef}
                query={search}
                open={searchOpen}
                onSelect={() => { setSearchOpen(false); setSearch(''); }}
                onClose={() => setSearchOpen(false)}
              />
            </div>
          </form>
          <div className="flex items-center gap-1 ml-auto">
            <Link to="/shop" className="hidden md:inline-flex px-3 py-2 text-sm font-medium text-ink-700 hover:text-brand">Shop</Link>
            <div className="relative" ref={accountRef}>
              <button data-testid={NAV.accountButton} onClick={() => setAccountOpen((v) => !v)} className="p-2 text-ink-700 hover:text-brand transition-colors inline-flex items-center gap-1.5">
                <User className="w-5 h-5" strokeWidth={1.5} />
                <span className="hidden sm:inline text-xs font-medium">Account</span>
              </button>
              {accountOpen && <AccountMenu onClose={() => setAccountOpen(false)} />}
            </div>
            <button data-testid={NAV.cartButton} onClick={openDrawer} className="relative p-2 text-ink-700 hover:text-brand transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span data-testid={CART.navCartBadge} className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
            <Link to="/wishlist" data-testid={WISHLIST.navIcon} className="relative p-2 text-ink-700 hover:text-brand transition-colors hidden sm:inline-flex" aria-label="Wishlist">
              <Heart className="w-5 h-5" strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span data-testid={WISHLIST.navBadge} className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop mega-menu */}
        <MegaMenuBar />
      </div>

      {/* Departments slide-out (desktop + mobile) */}
      {deptOpen && (
        <div className="absolute left-0 right-0 bg-white border-b border-ink-200 shadow-lg z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                onClick={() => setDeptOpen(false)}
                className="flex items-center gap-3 p-3 border border-ink-200 rounded-md hover:border-brand hover:bg-brand-50 transition-colors"
              >
                <img src={c.image} alt={c.name} className="w-10 h-10 object-cover rounded" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-900 truncate">{c.name}</div>
                  <div className="text-xs text-ink-500">{c.count} items</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-200 bg-white">
          <div className="px-4 py-3">
            <form onSubmit={submitSearch} className="md:hidden" ref={mobileSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
                <input
                  data-testid={NAV.searchInput + '-mobile'}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => { mobileAutoRef.current?.handleKeyDown(e); }}
                  type="text"
                  placeholder="Search…"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-ink-50 border border-ink-200 rounded-md"
                  autoComplete="off"
                />
                <SearchAutocomplete
                  ref={mobileAutoRef}
                  query={search}
                  open={searchOpen}
                  onSelect={() => { setSearchOpen(false); setSearch(''); setMobileOpen(false); }}
                  onClose={() => setSearchOpen(false)}
                />
              </div>
            </form>
          </div>
          <div className="px-2 pb-3 grid grid-cols-2 gap-1">
            {categories.map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`} onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-ink-700 hover:text-brand rounded">{c.name}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
