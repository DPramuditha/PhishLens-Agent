import { useState } from 'react';
import { Copy, Check, RotateCw } from 'lucide-react';

export default function MessageActionBar({ msg, onRescan, isLoadingGlobal }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let textToCopy = msg.text || '';
    
    // If it's a scan report, format a helpful text summary to copy
    if (msg.report) {
      const { risk_score, risk_level, domain_age_days, registrar } = msg.report;
      textToCopy = `PhishLens Scan Report for: ${msg.url}\n` +
                   `Risk Level: ${risk_level || 'UNKNOWN'}\n` +
                   `Risk Score: ${risk_score ?? 0}%\n` +
                   `Domain Age: ${domain_age_days ?? 'N/A'} days\n` +
                   `Registrar: ${registrar || 'N/A'}`;
    } else if (msg.url) {
      textToCopy = msg.url;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const isUser = msg.isUser;
  const isBot = !isUser;
  
  // Disable conditions
  const isReloadDisabled = isLoadingGlobal || msg.status === 'loading';

  return (
    <div className="absolute right-3 -bottom-3.5 z-20 flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 dark:border-zinc-800/80 dark:bg-[#1a1a1a]/90 hover:shadow-md hover:scale-[1.02]">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        title="Copy message or report summary"
        className="flex items-center gap-1 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-slate-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-150 cursor-pointer"
      >
        {copied ? (
          <>
            <Check size={13} className="text-emerald-500 dark:text-emerald-400 animate-bounce" />
            <span className="text-[10px] font-bold text-emerald-550 dark:text-emerald-400 px-0.5">Copied!</span>
          </>
        ) : (
          <Copy size={13} />
        )}
      </button>

      {/* Reload/Rescan Button (Only for bot message / scans) */}
      {isBot && msg.url && (
        <>
          <div className="h-3 w-[1px] bg-slate-200 dark:bg-zinc-850" />
          <button
            onClick={() => !isReloadDisabled && onRescan(msg.id, msg.url)}
            disabled={isReloadDisabled}
            title={isReloadDisabled ? "Scan in progress..." : "Rescan URL"}
            className={`rounded-full p-1.5 transition-colors cursor-pointer ${
              isReloadDisabled
                ? "text-gray-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
                : "text-gray-500 hover:bg-slate-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-150"
            }`}
          >
            <RotateCw size={13} className={msg.status === 'loading' ? 'animate-spin' : ''} />
          </button>
        </>
      )}
    </div>
  );
}
