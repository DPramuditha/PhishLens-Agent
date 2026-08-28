import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  AlertTriangle,
  ScanEye,
  Image,
} from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCircularProgressBar } from './ui/animated-circular-progress-bar';
import { Highlight } from './ui/highlighter';
import FileDownloadCard from './FileDownloadCard';
import PDFBuildingAnimation from './PDFBuildingAnimation';

// Helper component to type out text word by word sequentially (or immediately for history)
function WordTypingText({ text, speed = 30, onComplete, trigger = false, animate = true }) {
  const [displayText, setDisplayText] = useState(animate ? '' : (text || ''));
  const onCompleteRef = useRef(onComplete);

  // Keep ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!animate) {
      setDisplayText(text || '');
      return;
    }

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
  }, [text, speed, trigger, animate]);

  if (!trigger) return null;

  return <span>{!animate ? text : displayText}</span>;
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
export default function ReportDashboard({
  report,
  duration,
  screenshotUrl,
  annotatedScreenshotUrl,
  toolTrace,
  urlAnalysisData,
  url,
  chatId,
  isLive = false,
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const containerRef = useRef(null);
  const [activeStep, setActiveStep] = useState(isLive ? 0 : 9999);
  const [isPdfReady, setIsPdfReady] = useState(!isLive);
  // Toggle between 'original' and 'annotated' screenshot views
  const [screenshotView, setScreenshotView] = useState(annotatedScreenshotUrl ? 'annotated' : 'original');
  const activeScreenshotUrl = screenshotView === 'annotated' && annotatedScreenshotUrl ? annotatedScreenshotUrl : screenshotUrl;

  useEffect(() => {
    setActiveStep(isLive ? 0 : 9999);
    setIsPdfReady(!isLive);
  }, [report, isLive]);

  // Helper to extract clean URL from summary text
  const getUrlFromSummary = (summaryText) => {
    const match = summaryText?.match(/https?:\/\/[a-zA-Z0-9\-.]+/);
    return match ? match[0] : 'https://secure-login-update-bank.com';
  };

  const analyzedUrl = url || getUrlFromSummary(report?.summary);

  // Entrance animations using GSAP
  useEffect(() => {
    if (!containerRef.current || !report) return;

    const ctx = gsap.context(() => {
      if (isLive) {
        gsap.set('.animate-left', { x: -30, opacity: 0 });
        gsap.set('.animate-report', { x: 30, opacity: 0 });
        gsap.set('.animate-footer', { opacity: 0 });

        const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 0.9 } });

        tl.to('.animate-left', { x: 0, opacity: 1, duration: 1.2 })
          .to('.animate-report', { x: 0, opacity: 1, duration: 1.0 }, '-=0.9')
          .to('.animate-footer', { opacity: 1, duration: 0.6 }, '-=0.5');
      } else {
        gsap.set('.animate-left', { x: 0, opacity: 1 });
        gsap.set('.animate-report', { x: 0, opacity: 1 });
        gsap.set('.animate-footer', { opacity: 1 });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [report, isLive]);

  // Lightbox slide panel animation
  useEffect(() => {
    if (!isLightboxOpen) return;
    // Animate after portal renders
    const timer = requestAnimationFrame(() => {
      const backdrop = document.getElementById('screenshot-lightbox-backdrop');
      const panel = document.getElementById('screenshot-lightbox-panel');
      if (backdrop) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      }
      if (panel) {
        gsap.fromTo(
          panel,
          { x: '100%', opacity: 0.5 },
          { x: '0%', opacity: 1, duration: 0.45, ease: 'power3.out' }
        );
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [isLightboxOpen]);

  const closeLightbox = useCallback(() => {
    const backdrop = document.getElementById('screenshot-lightbox-backdrop');
    const panel = document.getElementById('screenshot-lightbox-panel');
    const tl = gsap.timeline({
      onComplete: () => setIsLightboxOpen(false),
    });
    if (panel) {
      tl.to(panel, { x: '100%', opacity: 0.5, duration: 0.35, ease: 'power3.in' }, 0);
    }
    if (backdrop) {
      tl.to(backdrop, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.05);
    }
  }, []);

  // Close panel on Escape key
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLightboxOpen, closeLightbox]);

  if (!report) return null;

  const score = report?.risk_score ?? 0;
  const riskLevel = String(report?.risk_level || 'UNKNOWN').toUpperCase();
  const summaryText = report?.summary || 'Phishing analysis report completed.';

  const hasBrand = Boolean(report?.brand_impersonation && report.brand_impersonation.detected);
  const brandName = report?.brand_impersonation?.brand || 'Unknown Brand';
  const brandConfidence = typeof report?.brand_impersonation?.confidence === 'number'
    ? Math.round(report.brand_impersonation.confidence * 100)
    : 0;
  const findingsList = Array.isArray(report?.findings) ? report.findings : [];
  const findingsCount = findingsList.length;
  const findingsStartStep = hasBrand ? 2 : 1;
  const safetyStartStep = findingsStartStep + findingsCount;
  const pdfBuildStartStep = safetyStartStep + (report?.safety_advice ? 1 : 0);

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col gap-6 text-gray-800 dark:text-gray-100 font-inter"
    >
      {/* ─── TOP SECTION: Webpage Screenshot ─── */}
      <div className="animate-left flex flex-col gap-2.5 w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between ml-1 mr-1">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 text-left">
            Visual Screenshot
          </h3>

          {/* Original / AI Analysis Toggle — only shown when annotated screenshot exists */}
          {annotatedScreenshotUrl && (
            <div className="flex items-center bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-0.5 border border-gray-200/60 dark:border-gray-700/50 shadow-sm">
              <button
                onClick={() => setScreenshotView('original')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  screenshotView === 'original'
                    ? 'bg-white dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-100 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Image size={11} />
                Original
              </button>
              <button
                onClick={() => setScreenshotView('annotated')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  screenshotView === 'annotated'
                    ? 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-500/20'
                    : 'text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400'
                }`}
              >
                <ScanEye size={11} />
                AI Analysis
              </button>
            </div>
          )}
        </div>
        
        <div className={`overflow-hidden rounded-xl border bg-white dark:bg-[#121212] shadow-lg transition-colors duration-300 ${
          screenshotView === 'annotated' && annotatedScreenshotUrl
            ? 'border-rose-500/40 dark:border-rose-500/30'
            : 'border-gray-200/60 dark:border-gray-800/60'
        }`}>
          {activeScreenshotUrl ? (
            <div onClick={() => setIsLightboxOpen(true)} className="relative cursor-zoom-in">
              <img
                src={activeScreenshotUrl}
                alt={screenshotView === 'annotated' ? 'AI-Analyzed Screenshot with Logo Detection' : 'Captured Webpage'}
                className="w-full h-auto object-contain transition-transform duration-500 hover:scale-[1.01]"
              />
              
              {/* Expand Hover Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <Maximize2 size={12} />
                  View Fullscreen
                </div>
              </div>

              {/* AI Analysis badge overlay */}
              {screenshotView === 'annotated' && annotatedScreenshotUrl && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  <ScanEye size={11} />
                  Logo Detection Active
                </div>
              )}
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center select-none">
              <ShieldAlert size={28} className="opacity-40 mb-2" />
              <span className="text-xs font-semibold">No visual screenshot captured.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM SECTION: Security Report Details (Structured Plain Text with Typing in Inter Font) ─── */}
      <div className="animate-report font-inter flex flex-col gap-6 w-full max-w-2xl mx-auto text-left">
        
        {/* Verdict & Circular Progress Bar Row */}
        <div className="flex items-center justify-between gap-6 border-b border-gray-200/50 dark:border-gray-850/40 pb-5">
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[12px] uppercase tracking-widest font-black text-indigo-500 dark:text-indigo-400">
              Analysis Verdict
            </h4>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 text-gray-900 dark:text-white">
              VERDICT: {riskLevel}
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
              text={summaryText} 
              speed={35} 
              trigger={activeStep >= 0}
              animate={isLive}
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
                text={`Target Mimics: ${brandName} (Confidence: ${brandConfidence}%)`} 
                speed={35}
                trigger={activeStep >= 1}
                animate={isLive}
                onComplete={() => setActiveStep(findingsStartStep)}
              />
            </p>
          </div>
        )}

        {/* Key Findings */}
        {findingsList.length > 0 && activeStep >= findingsStartStep && (
          <div className="flex flex-col gap-3.5 mt-2 transition-opacity duration-500">
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Key Findings
            </h3>
            <div className="flex flex-col gap-3">
              {findingsList.map((f, idx) => {
                const category = f?.category || 'General';
                const severity = f?.severity ? ` [Severity: ${String(f.severity).toUpperCase()}]` : '';
                const stepTrigger = activeStep >= (findingsStartStep + idx);
                const typingCompleteTrigger = activeStep > (findingsStartStep + idx);
                const isVisualML = (category || '').toLowerCase().includes('visual');
                const severityLower = (f?.severity || '').toLowerCase();
                const detailLower = (f?.detail || '').toLowerCase();
                const isPhishing = severityLower === 'high' || 
                                   severityLower === 'critical' || 
                                   (detailLower.includes('phishing') && !detailLower.includes('legitimate') && !detailLower.includes('below the 0.60'));
                const highlightColor = isPhishing ? 'red' : 'green';

                return (
                  <div key={idx} className={`flex gap-2 transition-all duration-300 ${stepTrigger ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    <span className="font-bold text-indigo-500 shrink-0 select-none">•</span>
                    <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium relative">
                      <span className="font-black text-gray-900 dark:text-white">{category}{severity}: </span>
                      {isVisualML ? (
                        <Highlight color={highlightColor} trigger={!isLive || typingCompleteTrigger} duration={isLive ? 0.9 : 0} delay={isLive ? 0.1 : 0}>
                          <WordTypingText 
                            text={f?.detail || ''} 
                            speed={35}
                            trigger={stepTrigger}
                            animate={isLive}
                            onComplete={() => setActiveStep(findingsStartStep + idx + 1)}
                          />
                        </Highlight>
                      ) : (
                        <WordTypingText 
                          text={f?.detail || ''} 
                          speed={35}
                          trigger={stepTrigger}
                          animate={isLive}
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
        {report?.safety_advice && activeStep >= safetyStartStep && (
          <div className="flex flex-col gap-2 mt-2 transition-opacity duration-500">
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Safety Advice & Recommendations
            </h3>
            <p className="text-[16.5px] md:text-[18px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium">
              <WordTypingText 
                text={report.safety_advice} 
                speed={35}
                trigger={activeStep >= safetyStartStep}
                animate={isLive}
                onComplete={() => setActiveStep(pdfBuildStartStep)}
              />
            </p>
          </div>
        )}

        {/* LLM Error Detail Banner — shown when fallback synthesis was used */}
        {report?.llm_error && (
          <div className="mt-4 border border-amber-300/60 dark:border-amber-700/40 rounded-2xl overflow-hidden bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-md">
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={16} />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-black text-amber-600 dark:text-amber-400">
                    LLM Provider Error — Deterministic Fallback Used
                  </h4>
                  <p className="text-[12px] text-amber-700/80 dark:text-amber-300/60 font-medium mt-0.5">
                    The AI synthesis model returned an error. The report above was generated using deterministic multi-agent analysis instead.
                  </p>
                </div>
              </div>
              <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-xl px-4 py-3 border border-amber-200/50 dark:border-amber-800/30">
                <p className="text-[12px] font-mono text-amber-800 dark:text-amber-200/80 break-all whitespace-pre-wrap leading-relaxed">
                  {report.llm_error}
                </p>
              </div>
              {report?.synthesis_method && (
                <p className="text-[11px] font-semibold text-amber-600/70 dark:text-amber-400/50 flex items-center gap-1.5">
                  <Activity size={12} />
                  Synthesis method: <span className="font-mono font-bold">{report.synthesis_method}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── PDF Building Animation (triggers after all writing steps complete on live scans only) ─── */}
        {isLive && activeStep >= pdfBuildStartStep && !isPdfReady && (
          <div className="mt-3">
            <PDFBuildingAnimation
              onSettled={() => setIsPdfReady(true)}
              hasScreenshot={Boolean(screenshotUrl)}
            />
          </div>
        )}

        {/* ─── PDF Report Download Card (revealed once building animation settles or immediately in history view) ─── */}
        {isPdfReady && (
          <div className="mt-2 transition-all duration-500 animate-fadeIn">
            <FileDownloadCard
              url={analyzedUrl}
              report={report}
              screenshotUrl={screenshotUrl}
              urlAnalysisData={urlAnalysisData}
              duration={duration}
              chatId={chatId}
            />
          </div>
        )}

        {/* Trace Logs */}
        <div className="animate-footer mt-4">
          <TraceStepList steps={toolTrace} />
        </div>
      </div>

      {/* ─── RIGHT-SIDE SLIDE PANEL FOR SCREENSHOT ─── */}
      {isLightboxOpen && activeScreenshotUrl && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
          className="select-none"
        >
          {/* Backdrop */}
          <div
            id="screenshot-lightbox-backdrop"
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Slide Panel (right side) */}
          <div
            id="screenshot-lightbox-panel"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '720px',
              maxWidth: '95vw',
              height: '100%',
              transform: 'translateX(100%)',
              display: 'flex',
              flexDirection: 'column',
            }}
            className="bg-[#111113] border-l border-white/8 shadow-2xl"
          >
            {/* Panel Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/6 bg-[#0e0e10]/90 backdrop-blur-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-[13px] font-semibold text-white/90 font-mono truncate">{analyzedUrl}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Lightbox toggle */}
                {annotatedScreenshotUrl && (
                  <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/8">
                    <button
                      onClick={() => setScreenshotView('original')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        screenshotView === 'original'
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Image size={10} />
                      Original
                    </button>
                    <button
                      onClick={() => setScreenshotView('annotated')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        screenshotView === 'annotated'
                          ? 'bg-rose-500/15 text-rose-400 shadow-sm border border-rose-500/20'
                          : 'text-gray-500 hover:text-rose-400'
                      }`}
                    >
                      <ScanEye size={10} />
                      AI Analysis
                    </button>
                  </div>
                )}
                <button
                  onClick={closeLightbox}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col items-center justify-start bg-[#111113]">
              <img
                src={activeScreenshotUrl}
                alt={screenshotView === 'annotated' ? 'AI-Analyzed Screenshot with Logo Detection' : 'Webpage Full Screenshot'}
                className="w-full h-auto object-contain rounded-xl border border-white/5 shadow-lg"
              />
              <p className="mt-3 text-[11px] font-medium text-gray-500 tracking-wide uppercase">
                {screenshotView === 'annotated' ? 'AI-Analyzed Screenshot — Logo Region Highlighted' : 'Captured Webpage Screenshot'}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
