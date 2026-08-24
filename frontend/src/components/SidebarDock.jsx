import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import gsap from 'gsap';
import Lottie from 'lottie-react';
import { useAuth } from '../context/AuthContext';

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

// ─── Total dock pill height from an array of item sizes ──────────────────────
function totalHeight(sizes, hasDivider) {
  const dividerHeight = hasDivider ? 1 + ITEM_GAP * 2 : 0;
  const numGaps = sizes.length - 1 + (hasDivider ? 1 : 0);
  return (
    DOCK_PX * 2 +
    sizes.reduce((sum, s) => sum + s, 0) +
    numGaps * ITEM_GAP +
    dividerHeight
  );
}

// ─── DockItem ─────────────────────────────────────────────────────────────────
function DockItem({
  id,
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
  isExpanded,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef   = useRef(null);
  const iconContentRef = useRef(null);
  const isLogo = id === 'logo';

  const handleEnter = useCallback(() => {
    setShowTooltip(true);
    onPlayLottie?.();
    // Scale-up animation when sidebar is expanded
    if (isExpanded && iconContentRef.current) {
      gsap.to(iconContentRef.current, {
        scale: 1.18,
        duration: 0.3,
        ease: 'back.out(2.5)',
        overwrite: 'auto',
      });
    }
  }, [onPlayLottie, isExpanded]);

  const handleLeave = useCallback(() => {
    setShowTooltip(false);
    onStopLottie?.();
    // Scale-down animation when sidebar is expanded
    if (isExpanded && iconContentRef.current) {
      gsap.to(iconContentRef.current, {
        scale: 1,
        duration: 0.35,
        ease: 'elastic.out(1, 0.5)',
        overwrite: 'auto',
      });
    }
  }, [onStopLottie, isExpanded]);

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
      <div ref={iconContentRef} className="relative z-10 flex items-center justify-center" style={{ width: isLogo ? '92%' : '58%', height: isLogo ? '92%' : '58%', transform: isLogo ? 'scale(1.25)' : 'none', willChange: isExpanded ? 'transform' : 'auto' }}>
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

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── ChatHistoryPanel Subcomponent (Real PostgreSQL History) ────────────────
function ChatHistoryPanel({ isExpanded, isDarkMode, onSelectChat, activeChatId, refreshKey }) {
  const containerRef = useRef(null);
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChats = useCallback(async (query = '') => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/?q=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching chat history in sidebar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isExpanded) {
      fetchChats(search);
    }
  }, [isExpanded, search, refreshKey, fetchChats]);

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/${chatId}/`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (err) {
      console.error('Error deleting chat from sidebar:', err);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.killTweensOf(containerRef.current);
    if (isExpanded) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: 12 },
        { opacity: 1, x: 0, duration: 0.35, delay: 0.18, ease: 'power2.out' }
      );
    } else {
      gsap.to(containerRef.current, { opacity: 0, x: 8, duration: 0.15 });
    }
  }, [isExpanded]);

  if (!isExpanded) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col pl-4 border-l overflow-hidden"
      style={{
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        width: 228,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold tracking-wide text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span>Chat History</span>
          {chats.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              {chats.length}
            </span>
          )}
        </h3>
      </div>

      {/* Search Input */}
      <div className="relative mb-3 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.2"
          stroke="currentColor"
          className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5 pb-2">
        {isLoading && chats.length === 0 ? (
          <div className="text-[11px] text-gray-400 text-center py-6 flex items-center justify-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Loading history...</span>
          </div>
        ) : chats.map((chat) => {
          const isActive = String(chat.id) === String(activeChatId);
          const riskLevel = chat.last_message?.risk_level;
          const riskScore = chat.last_message?.risk_score;

          let badgeColor = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
          if (riskScore !== null && riskScore !== undefined) {
            if (riskScore >= 61) badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40';
            else if (riskScore >= 41) badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40';
            else badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40';
          }

          return (
            <div
              key={chat.id}
              className={`group relative p-2.5 rounded-xl text-left cursor-pointer transition-all duration-200 border ${
                isActive
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500/30 text-indigo-900 dark:text-indigo-200 shadow-sm'
                  : 'bg-gray-50/50 dark:bg-white/2 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 border-gray-200/40 dark:border-white/2 hover:border-indigo-500/20 active:scale-[0.98]'
              }`}
              onClick={() => {
                if (onSelectChat) {
                  onSelectChat(chat.id);
                }
              }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <span className={`text-[12px] font-semibold truncate flex-1 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`}>
                  {chat.title}
                </span>

                {riskLevel && (
                  <span className={`text-[9px] font-bold px-1.2 py-0.2 rounded shrink-0 ${badgeColor}`}>
                    {riskScore !== null ? `${riskScore}%` : riskLevel}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                <span className="truncate">
                  {formatRelativeTime(chat.updated_at || chat.created_at)}
                </span>

                {/* Hover Delete Action */}
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-0.5 rounded transition-all duration-150 cursor-pointer"
                  title="Delete chat"
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {!isLoading && chats.length === 0 && (
          <div className="text-[11px] text-gray-400 text-center py-6">
            {search ? `No chats match "${search}"` : 'No previous chats'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main SidebarDock ─────────────────────────────────────────────────────────
export default function SidebarDock({
  items        = [],
  bottomItems  = [],
  isDarkMode   = true,
  activeItemId = null,
  isExpanded   = false,
  onSelectChat = null,
  activeChatId = null,
  refreshKey   = 0,
}) {
  const dockRef    = useRef(null);
  const pillRef    = useRef(null);           // the background pill element
  const itemRefs   = useRef([]);
  const scalesRef  = useRef([]);            // live scale ratios per item
  const isHovering = useRef(false);
  const isMounted  = useRef(false);

  const allItems     = [...items, ...bottomItems];
  const totalItems   = allItems.length;
  const hasDivider   = bottomItems.length > 0;

  const { itemBases, itemPeaks } = useMemo(() => {
    const bases = allItems.map(() => ITEM_BASE);
    const peaks = allItems.map(() => ITEM_PEAK);
    return { itemBases: bases, itemPeaks: peaks };
  }, [items, bottomItems]);

  const maxBase = useMemo(() => Math.max(...itemBases, ITEM_BASE), [itemBases]);
  const restH = useMemo(() => totalHeight(itemBases, hasDivider), [itemBases, hasDivider]);

  // ── Register item refs ──────────────────────────────────────────────────────
  const setItemRef = useCallback((el, idx) => {
    itemRefs.current[idx] = el;
    scalesRef.current[idx] = 1;
  }, []);

  // ── Recompute and apply magnification ──────────────────────────────────────
  const applyMagnify = useCallback((cursorY) => {
    if (isExpanded) return; // Disable hover zoom when sidebar is expanded
    const els = itemRefs.current;
    if (!pillRef.current) return;

    // Collect current item center Y positions (in viewport coords)
    const centersY = els.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });

    // Compute target sizes
    const targetSizes = centersY.map((cy, i) => {
      const dist  = Math.abs(cursorY - cy);
      const t     = gaussScale(dist);
      const base  = itemBases[i] || ITEM_BASE;
      const peak  = itemPeaks[i] || ITEM_PEAK;
      return base + (peak - base) * t;
    });

    // Update each item's width & height via GSAP (keeps layout flow)
    els.forEach((el, i) => {
      if (!el) return;
      const sz = targetSizes[i];
      const base = itemBases[i] || ITEM_BASE;
      scalesRef.current[i] = sz / base;
      gsap.to(el, {
        width:  sz,
        height: sz,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    // Expand/contract the pill to fit the new total height
    const newH = totalHeight(targetSizes, hasDivider);
    gsap.to(pillRef.current, {
      height: newH,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [isExpanded, itemBases, itemPeaks, hasDivider]);

  // ── Reset all sizes ────────────────────────────────────────────────────────
  const resetSizes = useCallback(() => {
    if (isExpanded) return;
    const restH = totalHeight(itemBases);

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const base = itemBases[i] || ITEM_BASE;
      gsap.to(el, {
        width:  base,
        height: base,
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
  }, [isExpanded, itemBases, hasDivider]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (isExpanded) return;
    isHovering.current = true;
    applyMagnify(e.clientY);
  }, [applyMagnify, isExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (isExpanded) return;
    isHovering.current = false;
    resetSizes();
  }, [resetSizes, isExpanded]);

  // ── Set initial pill height and run entrance animation ─────────────────────
  useLayoutEffect(() => {
    if (isExpanded) return;
    const restH = totalHeight(itemBases, hasDivider);
    if (pillRef.current) {
      pillRef.current.style.height = `${restH}px`;
    }
  }, [isExpanded, itemBases, hasDivider]);

  useEffect(() => {
    const pill  = pillRef.current;
    const valid = itemRefs.current.filter(Boolean);
    if (!pill) return;

    // Entrance: slide in from left
    gsap.set(pill, { opacity: 0, x: -28 });
    const pillTween = gsap.to(pill, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 });

    // Items stagger pop-in
    const itemsTween = gsap.fromTo(
      valid,
      { opacity: 0, scale: 0.55 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.06, delay: 0.22 }
    );

    return () => {
      pillTween.kill();
      itemsTween.kill();
    };
  }, []);

  // ── Handle expansion state changes with GSAP ────────────────────────────────
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (!pillRef.current) return;

    // Kill any active height tweens running on the pill container
    gsap.killTweensOf(pillRef.current, 'height');
    
    // Animate items to their resting base sizes
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const base = itemBases[i] || ITEM_BASE;
      gsap.to(el, {
        width: base,
        height: base,
        duration: 0.3,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    });
  }, [isExpanded, itemBases, maxBase, hasDivider]);

  return (
    /* Outer wrapper: full-height column, left-edge, centered vertically */
    <div
      className="fixed left-0 top-0 h-screen flex items-center z-40 pointer-events-none"
      style={{ paddingLeft: 10 }}
    >
      {/* The floating pill – height and width animated dynamically */}
      <div
        ref={pillRef}
        className="relative flex flex-row items-stretch pointer-events-auto overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: isExpanded ? 320 : (maxBase + 14),
          height: isExpanded ? 'calc(100vh - 24px)' : restH,
          padding: isExpanded ? '24px 16px' : `${DOCK_PX}px 7px`,
          gap: ITEM_GAP,
          borderRadius: isExpanded ? 24 : 22,
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
          transition: 'width 0.5s cubic-bezier(0.25, 1, 0.5, 1), height 0.5s cubic-bezier(0.25, 1, 0.5, 1), padding 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: 'width, height, padding, border-radius',
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

        {/* LEFT COLUMN: Dock Icons */}
        <div
          className="flex flex-col items-center shrink-0"
          style={{
            width: maxBase,
            gap: ITEM_GAP,
            height: isExpanded ? '100%' : 'auto',
          }}
        >
          {/* Top group: main items */}
          <div className="flex flex-col items-center" style={{ gap: ITEM_GAP }}>
            {items.map((item, i) => (
              <DockItem
                key={item.id}
                {...item}
                isDarkMode={isDarkMode}
                isActive={item.id === activeItemId}
                isExpanded={isExpanded}
                dockItemRef={(el) => setItemRef(el, i)}
                onPlayLottie={() => item.lottieRef?.current?.play()}
                onStopLottie={() => item.lottieRef?.current?.stop()}
              />
            ))}
          </div>

          {/* Spacer to push bottom items down when expanded */}
          {isExpanded && <div className="flex-1" />}

          {/* Bottom group: divider + bottom items */}
          <div className="flex flex-col items-center" style={{ gap: ITEM_GAP }}>
            {bottomItems.length > 0 && <DockDivider isDarkMode={isDarkMode} />}
            {bottomItems.map((item, i) => (
              <DockItem
                key={item.id}
                {...item}
                isDarkMode={isDarkMode}
                isActive={item.id === activeItemId}
                isExpanded={isExpanded}
                dockItemRef={(el) => setItemRef(el, items.length + i)}
                onPlayLottie={() => item.lottieRef?.current?.play()}
                onStopLottie={() => item.lottieRef?.current?.stop()}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat History Panel (Real PostgreSQL History) */}
        <ChatHistoryPanel
          isExpanded={isExpanded}
          isDarkMode={isDarkMode}
          onSelectChat={onSelectChat}
          activeChatId={activeChatId}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
