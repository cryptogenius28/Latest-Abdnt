import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      data-testid="back-to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 w-10 h-10 rounded-full bg-ink-900 hover:bg-brand text-white shadow-lg inline-flex items-center justify-center transition-colors duration-200"
    >
      <ChevronUp className="w-5 h-5" strokeWidth={2} />
    </button>
  );
};
