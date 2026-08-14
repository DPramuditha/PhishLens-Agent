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
    if (!wrapRef.current) { onDismiss(toast.id); return; }

    gsap.to(wrapRef.current, {
      scale: 0.88,
      opacity: 0,
      y: -14,
      duration: 0.3,
      ease: 'back.in(1.4)',
      onComplete: () => onDismiss(toast.id),
    });
  }, [toast.id, onDismiss]);

  /* ── entrance & auto dismiss ── */
  useEffect(() => {
    if (!wrapRef.current) return;

    gsap.fromTo(
      wrapRef.current,
      { scale: 0.8, opacity: 0, y: -20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }
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

/* ─── Toast Container — Top-Right Stack ─── */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
        maxHeight: 'calc(100vh - 80px)',
        overflow: 'visible',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
