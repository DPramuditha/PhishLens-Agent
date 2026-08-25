import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';

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
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const INTER_FONT_STYLE = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export default function ScreenshotsGalleryModal({ isOpen, onClose, isDarkMode = true }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const [screenshots, setScreenshots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null); // for full-size lightbox
  const [copiedId, setCopiedId] = useState(null);

  // Fetch screenshots from backend API
  const fetchScreenshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:8000/api/screenshots/', { headers });
      if (res.ok) {
        const data = await res.json();
        setScreenshots(data.screenshots || []);
      }
    } catch (err) {
      console.error('Failed to fetch user screenshots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial fetch when opened
  useEffect(() => {
    if (isOpen) {
      fetchScreenshots();
    }
  }, [isOpen, fetchScreenshots]);

  // Body scroll locking when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Modal entrance animation (runs once when isOpen becomes true)
  useEffect(() => {
    if (!isOpen) return;

    if (backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.28, ease: 'power2.out' }
      );
    }
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.95, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // Keyboard shortcut listener for closing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedScreenshot) {
          setSelectedScreenshot(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, selectedScreenshot]);

  const copyUrl = (url, id, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenChat = (chatId, e) => {
    if (e) e.stopPropagation();
    if (!chatId) return;
    onClose();
    navigate(`/chat/${chatId}`);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 select-none screenshots-scope font-inter"
      role="dialog"
      aria-modal="true"
      aria-label="Screenshots Gallery"
      style={INTER_FONT_STYLE}
    >
      {/* Translucent Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Apple-styled Modal Window */}
      <div
        ref={contentRef}
        className={`relative z-10 w-full max-w-5xl h-[85vh] max-h-[800px] rounded-[28px] flex flex-col shadow-2xl border overflow-hidden transition-colors ${
          isDarkMode
            ? 'bg-[#1c1c1e]/90 text-[#f5f5f7] border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)]'
            : 'bg-[#f5f5f7]/95 text-[#1d1d1f] border-black/10 shadow-[0_30px_70px_rgba(0,0,0,0.2)]'
        }`}
        style={{
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
        }}
      >
        {/* Apple Style Header Bar */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkMode
              ? 'border-white/[0.08] bg-white/[0.02]'
              : 'border-black/[0.06] bg-white/40'
          }`}
        >
          {/* Left Title & Icon */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform active:scale-95 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-gradient-to-b from-indigo-50 to-white border-indigo-200/80 text-indigo-600'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.9451 1.25H13.0549C14.4225 1.24998 15.5248 1.24996 16.3918 1.36652C17.2919 1.48754 18.0498 1.74643 18.6517 2.34835C19.0519 2.74855 19.3004 3.2177 19.4577 3.75175C19.6692 3.75503 19.8458 3.76426 20.0084 3.79001C21.3991 4.01027 22.4898 5.10094 22.71 6.49159C22.7502 6.74548 22.7501 7.03358 22.75 7.43528C22.75 7.45653 22.75 7.4781 22.75 7.5V16.5C22.75 16.5219 22.75 16.5435 22.75 16.5647C22.7501 16.9664 22.7502 17.2545 22.71 17.5084C22.4898 18.8991 21.3991 19.9897 20.0084 20.21C19.8458 20.2357 19.6692 20.245 19.4577 20.2482C19.3004 20.7823 19.0519 21.2514 18.6517 21.6517C18.0498 22.2536 17.2919 22.5125 16.3918 22.6335C15.5248 22.75 14.4225 22.75 13.0549 22.75H10.9452C9.57756 22.75 8.47524 22.75 7.60827 22.6335C6.70816 22.5125 5.95029 22.2536 5.34837 21.6517C4.94817 21.2514 4.69961 20.7823 4.54238 20.2482C4.33086 20.245 4.15422 20.2357 3.99161 20.21C2.60096 19.9897 1.51029 18.8991 1.29004 17.5084C1.24982 17.2545 1.2499 16.9664 1.25001 16.5647C1.25002 16.5435 1.25002 16.5219 1.25002 16.5V7.5C1.25002 7.4781 1.25002 7.45652 1.25001 7.43527C1.2499 7.03357 1.24982 6.74548 1.29004 6.49159C1.51029 5.10094 2.60096 4.01027 3.99161 3.79001C4.15422 3.76426 4.33086 3.75503 4.54238 3.75175C4.69961 3.2177 4.94817 2.74855 5.34837 2.34835C5.95029 1.74643 6.70816 1.48754 7.60827 1.36652C8.47524 1.24996 9.57756 1.24998 10.9451 1.25ZM4.30193 5.26229C4.27396 5.26483 4.24942 5.26788 4.22626 5.27155C3.47745 5.39015 2.89017 5.97743 2.77157 6.72624C2.75235 6.84758 2.75002 7.00684 2.75002 7.5V16.5C2.75002 16.9932 2.75235 17.1524 2.77157 17.2738C2.89017 18.0226 3.47745 18.6099 4.22626 18.7285C4.24942 18.7321 4.27396 18.7352 4.30193 18.7377C4.24999 17.9893 4.25001 17.0995 4.25002 16.0549L4.25002 14.8166C4.25002 14.8161 4.25002 14.8156 4.25002 14.8151L4.25002 7.94512C4.25001 6.90052 4.24999 6.01069 4.30193 5.26229ZM5.75002 15.1209V16C5.75002 17.4354 5.75162 18.4365 5.85317 19.1919C5.95182 19.9257 6.13227 20.3142 6.40903 20.591C6.6858 20.8678 7.07437 21.0482 7.80814 21.1469C8.56349 21.2484 9.56461 21.25 11 21.25H13C14.4354 21.25 15.4366 21.2484 16.1919 21.1469C16.9257 21.0482 17.3143 20.8678 17.591 20.591C17.743 20.439 17.8659 20.2533 17.9622 19.9952L16.0804 18.0092C15.577 17.478 14.8816 17.4416 14.352 17.8781L14.1322 18.0591C13.216 18.8142 11.9548 18.6658 11.1952 17.7751L8.03435 14.0687C7.68431 13.6583 7.1851 13.6485 6.82776 14.0152L5.75002 15.1209ZM18.2292 18.0961L17.1692 16.9775C16.1406 15.892 14.5546 15.7673 13.398 16.7205L13.1783 16.9016C12.9228 17.1121 12.5897 17.0987 12.3365 16.8018L9.17567 13.0954C8.26393 12.0263 6.73916 11.957 5.75357 12.9682L5.75002 12.9719V8C5.75002 6.56458 5.75162 5.56347 5.85317 4.80812C5.95182 4.07435 6.13227 3.68577 6.40903 3.40901C6.6858 3.13225 7.07437 2.9518 7.80814 2.85315C8.56349 2.75159 9.56461 2.75 11 2.75H13C14.4354 2.75 15.4366 2.75159 16.1919 2.85315C16.9257 2.9518 17.3143 3.13225 17.591 3.40901C17.8678 3.68577 18.0482 4.07435 18.1469 4.80812C18.2484 5.56347 18.25 6.56458 18.25 8V16C18.25 16.8326 18.2495 17.519 18.2292 18.0961ZM19.6981 18.7377C19.7261 18.7352 19.7506 18.7321 19.7738 18.7285C20.5226 18.6099 21.1099 18.0226 21.2285 17.2738C21.2477 17.1524 21.25 16.9932 21.25 16.5V7.5C21.25 7.00684 21.2477 6.84758 21.2285 6.72624C21.1099 5.97743 20.5226 5.39015 19.7738 5.27155C19.7506 5.26788 19.7261 5.26483 19.6981 5.26229C19.7501 6.01069 19.75 6.90053 19.75 7.94513V16.0549C19.75 17.0995 19.7501 17.9893 19.6981 18.7377ZM14.5 5.75C14.0858 5.75 13.75 6.08579 13.75 6.5C13.75 6.91421 14.0858 7.25 14.5 7.25C14.9142 7.25 15.25 6.91421 15.25 6.5C15.25 6.08579 14.9142 5.75 14.5 5.75ZM12.25 6.5C12.25 5.25736 13.2574 4.25 14.5 4.25C15.7427 4.25 16.75 5.25736 16.75 6.5C16.75 7.74264 15.7427 8.75 14.5 8.75C13.2574 8.75 12.25 7.74264 12.25 6.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-[17px] font-semibold tracking-[-0.02em]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Screenshots
                </h2>
                {screenshots.length > 0 && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isDarkMode
                        ? 'bg-white/10 text-gray-300'
                        : 'bg-black/5 text-gray-600'
                    }`}
                  >
                    {screenshots.length} {screenshots.length === 1 ? 'capture' : 'captures'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Visual webpage snapshots for {user?.email || 'your account'}
              </p>
            </div>
          </div>

          {/* Right Controls: Refresh & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchScreenshots}
              disabled={isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-300'
                  : 'bg-black/[0.05] hover:bg-black/[0.08] text-gray-700'
              }`}
              title="Refresh screenshots"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-300 hover:text-white'
                  : 'bg-black/[0.05] hover:bg-black/[0.08] text-gray-600 hover:text-black'
              }`}
              title="Close gallery (Esc)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.4"
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {isLoading && screenshots.length === 0 ? (
            /* Apple-Style Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-56 rounded-2xl animate-pulse border ${
                    isDarkMode
                      ? 'bg-white/[0.04] border-white/[0.06]'
                      : 'bg-black/[0.03] border-black/[0.05]'
                  }`}
                />
              ))}
            </div>
          ) : screenshots.length === 0 ? (
            /* Apple Minimal Empty State */
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-8">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${
                  isDarkMode
                    ? 'bg-white/[0.04] border-white/[0.08] text-gray-400'
                    : 'bg-black/[0.03] border-black/[0.06] text-gray-400'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-7 h-7 opacity-70"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
              </div>

              <h3
                className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1"
                style={{ letterSpacing: '-0.01em' }}
              >
                No Screenshots Captured
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                Visual webpage snapshots from your PhishLens scans will automatically be saved and displayed here.
              </p>
            </div>
          ) : (
            /* Screenshot Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {screenshots.map((item) => {
                const isPhishing = item.risk_level === 'PHISHING' || item.risk_score >= 61;
                const isSuspicious =
                  item.risk_level === 'SUSPICIOUS' ||
                  (item.risk_score >= 41 && item.risk_score < 61);
                const isSafe = item.risk_level === 'LEGITIMATE' || item.risk_score < 41;

                let pillBadge = isDarkMode
                  ? 'bg-white/10 text-gray-300 border-white/10'
                  : 'bg-black/5 text-gray-700 border-black/10';

                if (isPhishing) {
                  pillBadge = isDarkMode
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (isSuspicious) {
                  pillBadge = isDarkMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
                } else if (isSafe) {
                  pillBadge = isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200';
                }

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-[20px] overflow-hidden border flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-[1.015] active:scale-[0.99] cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06]'
                        : 'bg-white border-black/[0.06] hover:border-black/15 hover:bg-white/90 shadow-sm'
                    }`}
                    onClick={() => setSelectedScreenshot(item)}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                      <img
                        src={item.screenshot_url}
                        alt={`Screenshot of ${item.domain || item.target_url}`}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Subtle hover gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-end justify-between p-3">
                        <span className="text-[11px] font-medium text-white/90 drop-shadow">
                          Click to inspect
                        </span>
                        <span className="text-[10px] text-white/70 font-medium">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-md ${pillBadge}`}
                        >
                          {item.risk_score !== null && item.risk_score !== undefined
                            ? `${item.risk_score}% ${item.risk_level}`
                            : item.risk_level}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        {/* Domain / Title */}
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <h4 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.domain || item.chat_title}
                          </h4>

                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        {/* Target URL */}
                        <p
                          className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate"
                          title={item.target_url}
                        >
                          {item.target_url}
                        </p>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={(e) => copyUrl(item.target_url, item.id, e)}
                          className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy target URL"
                        >
                          {copiedId === item.id ? (
                            <span className="text-emerald-500 font-medium">Copied</span>
                          ) : (
                            <span>Copy URL</span>
                          )}
                        </button>

                        {item.chat_id && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenChat(item.chat_id, e)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                              isDarkMode
                                ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/15 text-gray-200'
                                : 'bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08] text-gray-700'
                            }`}
                            title="Open scan in chat"
                          >
                            <span>Open Scan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Lightbox Modal for Close Inspection */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-2xl flex flex-col p-4 md:p-6 select-none animate-fadeIn screenshots-scope font-inter"
          onClick={() => setSelectedScreenshot(null)}
          style={INTER_FONT_STYLE}
        >
          {/* Lightbox Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 text-white bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl border border-white/10 mb-4 shrink-0 max-w-4xl mx-auto w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="truncate">
                <h3 className="text-[13px] font-semibold text-white truncate">
                  {selectedScreenshot.domain || selectedScreenshot.target_url}
                </h3>
                <p className="text-[11px] text-gray-400 truncate">
                  {selectedScreenshot.target_url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={selectedScreenshot.screenshot_url}
                target="_blank"
                rel="noreferrer"
                download={`screenshot-${selectedScreenshot.domain || 'phishlens'}.png`}
                className="px-3 py-1 rounded-xl text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Download</span>
              </a>

              {selectedScreenshot.chat_id && (
                <button
                  type="button"
                  onClick={() => {
                    const chatId = selectedScreenshot.chat_id;
                    setSelectedScreenshot(null);
                    handleOpenChat(chatId);
                  }}
                  className="px-3 py-1 rounded-xl text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1"
                >
                  <span>Open Scan</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                title="Close fullscreen preview"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Fullscreen Image Preview */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedScreenshot.screenshot_url}
              alt={`Full inspection preview of ${selectedScreenshot.target_url}`}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/15"
            />
          </div>
        </div>
      )}
    </div>
  );
}
