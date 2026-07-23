import React, { useRef, useState, useEffect } from "react";

// ── Styles ──────────────────────────────────────────────
// Auto-injected on first import. Idempotent (guarded by element id)
// and SSR-safe.
const __PILL_NOTIFICATION_STYLES = `
:root {
  --check-opacity-dur: 500ms;
  --check-rotate-dur: 500ms;
  --check-rotate-from: 80deg;
  --check-bob-dur: 500ms;
  --check-y-amount: 24px;
  --check-blur-dur: 500ms;
  --check-blur-from: 8px;
  --check-path-dur: 500ms;
  --check-path-delay: 100ms;
  --check-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-opacity: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-rotate: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-bob: cubic-bezier(0.34, 1.35, 0.64, 1);
  --check-ease-path: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Compact Pill Notification Container (Subtle Minimal Shadow) ── */
.t-pill-notification {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 8px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 
    0 3px 10px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.02);
  width: 380px;
  max-width: min(380px, calc(100vw - 32px));
  box-sizing: border-box;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  position: relative;
}

.t-pill-notification:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 5px 14px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.03);
}

/* ── Variants Setup ── */
.t-pill-notification[data-type="success"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #bbf7d0, #86efac);
  --badge-color: #15803d;
}

.t-pill-notification[data-type="error"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #fecdd3, #fda4af);
  --badge-color: #9f1239;
}

.t-pill-notification[data-type="warning"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #fef3c7, #fde68a);
  --badge-color: #b45309;
}

.t-pill-notification[data-type="info"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #bfdbfe, #93c5fd);
  --badge-color: #1e40af;
}

/* ── Circular Icon Badge ── */
.t-pill-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--badge-bg);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--badge-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* ── Animated Icon Wrapper (Transitions.dev) ── */
.t-pill-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  opacity: 0;
  will-change: transform, opacity, filter;
}

.t-pill-icon svg {
  display: block;
  overflow: visible;
}

.t-pill-icon svg path {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
}

.t-pill-icon[data-state="in"] {
  animation:
    t-check-fade   var(--check-opacity-dur) var(--check-ease-opacity) forwards,
    t-check-rotate var(--check-rotate-dur)  var(--check-ease-rotate)  forwards,
    t-check-blur   var(--check-blur-dur)    var(--check-ease-out)     forwards,
    t-check-bob    var(--check-bob-dur)     var(--check-ease-bob)     forwards;
}

.t-pill-icon[data-state="in"] svg path {
  animation: t-check-draw var(--check-path-dur) var(--check-ease-path) var(--check-path-delay, 0ms) forwards;
}

@keyframes t-check-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes t-check-rotate {
  from { transform: rotate(var(--check-rotate-from)); }
  to   { transform: rotate(0deg); }
}
@keyframes t-check-blur {
  from { filter: blur(var(--check-blur-from)); }
  to   { filter: blur(0); }
}
@keyframes t-check-bob {
  from { translate: 0 var(--check-y-amount); }
  to   { translate: 0 0; }
}
@keyframes t-check-draw { to { stroke-dashoffset: 0; } }

/* ── Content Area ── */
.t-pill-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  padding-right: 4px;
}

.t-pill-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  text-align: left;
  width: 100%;
}

.t-pill-desc {
  font-size: 12.5px;
  font-weight: 400;
  color: #64748b;
  text-align: left;
  word-break: break-word;
  white-space: normal;
  width: 100%;
}

/* ── Dismiss Button ── */
.t-pill-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.t-pill-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #334155;
}

/* ── Dark Mode ── */
.dark .t-pill-notification {
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.1);
}
.dark .t-pill-title { color: #f8fafc; }
.dark .t-pill-desc { color: #94a3b8; font-weight: 400; }
.dark .t-pill-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.dark .t-pill-notification[data-type="success"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #166534, #14532d);
  --badge-color: #4ade80;
}
.dark .t-pill-notification[data-type="error"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #9f1239, #881337);
  --badge-color: #fb7185;
}
.dark .t-pill-notification[data-type="warning"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #92400e, #78350f);
  --badge-color: #fcd34d;
}
.dark .t-pill-notification[data-type="info"] {
  --badge-bg: radial-gradient(circle at 30% 30%, #1e40af, #1e3a8a);
  --badge-color: #93c5fd;
}

@media (prefers-reduced-motion: reduce) {
  .t-pill-icon { animation: none !important; opacity: 1; }
  .t-pill-icon svg path { animation: none !important; stroke-dashoffset: 0 !important; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("transitions-pill-notification-styles")) {
  const __style = document.createElement("style");
  __style.id = "transitions-pill-notification-styles";
  __style.textContent = __PILL_NOTIFICATION_STYLES;
  document.head.appendChild(__style);
}

/**
 * Animated SVG Icons for each Notification Type
 */
const NOTIFICATION_ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4m0 4h.01M12 3l9 17H3L12 3z" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v.01M12 12v5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

/**
 * PillNotification Component (Supports success, error, warning, info)
 */
export function PillNotification({
  type = "success",
  title,
  description = "Notification Description",
  autoTrigger = true,
  onClose,
}) {
  const [animState, setAnimState] = useState("out");
  const iconRef = useRef(null);

  const triggerAnimation = () => {
    setAnimState("out");
    requestAnimationFrame(() => {
      if (iconRef.current) void iconRef.current.offsetWidth;
      setAnimState("in");
    });
  };

  useEffect(() => {
    if (autoTrigger) {
      triggerAnimation();
    }
  }, [autoTrigger, type]);

  const IconSvg = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info;

  return (
    <div className="t-pill-notification" data-type={type}>
      {/* Notification Icon Badge */}
      <div 
        className="t-pill-badge" 
        onClick={triggerAnimation}
        title="Click to replay animation" 
        style={{ cursor: 'pointer' }}
      >
        <span ref={iconRef} className="t-pill-icon" data-state={animState} aria-hidden="true">
          {IconSvg}
        </span>
      </div>

      {/* Notification Content */}
      <div className="t-pill-content">
        {title && <div className="t-pill-title">{title}</div>}
        <div className="t-pill-desc">{description}</div>
      </div>

      {/* Close button if onClose is provided */}
      {onClose && (
        <button type="button" className="t-pill-close" onClick={onClose} aria-label="Close notification">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Full Showcase / Demo of all notification types (Success, Error, Warning, Info)
 */
export default function PillNotificationShowcase() {
  const [key, setKey] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "20px" }}>
      <PillNotification key={`success-${key}`} type="success" title="Success!" description="Operation completed successfully." />
      <PillNotification key={`error-${key}`} type="error" title="Invalid URL Format" description="Please enter a valid website URL or domain name (e.g. google.com)" />
      <PillNotification key={`warning-${key}`} type="warning" title="Warning!" description="Storage limit is almost full." />
      <PillNotification key={`info-${key}`} type="info" title="Information" description="New updates are available." />

      <button
        type="button"
        onClick={() => setKey(k => k + 1)}
        style={{
          marginTop: "12px",
          padding: "8px 18px",
          borderRadius: "9999px",
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
        }}
      >
        Replay All Animations
      </button>
    </div>
  );
}
