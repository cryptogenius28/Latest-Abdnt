import React from 'react';
import { Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { NAV } from '@/constants/testIds';

export const AnnouncementBar = () => (
  <div
    data-testid={NAV.announcementBar}
    className="bg-ink-900 text-white text-xs"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-6">
      <div className="hidden md:flex items-center gap-6">
        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />Free shipping over $49</span>
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />30-day returns</span>
      </div>
      <div className="flex-1 md:flex-none text-center md:text-right flex items-center justify-center md:justify-end gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />
        <span className="font-medium tracking-wide">FLASH SALE — up to 40% off select categories</span>
      </div>
    </div>
  </div>
);
