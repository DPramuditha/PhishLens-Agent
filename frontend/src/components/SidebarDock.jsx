import { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import gsap from 'gsap';
import Lottie from 'lottie-react';

// ─── Tuning constants ─────────────────────────────────────────────────────────
const ITEM_BASE   = 50;   // px – resting icon cell size
const ITEM_PEAK   = 62;   // px – max magnified icon cell size  (reduced from 76)
const ITEM_GAP    = 5;    // px – gap between icon cells
const DOCK_PX     = 25;   // px – top/bottom internal padding of the pill
const SPREAD      = 1.4;  // gaussian sigma multiplier (reduced – tighter spread)
const TOOLTIP_GAP = 14;   // px – gap between pill edge and tooltip

// ─── Gaussian helper: scale ∈ [0,1] given cursor distance ────────────────────
function gaussScale(distPx) {
  const sigma = (ITEM_BASE * SPREAD) / 2;
  return Math.exp(-(distPx * distPx) / (2 * sigma * sigma));
}

// ─── Compute each item's target size given cursor Y ───────────────────────────
// Returns array of sizes (px) for every item slot
function computeSizes(cursorY, itemCentersY) {
  return itemCentersY.map((cy) => {
    const dist  = Math.abs(cursorY - cy);
    const t     = gaussScale(dist);
    return ITEM_BASE + (ITEM_PEAK - ITEM_BASE) * t;
  });
}

// ─── Total dock pill height from an array of item sizes ──────────────────────
function totalHeight(sizes) {
  return (
    DOCK_PX * 2 +
    sizes.reduce((sum, s) => sum + s, 0) +
    (sizes.length - 1) * ITEM_GAP
  );
}

// ─── DockItem ─────────────────────────────────────────────────────────────────
function DockItem({
  icon,
  label,
  lottieData,
  lottieRef,
  onClick,
  isActive,
  isDarkMode,
  dockItemRef,
  hasDot,
  onPlayLottie,
  onStopLottie,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef   = useRef(null);

  const handleEnter = useCallback(() => {
    setShowTooltip(true);
    onPlayLottie?.();
  }, [onPlayLottie]);

  const handleLeave = useCallback(() => {
    setShowTooltip(false);
    onStopLottie?.();
  }, [onStopLottie]);

  // Tooltip animation
  useEffect(() => {
    if (!tooltipRef.current) return;
    gsap.killTweensOf(tooltipRef.current);
    if (showTooltip) {
      gsap.fromTo(
        tooltipRef.current,
        { opacity: 0, x: -8, scale: 0.85 },
        { opacity: 1, x: 0, scale: 1, duration: 0.2, ease: 'back.out(2.5)' }
      );
    } else {
      gsap.to(tooltipRef.current, {
        opacity: 0, x: -6, scale: 0.88,
        duration: 0.13, ease: 'power2.in',
      });
    }
  }, [showTooltip]);

  return (
    <div
      ref={dockItemRef}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="dock-item relative flex items-center justify-center cursor-pointer select-none"
      style={{
        width:  ITEM_BASE,
        height: ITEM_BASE,
        flexShrink: 0,
        transformOrigin: 'center center',
        willChange: 'width, height',
      }}
    >
      {/* Icon backdrop */}
      <div
        className="absolute inset-0 rounded-[14px] transition-colors duration-150"
        style={{
          background: isActive
            ? 'linear-gradient(135deg, rgba(99,102,241,0.20) 0%, rgba(139,92,246,0.14) 100%)'
            : 'rgba(128,128,128,0.06)',
          border: isActive
            ? '1px solid rgba(99,102,241,0.30)'
            : '1px solid rgba(128,128,128,0.10)',
          boxShadow: isActive
            ? '0 4px 16px rgba(99,102,241,0.22)'
            : 'none',
        }}
      />

      {/* Icon content – scales with parent via % sizing */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: '58%', height: '58%' }}>
        {lottieData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={lottieData}
            autoplay={false}
            loop
            style={{ width: '100%', height: '100%' }}
          />
        ) : icon ? (
          <span className="flex items-center justify-center w-full h-full text-gray-600 dark:text-gray-300">
            {icon}
          </span>
        ) : null}
      </div>

      {/* Active dot */}
      {(isActive || hasDot) && (
        <span
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400"
          style={{ boxShadow: '0 0 5px rgba(99,102,241,0.8)' }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-full whitespace-nowrap opacity-0 z-50"
        style={{ marginLeft: TOOLTIP_GAP }}
      >
        <div
          className="px-3 py-1.5 rounded-xl text-[11.5px] font-semibold tracking-wide shadow-2xl border"
          style={{
            background:  isDarkMode ? 'rgba(30,30,36,0.95)'  : 'rgba(255,255,255,0.96)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
            color:       isDarkMode ? '#e5e7eb' : '#1f2937',
            backdropFilter: 'blur(20px)',
          }}
        >
          {label}
          {/* Arrow */}
          <span
            className="absolute right-full top-1/2 -translate-y-1/2"
            style={{
              borderTop:    '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight:  isDarkMode
                ? '5px solid rgba(30,30,36,0.95)'
                : '5px solid rgba(255,255,255,0.96)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Thin separator ───────────────────────────────────────────────────────────
function DockDivider({ isDarkMode }) {
  return (
    <div
      style={{
        width: '60%',
        height: 1,
        flexShrink: 0,
        margin: `${ITEM_GAP}px 0`,
        background: isDarkMode
          ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.15) 50%, transparent)'
          : 'linear-gradient(to right, transparent, rgba(0,0,0,0.12) 50%, transparent)',
      }}
    />
  );
}

// ─── Main SidebarDock ─────────────────────────────────────────────────────────
export default function SidebarDock({
  items       = [],
  bottomItems = [],
  isDarkMode  = true,
  activeItemId = null,
}) {
  const dockRef    = useRef(null);
  const pillRef    = useRef(null);           // the background pill element
  const itemRefs   = useRef([]);
  const scalesRef  = useRef([]);            // live scale ratios per item
  const isHovering = useRef(false);

  const allItems     = [...items, ...bottomItems];
  const totalItems   = allItems.length;
  const dividerIndex = items.length;        // divider sits between top & bottom groups

  // ── Register item refs ──────────────────────────────────────────────────────
  const setItemRef = useCallback((el, idx) => {
    itemRefs.current[idx] = el;
    scalesRef.current[idx] = 1;
  }, []);

  // ── Recompute and apply magnification ──────────────────────────────────────
  const applyMagnify = useCallback((cursorY) => {
    const els = itemRefs.current;
    if (!pillRef.current) return;

    // Collect current item center Y positions (in viewport coords)
    const centersY = els.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });

    // Compute target sizes
    const sizes = computeSizes(cursorY, centersY);

    // Update each item's width & height via GSAP (keeps layout flow)
    els.forEach((el, i) => {
      if (!el) return;
      const sz = sizes[i];
      scalesRef.current[i] = sz / ITEM_BASE;
      gsap.to(el, {
        width:  sz,
        height: sz,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    // Expand/contract the pill to fit the new total height
    const newH = totalHeight(sizes);
    gsap.to(pillRef.current, {
      height: newH,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, []);

  // ── Reset all sizes ────────────────────────────────────────────────────────
  const resetSizes = useCallback(() => {
    const restH = totalHeight(Array(totalItems).fill(ITEM_BASE));

    itemRefs.current.forEach((el) => {
      if (!el) return;
      gsap.to(el, {
        width:  ITEM_BASE,
        height: ITEM_BASE,
        duration: 0.42,
        ease: 'elastic.out(1, 0.6)',
        overwrite: 'auto',
      });
    });

    if (pillRef.current) {
      gsap.to(pillRef.current, {
        height: restH,
        duration: 0.42,
        ease: 'elastic.out(1, 0.6)',
        overwrite: 'auto',
      });
    }
  }, [totalItems]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    isHovering.current = true;
    applyMagnify(e.clientY);
  }, [applyMagnify]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    resetSizes();
  }, [resetSizes]);

  // ── Set initial pill height and run entrance animation ─────────────────────
  useLayoutEffect(() => {
    const restH = totalHeight(Array(totalItems).fill(ITEM_BASE));
    if (pillRef.current) {
      pillRef.current.style.height = `${restH}px`;
    }
  }, [totalItems]);

  useEffect(() => {
    const pill  = pillRef.current;
    const valid = itemRefs.current.filter(Boolean);
    if (!pill) return;

    // Entrance: slide in from left
    gsap.set(pill, { opacity: 0, x: -28 });
    gsap.to(pill, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 });

    // Items stagger pop-in
    gsap.fromTo(
      valid,
      { opacity: 0, scale: 0.55 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.06, delay: 0.22 }
    );
  }, []);

  return (
    /* Outer wrapper: full-height column, left-edge, centered vertically */
    <div
      className="fixed left-0 top-0 h-screen flex items-center z-40 pointer-events-none"
      style={{ paddingLeft: 10 }}
    >
      {/* The floating pill – height is animated by GSAP */}
      <div
        ref={pillRef}
        className="relative flex flex-col items-center pointer-events-auto overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: ITEM_BASE + 14,        // pill width = icon + side padding
          padding: `${DOCK_PX}px 7px`,
          gap: ITEM_GAP,
          borderRadius: 22,
          boxSizing: 'border-box',
          /* Glass background */
          background:  isDarkMode
            ? 'rgba(26,26,30,0.82)'
            : 'rgba(248,248,252,0.88)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          border: isDarkMode
            ? '1px solid rgba(255,255,255,0.09)'
            : '1px solid rgba(0,0,0,0.07)',
          boxShadow: isDarkMode
            ? '0 20px 60px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.25)'
            : '0 20px 60px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.95)',
          willChange: 'height',
        }}
      >
        {/* Inner specular shine */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[21px]"
          style={{
            background: isDarkMode
              ? 'linear-gradient(155deg, rgba(255,255,255,0.07) 0%, transparent 55%)'
              : 'linear-gradient(155deg, rgba(255,255,255,0.80) 0%, transparent 55%)',
          }}
          aria-hidden
        />

        {/* Top items */}
        {items.map((item, i) => (
          <DockItem
            key={item.id}
            {...item}
            isDarkMode={isDarkMode}
            isActive={item.id === activeItemId}
            dockItemRef={(el) => setItemRef(el, i)}
            onPlayLottie={() => item.lottieRef?.current?.play()}
            onStopLottie={() => item.lottieRef?.current?.stop()}
          />
        ))}

        {/* Divider */}
        {bottomItems.length > 0 && <DockDivider isDarkMode={isDarkMode} />}

        {/* Bottom items */}
        {bottomItems.map((item, i) => (
          <DockItem
            key={item.id}
            {...item}
            isDarkMode={isDarkMode}
            isActive={item.id === activeItemId}
            dockItemRef={(el) => setItemRef(el, items.length + i)}
            onPlayLottie={() => item.lottieRef?.current?.play()}
            onStopLottie={() => item.lottieRef?.current?.stop()}
          />
        ))}
      </div>
    </div>
  );
}
