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
  Globe,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCircularProgressBar } from './ui/animated-circular-progress-bar';
import { Highlight } from './ui/highlighter';

// Helper component to type out text word by word sequentially
function WordTypingText({ text, speed = 30, onComplete, trigger = false }) {
  const [displayText, setDisplayText] = useState('');
  const onCompleteRef = useRef(onComplete);

  // Keep ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger || !text) {
      setDisplayText('');
      return;
    }

    const words = text.split(' ');
    let currentIndex = 0;
    setDisplayText('');

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex <= words.length) {
        setDisplayText(words.slice(0, currentIndex).join(' '));
        if (currentIndex === words.length) {
          clearInterval(interval);
          if (onCompleteRef.current) {
            setTimeout(() => {
              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
            }, 180);
          }
        }
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, trigger]);

  if (!trigger) return null;

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

// InfoCard subcomponent for structured data display
function InfoCard({ icon: Icon, title, children, iconColor = 'text-indigo-400' }) {
  return (
    <div className="rounded-2xl border border-gray-200/50 dark:border-gray-800/40 bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`p-2 rounded-xl bg-gray-100/80 dark:bg-white/5 ${iconColor}`}>
          <Icon size={16} />
        </div>
        <h4 className="text-[11px] uppercase tracking-[0.12em] font-black text-gray-500 dark:text-gray-400">
          {title}
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}

// InfoRow subcomponent for label-value pairs inside InfoCards
function InfoRow({ label, value, fullWidth = false, valueColor }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <dt className="text-[10.5px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500 mb-0.5">
        {label}
      </dt>
      <dd className={`text-[14px] font-semibold text-gray-800 dark:text-gray-200 break-all leading-snug ${valueColor || ''}`}>
        {value || <span className="text-gray-400 dark:text-gray-600 italic text-[13px]">—</span>}
      </dd>
    </div>
  );
}

