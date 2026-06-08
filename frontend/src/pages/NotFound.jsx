import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  useEffect(() => { document.title = 'Page Not Found | Abundant Merchandise'; }, []);
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">404</p>
      <h1 className="mt-2 font-heading text-4xl md:text-5xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-4 text-ink-500">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link to="/" className="inline-block mt-8 bg-brand hover:bg-brand-600 text-white font-semibold rounded-md px-6 py-3">
        Back to homepage
      </Link>
    </div>
  );
};

export default NotFound;
