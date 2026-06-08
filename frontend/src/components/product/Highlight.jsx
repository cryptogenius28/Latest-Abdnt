import React from 'react';

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const Highlight = ({ text = '', query = '', className = '' }) => {
  if (!query || !text) return <>{text}</>;
  const safe = escapeRegExp(query.trim());
  if (!safe) return <>{text}</>;
  const re = new RegExp(`(${safe})`, 'ig');
  const parts = String(text).split(re);
  const lowerQ = query.trim().toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part && part.toLowerCase() === lowerQ ? (
          <mark key={i} className={`bg-brand/20 text-ink-900 rounded-sm px-0.5 ${className}`}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};
