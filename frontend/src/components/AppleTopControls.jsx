import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

/**
 * Heroicons outline icons
 */
function SunIcon({ className = "w-5 h-5", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon({ className = "w-5 h-5", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

function BellAlertIcon({ className = "w-5 h-5", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
      />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function ShieldExclamationIcon({ className = "w-4 h-4", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4", strokeWidth = 1.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'PhishLens Threat Shield Active',
    description: 'Real-time proactive phishing defense and SSL integrity scanning enabled.',
    time: 'Just now',
    type: 'safe',
    unread: true,
  },
  {
    id: 2,
    title: 'High Risk Alert: Impersonation',
    description: 'Suspicious credential harvesting pattern detected on recent link scan.',
    time: '12m ago',
    type: 'danger',
    unread: true,
  },
  {
    id: 3,
    title: 'AI Threat Analysis Ready',
    description: 'Multi-agent consensus report completed with 99.4% confidence score.',
    time: '1h ago',
    type: 'ai',
    unread: false,
  },
  {
    id: 4,
    title: 'Brand Registry Updated',
    description: '3,420 new brand keywords and zero-day signatures synchronized.',
    time: '3h ago',
    type: 'info',
    unread: false,
  },
];

/**
 * AppleTopControls Component
 * Provides:
 * 1. Apple-style tactile Light / Dark mode toggle switch
 * 2. Apple-style circular Notification button with alert badge & animated dropdown drawer
 */
export default function AppleTopControls({
  isDarkMode,
  onToggleDarkMode,
  className = '',
}) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const bellButtonRef = useRef(null);
  const toggleThumbRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  /* ── Animate Popover Entrance / Exit with GSAP spring ── */
  useEffect(() => {
    if (!popoverRef.current) return;

    if (isNotificationOpen) {
      gsap.killTweensOf(popoverRef.current);
      gsap.fromTo(
        popoverRef.current,
        {
          opacity: 0,
          scale: 0.92,
          y: -10,
          transformOrigin: 'top right',
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.32,
          ease: 'back.out(1.6)',
          pointerEvents: 'auto',
        }
      );
    } else {
      gsap.killTweensOf(popoverRef.current);
      gsap.to(popoverRef.current, {
        opacity: 0,
        scale: 0.94,
        y: -8,
        duration: 0.22,
        ease: 'power2.inOut',
        pointerEvents: 'none',
      });
    }
  }, [isNotificationOpen]);

  /* ── Click outside to close notification popover ── */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    }

    if (isNotificationOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  /* ── Bell wiggle animation on click ── */
  const handleBellClick = useCallback(() => {
    if (bellButtonRef.current) {
      const bellSvg = bellButtonRef.current.querySelector('.bell-icon-svg');
      if (bellSvg) {
        gsap.fromTo(
          bellSvg,
          { rotation: 0 },
          {
            keyframes: [
              { rotation: -16, duration: 0.08 },
              { rotation: 14, duration: 0.08 },
              { rotation: -10, duration: 0.08 },
              { rotation: 6, duration: 0.08 },
              { rotation: 0, duration: 0.08 },
            ],
            ease: 'power1.out',
          }
        );
      }
    }
    setIsNotificationOpen((prev) => !prev);
  }, []);

  /* ── Notification action handlers ── */
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleToggleReadItem = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const displayedNotifications =
    filter === 'unread'
      ? notifications.filter((n) => n.unread)
      : notifications;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-2 select-none ${className}`}
      style={{ zIndex: 90 }}
    >
      {/* ── 1. Apple-Style Compact Light / Dark Toggle Switch ── */}
      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        aria-label="Toggle theme appearance"
        onClick={onToggleDarkMode}
        className="group relative flex h-[32px] w-[58px] cursor-pointer items-center rounded-full p-[3px] transition-all duration-300 active:scale-[0.95] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        style={{
          background: isDarkMode
            ? 'rgba(36, 36, 42, 0.88)'
            : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: isDarkMode
            ? '0 3px 14px -2px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
            : '0 3px 12px -2px rgba(0, 0, 0, 0.08), 0 1px 3px -1px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Track Fixed Background Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          {/* Sun icon (left slot) */}
          <div
            className={`flex items-center justify-center transition-opacity duration-300 ${
              isDarkMode ? 'opacity-40 text-gray-400' : 'opacity-0'
            }`}
          >
            <SunIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>

          {/* Moon icon (right slot) */}
          <div
            className={`flex items-center justify-center transition-opacity duration-300 ${
              !isDarkMode ? 'opacity-45 text-gray-400' : 'opacity-0'
            }`}
          >
            <MoonIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
        </div>

        {/* Sliding Thumb (Apple tactile knob) */}
        <div
          ref={toggleThumbRef}
          className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full transition-transform duration-350 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
          style={{
            transform: isDarkMode
              ? 'translateX(26px)'
              : 'translateX(0px)',
            background: isDarkMode
              ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
              : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            boxShadow: isDarkMode
              ? '0 2px 8px rgba(79, 70, 229, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
              : '0 2px 8px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
          }}
        >
          {isDarkMode ? (
            <MoonIcon
              className="w-3.5 h-3.5 text-white transition-transform duration-300"
              strokeWidth={2}
            />
          ) : (
            <SunIcon
              className="w-3.5 h-3.5 text-white transition-transform duration-300"
              strokeWidth={2}
            />
          )}
        </div>
      </button>

      {/* ── 2. Apple-Style Compact Circular Notification Bell Button ── */}
      <button
        ref={bellButtonRef}
        type="button"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isNotificationOpen}
        onClick={handleBellClick}
        className="group relative flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full transition-all duration-250 active:scale-[0.92] hover:scale-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        style={{
          background: isDarkMode
            ? 'rgba(36, 36, 42, 0.88)'
            : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: isDarkMode
            ? '0 3px 14px -2px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
            : '0 3px 12px -2px rgba(0, 0, 0, 0.08), 0 1px 3px -1px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Bell Icon (Heroicons Outline bell-alert) */}
        <div className="bell-icon-svg text-gray-700 dark:text-gray-200 transition-colors duration-200 group-hover:text-black dark:group-hover:text-white">
          <BellAlertIcon className="w-4 h-4" strokeWidth={1.65} />
        </div>

        {/* Apple Red Notification Badge Dot */}
        {unreadCount > 0 && (
          <span
            className="absolute top-[4.5px] right-[4.5px] pointer-events-none flex h-[6.5px] w-[6.5px] items-center justify-center"
            title={`${unreadCount} unread notifications`}
          >
            <span
              className="h-[6.5px] w-[6.5px] rounded-full bg-[#ff3b30] ring-[1.5px] ring-white dark:ring-[#24242a]"
              style={{
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
              }}
            />
          </span>
        )}
      </button>

      {/* ── 3. Apple-Style Translucent Notification Popover Drawer ── */}
      <div
        ref={popoverRef}
        className="absolute right-0 top-10.5 w-[310px] sm:w-[350px] rounded-2xl p-3.5 shadow-2xl transition-colors duration-300"
        style={{
          opacity: 0,
          pointerEvents: 'none',
          background: isDarkMode
            ? 'rgba(28, 28, 34, 0.94)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDarkMode
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
            : '0 20px 40px -10px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[15px] tracking-tight text-gray-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center justify-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {unreadCount} new
              </span>
            ) : (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                All read
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors cursor-pointer"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Read all</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear all notifications"
                className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-2.5 pb-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
              filter === 'all'
                ? isDarkMode
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
              filter === 'unread'
                ? isDarkMode
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-2 max-h-[310px] overflow-y-auto pr-0.5 no-scrollbar mt-1">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 mb-2">
                <BellAlertIcon className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleReadItem(item.id)}
                className={`group/item relative flex items-start gap-3 rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer ${
                  item.unread
                    ? isDarkMode
                      ? 'bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.08]'
                      : 'bg-gray-50/90 hover:bg-gray-100/90 border border-gray-200/60'
                    : isDarkMode
                      ? 'hover:bg-white/[0.03] border border-transparent'
                      : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                {/* Type Icon Badge */}
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/item:scale-105 ${
                    item.type === 'danger'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : item.type === 'safe'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : item.type === 'ai'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {item.type === 'danger' && <ShieldExclamationIcon className="w-4 h-4" />}
                  {item.type === 'safe' && <ShieldCheckIcon className="w-4 h-4" />}
                  {item.type === 'ai' && <SparklesIcon className="w-4 h-4" />}
                  {item.type === 'info' && <BellAlertIcon className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Unread indicator / Delete button */}
                <div className="flex flex-col items-center justify-between self-stretch shrink-0">
                  {item.unread ? (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shadow-sm" />
                  ) : (
                    <span className="h-2 w-2" />
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    title="Dismiss"
                    className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-rose-500 transition-opacity p-0.5 cursor-pointer"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
