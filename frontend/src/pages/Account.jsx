import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Package, MapPin, CreditCard, User, Sparkles } from 'lucide-react';
import MyOrders from '@/pages/MyOrders';
import Addresses from '@/pages/Addresses';
import PaymentMethods from '@/pages/PaymentMethods';
import Profile from '@/pages/Profile';
import SavedChats from '@/pages/SavedChats';

const Tile = ({ icon: Icon, title, desc, to }) => (
  <Link to={to} className="p-6 border border-ink-200 rounded-xl hover:border-brand hover:shadow-md transition-all bg-white">
    <Icon className="w-6 h-6 text-brand" strokeWidth={1.5} />
    <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
    <p className="text-sm text-ink-500 mt-1">{desc}</p>
  </Link>
);

const AccountHome = () => {
  const { user } = useAuth();
  React.useEffect(() => { document.title = 'My Account | Abundant Merchandise'; }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">My Account</p>
        <h1 className="mt-1 font-heading text-3xl md:text-4xl font-bold text-ink-900">Hi, {user?.name || 'there'} 👋</h1>
        <p className="text-ink-500 mt-2">{user?.email}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile icon={Package} title="My Orders" desc="Track packages and view order history" to="/account/orders" />
        <Tile icon={MapPin} title="Addresses" desc="Manage shipping and billing addresses" to="/account/addresses" />
        <Tile icon={CreditCard} title="Payment Methods" desc="Saved cards stored securely with Stripe" to="/account/payment" />
        <Tile icon={User} title="Profile" desc="Update name, email, and password" to="/account/profile" />
        <Tile icon={Sparkles} title="Saved AI Chats" desc="Revisit past shopping assistant conversations" to="/account/chats" />
      </div>
    </div>
  );
};

const Account = () => (
  <Routes>
    <Route index element={<AccountHome />} />
    <Route path="orders" element={<MyOrders />} />
    <Route path="addresses" element={<Addresses />} />
    <Route path="payment" element={<PaymentMethods />} />
    <Route path="profile" element={<Profile />} />
    <Route path="chats" element={<SavedChats />} />
  </Routes>
);

export default Account;
