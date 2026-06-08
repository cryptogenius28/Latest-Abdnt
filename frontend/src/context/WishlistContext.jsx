import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'am_wishlist_v1';
const WishlistContext = createContext(null);

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {/* noop */}
  return [];
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(loadInitial);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {/* noop */}
  }, [items]);

  const isWished = useCallback((id) => items.some((i) => i.productId === id), [items]);

  const addItem = useCallback((product) => {
    if (!product) return;
    setItems((prev) => {
      if (prev.some((i) => i.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          image: product.images?.[0] || 'https://placehold.co/200x200?text=No+Image',
          price: product.price,
          sale_price: product.sale_price || null,
          brand: product.brand || '',
          rating: product.rating || 0,
          review_count: product.review_count || 0,
          fulfillment_type: product.fulfillment_type || 'warehouse',
          images: product.images || [],
        },
      ];
    });
    toast.success(`Added to wishlist: ${product.title}`);
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const toggle = useCallback((product) => {
    if (!product) return;
    if (items.some((i) => i.productId === product.id)) {
      removeItem(product.id);
      toast(`Removed from wishlist: ${product.title}`);
    } else {
      addItem(product);
    }
  }, [items, addItem, removeItem]);

  const clearAll = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items, count: items.length, isWished, addItem, removeItem, toggle, clearAll,
  }), [items, isWished, addItem, removeItem, toggle, clearAll]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
