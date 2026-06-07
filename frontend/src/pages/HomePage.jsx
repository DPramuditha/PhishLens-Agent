import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Settings,
  LogOut,
  Plus,
  ShieldAlert,
  HelpCircle,
  BookOpen,
  Sun,
  Moon,
  Globe,
  Activity,
  Clock,
  Check,
  AlertCircle,
  Eye,
  Code,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import gsap from 'gsap';
import chatAnimData from '../sidebar_images/chat.json';
import darkChatAnimData from '../sidebar_images/dark-chat.json';
import searchAnimData from '../sidebar_images/search.json';
import darkSearchAnimData from '../sidebar_images/dark-search.json';
import historyAnimData from '../sidebar_images/history.json';
import darkHistoryAnimData from '../sidebar_images/dark-history.json';
import chatbotAnimData from '../sidebar_images/claude.json';

import SearchChat from './SearchChat';
import ProfileBottomSheet from '../components/ProfileBottomSheet';

/* ── Orb background that persists & floats in idle state ── */
function BackgroundOrbs({ hasSentMessage }) {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  useEffect(() => {
    if (!orb1Ref.current || !orb2Ref.current) return;

    /* float orb1 */
    gsap.to(orb1Ref.current, {
      x: 60,
      y: -40,
      duration: 7,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    /* float orb2 */
    gsap.to(orb2Ref.current, {
      x: -50,
      y: 50,
      duration: 9,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1.5,
    });
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* purple-blue orb — left */}
      <div
        ref={orb1Ref}
        className="absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          background: '#422ea8',
          filter: 'blur(110px)',
          opacity: 0.28,
          bottom: hasSentMessage ? '-80px' : '8%',
          left: hasSentMessage ? '-80px' : '15%',
          transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1), left 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      {/* violet orb — right */}
      <div
        ref={orb2Ref}
        className="absolute rounded-full"
        style={{
          width: 480,
          height: 480,
          background: '#8a2be2',
          filter: 'blur(110px)',
          opacity: 0.28,
          bottom: hasSentMessage ? '-60px' : '6%',
          right: hasSentMessage ? '-80px' : '10%',
          transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1), right 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

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
function ReportDashboard({ report, duration, screenshotUrl, toolTrace }) {
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

      {/* 7. Extra Stats & Trace */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock size={12} /> Duration: {duration}s</span>
          <span className="flex items-center gap-1"><Activity size={12} /> System: ReAct Multi-Agent Pipeline</span>
        </div>
        <TraceStepList steps={toolTrace} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [showOrbs, setShowOrbs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const profileName = 'Dimuthu Pramuditha';
  const profileEmail = 'dimuthu@example.com';
  const profileInitial = profileName.trim().charAt(0).toUpperCase();

  const chatLottieRef = useRef(null);
  const searchLottieRef = useRef(null);
  const historyLottieRef = useRef(null);
  const chatbotLottieRef = useRef(null);

  const inputBarRef = useRef(null);
  const orbLeftRef = useRef(null);
  const orbRightRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Autoscroll message container when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const triggerOrbAnimation = useCallback(() => {
    setShowOrbs(true);
  }, []);

  useEffect(() => {
    if (!showOrbs) return;
    if (!orbLeftRef.current || !orbRightRef.current) return;
    gsap.fromTo(
      [orbLeftRef.current, orbRightRef.current],
      { opacity: 0, scale: 0.4 },
      { opacity: 0.85, scale: 1, duration: 0.45, ease: 'power2.out' }
    );
    gsap.to([orbLeftRef.current, orbRightRef.current], {
      opacity: 0,
      scale: 1.5,
      duration: 0.65,
      delay: 0.55,
      ease: 'power2.in',
      onComplete: () => setShowOrbs(false),
    });
  }, [showOrbs]);

  /* Animate the input bar into its bottom position on first message send */
  useEffect(() => {
    if (!hasSentMessage || !inputBarRef.current) return;
    gsap.fromTo(
      inputBarRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
    );
  }, [hasSentMessage]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    // Prepend protocol if user enters bare domain like 'google.com'
    const processedUrl = query.startsWith('http://') || query.startsWith('https://') 
      ? query 
      : `https://${query}`;

    const isFirst = !hasSentMessage;
    const userMsg = { id: Date.now() + '-user', text: query, isUser: true };
    const botMsgId = Date.now() + '-bot';
    const loadingBotMsg = {
      id: botMsgId,
      text: `Scanning URL: ${processedUrl}... Processing DOM structure, lexical attributes, WHOIS details, and visual similarity features. Please wait.`,
      isUser: false,
      status: 'loading'
    };

    setMessages((prev) => [...prev, userMsg, loadingBotMsg]);
    setInput('');
    setIsLoading(true);

    if (isFirst) {
      setHasSentMessage(true);
    }

    triggerOrbAnimation();

    try {
      const response = await fetch('http://localhost:8000/api/scan/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      // Attempt to extract screenshot URL from Django media serving
      let resolvedScreenshotUrl = null;
      if (data.tool_trace) {
        const screenshotStep = data.tool_trace.find(
          (step) => step.step === 'tool_result' && step.tool === 'capture_screenshot'
        );
        if (screenshotStep && screenshotStep.content_preview) {
          try {
            // Find absolute screenshot path inside content preview string
            const cleanedPreview = screenshotStep.content_preview.replace(/\.\.\.$/, '');
            const parsedPreview = JSON.parse(cleanedPreview + (cleanedPreview.endsWith('}') ? '' : '}'));
            if (parsedPreview.screenshot_path) {
              const parts = parsedPreview.screenshot_path.split(/[/\\]/);
              const filename = parts[parts.length - 1];
              resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
            }
          } catch (e) {
            const match = screenshotStep.content_preview.match(/["']screenshot_path["']:\s*["']([^"']+)["']/);
            if (match && match[1]) {
              const parts = match[1].split(/[/\\]/);
              const filename = parts[parts.length - 1];
              resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
            }
          }
        }
      }

      // Update bot message with structured report details
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: null,
                status: 'completed',
                report: data.report,
                screenshotUrl: resolvedScreenshotUrl,
                toolTrace: data.tool_trace,
                overallStatus: data.overall_status,
                duration: data.total_duration_sec,
                error: data.error,
              }
            : msg
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: `Scan failed: ${err.message}. Make sure Django server is running on http://localhost:8000`,
                status: 'failed',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // GSAP Tooltip hover animations
  const handleTooltipEnter = (e) => {
    const tooltip = e.currentTarget.querySelector('.sidebar-tooltip');
    if (tooltip) {
      gsap.killTweensOf(tooltip);
      gsap.fromTo(tooltip, 
        { opacity: 0, scale: 0.85, x: -12 },
        { opacity: 1, scale: 1, x: 0, duration: 0.25, ease: 'power2.out' }
      );
    }
  };

  const handleTooltipLeave = (e) => {
    const tooltip = e.currentTarget.querySelector('.sidebar-tooltip');
    if (tooltip) {
      gsap.killTweensOf(tooltip);
      gsap.to(tooltip, {
        opacity: 0,
        scale: 0.85,
        x: -12,
        duration: 0.18,
        ease: 'power2.in'
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans text-gray-800 dark:text-gray-200">
      {/* Sidebar (Permanently Collapsed Icon-Only View) */}
      <aside 
        className="w-[72px] bg-gray-50 dark:bg-[#3a3a3a] flex flex-col border-r border-gray-200 dark:border-gray-700 relative shrink-0 z-30"
      >
        {/* Logo / Header */}
        <div 
          className="flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-700 px-4 cursor-pointer relative"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="w-20 h-20 shrink-0">
            <Lottie
              lottieRef={chatbotLottieRef}
              animationData={chatbotAnimData}
              autoplay={true}
              loop={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {/* Tooltip (Styled as Chat Bubble) */}
          <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
            PhishLens Agent
          </div>
        </div>

        {/* Navigation Actions */}
        <nav className="flex-1 py-4 flex flex-col gap-3 px-2">
          {/* New Scan */}
          <button 
            className="w-full flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 p-2.5 relative"
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <div className="w-6 flex justify-center shrink-0 hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-[#48484A] dark:text-gray-200">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Tooltip (Styled as Chat Bubble) */}
            <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
              New Scan
            </div>
          </button>

          {/* Search */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 p-2.5 relative"
            onMouseEnter={(e) => { searchLottieRef.current?.play(); handleTooltipEnter(e); }}
            onMouseLeave={(e) => { searchLottieRef.current?.stop(); handleTooltipLeave(e); }}
          >
            <div className="w-6 flex justify-center shrink-0 hover:scale-110 transition-all duration-300">
              <Lottie
                lottieRef={searchLottieRef}
                animationData={isDarkMode ? searchAnimData : darkSearchAnimData}
                autoplay={false}
                loop={true}
                style={{ width: 25, height: 25 }}
              />
            </div>
            {/* Tooltip (Styled as Chat Bubble) */}
            <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
              Search History
            </div>
          </button>

          {/* Chat */}
          <button 
            className="w-full flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 p-2.5 relative"
            onMouseEnter={(e) => { chatLottieRef.current?.play(); handleTooltipEnter(e); }}
            onMouseLeave={(e) => { chatLottieRef.current?.stop(); handleTooltipLeave(e); }}
          >
            <div className="w-6 flex justify-center shrink-0 hover:scale-110 transition-all duration-300">
              <Lottie
                lottieRef={chatLottieRef}
                animationData={isDarkMode ? chatAnimData : darkChatAnimData}
                autoplay={false}
                loop={true}
                style={{ width: 25, height: 25 }}
              />
            </div>
            {/* Tooltip (Styled as Chat Bubble) */}
            <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
              AI Chat Assistant
            </div>
          </button>

          {/* Chat History */}
          <button 
            className="w-full flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 p-2.5 relative"
            onMouseEnter={(e) => { historyLottieRef.current?.play(); handleTooltipEnter(e); }}
            onMouseLeave={(e) => { historyLottieRef.current?.stop(); handleTooltipLeave(e); }}
          >
            <div className="w-6 flex justify-center shrink-0 hover:scale-110 transition-all duration-300">
              <Lottie
                lottieRef={historyLottieRef}
                animationData={isDarkMode ? historyAnimData : darkHistoryAnimData}
                autoplay={false}
                loop={true}
                style={{ width: 25, height: 25 }}
              />
            </div>
            {/* Tooltip (Styled as Chat Bubble) */}
            <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
              Scan Logs
            </div>
          </button>
        </nav>

        {/* Footer Profile Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 relative">
          <button 
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            className="w-full flex items-center justify-center rounded-xl hover:scale-105 transition-all cursor-pointer duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-left shrink-0 p-2 relative"
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold aspect-square shadow-sm">
              {profileInitial}
            </div>
            {/* Tooltip (Styled as Chat Bubble) */}
            <div className="sidebar-tooltip absolute left-16 px-3.5 py-2 rounded-2xl rounded-tl-none bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 text-xs font-semibold shadow-xl whitespace-nowrap opacity-0 pointer-events-none border border-gray-300/30 dark:border-gray-700/30">
              Profile: {profileName}
            </div>
          </button>

          <ProfileBottomSheet
            isOpen={showProfilePopup}
            onClose={() => setShowProfilePopup(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            profileName={profileName}
            profileEmail={profileEmail}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#212121] text-slate-700 dark:text-slate-400 relative transition-colors duration-300 overflow-hidden scroll-smooth no-scrollbar">

        {/* ── Persistent floating background orbs ── */}
        <BackgroundOrbs hasSentMessage={hasSentMessage} />

        {/* ── Send-burst orb flash (triggered on each send) ── */}
        {showOrbs && (
          <div
            className={"pointer-events-none absolute inset-0 flex justify-center " + (hasSentMessage ? "items-end pb-20" : "items-center")}
            style={{ zIndex: 2 }}
          >
            <div
              ref={orbLeftRef}
              className="absolute rounded-full"
              style={{
                width: 380,
                height: 380,
                background: '#422ea8',
                filter: 'blur(80px)',
                opacity: 0,
                transform: 'translateX(-30%)',
              }}
            />
            <div
              ref={orbRightRef}
              className="absolute rounded-full"
              style={{
                width: 380,
                height: 380,
                background: '#8a2be2',
                filter: 'blur(80px)',
                opacity: 0,
                transform: 'translateX(30%)',
              }}
            />
          </div>
        )}

        <header className="h-16 flex items-center justify-between px-6 shrink-0" style={{ position: 'relative', zIndex: 10 }}>
          <div className="font-semibold text-lg text-gray-700 dark:text-gray-300">Scan Dashboard</div>
        </header>

        {/* Messages area — only visible after first message (NO SCROLLBAR) */}
        {hasSentMessage && (
          <section
            className="flex-1 overflow-y-auto no-scrollbar px-4 pb-44 md:px-12 w-full max-w-4xl mx-auto flex flex-col gap-6 pt-4"
            style={{ position: 'relative', zIndex: 10 }}
          >
            {messages.map((msg) => (
              <div key={msg.id} className={"flex w-full " + (msg.isUser ? "justify-end" : "justify-start")}>
                {msg.isUser ? (
                  <div className="max-w-[85%] sm:max-w-[70%] px-5 py-3.5 text-[15px] leading-relaxed bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 rounded-3xl rounded-tr-sm shadow-sm font-semibold tracking-wide border border-gray-300/20">
                    {msg.text}
                  </div>
                ) : (
                  <div className="w-full flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 shrink-0 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                      PL
                    </div>
                    <div className="flex-1 min-w-0 bg-transparent py-1.5">
                      {msg.status === 'loading' ? (
                        <div className="flex flex-col gap-3 max-w-[85%]">
                          <p className="text-[14px] text-gray-500 dark:text-gray-400 italic animate-pulse">
                            {msg.text}
                          </p>
                          <div className="flex gap-2.5 items-center mt-1">
                            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      ) : msg.status === 'failed' ? (
                        <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm max-w-[85%] shadow-sm">
                          <AlertCircle size={20} className="shrink-0" />
                          <p>{msg.text}</p>
                        </div>
                      ) : (
                        <ReportDashboard 
                          report={msg.report}
                          duration={msg.duration}
                          screenshotUrl={msg.screenshotUrl}
                          toolTrace={msg.toolTrace}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </section>
        )}

        {/* Centered hero — only visible before first message */}
        {!hasSentMessage && (
          <div
            className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500 pointer-events-none select-none"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <div className="w-40 h-40 shrink-0">
              <Lottie
                lottieRef={chatbotLottieRef}
                animationData={chatbotAnimData}
                autoplay={true}
                loop={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-2">How can I assist your security?</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paste a suspicious URL, email snippet, or ask about phishing trends.</p>
          </div>
        )}

        {/* Input bar wrapper */}
        <div
          ref={inputBarRef}
          className={
            hasSentMessage
              ? "absolute bottom-0 left-0 w-full px-4 md:px-12 pt-16 pb-6 bg-gradient-to-t from-white dark:from-[#212121] via-white/80 dark:via-[#212121]/80 to-transparent"
              : "w-full px-4 md:px-12 pb-12 flex flex-col items-center"
          }
          style={
            hasSentMessage
              ? { zIndex: 20 }
              : { position: 'relative', zIndex: 20 }
          }
        >
          {/* Backdrop blur layer behind the input (visible in both states) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              maskImage: hasSentMessage
                ? 'linear-gradient(to top, black 50%, transparent 100%)'
                : 'none',
              WebkitMaskImage: hasSentMessage
                ? 'linear-gradient(to top, black 50%, transparent 100%)'
                : 'none',
              borderRadius: hasSentMessage ? 0 : 24,
            }}
          />

          <div className="max-w-2xl w-full mx-auto relative" style={{ zIndex: 1 }}>
            <form
              onSubmit={handleSend}
              className="relative flex items-center shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400 transition-all rounded-full bg-white/60 dark:bg-[#2f2f2f]/70 backdrop-blur-2xl border border-white/40 dark:border-gray-600/60"
              style={{
                boxShadow: '0 8px 32px 0 rgba(66,46,168,0.18), 0 1.5px 8px 0 rgba(138,43,226,0.10)',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste URL to scan for phishing..."
                disabled={isLoading}
                className="w-full bg-transparent py-4 pl-5 pr-14 outline-none text-[15px] text-gray-700 dark:text-gray-200 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={"absolute right-3 p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 duration-500 " + (input.trim() && !isLoading ? "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-black dark:hover:bg-gray-200" : "bg-gray-300 text-gray-500 dark:bg-[#424242] dark:text-gray-500")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </form>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2.5">
              PhishLens can make mistakes. Verify important security warnings.
            </p>
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <SearchChat 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
}

