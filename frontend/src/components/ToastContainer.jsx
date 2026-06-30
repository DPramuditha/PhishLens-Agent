import { useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import gsap from 'gsap';
import { useToast } from './ToastContext';

/* ─── Toast type config ─── */
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    accent: '#10b981',          // emerald-500
    accentDim: 'rgba(16,185,129,0.12)',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    accent: '#f43f5e',          // rose-500
    accentDim: 'rgba(244,63,94,0.12)',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    accent: '#f59e0b',          // amber-500
    accentDim: 'rgba(245,158,11,0.12)',
    label: 'Warning',
  },
  info: {
    icon: Info,
    accent: '#6366f1',          // indigo-500
    accentDim: 'rgba(99,102,241,0.12)',
    label: 'Info',
  },
};

/* ─── Single Toast Item with popup GSAP animation ─── */
function ToastItem({ toast, onDismiss }) {
  const wrapRef  = useRef(null);
  const cardRef  = useRef(null);
  const iconRef  = useRef(null);
  const ringRef  = useRef(null);
  const textRef  = useRef(null);
  const barRef   = useRef(null);
  const timerRef = useRef(null);

  const cfg  = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = cfg.icon;

  /* ── dismiss with exit animation ── */
  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!wrapRef.current) { onDismiss(toast.id); return; }

    const tl = gsap.timeline({ onComplete: () => onDismiss(toast.id) });
    tl.to(cardRef.current, {
      scale: 0.85,
      opacity: 0,
      y: -18,
      duration: 0.32,
      ease: 'back.in(1.6)',
    })
    .to(wrapRef.current, {
      height: 0,
      marginBottom: 0,
      duration: 0.25,
      ease: 'power3.inOut',
    }, '-=0.1');
  }, [toast.id, onDismiss]);

  /* ── entrance animation ── */
  useEffect(() => {
    if (!cardRef.current) return;

    const tl = gsap.timeline();

    // 1  — popup scale + fade
    tl.fromTo(cardRef.current,
      { scale: 0.3, opacity: 0, y: -30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.7)' }
    );

    // 2  — icon ring pulse
    if (ringRef.current) {
      tl.fromTo(ringRef.current,
        { scale: 0, opacity: 0.9 },
        { scale: 1.8, opacity: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.35'
      );
    }

    // 3  — icon bounce
    if (iconRef.current) {
      tl.fromTo(iconRef.current,
        { scale: 0, rotation: -45 },
        { scale: 1, rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)' },
        '-=0.5'
      );
    }

    // 4  — stagger text lines
    if (textRef.current) {
      const children = textRef.current.children;
      tl.fromTo(children,
        { opacity: 0, x: 16 },
        { opacity: 1, x: 0, stagger: 0.08, duration: 0.35, ease: 'power3.out' },
        '-=0.3'
      );
    }

    // 5  — progress bar countdown
    if (barRef.current && toast.duration > 0) {
      gsap.fromTo(barRef.current,
        { scaleX: 1 },
        { scaleX: 0, duration: toast.duration / 1000, ease: 'none', delay: 0.3 }
      );
    }

    // 6  — auto dismiss
    if (toast.duration > 0) {
      timerRef.current = setTimeout(dismiss, toast.duration);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.duration, dismiss]);

  return (
    <div ref={wrapRef} style={{ overflow: 'visible' }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          maxWidth: '92vw',
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
          willChange: 'transform, opacity',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          background: 'var(--toast-bg)',
          border: '1px solid var(--toast-border)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px ${cfg.accentDim}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 14px 14px 16px' }}>
          {/* Icon with ring pulse */}
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
            {/* Expanding ring */}
            <div
              ref={ringRef}
              style={{
                position: 'absolute', inset: -6,
                borderRadius: '50%',
                border: `2px solid ${cfg.accent}`,
                pointerEvents: 'none',
              }}
            />
            {/* Icon circle */}
            <div
              ref={iconRef}
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cfg.accentDim,
                color: cfg.accent,
              }}
            >
              <Icon size={18} strokeWidth={2.5} />
            </div>
          </div>

          {/* Text */}
          <div ref={textRef} style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            {toast.title && (
              <h4 style={{
                margin: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.3,
                color: 'var(--toast-title)',
                letterSpacing: '-0.01em',
              }}>
                {toast.title}
              </h4>
            )}
            <p style={{
              margin: toast.title ? '3px 0 0' : 0,
              fontSize: 12.5, fontWeight: 500, lineHeight: 1.45,
              color: 'var(--toast-msg)',
              wordBreak: 'break-word',
            }}>
              {toast.message}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 8,
              border: 'none', background: 'transparent',
              color: 'var(--toast-close)',
              cursor: 'pointer', transition: 'background .15s, color .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--toast-close-hover-bg)'; e.currentTarget.style.color = 'var(--toast-close-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--toast-close)'; }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Progress bar */}
        {toast.duration > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'var(--toast-bar-track)',
          }}>
            <div
              ref={barRef}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}aa)`,
                transformOrigin: 'left center',
                borderRadius: '0 2px 2px 0',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Toast Container — top-right stack ─── */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const containerRef = useRef(null);

  return (
    <>
      {/* CSS variables for light/dark */}
      <style>{`
        :root {
          --toast-bg: rgba(255,255,255,0.92);
          --toast-border: rgba(0,0,0,0.08);
          --toast-title: #111827;
          --toast-msg: #6b7280;
          --toast-close: #9ca3af;
          --toast-close-hover: #374151;
          --toast-close-hover-bg: rgba(0,0,0,0.05);
          --toast-bar-track: rgba(0,0,0,0.06);
        }
        .dark {
          --toast-bg: rgba(24,24,27,0.88);
          --toast-border: rgba(255,255,255,0.07);
          --toast-title: #f9fafb;
          --toast-msg: #9ca3af;
          --toast-close: #6b7280;
          --toast-close-hover: #e5e7eb;
          --toast-close-hover-bg: rgba(255,255,255,0.06);
          --toast-bar-track: rgba(255,255,255,0.06);
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'none',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'visible',
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </>
  );
}
