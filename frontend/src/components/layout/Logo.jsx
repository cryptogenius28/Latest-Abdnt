import React from 'react';
import { Link } from 'react-router-dom';
import { NAV } from '@/constants/testIds';

export const Logo = ({ inverted = false }) => (
  <Link
    to="/"
    data-testid={NAV.logoLink}
    className="flex items-center gap-2.5 group"
    aria-label="Abundant Merchandise — Home"
  >
    <span className="am-logo-mark transition-transform duration-300 group-hover:rotate-12" />
    <span className={`leading-none font-heading ${inverted ? 'text-white' : 'text-ink-900'}`}>
      <span className="block text-[15px] sm:text-[17px] font-bold tracking-tight">Abundant</span>
      <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
        Merchandise
      </span>
    </span>
  </Link>
);
