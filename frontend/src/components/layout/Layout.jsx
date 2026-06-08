import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import { BackToTop } from './BackToTop';
import { CookieBanner } from './CookieBanner';
import { ShoppingAssistant } from '@/components/ai/ShoppingAssistant';

export const Layout = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
    <CartDrawer />
    <MobileBottomNav />
    <BackToTop />
    <CookieBanner />
    <ShoppingAssistant />
  </div>
);
