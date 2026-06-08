import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'am_cookie_consent';
const SESSION_KEY = 'am_cookie_dismissed_session';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
      setVisible(true);
    } catch { /* noop */ }
  }, []);

  // Reflect banner height to <body> as a CSS var so pages can pad their bottom while it's open.
  useEffect(() => {
    const root = document.body;
    if (!root) return undefined;
    if (visible) root.classList.add('has-cookie-banner');
    else root.classList.remove('has-cookie-banner');
    return () => root.classList.remove('has-cookie-banner');
  }, [visible]);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch { /* noop */ }
    setVisible(false);
  };

  const dismissForSession = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* noop */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-banner"
      // Stay above MobileBottomNav (h-14 = 56px) on small screens + safe area; flush to bottom on large.
      className="fixed left-0 right-0 z-40 bg-ink-900 border-t border-ink-700 px-4 py-3 lg:px-8 lg:py-4 animate-in slide-in-from-bottom duration-300 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0"
    >
      <div className="max-w-7xl mx-auto flex flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Cookie className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-xs sm:text-sm text-ink-300 leading-relaxed">
            We use cookies to improve your experience. By continuing, you agree to our{' '}
            <Link to="/privacy" className="text-brand hover:underline font-medium">
              Privacy Policy
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            type="button"
            data-testid="cookie-accept"
            onClick={accept}
            className="h-9 px-3 sm:px-4 bg-brand hover:bg-brand-600 text-white text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
          >
            Accept all
          </button>
          <button
            type="button"
            data-testid="cookie-dismiss"
            aria-label="Dismiss"
            onClick={dismissForSession}
            className="w-9 h-9 inline-flex items-center justify-center text-ink-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};
