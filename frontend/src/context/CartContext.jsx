import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSessionId } from '@/lib/sessionId';

const STORAGE_KEY = 'am_cart_v1';
const CartContext = createContext(null);

const lineKey = (productId, variants) => {
  const v = variants ? Object.entries(variants).sort().map(([k, val]) => `${k}=${val}`).join('|') : '';
  return `${productId}::${v}`;
};

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {/* noop */}
  return [];
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadInitial);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {/* noop */}
  }, [items]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const addItem = useCallback((product, qty = 1, variants = null, { silent = false } = {}) => {
    if (!product) return;
    const key = lineKey(product.id, variants);
    const onSale = !!product.sale_price && product.sale_price < product.price;
    const unitPrice = onSale ? product.sale_price : product.price;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          title: product.title,
          image: product.images?.[0] || 'https://placehold.co/200x200?text=No+Image',
          brand: product.brand || '',
          price: product.price,
          sale_price: product.sale_price || null,
          unitPrice,
          qty,
          variants: variants || {},
          fulfillment_type: product.fulfillment_type || 'warehouse',
          sku: product.sku || '',
        },
      ];
    });
    if (!silent) {
      toast.success(`Added to cart: ${product.title}`, { description: `Qty: ${qty}` });
    }
    setDrawerOpen(true);
    // Fire-and-forget analytics — swallow errors so cart never breaks
    api.post(`/products/${product.id}/track`, { type: 'cart_add', session_id: getSessionId() }).catch(() => {});
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, qty: Math.max(1, qty) } : i));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { itemCount, subtotal } = useMemo(() => {
    let c = 0; let s = 0;
    for (const i of items) { c += i.qty; s += i.qty * i.unitPrice; }
    return { itemCount: c, subtotal: s };
  }, [items]);

  const value = useMemo(() => ({
    items, itemCount, subtotal,
    addItem, updateQty, removeItem, clearCart,
    drawerOpen, openDrawer, closeDrawer,
  }), [items, itemCount, subtotal, addItem, updateQty, removeItem, clearCart, drawerOpen, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
