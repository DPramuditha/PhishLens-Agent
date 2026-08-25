import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useToast } from './ToastContext';
import { PillNotification } from './PillNotification';

/* ─── Single Toast Item Wrapper with GSAP entrance/exit ─── */
function ToastItem({ toast, onDismiss }) {
  const wrapRef = useRef(null);
  const timerRef = useRef(null);

  /* ── dismiss with exit animation ── */
  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!wrapRef.current) {
      onDismiss(toast.id);
      return;
    }

    gsap.to(wrapRef.current, {
      scale: 0.88,
      opacity: 0,
      y: -12,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => onDismiss(toast.id),
    });
  }, [toast.id, onDismiss]);

  /* ── entrance & auto dismiss ── */
  useEffect(() => {
    if (!wrapRef.current) return;

    gsap.fromTo(
      wrapRef.current,
      { scale: 0.85, opacity: 0, y: -16 },
      { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }
    );

    if (toast.duration > 0) {
      timerRef.current = setTimeout(dismiss, toast.duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration, dismiss]);

  return (
    <div ref={wrapRef} style={{ willChange: 'transform, opacity' }}>
      <PillNotification
        type={toast.type || 'info'}
        title={toast.title}
        description={toast.message || toast.description}
        onClose={dismiss}
      />
    </div>
  );
}

/* ─── Toast Container — Top-Right Stack (Max 2 displayed) ─── */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  // Enforce maximum 2 notifications displayed
  const visibleToasts = toasts.slice(-2);

  return (
    <div
      className="popup-title-scope font-inter"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        pointerEvents: 'none',
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'visible',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
