import { useCallback, useEffect, useState } from 'react';

const KEY = 'abundant.recentlyViewed';
const MAX = 12;

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const save = (ids) => {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ }
};

/**
 * localStorage-backed list of recently viewed product IDs (newest first, capped at MAX).
 * Cross-tab synced via the 'storage' event.
 */
export const useRecentlyViewed = () => {
  const [ids, setIds] = useState(load);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setIds(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const track = useCallback((productId) => {
    if (!productId) return;
    setIds((prev) => {
      const next = [productId, ...prev.filter((x) => x !== productId)].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => { setIds([]); save([]); }, []);

  return { ids, track, clear };
};
