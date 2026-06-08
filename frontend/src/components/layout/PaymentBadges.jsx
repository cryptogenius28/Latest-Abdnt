import React from 'react';

// Inline SVG payment badges so we have zero new dependencies and full styling control.
// Uses currentColor on logo lockups so we can use CSS opacity/grayscale.

const wrap = "w-9 h-6 inline-flex items-center justify-center rounded-sm bg-white border border-ink-700/40 shadow-sm overflow-hidden";

export const PaymentBadges = ({ className = '' }) => {
  return (
    <div
      data-testid="footer-payment-badges"
      aria-label="Accepted payment methods"
      className={`flex items-center gap-2 ${className}`}
    >
      <div className={`${wrap} text-[10px] font-bold tracking-wider text-[#1A1F71] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all`} title="Visa">
        <span>VISA</span>
      </div>
      <div className={`${wrap} text-[7px] font-bold leading-none grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all`} title="Mastercard">
        <span className="relative flex">
          <span className="w-3 h-3 rounded-full bg-[#EB001B]" />
          <span className="w-3 h-3 rounded-full bg-[#F79E1B] -ml-1.5 mix-blend-multiply" />
        </span>
      </div>
      <div className={`${wrap} text-[8px] font-extrabold italic text-[#003087] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all`} title="PayPal">
        <span><span className="text-[#003087]">Pay</span><span className="text-[#0070BA]">Pal</span></span>
      </div>
      <div className={`${wrap} text-[8px] font-semibold text-black bg-white grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all`} title="Apple Pay">
        <span className="text-[10px] leading-none"></span>
        <span className="ml-0.5 text-[8px] font-semibold">Pay</span>
      </div>
      <div className={`${wrap} text-[7px] font-bold text-white bg-[#006FCF] border-[#006FCF] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all`} title="American Express">
        <span>AMEX</span>
      </div>
    </div>
  );
};

export default PaymentBadges;
