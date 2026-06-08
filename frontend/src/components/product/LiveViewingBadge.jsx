import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Subtle live-viewing badge. Polls /viewing-now once on mount.
 * Hidden unless >= 2 distinct viewers in last 15 minutes.
 */
export const LiveViewingBadge = ({ productId, className = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/products/${productId}/viewing-now`);
        if (!cancelled) setCount(Number(r.data?.count) || 0);
      } catch {
        // silent — badge just stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  if (count < 2) return null;

  const label = count > 20
    ? '20+ people viewing right now'
    : count >= 6
      ? `${count} people viewing right now`
      : `${count} people viewing this`;

  return (
    <div
      data-testid="live-viewing-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Eye className="w-3.5 h-3.5" strokeWidth={2} />
      <span>{label}</span>
    </div>
  );
};
