import { useEffect, useRef } from 'react';

/**
 * useFocusTrap — giữ keyboard focus bên trong modal khi mở (WCAG 2.1 AA).
 * - Focus phần tử đầu tiên (hoặc container) khi mount
 * - Trap Tab / Shift+Tab trong phạm vi container
 * - Restore focus về trigger trước đó khi unmount
 *
 * Cách dùng:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, isOpen);
 *   <div ref={ref} role="dialog" aria-modal="true">...</div>
 */
export function useFocusTrap<T extends HTMLElement>(
  ref: React.RefObject<T>,
  isOpen: boolean
) {
  const prevActive = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return;
    const container = ref.current;
    prevActive.current = document.activeElement;

    const focusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Focus phần tử đầu tiên (hoặc container)
    const first = focusable()[0];
    (first ?? container).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', onKey);
    return () => {
      container.removeEventListener('keydown', onKey);
      // Restore focus về trigger
      if (prevActive.current instanceof HTMLElement) {
        prevActive.current.focus();
      }
    };
  }, [isOpen, ref]);
}

export default useFocusTrap;
