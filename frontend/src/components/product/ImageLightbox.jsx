import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Fullscreen image lightbox for the PDP gallery.
 * Swipe-left/right or click chevrons to cycle. Tap close or press Escape to dismiss.
 */
export const ImageLightbox = ({ images = [], startIndex = 0, open, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => { if (open) setIdx(startIndex); }, [open, startIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length);
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, images.length, onClose]);

  if (!open || !images.length) return null;

  const next = () => setIdx((i) => (i + 1) % images.length);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);

  const onTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta > 50) prev();
    else if (delta < -50) next();
    setTouchStartX(null);
  };

  return (
    <div
      data-testid="image-lightbox"
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center touch-manipulation"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        data-testid="image-lightbox-close"
        className="absolute top-4 right-4 w-11 h-11 inline-flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full"
      >
        <X className="w-5 h-5" strokeWidth={2} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous image"
            data-testid="image-lightbox-prev"
            className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next image"
            data-testid="image-lightbox-next"
            className="hidden md:inline-flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2} />
          </button>
        </>
      )}
      <div
        className="w-full h-full flex items-center justify-center p-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          data-testid="image-lightbox-image"
          src={images[idx]}
          alt={`Product image ${idx + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>
      {images.length > 1 && (
        <div data-testid="image-lightbox-counter" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">
          {idx + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