// Subcomponent for rendering the beautiful, complete scan report dashboard
export default function ReportDashboard({ report, duration, screenshotUrl, toolTrace, urlAnalysisData }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const containerRef = useRef(null);
  const lightboxRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
  }, [report]);

  // Helper to extract clean URL from summary text
  const getUrlFromSummary = (summaryText) => {
    const match = summaryText?.match(/https?:\/\/[a-zA-Z0-9\-\.]+/);
    return match ? match[0] : 'https://secure-login-update-bank.com';
  };

  // Entrance animations using GSAP
  useEffect(() => {
    if (!containerRef.current || !report) return;

    const ctx = gsap.context(() => {
      gsap.set('.animate-left', { x: -30, opacity: 0 });
      gsap.set('.animate-report', { x: 30, opacity: 0 });
      gsap.set('.animate-footer', { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 0.9 } });

      tl.to('.animate-left', { x: 0, opacity: 1, duration: 1.2 })
        .to('.animate-report', { x: 0, opacity: 1, duration: 1.0 }, '-=0.9')
        .to('.animate-footer', { opacity: 1, duration: 0.6 }, '-=0.5');
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

  const hasBrand = report.brand_impersonation && report.brand_impersonation.detected;
  const findingsCount = report.findings ? report.findings.length : 0;
  const findingsStartStep = hasBrand ? 2 : 1;
  const safetyStartStep = findingsStartStep + findingsCount;

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col gap-6 text-gray-800 dark:text-gray-100"
    >
      {/* ─── TOP SECTION: Webpage Screenshot ─── */}
      <div className="animate-left flex flex-col gap-2.5 w-full max-w-2xl mx-auto">
        <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 ml-1 text-left">
          Visual Screenshot
        </h3>
        
        <div className="overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-[#121212] shadow-lg">
          {screenshotUrl ? (
            <div onClick={() => setIsLightboxOpen(true)} className="relative cursor-zoom-in">
              <img
                src={screenshotUrl}
                alt="Captured Webpage"
                className="w-full h-auto object-contain transition-transform duration-500 hover:scale-[1.01]"
              />
              
              {/* Expand Hover Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <Maximize2 size={12} />
                  View Fullscreen
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center select-none">
              <ShieldAlert size={28} className="opacity-40 mb-2" />
              <span className="text-xs font-semibold">No visual screenshot captured.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM SECTION: Security Report Details (Structured Plain Text with Typing) ─── */}
      <div className="animate-report flex flex-col gap-6 w-full max-w-2xl mx-auto text-left">
        
        {/* Verdict & Circular Progress Bar Row */}
        <div className="flex items-center justify-between gap-6 border-b border-gray-200/50 dark:border-gray-850/40 pb-5">
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[12px] uppercase tracking-widest font-black text-indigo-500 dark:text-indigo-400">
              Analysis Verdict
            </h4>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 text-gray-900 dark:text-white">
              VERDICT: {report.risk_level.toUpperCase()}
            </h2>
            <p className="text-[16px] md:text-[17.5px] font-bold text-gray-500 dark:text-gray-400">
              Risk Score: {score}% | Duration: {duration}s
            </p>
          </div>
          
          {/* Animated Circular Progress Bar & (Risk Score: 38%) Label */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <AnimatedCircularProgressBar value={score} max={100} min={0} className="scale-100" />
            <span className="text-[13px] md:text-[14px] font-black text-gray-700 dark:text-gray-300 tracking-tight whitespace-nowrap">
              (Risk Score: {score}%)
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-gray-900 dark:text-white uppercase">
            Executive Summary
          </h3>
          <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium">
            <WordTypingText 
              text={report.summary} 
              speed={35} 
              trigger={activeStep >= 0}
              onComplete={() => setActiveStep(hasBrand ? 1 : findingsStartStep)}
            />
          </p>
        </div>

        {/* ─── STRUCTURED DATA INFO CARDS ─── */}
        {urlAnalysisData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

            {/* Domain Whois Card */}
            {urlAnalysisData.whois && urlAnalysisData.whois.status === 'success' && (
              <InfoCard icon={FileText} title="Domain Whois" iconColor="text-violet-400">
                <InfoRow
                  label="Registered Domain"
                  value={urlAnalysisData.whois.registered_domain}
                  fullWidth
                />
                <InfoRow
                  label="Creation Date"
                  value={urlAnalysisData.whois.creation_date}
                />
                <InfoRow
                  label="Updated Date"
                  value={urlAnalysisData.whois.updated_date}
                />
              </InfoCard>
            )}

            {/* SSL Certificate Card */}
            {urlAnalysisData.ssl_certificate && urlAnalysisData.ssl_certificate.status !== 'error' && (
              <InfoCard icon={Lock} title="SSL Certificate" iconColor="text-emerald-400">
                <InfoRow
                  label="Subject"
                  value={urlAnalysisData.ssl_certificate.subject}
                  fullWidth
                />
                <InfoRow
                  label="Issuer"
                  value={urlAnalysisData.ssl_certificate.issuer}
                  fullWidth
                />
                <InfoRow
                  label="Trusted"
                  value={
                    urlAnalysisData.ssl_certificate.is_trusted ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-500 font-black">
                        <CheckCircle size={14} /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-500 font-black">
                        <XCircle size={14} /> No
                      </span>
                    )
                  }
                />
                <InfoRow
                  label="Expires"
                  value={urlAnalysisData.ssl_certificate.not_after}
                />
                <InfoRow
                  label="Renewed"
                  value={urlAnalysisData.ssl_certificate.not_before}
                />
              </InfoCard>
            )}

            {/* Server Location Card */}
            {urlAnalysisData.server_location && urlAnalysisData.server_location.status === 'success' && (
              <InfoCard icon={MapPin} title="Server Location" iconColor="text-sky-400">
                <InfoRow
                  label="City"
                  value={urlAnalysisData.server_location.city}
                />
                <InfoRow
                  label="Country"
                  value={urlAnalysisData.server_location.country}
                />
                <InfoRow
                  label="Timezone"
                  value={urlAnalysisData.server_location.timezone}
                />
                <InfoRow
                  label="IP Address"
                  value={urlAnalysisData.server_location.ip_address}
                />
              </InfoCard>
            )}

            {/* Global Ranking Card */}
            {urlAnalysisData.global_ranking && (
              <InfoCard icon={BarChart3} title="Global Ranking" iconColor="text-amber-400">
                <InfoRow
                  label="Rank"
                  value={
                    urlAnalysisData.global_ranking.rank ? (
                      <span className="text-[20px] font-black text-indigo-500 dark:text-indigo-400 tabular-nums">
                        #{urlAnalysisData.global_ranking.rank.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 font-semibold italic">Unranked</span>
                    )
                  }
                />
                <InfoRow
                  label="Source"
                  value={urlAnalysisData.global_ranking.source || 'Tranco'}
                />
              </InfoCard>
            )}

          </div>
        )}

        {/* Brand Impersonation (if detected) */}
        {hasBrand && activeStep >= 1 && (
          <div className="flex flex-col gap-1.5 mt-2 border-l-4 border-l-rose-500 pl-4 py-1">
            <h3 className="text-[16.5px] md:text-[17.5px] font-black tracking-tight text-rose-500 uppercase">
              [!] Brand Impersonation Warning
            </h3>
            <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-bold">
              <WordTypingText 
                text={`Target Mimics: ${report.brand_impersonation.brand} (Confidence: ${Math.round(report.brand_impersonation.confidence * 100)}%)`} 
                speed={35}
                trigger={activeStep >= 1}
                onComplete={() => setActiveStep(findingsStartStep)}
              />
            </p>
          </div>
        )}

        {/* Key Findings */}
        {report.findings && report.findings.length > 0 && activeStep >= findingsStartStep && (
          <div className="flex flex-col gap-3.5 mt-2 transition-opacity duration-500">
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Key Findings
            </h3>
            <div className="flex flex-col gap-3">
              {report.findings.map((f, idx) => {
                const severity = f.severity ? ` [Severity: ${f.severity.toUpperCase()}]` : '';
                const stepTrigger = activeStep >= (findingsStartStep + idx);
                const typingCompleteTrigger = activeStep > (findingsStartStep + idx);
                const isVisualML = f.category.toLowerCase().includes('visual');
                const severityLower = (f.severity || '').toLowerCase();
                const detailLower = (f.detail || '').toLowerCase();
                const isPhishing = severityLower === 'high' || 
                                   severityLower === 'critical' || 
                                   (detailLower.includes('phishing') && !detailLower.includes('legitimate') && !detailLower.includes('below the 0.60'));
                const highlightColor = isPhishing ? 'red' : 'green';

                return (
                  <div key={idx} className={`flex gap-2 transition-all duration-300 ${stepTrigger ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    <span className="font-bold text-indigo-500 shrink-0 select-none">•</span>
                    <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium relative">
                      <span className="font-black text-gray-900 dark:text-white">{f.category}{severity}: </span>
                      {isVisualML ? (
                        <Highlight color={highlightColor} trigger={typingCompleteTrigger} duration={0.9} delay={0.1}>
                          <WordTypingText 
                            text={f.detail} 
                            speed={35}
                            trigger={stepTrigger}
                            onComplete={() => setActiveStep(findingsStartStep + idx + 1)}
                          />
                        </Highlight>
                      ) : (
                        <WordTypingText 
                          text={f.detail} 
                          speed={35}
                          trigger={stepTrigger}
                          onComplete={() => setActiveStep(findingsStartStep + idx + 1)}
                        />
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Safety Advice */}
        {report.safety_advice && activeStep >= safetyStartStep && (
          <div className="flex flex-col gap-2 mt-2 transition-opacity duration-500">
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Safety Advice & Recommendations
            </h3>
            <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium">
              <WordTypingText 
                text={report.safety_advice} 
                speed={35}
                trigger={activeStep >= safetyStartStep}
              />
            </p>
          </div>
        )}

        {/* Trace Logs */}
        <div className="animate-footer mt-4">
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
