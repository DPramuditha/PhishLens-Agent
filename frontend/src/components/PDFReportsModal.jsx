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

export function PdfArchiveIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.25 18C8.25 17.5858 8.58579 17.25 9 17.25H15C15.4142 17.25 15.75 17.5858 15.75 18C15.75 18.4142 15.4142 18.75 15 18.75H9C8.58579 18.75 8.25 18.4142 8.25 18Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.69935 1.25001H15.3004C15.5203 1.24995 15.6888 1.2499 15.8362 1.26571C17.1903 1.41104 18.2268 2.52307 18.2897 3.87013C19.4805 4.22571 20.3289 5.3275 20.3443 6.59118C20.9453 6.77151 21.4637 7.05595 21.888 7.51432C22.54 8.21857 22.7421 9.08649 22.7498 10.1003C22.7572 11.075 22.5835 12.3067 22.3678 13.8363L21.9288 16.9499C21.7602 18.146 21.6232 19.1176 21.4101 19.879C21.1871 20.6756 20.8585 21.331 20.25 21.8349C19.6463 22.3347 18.9301 22.5502 18.0835 22.6518C17.265 22.75 16.2353 22.75 14.9532 22.75H9.04687C7.76478 22.75 6.73501 22.75 5.91647 22.6518C5.06993 22.5502 4.35372 22.3347 3.75003 21.8349C3.14152 21.331 2.81286 20.6756 2.58989 19.879C2.37676 19.1176 2.23979 18.146 2.07118 16.9499L1.63219 13.8363C1.41651 12.3067 1.24283 11.075 1.25023 10.1003C1.25792 9.08649 1.45997 8.21857 2.11196 7.51432C2.53621 7.05606 3.05445 6.77164 3.65528 6.5913C3.67058 5.3275 4.51917 4.22559 5.71005 3.87007C5.77295 2.52304 6.80943 1.41104 8.16359 1.26571C8.31094 1.2499 8.4795 1.24995 8.69935 1.25001ZM5.18902 6.32785C6.11481 6.24999 7.24973 6.25 8.61594 6.25001H15.384C16.75 6.25 17.8848 6.24999 18.8105 6.32781C18.6734 5.72018 18.1306 5.25001 17.4617 5.25001H6.53787C5.86896 5.25001 5.32618 5.72019 5.18902 6.32785ZM15.6761 2.75715C16.2263 2.8162 16.6611 3.22633 16.7677 3.75001H7.2321C7.33862 3.22633 7.77344 2.8162 8.32365 2.75715C8.37993 2.75111 8.46013 2.75001 8.74099 2.75001H15.2588C15.5396 2.75001 15.6198 2.75111 15.6761 2.75715ZM3.21267 8.53336C3.51557 8.20618 3.97106 7.98917 4.85612 7.87145C5.75726 7.75159 6.96357 7.75001H15.3276C17.0364 7.75001 18.2427 7.75159 19.1439 7.87145C20.0289 7.98917 20.4844 8.20618 20.7873 8.53336C21.0832 8.85293 21.2436 9.28782 21.2498 10.1117C21.2563 10.9618 21.1002 12.0828 20.8738 13.6883L20.4509 16.6883C20.2731 17.9491 20.1486 18.821 19.9656 19.4747C19.7894 20.1042 19.582 20.4405 19.2934 20.6795C18.9999 20.9225 18.6058 21.0784 17.9048 21.1625C17.1861 21.2488 16.2465 21.25 14.9046 21.25H9.09536C7.75347 21.25 6.81393 21.2488 6.09519 21.1625C5.39417 21.0784 5.00014 20.9225 4.70664 20.6795C4.41795 20.4405 4.21058 20.1042 4.03437 19.4747C3.8514 18.821 3.7269 17.9491 3.54913 16.6883L3.12616 13.6883C2.89981 12.0828 2.74373 10.9618 2.75018 10.1117C2.75644 8.28782 2.91681 8.85293 3.21267 8.53336Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PDFReportsModal({ isOpen, onClose, isDarkMode = true, onSelectChat = null }) {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PHISHING' | 'SUSPICIOUS' | 'LEGITIMATE'
  const [selectedReport, setSelectedReport] = useState(null); // popup detail inspection
  const [downloadingIds, setDownloadingIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Fetch all user scanned PDF reports
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = 'http://localhost:8000/api/pdf-reports/';
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (activeFilter !== 'ALL') params.append('risk', activeFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch PDF reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, searchQuery, activeFilter]);

  // Reactive fetch when open
  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, fetchReports]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchReports();
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, isOpen, fetchReports]);

  // Body scroll locking
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

  // Keyboard shortcut listener (Esc key)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedReport) {
          setSelectedReport(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, selectedReport]);

  const copyUrl = (url, id, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    addToast?.({ type: 'success', title: 'Copied', message: 'Target URL copied to clipboard.' });
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

  // Direct PDF Download Handler
  const handleDownloadPdf = async (item, e) => {
    if (e) e.stopPropagation();
    if (!item) return;

    const itemId = item.id;
    setDownloadingIds((prev) => ({ ...prev, [itemId]: true }));

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      if (item.chat_id) {
        res = await fetch(`http://localhost:8000/api/chats/${item.chat_id}/pdf/`, { headers });
      } else {
        res = await fetch('http://localhost:8000/api/scan/pdf/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: item.target_url,
            report: item.report,
            screenshot_data: item.screenshot_url,
            url_analysis_data: item.url_analysis_data,
            duration: item.duration_sec,
          }),
        });
      }

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = item.filename || `PhishLens_Security_Report_${item.domain || 'target'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        addToast?.({
          type: 'success',
          title: 'PDF Downloaded',
          message: `${item.filename || 'Security Report'} exported successfully.`,
        });
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      addToast?.({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not export PDF report file.',
      });
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Stats calculation
  const totalCount = reports.length;
  const phishingCount = reports.filter(
    (r) => r.risk_level === 'PHISHING' || (r.risk_score !== null && r.risk_score >= 61)
  ).length;
  const suspiciousCount = reports.filter(
    (r) => r.risk_level === 'SUSPICIOUS' || (r.risk_score !== null && r.risk_score >= 41 && r.risk_score < 61)
  ).length;
  const legitimateCount = reports.filter(
    (r) => r.risk_level === 'LEGITIMATE' || (r.risk_score !== null && r.risk_score < 41)
  ).length;

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 select-none pdf-reports-scope font-inter"
      role="dialog"
      aria-modal="true"
      aria-label="User Scanned PDF Reports"
      style={INTER_FONT_STYLE}
    >
      {/* Translucent Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/65 backdrop-blur-xl transition-opacity duration-300"
        onClick={() => {
          if (selectedReport) setSelectedReport(null);
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
            isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-white/50'
          }`}
        >
          {/* Left Title with Custom Archive SVG Icon */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-transform active:scale-95 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-gradient-to-b from-indigo-50 to-white border-indigo-200/80 text-indigo-600'
              }`}
            >
              <PdfArchiveIcon className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-[17px] font-semibold tracking-[-0.02em]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Scanned PDF Reports
                </h2>
                {totalCount > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isDarkMode
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {totalCount} {totalCount === 1 ? 'file' : 'files'}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                Downloadable vector threat assessments generated for {user?.email || 'your scans'}
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
                placeholder="Search PDF by target, domain..."
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
              onClick={fetchReports}
              disabled={isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-300'
                  : 'bg-black/[0.05] hover:bg-black/[0.08] text-gray-700'
              }`}
              title="Refresh PDF reports"
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
              { id: 'ALL', label: 'All PDF Files', count: totalCount },
              { id: 'PHISHING', label: 'Phishing', count: phishingCount },
              { id: 'SUSPICIOUS', label: 'Suspicious', count: suspiciousCount },
              { id: 'LEGITIMATE', label: 'Legitimate', count: legitimateCount },
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

          {/* Quick PDF stats legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Vector PDF
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Phishing Threats ({phishingCount})
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe Domains ({legitimateCount})
            </span>
          </div>
        </div>

        {/* Content Body: PDF Reports Grid */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 no-scrollbar">
          {isLoading && reports.length === 0 ? (
            /* Apple Skeleton Loaders */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-44 rounded-2xl animate-pulse border ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/[0.06]'
                      : 'bg-black/[0.03] border-black/[0.05]'
                  }`}
                />
              ))}
            </div>
          ) : reports.length === 0 ? (
            /* Empty State */
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${
                  isDarkMode
                    ? 'bg-white/[0.04] border-white/[0.08] text-gray-400'
                    : 'bg-black/[0.03] border-black/[0.06] text-gray-400'
                }`}
              >
                <PdfArchiveIcon className="w-7 h-7 opacity-75" />
              </div>

              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                No Scanned PDF Reports Found
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                {searchQuery
                  ? `No PDF files match "${searchQuery}". Try searching another domain or clear filters.`
                  : 'Execute a website phishing scan to automatically generate and export downloadable PDF threat intelligence reports.'}
              </p>
            </div>
          ) : (
            /* Grid of PDF Document Cards */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reports.map((item) => {
                const isFailed = item.overall_status === 'FAILED';
                const riskLevel = item.risk_level || (isFailed ? 'FAILED' : 'UNKNOWN');
                const riskScore = item.risk_score;

                const isPhishing = riskLevel === 'PHISHING' || (riskScore !== null && riskScore >= 61);
                const isSuspicious =
                  riskLevel === 'SUSPICIOUS' || (riskScore !== null && riskScore >= 41 && riskScore < 61);
                const isLegit = riskLevel === 'LEGITIMATE' || (riskScore !== null && riskScore < 41);

                let badgeStyle = isDarkMode
                  ? 'bg-gray-800 text-gray-300 border-gray-700'
                  : 'bg-gray-100 text-gray-700 border-gray-200';

                let pdfIconBg = isDarkMode ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600';

                if (isPhishing || isFailed) {
                  badgeStyle = isDarkMode
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-rose-100 text-rose-800 border-rose-200';
                  pdfIconBg = isDarkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600';
                } else if (isSuspicious) {
                  badgeStyle = isDarkMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
                  pdfIconBg = isDarkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600';
                } else if (isLegit) {
                  badgeStyle = isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  pdfIconBg = isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600';
                }

                const isDownloading = Boolean(downloadingIds[item.id]);

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-[22px] border p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.995] cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.05]'
                        : 'bg-white border-black/[0.06] hover:border-black/15 hover:bg-white/95 shadow-sm'
                    }`}
                    onClick={() => setSelectedReport(item)}
                  >
                    {/* Top Row: PDF File Name, Threat Verdict & Time */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* PDF File Badge Icon */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${pdfIconBg}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          >
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M9 13v4" />
                            <path d="M12 13v4" />
                            <path d="M15 13v4" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-400 transition-colors">
                            {item.filename}
                          </h4>
                          <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                            {item.target_url || item.chat_title}
                          </p>
                        </div>
                      </div>

                      {/* Risk Badge & Time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${badgeStyle}`}>
                          {riskScore !== null && riskScore !== undefined ? `${riskScore}% ${riskLevel}` : riskLevel}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Screenshot Thumbnail / Preview & Summary */}
                    <div className="flex items-center gap-3.5 pt-1">
                      {item.screenshot_url ? (
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/40 shadow-xs">
                          <img
                            src={item.screenshot_url}
                            alt={`Screenshot for ${item.domain}`}
                            loading="lazy"
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[9px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded-md">
                              PDF Preview
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-24 h-16 rounded-xl flex items-center justify-center shrink-0 border text-[10px] text-gray-400 ${
                            isDarkMode ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.04]'
                          }`}
                        >
                          Vector PDF
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[11.5px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {item.summary || (isFailed ? 'Scan failed during analysis' : 'Multi-agent security report with forensic evidence.')}
                        </p>

                        {/* Badges and metadata */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            PDF Document
                          </span>
                          {item.duration_sec && (
                            <span className="text-[10px] text-gray-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              ⏱ {item.duration_sec}s
                            </span>
                          )}
                          {item.brand_detected && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200/50 dark:border-purple-800/40">
                              🏷 {item.brand_detected}
                            </span>
                          )}
                          {item.findings_count > 0 && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/40">
                              🛡 {item.findings_count} findings
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.05] text-xs">
                      <button
                        type="button"
                        onClick={(e) => copyUrl(item.target_url, item.id, e)}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === item.id ? (
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
                            setSelectedReport(item);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 border ${
                            isDarkMode
                              ? 'bg-white/[0.06] border-white/[0.08] hover:bg-white/15 text-gray-200'
                              : 'bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08] text-gray-700'
                          }`}
                        >
                          <span>Inspect Report</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(item, e)}
                          disabled={isDownloading}
                          className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                              <span>Download PDF</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── POPUP REPORT DETAILS & TELEMETRY INSPECTION MODAL ── */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 md:p-8 animate-fadeIn pdf-reports-scope font-inter"
          style={INTER_FONT_STYLE}
        >
          {/* Backdrop for popup */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-2xl transition-opacity"
            onClick={() => setSelectedReport(null)}
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
                    selectedReport.risk_level === 'PHISHING' || selectedReport.risk_score >= 61
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <PdfArchiveIcon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold truncate">
                      {selectedReport.filename}
                    </h3>
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedReport.risk_level === 'PHISHING' || selectedReport.risk_score >= 61
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : selectedReport.risk_level === 'SUSPICIOUS'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {selectedReport.risk_score !== null && selectedReport.risk_score !== undefined
                        ? `${selectedReport.risk_score}% ${selectedReport.risk_level}`
                        : selectedReport.risk_level}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                    {selectedReport.target_url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleDownloadPdf(selectedReport, e)}
                  disabled={downloadingIds[selectedReport.id]}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {downloadingIds[selectedReport.id] ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span>Download PDF Report</span>
                    </>
                  )}
                </button>

                {selectedReport.chat_id && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenChat(selectedReport.chat_id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      isDarkMode
                        ? 'bg-white/10 hover:bg-white/15 text-gray-200 border-white/10'
                        : 'bg-black/5 hover:bg-black/10 text-gray-800 border-black/10'
                    }`}
                  >
                    <span>Open in Chat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isDarkMode ? 'bg-white/10 text-gray-300 hover:text-white' : 'bg-black/5 text-gray-700 hover:text-black'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Popup Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {/* Executive Summary Banner */}
              <div
                className={`p-4 rounded-2xl border ${
                  selectedReport.risk_level === 'PHISHING' || selectedReport.risk_score >= 61
                    ? isDarkMode
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                    : isDarkMode
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Executive Threat Summary
                  </h4>
                  <span className="text-[11px] font-mono">
                    Scanned {formatFullDateTime(selectedReport.created_at)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed">
                  {selectedReport.summary || 'Automated multi-agent threat assessment completed.'}
                </p>
              </div>

              {/* Forensic Screenshot Preview */}
              {selectedReport.screenshot_url && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Visual Evidence Capture
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 max-h-[300px] flex items-center justify-center">
                    <img
                      src={selectedReport.screenshot_url}
                      alt={`Visual evidence for ${selectedReport.domain}`}
                      className="max-h-[300px] w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Findings & Telemetry List */}
              {selectedReport.report?.findings && Array.isArray(selectedReport.report.findings) && selectedReport.report.findings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    Security Findings ({selectedReport.report.findings.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.report.findings.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.04]'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {f.category || 'General Finding'}
                          </span>
                          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {f.detail}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                            f.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-400'
                              : f.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {f.severity || 'info'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Advice */}
              {selectedReport.report?.safety_advice && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDarkMode ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-200' : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                  }`}
                >
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-1">
                    Actionable Safety Advice
                  </h5>
                  <p className="text-xs leading-relaxed">
                    {selectedReport.report.safety_advice}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
