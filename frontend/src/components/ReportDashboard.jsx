import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Eye,
  ExternalLink,
  Clock,
  Activity,
  ShieldCheck,
  ShieldAlert as AlertShield,
  HelpCircle,
  Lock,
  RefreshCw,
  X,
  Maximize2,
} from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCircularProgressBar } from './ui/animated-circular-progress-bar';

// Helper component to type out text character by character
function TypingText({ text, speed = 8 }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    if (!text) return;
    
    const interval = setInterval(() => {
      setDisplayText(() => {
        if (index < text.length) {
          index++;
          return text.substring(0, index);
        } else {
          clearInterval(interval);
          return text;
        }
      });
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayText}</span>;
}

// Subcomponent for displaying execution trace logs with smooth height animation
function TraceStepList({ steps }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isOpen) {
      gsap.killTweensOf(contentRef.current);
      gsap.fromTo(
        contentRef.current,
        { height: 0, opacity: 0 },
        {
          height: 'auto',
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
        }
      );
    } else {
      gsap.killTweensOf(contentRef.current);
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.35,
        ease: 'power3.in',
      });
    }
  }, [isOpen]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-200/60 dark:border-gray-800/40 rounded-2xl overflow-hidden bg-white/50 dark:bg-[#151515]/30 backdrop-blur-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-gray-550 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-indigo-500" />
          Agent Reasoning Execution Trace ({steps.length} steps)
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden"
        style={{ height: 0, opacity: 0 }}
      >
        <div className="px-5 pb-5 pt-2 flex flex-col gap-3 font-mono text-[11px] leading-relaxed border-t border-gray-200/50 dark:border-gray-800/40 max-h-[300px] overflow-y-auto no-scrollbar">
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
      </div>
    </div>
  );
}

