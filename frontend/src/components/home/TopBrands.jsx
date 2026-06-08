import React from 'react';

const BRANDS = [
  { name: 'Nike', gradient: 'from-black to-gray-700' },
  { name: 'Samsung', gradient: 'from-blue-700 to-blue-900' },
  { name: 'Apple', gradient: 'from-gray-700 to-gray-900' },
  { name: 'Sony', gradient: 'from-black to-blue-900' },
  { name: 'Bosch', gradient: 'from-red-700 to-red-900' },
  { name: "L'Oréal", gradient: 'from-rose-700 to-rose-900' },
  { name: 'LEGO', gradient: 'from-yellow-500 to-red-600' },
  { name: 'Michelin', gradient: 'from-blue-500 to-blue-700' },
];

export const TopBrands = () => {
  // Duplicate brands for infinite loop effect
  const loopBrands = [...BRANDS, ...BRANDS];
  return (
    <section data-testid="home-top-brands" className="border-y border-ink-200 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Trusted by shoppers</p>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink-900 mt-1">Top brands we carry</h2>
          </div>
          <p className="hidden md:block text-xs text-ink-500">100% authentic · Manufacturer warranty</p>
        </div>
        <div className="relative">
          <div className="flex gap-4 animate-brand-scroll" style={{ width: 'max-content' }}>
            {loopBrands.map((b, i) => (
              <div
                key={`${b.name}-${i}`}
                className={`flex-shrink-0 h-16 px-8 inline-flex items-center justify-center rounded-full border border-ink-200 bg-gradient-to-br ${b.gradient} text-white font-heading font-bold text-lg tracking-wide min-w-[140px]`}
              >
                {b.name}
              </div>
            ))}
          </div>
          {/* Fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>
      <style>{`
        @keyframes brand-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-brand-scroll { animation: brand-scroll 28s linear infinite; }
        .animate-brand-scroll:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
};
