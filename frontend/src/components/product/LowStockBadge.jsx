import React from 'react';
import { Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PDP } from '@/constants/testIds';

/**
 * Stock urgency display that escalates copy based on remaining qty.
 * - 0 → Out of stock (red)
 * - 1-3 → "Only N left — order soon" (red urgency)
 * - 4-5 → "Almost gone — N left in stock" (amber urgency)
 * - 6-10 → "Low stock — N left" (amber, calmer)
 * - 10+ → "In stock — N available" (emerald, default)
 *
 * Optionally augments with "Selling fast — Xx viewed recently" when view_count is unusually high.
 */
export const LowStockBadge = ({ stock = 0, viewCount = 0 }) => {
  const sellingFast = stock > 0 && viewCount >= 30 && viewCount > stock * 6;

  if (stock <= 0) {
    return (
      <p data-testid={PDP.stockStatus} className="mt-3 text-sm font-semibold text-red-600 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Out of stock
      </p>
    );
  }

  if (stock <= 3) {
    return (
      <div data-testid={PDP.stockStatus} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
        <AlertTriangle className="w-4 h-4 text-red-600" strokeWidth={2.25} />
        <span className="text-sm font-bold text-red-700">
          Only {stock} left — order soon
        </span>
      </div>
    );
  }

  if (stock <= 5) {
    return (
      <div data-testid={PDP.stockStatus} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
        <Flame className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
        <span className="text-sm font-bold text-amber-800">
          Almost gone — {stock} left in stock
        </span>
      </div>
    );
  }

  if (stock <= 10) {
    return (
      <p data-testid={PDP.stockStatus} className="mt-3 text-sm font-semibold text-amber-700 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        Low stock — {stock} left
        {sellingFast && <span className="text-xs font-semibold text-ink-500 ml-2">· Selling fast</span>}
      </p>
    );
  }

  return (
    <p data-testid={PDP.stockStatus} className="mt-3 text-sm font-semibold text-emerald-600 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
      In stock — {stock} available
      {sellingFast && <span className="text-xs font-semibold text-ink-500 ml-2">· Selling fast</span>}
    </p>
  );
};
