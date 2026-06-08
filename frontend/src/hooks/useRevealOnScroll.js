import { useEffect, useRef, useState } from 'react';

/**
 * Adds an `is-visible` class to the returned ref when the element enters the viewport.
 * Pair with the .reveal CSS class for fade+slide entrance.
 *
 * Options:
 *   threshold: 0.15 by default
 *   rootMargin: '0px 0px -40px 0px' so elements reveal slightly before fully in view
 *   once: true by default (un-observe after first reveal)
 */
export const useRevealOnScroll = ({
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
  once = true,
} = {}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      // SSR / very old browsers: just mark visible.
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, visible];
};

export default useRevealOnScroll;