// Subcomponent for rendering the beautiful, complete scan report dashboard
export default function ReportDashboard({ report, duration, screenshotUrl, toolTrace, onViewFullDashboard }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const containerRef = useRef(null);
  const lightboxRef = useRef(null);

  // Helper to extract clean URL from summary text
  const getUrlFromSummary = (summaryText) => {
    const match = summaryText?.match(/https?:\/\/[a-zA-Z0-9\-\.]+/);
    return match ? match[0] : 'https://secure-login-update-bank.com';
  };

  // Entrance animations using GSAP (Asymmetric Split Reveal)
  useEffect(() => {
    if (!containerRef.current || !report) return;

    const ctx = gsap.context(() => {
      // Set initial values
      gsap.set('.animate-left', { x: -40, opacity: 0 });
      gsap.set('.animate-header', { x: 30, opacity: 0 });
      gsap.set('.animate-banner', { x: 30, opacity: 0 });
      gsap.set('.animate-summary', { x: 30, opacity: 0 });
      gsap.set('.animate-finding', { x: 30, opacity: 0, scale: 0.98 });
      gsap.set('.animate-advice', { x: 30, opacity: 0 });
      gsap.set('.animate-footer', { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 0.9 } });

      tl.to('.animate-left', { x: 0, opacity: 1, duration: 1.2 })
        .to('.animate-header', { x: 0, opacity: 1, duration: 1.0 }, '-=0.9')
        .to('.animate-banner', { x: 0, opacity: 1 }, '-=0.8')
        .to('.animate-summary', { x: 0, opacity: 1 }, '-=0.7')
        .to('.animate-finding', {
          x: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.08,
          duration: 0.8,
        }, '-=0.6')
        .to('.animate-advice', { x: 0, opacity: 1 }, '-=0.6')
        .to('.animate-footer', { opacity: 1, duration: 0.6 }, '-=0.4');
    }, containerRef);

    return () => ctx.revert();
  }, [report]);

  // Lightbox animation
  useEffect(() => {
    if (!lightboxRef.current) return;
    if (isLightboxOpen) {
      gsap.killTweensOf(lightboxRef.current);
      gsap.fromTo(
        lightboxRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [isLightboxOpen]);

  if (!report) return null;

  const score = report.risk_score ?? 0;
  const analyzedUrl = getUrlFromSummary(report.summary);
  
  // Determine color themes
  let scoreColor = "text-emerald-500 dark:text-emerald-400";
  let scoreBg = "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/2";
  let scoreBorder = "border-emerald-500/20 dark:border-emerald-500/10 shadow-emerald-500/5";
  let riskLevelLabel = "Safe";
  let RiskIcon = ShieldCheck;

  if (score > 20 && score <= 40) {
    scoreColor = "text-amber-500 dark:text-amber-400";
    scoreBg = "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 dark:from-amber-500/10 dark:to-yellow-500/2";
    scoreBorder = "border-amber-500/20 dark:border-amber-500/10 shadow-amber-500/5";
    riskLevelLabel = "Low Risk";
    RiskIcon = ShieldCheck;
  } else if (score > 40 && score <= 60) {
    scoreColor = "text-orange-500 dark:text-orange-400";
    scoreBg = "bg-gradient-to-r from-orange-500/10 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/2";
    scoreBorder = "border-orange-500/20 dark:border-orange-500/10 shadow-orange-500/5";
    riskLevelLabel = "Medium Risk";
    RiskIcon = HelpCircle;
  } else if (score > 60 && score <= 80) {
    scoreColor = "text-rose-500 dark:text-rose-400";
    scoreBg = "bg-gradient-to-r from-rose-500/10 to-red-500/5 dark:from-rose-500/15 dark:to-red-500/5";
    scoreBorder = "border-rose-500/30 dark:border-rose-500/20 shadow-rose-500/10";
    riskLevelLabel = "High Risk";
    RiskIcon = AlertShield;
  } else if (score > 80) {
    scoreColor = "text-red-500 dark:text-red-400";
    scoreBg = "bg-gradient-to-r from-red-500/10 to-rose-500/5 dark:from-red-500/20 dark:to-rose-500/5";
    scoreBorder = "border-red-500/30 dark:border-red-500/20 shadow-red-500/10";
    riskLevelLabel = "Critical Risk";
    RiskIcon = AlertShield;
  }

  return (
    <div
      ref={containerRef}
      className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start text-gray-800 dark:text-gray-100"
    >
      {/* ─── LEFT COLUMN: Webpage Screenshot (Mock Browser Viewport) ─── */}
      <div className="animate-left md:col-span-5 md:sticky md:top-6 flex flex-col gap-3.5 w-full">
        <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 ml-1">
          Visual Impersonation Inspection
        </h3>
        
        {/* Browser Mockup Container */}
        <div className="group relative rounded-xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden bg-gray-50 dark:bg-[#181818]/65 shadow-xl transition-all duration-300 hover:border-indigo-500/30">
          
          {/* Browser Header Bar */}
          <div className="bg-gray-100/80 dark:bg-[#202020]/90 px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center gap-3">
            {/* Window Controls */}
            <div className="flex gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/90 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/90 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/90 inline-block" />
            </div>
            
            {/* Address Bar */}
            <div className="flex-1 bg-white dark:bg-black/30 border border-gray-200/50 dark:border-white/5 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] text-gray-450 dark:text-gray-500 font-mono select-none">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Lock size={10} className="text-emerald-500/80 shrink-0" />
                <span className="truncate">{analyzedUrl}</span>
              </div>
              <RefreshCw size={10} className="opacity-50 shrink-0 ml-1.5" />
            </div>
          </div>
          
          {/* Screenshot Content Area */}
          <div className="relative max-h-[350px] md:max-h-[460px] overflow-y-auto no-scrollbar bg-white dark:bg-[#121212] cursor-zoom-in">
            {screenshotUrl ? (
              <div onClick={() => setIsLightboxOpen(true)} className="relative">
                <img
                  src={screenshotUrl}
                  alt="Captured Webpage"
                  className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                />
                
                {/* Expand Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-black/75 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg scale-95 group-hover:scale-100 transition-all duration-300">
                    <Maximize2 size={13} />
                    Click to Expand
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center select-none">
                <ShieldAlert size={28} className="opacity-40 mb-2" />
                <span className="text-xs font-semibold">No visual screenshot captured.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Security Report Details ─── */}
      <div className="md:col-span-7 flex flex-col gap-6 w-full">
        {/* 1. Header Overview Card */}
        <div
          className={`animate-header p-5 rounded-[24px] border ${scoreBorder} ${scoreBg} flex flex-row items-center justify-between gap-6 shadow-md backdrop-blur-md`}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-indigo-500/80 dark:text-indigo-400/90 bg-indigo-500/5 dark:bg-indigo-400/5 px-2.5 py-0.5 rounded-full border border-indigo-500/10 dark:border-indigo-400/10 w-fit">
              Security Report
            </span>
            <h2 className="text-xl font-black tracking-tight mt-1">Status: {report.risk_level}</h2>
            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold">
              <span className="flex items-center gap-1"><Clock size={11} /> {duration}s</span>
              <span className="flex items-center gap-1"><Activity size={11} /> ReAct Engine</span>
            </div>
          </div>
          
          {/* Score ring */}
          <div className="flex items-center gap-3.5 bg-white/45 dark:bg-black/35 p-2.5 pr-4.5 rounded-xl border border-white/30 dark:border-white/5 shadow-sm shrink-0">
            <AnimatedCircularProgressBar value={score} max={100} min={0} className="scale-90" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">Verdict</span>
              <div className="flex items-center gap-1">
                <RiskIcon size={13} className={scoreColor} />
                <div className={`text-xs font-bold uppercase tracking-wider ${scoreColor}`}>{riskLevelLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Brand Impersonation Banner */}
        {report.brand_impersonation && report.brand_impersonation.detected && (
          <div
            className="animate-banner p-4 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 shadow-sm"
          >
            <ShieldAlert size={18} className="shrink-0 animate-pulse text-red-500" />
            <div className="text-xs leading-relaxed">
              <span className="font-extrabold">Brand Impersonation!</span> Mimics <span className="underline font-black">{report.brand_impersonation.brand}</span> (Confidence: {Math.round((report.brand_impersonation.confidence ?? 0) * 100)}%).
            </div>
          </div>
        )}

        {/* 3. Executive Summary */}
        <div className="animate-summary flex flex-col gap-2">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 ml-1">Summary</h3>
          <p className="text-[13px] leading-relaxed text-gray-605 dark:text-gray-300 bg-white/35 dark:bg-[#1a1a1a]/30 p-4.5 rounded-2xl border border-gray-200/50 dark:border-gray-800/40 shadow-sm font-medium">
            <TypingText text={report.summary} speed={8} />
          </p>
        </div>

        {/* 4. Structured Findings */}
        {report.findings && report.findings.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 ml-1">Key Findings ({report.findings.length})</h3>
            <div className="flex flex-col gap-3">
              {report.findings.map((finding, index) => {
                const severity = (finding.severity ?? "low").toLowerCase();
                let borderHighlight = "border-l-4 border-l-emerald-500";
                let badgeBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                
                if (severity === "medium") {
                  borderHighlight = "border-l-4 border-l-amber-500";
                  badgeBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                } else if (severity === "high" || severity === "critical") {
                  borderHighlight = "border-l-4 border-l-rose-500";
                  badgeBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
                }

                return (
                  <div
                    key={index}
                    className={`animate-finding p-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 ${borderHighlight} bg-white/40 dark:bg-[#1b1b1b]/35 shadow-sm hover:border-indigo-500/30 transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">{finding.category}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest ${badgeBg}`}>
                        {severity}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-medium text-left">
                      <TypingText text={finding.detail} speed={7} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Safety Advice */}
        <div
          className="animate-advice p-4.5 rounded-[18px] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/5 border border-indigo-500/20 dark:border-indigo-500/10 text-indigo-900 dark:text-indigo-300 shadow-sm"
        >
          <div className="text-[9px] uppercase tracking-widest font-black opacity-60 mb-1">Safety Advice</div>
          <p className="text-xs leading-relaxed font-semibold">
            <TypingText text={report.safety_advice} speed={8} />
          </p>
        </div>

        {/* 6. Trace Logs */}
        <div className="animate-footer">
          <TraceStepList steps={toolTrace} />
        </div>
      </div>

      {/* ─── LIGHTBOX OVERLAY MODAL ─── */}
      {isLightboxOpen && screenshotUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
          <div
            ref={lightboxRef}
            className="relative max-w-5xl w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center bg-[#0d0d0d]"
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/60 sticky top-0 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-white font-mono">{analyzedUrl}</span>
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Image Container */}
            <div className="p-4 flex justify-center w-full bg-[#0d0d0d]">
              <img
                src={screenshotUrl}
                alt="Webpage Full Screenshot"
                className="w-full h-auto object-contain max-h-[80vh] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
