import React, { useRef, useState, useEffect } from "react";

// ── Styles ──────────────────────────────────────────────
const __NOTIFICATION_STYLES = `
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
.t-notification-pill {
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
}

.t-notification-pill:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 5px 14px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.03);
}

/* ── Circular Icon Badge ── */
.t-notification-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #bbf7d0, #86efac);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #15803d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* ── Success Check Wrapper ── */
.t-success-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  opacity: 0;
  will-change: transform, opacity, filter;
}

.t-success-check svg {
  display: block;
  overflow: visible;
}

.t-success-check svg path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
}

.t-success-check[data-state="in"] {
  animation:
    t-check-fade   var(--check-opacity-dur) var(--check-ease-opacity) forwards,
    t-check-rotate var(--check-rotate-dur)  var(--check-ease-rotate)  forwards,
    t-check-blur   var(--check-blur-dur)    var(--check-ease-out)     forwards,
    t-check-bob    var(--check-bob-dur)     var(--check-ease-bob)     forwards;
}

.t-success-check[data-state="in"] svg path {
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
.t-notification-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  padding-right: 4px;
}

.t-notification-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  text-align: left;
  width: 100%;
}

.t-notification-desc {
  font-size: 12.5px;
  font-weight: 400;
  color: #64748b;
  text-align: left;
  word-break: break-word;
  white-space: normal;
  width: 100%;
}

/* ── Dark Mode ── */
.dark .t-notification-pill {
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.1);
}
.dark .t-notification-title { color: #f8fafc; }
.dark .t-notification-desc { color: #94a3b8; font-weight: 400; }
.dark .t-notification-badge {
  background: radial-gradient(circle at 30% 30%, #166534, #14532d);
  color: #4ade80;
}

@media (prefers-reduced-motion: reduce) {
  .t-success-check { animation: none !important; opacity: 1; }
  .t-success-check svg path { animation: none !important; stroke-dashoffset: 0 !important; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("transitions-notification-styles")) {
  const __style = document.createElement("style");
  __style.id = "transitions-notification-styles";
  __style.textContent = __NOTIFICATION_STYLES;
  document.head.appendChild(__style);
}

export function SuccessNotification({
  title = "Success!",
  description = "Notification Description",
  autoTrigger = true,
}) {
  const [animState, setAnimState] = useState("out");
  const checkRef = useRef(null);

  const triggerAnimation = () => {
    setAnimState("out");
    requestAnimationFrame(() => {
      if (checkRef.current) void checkRef.current.offsetWidth;
      setAnimState("in");
    });
  };

  useEffect(() => {
    if (autoTrigger) {
      triggerAnimation();
    }
  }, [autoTrigger]);

  return (
    <div className="t-notification-pill">
      <div 
        className="t-notification-badge" 
        onClick={triggerAnimation}
        title="Click to replay animation" 
        style={{ cursor: 'pointer' }}
      >
        <span ref={checkRef} className="t-success-check" data-state={animState} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      </div>

      <div className="t-notification-content">
        {title && <div className="t-notification-title">{title}</div>}
        <div className="t-notification-desc">{description}</div>
      </div>
    </div>
  );
}

export default SuccessNotification;
