import { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { useToast } from './ToastContext';
import { useAuth } from '../context/AuthContext';
import { PdfFileIcon } from './PDFBuildingAnimation';

export default function FileDownloadCard({
  url,
  report,
  screenshotUrl,
  urlAnalysisData,
  duration,
  chatId,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { addToast } = useToast();
  const { token } = useAuth();

  // Extract clean domain for the display filename
  const getCleanDomain = () => {
    try {
      if (!url) return 'target';
      const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
      return parsed.hostname.replace('www.', '') || 'target';
    } catch {
      return (url || 'target').replace(/[^a-zA-Z0-9.-]/g, '_');
    }
  };

  const domain = getCleanDomain();
  const fileName = `PhishLens_Security_Report_${domain}.pdf`;
  const estimatedSize = screenshotUrl ? '185.4 KB' : '94.2 KB';

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response;

      // 1. Try saved chat PDF endpoint if chatId exists
      if (chatId) {
        try {
          response = await fetch(`http://localhost:8000/api/chats/${chatId}/pdf/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch {
          response = null;
        }
      }

      // 2. Fallback to on-demand POST generation
      if (!response || !response.ok) {
        response = await fetch('http://localhost:8000/api/scan/pdf/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: url || 'Target URL',
            report: report || {},
            screenshot_data: screenshotUrl || null,
            url_analysis_data: urlAnalysisData || null,
            duration: duration || null,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to export PDF (Status: ${response.status})`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setIsDownloaded(true);
      addToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: `${fileName} has been saved to your downloads.`,
      });

      setTimeout(() => setIsDownloaded(false), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not generate PDF report.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 my-2">
      {/* Title matching user's design */}
      <h3 className="text-[15px] md:text-[16px] font-bold text-gray-900 dark:text-white tracking-tight">
        Download the file here:
      </h3>

      {/* Container card with full Light & Dark mode support */}
      <div className="w-full rounded-2xl bg-white dark:bg-[#141416] border border-gray-200/90 dark:border-gray-800/80 p-3.5 sm:p-4 flex items-center justify-between shadow-sm dark:shadow-xl transition-all hover:border-gray-300 dark:hover:border-gray-700/80">
        {/* Left Side: Document Icon & Metadata */}
        <div className="flex items-center gap-3.5 min-w-0 pr-3">
          {/* Stylized Document File Icon using user's PDF Icon */}
          <div className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/25 flex items-center justify-center shrink-0 shadow-inner select-none p-2">
            <PdfFileIcon className="w-7 h-7 sm:w-8 sm:h-8" glow={false} />
          </div>

          {/* File Name & Subtitle */}
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[14px] sm:text-[15px] text-gray-900 dark:text-gray-100 truncate tracking-tight">
              {fileName}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
              Document • {estimatedSize}
            </span>
          </div>
        </div>

        {/* Right Side: Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-medium text-[12.5px] sm:text-[13px] transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          {isDownloading ? (
            <>
              <Loader2 size={15} className="animate-spin text-indigo-500 dark:text-indigo-400" />
              <span>Generating...</span>
            </>
          ) : isDownloaded ? (
            <>
              <Check size={15} className="text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-300">Saved</span>
            </>
          ) : (
            <>
              <Download size={15} className="text-gray-600 dark:text-gray-300" />
              <span>Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
