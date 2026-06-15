import { useState } from 'react';
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Eye,
  ExternalLink,
  Clock,
  Activity,
} from 'lucide-react';

// Subcomponent for displaying execution trace logs
function TraceStepList({ steps }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-[#1e1e1e]/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-indigo-500" />
          Agent Reasoning Execution Trace ({steps.length} steps)
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-3 font-mono text-[11px] leading-relaxed border-t border-gray-200 dark:border-gray-700/60 max-h-[300px] overflow-y-auto no-scrollbar">
          {steps.map((step, idx) => {
            const isCall = step.step === 'tool_call';
            return (
              <div key={idx} className="flex gap-2.5">
                <span className={isCall ? "text-indigo-400 font-bold shrink-0" : "text-emerald-400 font-bold shrink-0"}>
                  {isCall ? "→" : "←"}
                </span>
                <div>
                  <span className={isCall ? "text-indigo-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {isCall ? `call:${step.tool}` : `observe:${step.tool}`}
                  </span>
                  {isCall && step.args && (
                    <span className="text-gray-400 ml-1">args={JSON.stringify(step.args)}</span>
                  )}
                  {!isCall && step.content_preview && (
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 ml-2 border-l border-gray-300 dark:border-gray-700 pl-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all">
                      {step.content_preview}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Subcomponent for rendering the beautiful, complete scan report dashboard
export default function ReportDashboard({ report, duration, screenshotUrl, toolTrace, onViewFullDashboard }) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  if (!report) return null;

  // Determine badge colors based on risk score / level
  const score = report.risk_score ?? 0;
  let scoreColor = "text-emerald-500 dark:text-emerald-400";
  let scoreBg = "bg-emerald-50 dark:bg-emerald-950/20";
  let scoreBorder = "border-emerald-200/50 dark:border-emerald-800/40";
  let riskLevelLabel = "Safe";

  if (score > 20 && score <= 40) {
    scoreColor = "text-yellow-500 dark:text-yellow-400";
    scoreBg = "bg-yellow-50 dark:bg-yellow-950/20";
    scoreBorder = "border-yellow-200/50 dark:border-yellow-800/40";
    riskLevelLabel = "Low Risk";
  } else if (score > 40 && score <= 60) {
    scoreColor = "text-orange-500 dark:text-orange-400";
    scoreBg = "bg-orange-50 dark:bg-orange-950/20";
    scoreBorder = "border-orange-200/50 dark:border-orange-800/40";
    riskLevelLabel = "Medium Risk";
  } else if (score > 60 && score <= 80) {
    scoreColor = "text-rose-500 dark:text-rose-400";
    scoreBg = "bg-rose-50 dark:bg-rose-950/20";
    scoreBorder = "border-rose-200/50 dark:border-rose-800/40";
    riskLevelLabel = "High Risk";
  } else if (score > 80) {
    scoreColor = "text-red-500 dark:text-red-400";
    scoreBg = "bg-red-50 dark:bg-red-950/20";
    scoreBorder = "border-red-200/50 dark:border-red-800/40";
    riskLevelLabel = "Critical Risk";
  }

  return (
    <div className="w-full flex flex-col gap-6 text-gray-800 dark:text-gray-100 animate-fade-in">
      {/* 1. Header Overview Card */}
      <div className={`p-6 rounded-3xl border ${scoreBorder} ${scoreBg} flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm`}>
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="text-xs uppercase tracking-widest font-bold opacity-60">Security Analysis Completed</div>
          <h2 className="text-xl font-bold tracking-tight">Status: {report.risk_level}</h2>
          <p className="text-sm opacity-80 max-w-md">
            PhishLens has analyzed the target site's DOM features, lexical signals, WHOIS registration record, and visual components.
          </p>
        </div>
        
        {/* Score Ring / Gauge */}
        <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/20">
          <div className="flex flex-col items-center">
            <span className={`text-4xl font-extrabold tracking-tighter ${scoreColor}`}>{score}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Risk Score</span>
          </div>
          <div className="h-8 w-[1px] bg-gray-300 dark:bg-gray-700" />
          <div className="text-xs font-bold uppercase tracking-wider">{riskLevelLabel}</div>
        </div>
      </div>

      {/* 2. Brand Impersonation Warning Banner */}
      {report.brand_impersonation && report.brand_impersonation.detected && (
        <div className="p-4 rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-3">
          <ShieldAlert size={20} className="shrink-0 animate-pulse" />
          <div>
            <span className="font-bold">Brand Impersonation Detected!</span> The site mimics visual or HTML elements of <span className="underline font-extrabold">{report.brand_impersonation.brand}</span> (Confidence: {Math.round((report.brand_impersonation.confidence ?? 0) * 100)}%).
          </div>
        </div>
      )}

      {/* 3. Executive Summary */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400">Executive Summary</h3>
        <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-[#1a1a1a]/30 p-5 rounded-2xl border border-gray-200/50 dark:border-gray-800/40">
          {report.summary}
        </p>
      </div>

      {/* 4. Structured Findings */}
      {report.findings && report.findings.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400">Key Findings ({report.findings.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.findings.map((finding, index) => {
              const severity = (finding.severity ?? "low").toLowerCase();
              let badgeBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              if (severity === "medium") badgeBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
              if (severity === "high" || severity === "critical") badgeBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";

              return (
                <div key={index} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1b1b1b]/35 shadow-sm hover:border-indigo-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">{finding.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${badgeBg}`}>
                      {severity}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{finding.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Captured Screenshot Section */}
      {screenshotUrl && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1b1b1b]/20">
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="w-full px-5 py-4 flex items-center justify-between font-semibold text-sm hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Eye size={16} className="text-indigo-500" />
              Captured Webpage Screenshot
            </span>
            {showScreenshot ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showScreenshot && (
            <div className="p-4 bg-gray-50 dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md group">
                <img
                  src={screenshotUrl}
                  alt="Captured Target Webpage"
                  className="w-full h-auto object-contain max-h-[500px]"
                />
                <a
                  href={screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/95 text-white p-2 rounded-lg text-xs flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink size={12} />
                  Open Full Resolution
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Safety Advice */}
      <div className="p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-300">
        <div className="text-xs uppercase tracking-widest font-bold opacity-60 mb-1">Safety Recommendation</div>
        <p className="text-[14px] leading-relaxed font-medium">{report.safety_advice}</p>
      </div>

      {/* 7. Extra Stats & Trace & Full Dashboard Button */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock size={12} /> Duration: {duration}s</span>
          <span className="flex items-center gap-1"><Activity size={12} /> System: ReAct Multi-Agent Pipeline</span>
        </div>
        <TraceStepList steps={toolTrace} />
      </div>
    </div>
  );
}
