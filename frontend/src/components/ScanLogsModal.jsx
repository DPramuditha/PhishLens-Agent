import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';

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

function formatFullDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const INTER_FONT_STYLE = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export default function ScanLogsModal({ isOpen, onClose, isDarkMode = true, onSelectChat = null }) {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PHISHING' | 'SUSPICIOUS' | 'LEGITIMATE' | 'FAILED'
  const [selectedLog, setSelectedLog] = useState(null); // For popup inspection modal
  const [screenshotTab, setScreenshotTab] = useState('original'); // 'original' | 'annotated'
  const [lightboxImage, setLightboxImage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Fetch scan logs from backend API
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = 'http://localhost:8000/api/scan-logs/';
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (activeFilter !== 'ALL') params.append('risk', activeFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch scan logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, searchQuery, activeFilter]);

  // Initial & reactive fetch
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchLogs();
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, isOpen, fetchLogs]);

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

  // Modal entrance animation
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
        { opacity: 0, scale: 0.95, y: 14 },
        { opacity: 1, scale: 1, y: 0, duration: 0.36, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (selectedLog) {
          setSelectedLog(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, selectedLog, lightboxImage]);

  const copyUrl = (url, id, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    addToast?.({ type: 'success', title: 'Copied', message: 'URL copied to clipboard.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenChat = (chatId, e) => {
    if (e) e.stopPropagation();
    if (!chatId) return;
    onClose();
    if (onSelectChat) {
      onSelectChat(chatId);
    } else {
      navigate(`/chat/${chatId}`);
    }
  };

  const handleExportPdf = async (log, e) => {
    if (e) e.stopPropagation();
    if (!log) return;
    setIsExportingPdf(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      if (log.chat_id) {
        res = await fetch(`http://localhost:8000/api/chats/${log.chat_id}/pdf/`, { headers });
      } else {
        res = await fetch('http://localhost:8000/api/scan/pdf/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: log.target_url,
            report: log.report,
            screenshot_data: log.screenshot_url,
            url_analysis_data: log.url_analysis_data,
            duration: log.duration_sec,
          }),
        });
      }

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `PhishLens_Security_Report_${log.domain || 'scan'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        addToast?.({ type: 'success', title: 'PDF Downloaded', message: 'Security report exported successfully.' });
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast?.({ type: 'error', title: 'Export Failed', message: 'Could not export PDF report.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Filter out any user prompt messages to guarantee no duplicate cards
  const displayLogs = logs.filter(
    (l) =>
      l.sender !== 'user' &&
      (l.report || l.message_type === 'scan_result' || l.overall_status === 'COMPLETED' || l.overall_status === 'FAILED')
  );

  // Stats calculation
  const totalCount = displayLogs.length;
  const phishingCount = displayLogs.filter(
    (l) => l.report?.risk_level === 'PHISHING' || l.report?.risk_score >= 61
  ).length;
  const legitimateCount = displayLogs.filter(
    (l) => l.report?.risk_level === 'LEGITIMATE' || (l.report?.risk_score !== null && l.report?.risk_score < 41)
  ).length;

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 select-none scan-logs-scope font-inter"
      role="dialog"
      aria-modal="true"
      aria-label="Scan Logs and Threat Activity History"
      style={INTER_FONT_STYLE}
    >
      {/* Translucent Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/65 backdrop-blur-xl transition-opacity duration-300"
        onClick={() => {
          if (lightboxImage) setLightboxImage(null);
          else if (selectedLog) setSelectedLog(null);
          else onClose();
        }}
      />

      {/* Main Apple-Styled Window */}
      <div
        ref={contentRef}
        className={`relative z-10 w-full max-w-6xl h-[88vh] max-h-[850px] rounded-[28px] flex flex-col shadow-2xl border overflow-hidden transition-colors ${
          isDarkMode
            ? 'bg-[#18181b]/95 text-[#f5f5f7] border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.85)]'
            : 'bg-[#f8f9fa]/95 text-[#1d1d1f] border-black/10 shadow-[0_30px_80px_rgba(0,0,0,0.22)]'
        }`}
        style={{
          backdropFilter: 'blur(45px) saturate(190%)',
          WebkitBackdropFilter: 'blur(45px) saturate(190%)',
        }}
      >
        {/* Header Bar */}
        <div
          className={`flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-4 border-b gap-3.5 shrink-0 ${
            isDarkMode
              ? 'border-white/[0.08] bg-white/[0.02]'
              : 'border-black/[0.06] bg-white/50'
          }`}
        >
          {/* Left Title with Terminal / Radar Icon */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-transform active:scale-95 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-gradient-to-b from-indigo-50 to-white border-indigo-200/80 text-indigo-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.25 2C11.25 1.58579 11.5858 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 11.5858 1.58579 11.25 2 11.25C2.41421 11.25 2.75 11.5858 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75C11.5858 2.75 11.25 2.41421 11.25 2ZM12 8.25C12.4142 8.25 12.75 8.58579 12.75 9V12.25H16C16.4142 12.25 16.75 12.5858 16.75 13C16.75 13.4142 16.4142 13.75 16 13.75H12C11.5858 13.75 11.25 13.4142 11.25 13V9C11.25 8.58579 11.5858 8.25 12 8.25Z"
                  fill="currentColor"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.09958 2.39754C9.24874 2.78396 9.05641 3.21814 8.66999 3.36731C8.52855 3.42191 8.38879 3.47988 8.2508 3.54114C7.87221 3.70921 7.42906 3.53856 7.261 3.15997C7.09293 2.78139 7.26358 2.33824 7.64217 2.17017C7.80267 2.09892 7.96526 2.03147 8.1298 1.96795C8.51623 1.81878 8.95041 2.01112 9.09958 2.39754ZM5.6477 4.24026C5.93337 4.54021 5.92178 5.01495 5.62183 5.30061C5.51216 5.40506 5.40505 5.51216 5.30061 5.62183C5.01495 5.92178 4.54021 5.93337 4.24026 5.6477C3.94031 5.36204 3.92873 4.88731 4.21439 4.58736C4.33566 4.46003 4.46002 4.33566 4.58736 4.21439C4.88731 3.92873 5.36204 3.94031 5.6477 4.24026ZM3.15997 7.261C3.53856 7.42907 3.70921 7.87222 3.54114 8.2508C3.47988 8.38879 3.42191 8.52855 3.36731 8.66999C3.21814 9.05641 2.78396 9.24874 2.39754 9.09958C2.01112 8.95041 1.81878 8.51623 1.96795 8.12981C2.03147 7.96526 2.09892 7.80267 2.17017 7.64217C2.33824 7.26358 2.78139 7.09293 3.15997 7.261Z"
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
                  Scan Logs & History
                </h2>
                {displayLogs.length > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {displayLogs.length} {displayLogs.length === 1 ? 'log' : 'logs'}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                Detailed multi-agent audit trail, security metrics, and webpage screenshots
              </p>
            </div>
          </div>

          {/* Quick Filter Search & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex items-center min-w-[200px] sm:min-w-[240px]">
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
                placeholder="Search target URL, domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none transition-all border ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-gray-100 placeholder-gray-500 focus:border-indigo-500/60 focus:bg-white/10'
                    : 'bg-black/5 border-black/10 text-gray-800 placeholder-gray-400 focus:border-indigo-500/60 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-300'
                  : 'bg-black/[0.05] hover:bg-black/[0.08] text-gray-700'
              }`}
              title="Refresh logs"
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

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-300 hover:text-white'
                  : 'bg-black/[0.05] hover:bg-black/[0.08] text-gray-600 hover:text-black'
              }`}
              title="Close modal (Esc)"
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

        {/* Filter Tab Pills & Stats Summary Bar */}
        <div
          className={`flex items-center justify-between px-6 py-2.5 border-b shrink-0 text-xs overflow-x-auto no-scrollbar gap-3 ${
            isDarkMode
              ? 'border-white/[0.06] bg-black/20'
              : 'border-black/[0.05] bg-black/[0.02]'
          }`}
        >
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'ALL', label: 'All Scans' },
              { id: 'PHISHING', label: 'Phishing', count: phishingCount },
              { id: 'SUSPICIOUS', label: 'Suspicious' },
              { id: 'LEGITIMATE', label: 'Legitimate', count: legitimateCount },
              { id: 'FAILED', label: 'Failed' },
            ].map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'bg-black/10 text-gray-900 shadow-sm font-semibold'
                      : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && f.count > 0 && (
                    <span className="text-[10px] opacity-75">({f.count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Activity Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Phishing (High)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Suspicious
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Legitimate
            </span>
          </div>
        </div>

        {/* Content Body: Scan Logs Feed */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 no-scrollbar">
          {isLoading && displayLogs.length === 0 ? (
            /* Apple-Style Skeleton Loaders */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-40 rounded-2xl animate-pulse border ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/[0.06]'
                      : 'bg-black/[0.03] border-black/[0.05]'
                  }`}
                />
              ))}
            </div>
          ) : displayLogs.length === 0 ? (
            /* Empty State */
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8">
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
                  className="w-7 h-7 opacity-75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
              </div>

              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                No Scan Logs Found
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                {searchQuery
                  ? `No logs match "${searchQuery}". Try searching another domain or clear filters.`
                  : 'Start a scan from the main interface to record automated agent logs, threat intelligence, and webpage screenshots.'}
              </p>
            </div>
          ) : (
            /* Grid of Scan Log Cards */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayLogs.map((log) => {
                const report = log.report || {};
                const isFailed = log.overall_status === 'FAILED' || Boolean(log.error);
                const riskLevel = report.risk_level || (isFailed ? 'FAILED' : 'UNKNOWN');
                const riskScore = report.risk_score;

                const isPhishing = riskLevel === 'PHISHING' || (riskScore !== null && riskScore >= 61);
                const isSuspicious =
                  riskLevel === 'SUSPICIOUS' || (riskScore !== null && riskScore >= 41 && riskScore < 61);
                const isLegit = riskLevel === 'LEGITIMATE' || (riskScore !== null && riskScore < 41);

                let badgeStyle = isDarkMode
                  ? 'bg-gray-800 text-gray-300 border-gray-700'
                  : 'bg-gray-100 text-gray-700 border-gray-200';

                if (isPhishing || isFailed) {
                  badgeStyle = isDarkMode
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (isSuspicious) {
                  badgeStyle = isDarkMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
                } else if (isLegit) {
                  badgeStyle = isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200';
                }

                return (
                  <div
                    key={log.id}
                    className={`group relative rounded-[22px] border p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.995] cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.05]'
                        : 'bg-white border-black/[0.06] hover:border-black/15 hover:bg-white/95 shadow-sm'
                    }`}
                    onClick={() => {
                      setSelectedLog(log);
                      setScreenshotTab('original');
                    }}
                  >
                    {/* Top Row: Icon/Domain, Badges & Time */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isPhishing || isFailed
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                              : isSuspicious
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                          }`}
                        >
                          {isPhishing || isFailed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-400 transition-colors">
                            {log.domain || log.chat_title || log.target_url}
                          </h4>
                          <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                            {log.target_url || log.chat_title}
                          </p>
                        </div>
                      </div>

                      {/* Risk Badge & Time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${badgeStyle}`}>
                          {riskScore !== null && riskScore !== undefined ? `${riskScore}% ${riskLevel}` : riskLevel}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Screenshot Thumbnail + Message Summary Snippet */}
                    <div className="flex items-center gap-3.5 pt-1">
                      {log.screenshot_url ? (
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/40 shadow-xs">
                          <img
                            src={log.screenshot_url}
                            alt={`Screenshot for ${log.domain}`}
                            loading="lazy"
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[9px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded-md">
                              Inspect
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-24 h-16 rounded-xl flex items-center justify-center shrink-0 border text-[10px] text-gray-400 ${
                            isDarkMode ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.04]'
                          }`}
                        >
                          No screenshot
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[11.5px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {report.summary || log.text || (isFailed ? log.error : 'Automated multi-agent security scan execution.')}
                        </p>

                        {/* Extra metadata pills */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {log.duration_sec && (
                            <span className="text-[10px] text-gray-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              ⏱ {log.duration_sec}s
                            </span>
                          )}
                          {report.brand_detected && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200/50 dark:border-purple-800/40">
                              🏷 {report.brand_detected}
                            </span>
                          )}
                          {log.tool_trace && Array.isArray(log.tool_trace) && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/40">
                              ⚡ {log.tool_trace.length} agent steps
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.05] text-xs">
                      <button
                        type="button"
                        onClick={(e) => copyUrl(log.target_url, log.id, e)}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === log.id ? (
                          <span className="text-emerald-500 font-semibold">✓ Copied</span>
                        ) : (
                          <span>Copy URL</span>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 border ${
                            isDarkMode
                              ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/15 text-gray-200'
                              : 'bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08] text-gray-700'
                          }`}
                        >
                          <span>Popup Details</span>
                        </button>

                        {log.chat_id && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenChat(log.chat_id, e)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>Open Chat</span>
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

      {/* ── POPUP MESSAGE & SCREENSHOT INSPECTION DRAWER / MODAL ── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 md:p-8 animate-fadeIn scan-logs-scope font-inter"
          style={INTER_FONT_STYLE}
        >
          {/* Backdrop for popup */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-2xl transition-opacity"
            onClick={() => setSelectedLog(null)}
          />

          {/* Popup Modal Window */}
          <div
            className={`relative z-10 w-full max-w-4xl max-h-[90vh] rounded-[28px] flex flex-col shadow-2xl border overflow-hidden transition-all ${
              isDarkMode
                ? 'bg-[#1e1e24]/95 text-[#f5f5f7] border-white/15 shadow-[0_35px_90px_rgba(0,0,0,0.9)]'
                : 'bg-white/95 text-[#1d1d1f] border-black/10 shadow-[0_35px_90px_rgba(0,0,0,0.25)]'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              backdropFilter: 'blur(50px) saturate(200%)',
              WebkitBackdropFilter: 'blur(50px) saturate(200%)',
            }}
          >
            {/* Popup Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-white/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedLog.report?.risk_level === 'PHISHING' || selectedLog.report?.risk_score >= 61
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold truncate">
                      Scan Log: {selectedLog.domain || selectedLog.target_url}
                    </h3>
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedLog.report?.risk_level === 'PHISHING' || selectedLog.report?.risk_score >= 61
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : selectedLog.report?.risk_level === 'SUSPICIOUS'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {selectedLog.report?.risk_score !== null && selectedLog.report?.risk_score !== undefined
                        ? `${selectedLog.report?.risk_score}% ${selectedLog.report?.risk_level || 'SCAN'}`
                        : selectedLog.report?.risk_level || 'COMPLETED'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                    {selectedLog.target_url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-black/5 hover:bg-black/10 text-gray-700'
                  }`}
                  title="Close popup"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Popup Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar flex flex-col gap-6">
              {/* 1. SCREENSHOT VIEWER (Original vs Annotated) */}
              <div
                className={`rounded-2xl border p-4.5 flex flex-col gap-3.5 ${
                  isDarkMode ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-indigo-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      Webpage Screenshot
                    </span>
                    {selectedLog.annotated_screenshot_url && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                        Visual AI Annotated
                      </span>
                    )}
                  </div>

                  {/* Toggle buttons if annotated screenshot is available */}
                  <div className="flex items-center gap-1.5">
                    {selectedLog.annotated_screenshot_url && (
                      <div className="flex rounded-lg bg-black/10 dark:bg-white/10 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setScreenshotTab('original')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            screenshotTab === 'original'
                              ? 'bg-white dark:bg-zinc-800 shadow text-gray-900 dark:text-white'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Original View
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreenshotTab('annotated')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            screenshotTab === 'annotated'
                              ? 'bg-white dark:bg-zinc-800 shadow text-gray-900 dark:text-white'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Visual Brand Box
                        </button>
                      </div>
                    )}

                    {(selectedLog.screenshot_url || selectedLog.annotated_screenshot_url) && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage(
                            screenshotTab === 'annotated' && selectedLog.annotated_screenshot_url
                              ? selectedLog.annotated_screenshot_url
                              : selectedLog.screenshot_url
                          )
                        }
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full Inspection</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Screenshot Display Card */}
                {selectedLog.screenshot_url || selectedLog.annotated_screenshot_url ? (
                  <div
                    className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-lg cursor-pointer group"
                    onClick={() =>
                      setLightboxImage(
                        screenshotTab === 'annotated' && selectedLog.annotated_screenshot_url
                          ? selectedLog.annotated_screenshot_url
                          : selectedLog.screenshot_url
                      )
                    }
                  >
                    <img
                      src={
                        screenshotTab === 'annotated' && selectedLog.annotated_screenshot_url
                          ? selectedLog.annotated_screenshot_url
                          : selectedLog.screenshot_url
                      }
                      alt={`Screenshot of ${selectedLog.target_url}`}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-[11px] font-medium text-white/90">
                        Click to view full-resolution screenshot
                      </span>
                      <span className="text-[10px] text-white/70">
                        Captured at {formatFullDateTime(selectedLog.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 rounded-xl bg-black/5 dark:bg-white/5">
                    No visual screenshot was captured for this scan entry.
                  </div>
                )}
              </div>

              {/* 2. SUMMARY & VERDICT MESSAGE */}
              <div
                className={`rounded-2xl border p-4.5 flex flex-col gap-2.5 ${
                  isDarkMode ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.06]'
                }`}
              >
                <h4 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>AI Security Verdict & Message</span>
                  {selectedLog.duration_sec && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                      Duration: {selectedLog.duration_sec}s
                    </span>
                  )}
                </h4>

                <p className="text-[12.5px] leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap font-sans">
                  {selectedLog.report?.summary || selectedLog.text || selectedLog.error || 'Scan analysis completed.'}
                </p>

                {selectedLog.report?.reasoning && (
                  <div className="mt-2 p-3 rounded-xl bg-black/10 dark:bg-white/5 text-[11.5px] leading-relaxed text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/5">
                    <span className="font-semibold text-indigo-400 block mb-1">Detailed Reasoning:</span>
                    {selectedLog.report.reasoning}
                  </div>
                )}
              </div>

              {/* 3. SUSPICIOUS & LEGITIMATE INDICATORS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Suspicious Flags */}
                <div
                  className={`rounded-2xl border p-4 flex flex-col gap-2 ${
                    isDarkMode ? 'bg-rose-950/20 border-rose-800/30' : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  <h5 className="text-[12px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span>⚠️ Suspicious Indicators</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20">
                      {selectedLog.report?.suspicious_indicators?.length || 0}
                    </span>
                  </h5>

                  {selectedLog.report?.suspicious_indicators && selectedLog.report.suspicious_indicators.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 text-[11.5px] text-rose-800 dark:text-rose-200/90 list-disc list-inside">
                      {selectedLog.report.suspicious_indicators.map((ind, idx) => (
                        <li key={idx} className="leading-snug">{ind}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">No suspicious indicators triggered.</p>
                  )}
                </div>

                {/* Legitimate Flags */}
                <div
                  className={`rounded-2xl border p-4 flex flex-col gap-2 ${
                    isDarkMode ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <h5 className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>🛡️ Legitimate Indicators</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20">
                      {selectedLog.report?.legit_indicators?.length || 0}
                    </span>
                  </h5>

                  {selectedLog.report?.legit_indicators && selectedLog.report.legit_indicators.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 text-[11.5px] text-emerald-800 dark:text-emerald-200/90 list-disc list-inside">
                      {selectedLog.report.legit_indicators.map((ind, idx) => (
                        <li key={idx} className="leading-snug">{ind}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">No trust indicators confirmed.</p>
                  )}
                </div>
              </div>

              {/* 4. AGENT TOOL EXECUTION TRACE */}
              {selectedLog.tool_trace && Array.isArray(selectedLog.tool_trace) && selectedLog.tool_trace.length > 0 && (
                <div
                  className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${
                    isDarkMode ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.06]'
                  }`}
                >
                  <h5 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <span>⚡ Multi-Agent Execution Trace</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      ({selectedLog.tool_trace.length} tools executed)
                    </span>
                  </h5>

                  <div className="flex flex-col gap-1.5">
                    {selectedLog.tool_trace.map((trace, tIdx) => (
                      <div
                        key={tIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {trace.tool_name || trace.agent || `Agent Step ${tIdx + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {trace.duration && (
                            <span className="text-gray-400">{trace.duration}s</span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              trace.status === 'error' || trace.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {trace.status || 'OK'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Popup Footer Actions */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-t gap-3 shrink-0 ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-white/60'
              }`}
            >
              <button
                type="button"
                onClick={(e) => copyUrl(selectedLog.target_url, selectedLog.id, e)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                    : 'bg-black/5 border-black/10 hover:bg-black/10 text-gray-700'
                }`}
              >
                {copiedId === selectedLog.id ? <span>✓ Copied</span> : <span>Copy Target URL</span>}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={(e) => handleExportPdf(selectedLog, e)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isDarkMode
                      ? 'bg-white/10 border-white/15 hover:bg-white/20 text-white'
                      : 'bg-black/5 border-black/10 hover:bg-black/10 text-gray-900'
                  }`}
                >
                  <span>{isExportingPdf ? 'Exporting...' : 'Export PDF Report'}</span>
                </button>

                {selectedLog.chat_id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const cid = selectedLog.chat_id;
                      setSelectedLog(null);
                      handleOpenChat(cid, e);
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <span>Open in Chat Conversation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN LIGHTBOX FOR SCREENSHOT ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[10005] bg-black/90 backdrop-blur-2xl flex flex-col p-4 md:p-6 select-none animate-fadeIn scan-logs-scope font-inter"
          onClick={() => setLightboxImage(null)}
          style={INTER_FONT_STYLE}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 text-white bg-[#1c1c1e]/90 backdrop-blur-xl rounded-2xl border border-white/10 mb-4 shrink-0 max-w-4xl mx-auto w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="truncate">
                <h4 className="text-[13px] font-semibold text-white truncate">
                  Visual Screenshot Inspection
                </h4>
                <p className="text-[11px] text-gray-400 truncate">{selectedLog?.target_url}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noreferrer"
                download={`screenshot-${selectedLog?.domain || 'phishlens'}.png`}
                className="px-3 py-1 rounded-xl text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Download Image</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                title="Close lightbox"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Inspection Full Screenshot"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/15"
            />
          </div>
        </div>
      )}
    </div>
  );
}
