import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  BarChart3,
  Maximize2,
  Shield,
  FileText,
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
import expandAnimData from '../sidebar_images/expand.json';
import lightExpandAnimData from '../sidebar_images/light-mode-expand.json';

import SearchChat from './SearchChat';
import ProfileBottomSheet from '../components/ProfileBottomSheet';
import SidebarDock from '../components/SidebarDock';
import ReportDashboard from '../components/ReportDashboard';
import { DotmHex2 } from '../components/ui/dotm-hex-2';

const PLACEHOLDERS = [
  'Paste URL to scan for phishing...',
  'Analyze suspicious email links for safety...',
  'Check domain registry age and SSL status...',
  'Verify brand similarity warnings...',
  'Scan for credential harvesting risks...'
];

function PlaceholderCycler({ leftPaddingClass }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAnimatingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const words = container.querySelectorAll('.placeholder-word');
      if (words.length === 0) return;

      isAnimatingRef.current = true;

      // Animate current words out: bottom-to-top means sliding UPwards
      gsap.to(words, {
        y: -14,
        opacity: 0,
        duration: 0.35,
        stagger: 0.02,
        ease: 'power2.in',
        onComplete: () => {
          setIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      });
    }, 3800);

    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const words = container.querySelectorAll('.placeholder-word');
    if (words.length === 0) return;

    // Set initial position for incoming words: bottom-to-top means starting from below (y: 14)
    gsap.set(words, {
      y: 14,
      opacity: 0
    });

    // Animate words in
    gsap.to(words, {
      y: 0,
      opacity: 1,
      duration: 0.45,
      stagger: 0.02,
      ease: 'power2.out',
      onComplete: () => {
        isAnimatingRef.current = false;
      }
    });
  }, [index]);

  return (
    <div
      ref={containerRef}
      className={`absolute ${leftPaddingClass} top-1/2 -translate-y-1/2 pointer-events-none text-[15px] text-gray-400/90 dark:text-gray-500/90 select-none flex flex-wrap gap-x-[4px]`}
    >
      {PLACEHOLDERS[index].split(' ').map((word, wIdx) => (
        <span key={wIdx} className="placeholder-word inline-block">
          {word}
        </span>
      ))}
    </div>
  );
}

const HERO_TITLE_PREFIX = 'How can I assist your';
const CYCLING_WORDS = ['security', 'inboxes', 'domains', 'credentials', 'networks'];
const HERO_SUGGESTIONS = [
  {
    title: 'Scan URL',
    description: 'Check lexical features, WHOIS registry, and brand similarity.',
    value: 'https://',
    icon: Shield,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-gradient-to-br from-indigo-50/90 to-indigo-50/30 dark:from-indigo-950/20 dark:to-indigo-950/5',
    border: 'border-indigo-100/90 dark:border-indigo-900/40',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/30',
    dotBg: 'bg-indigo-500',
    pingBg: 'bg-indigo-400'
  },
  {
    title: 'Analyze Email',
    description: 'Scan email headers or body snippets for warning flags.',
    value: 'Analyze email snippet',
    icon: FileText,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-gradient-to-br from-violet-50/90 to-violet-50/30 dark:from-violet-950/20 dark:to-violet-950/5',
    border: 'border-violet-100/90 dark:border-violet-900/40',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-500/30',
    dotBg: 'bg-violet-500',
    pingBg: 'bg-violet-400'
  },
  {
    title: 'Phishing Trends',
    description: 'Check live threat intelligence statistics and vectors.',
    value: 'Check phishing trends',
    icon: BarChart3,
    color: 'text-emerald-550 dark:text-emerald-405',
    bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-50/30 dark:from-emerald-950/20 dark:to-emerald-950/5',
    border: 'border-emerald-100/90 dark:border-emerald-900/40',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
    dotBg: 'bg-emerald-500',
    pingBg: 'bg-emerald-400'
  }
];

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



export default function HomePage() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [showOrbs, setShowOrbs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const isCyclingAnimating = useRef(false);
  const cycleTimeoutRef = useRef(null);

  const profileName = 'Dimuthu Pramuditha';
  const profileEmail = 'dimuthu@example.com';
  const profileInitial = profileName.trim().charAt(0).toUpperCase();

  const chatLottieRef = useRef(null);
  const searchLottieRef = useRef(null);
  const historyLottieRef = useRef(null);
  const chatbotLottieRef = useRef(null);
  const expandLottieRef = useRef(null);

  const inputBarRef = useRef(null);
  const orbLeftRef = useRef(null);
  const orbRightRef = useRef(null);
  const titleMenuRef = useRef(null);
  const messagesEndRef = useRef(null);

  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const heroInputWrapRef = useRef(null);
  const heroSuggestionsRef = useRef(null);
  const heroBadgeRef = useRef(null);

  // ── Dock item configs ──────────────────────────────────────────────────────
  const dockTopItems = [
    {
      id: 'logo',
      label: 'PhishLens Agent',
      lottieData: chatbotAnimData,
      lottieRef: chatbotLottieRef,
      onClick: () => {},
      hasDot: false,
    },
    {
      id: 'new-scan',
      label: 'New Scan',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => {},
      hasDot: false,
    },
    {
      id: 'search',
      label: 'Search History',
      lottieData: isDarkMode ? searchAnimData : darkSearchAnimData,
      lottieRef: searchLottieRef,
      onClick: () => setIsSearchOpen(true),
      hasDot: false,
    },
    {
      id: 'chat',
      label: 'AI Chat Assistant',
      lottieData: isDarkMode ? chatAnimData : darkChatAnimData,
      lottieRef: chatLottieRef,
      onClick: () => {},
      hasDot: false,
    },
    {
      id: 'history',
      label: 'Scan Logs',
      lottieData: isDarkMode ? historyAnimData : darkHistoryAnimData,
      lottieRef: historyLottieRef,
      onClick: () => {},
      hasDot: false,
    },
    {
      id: 'expand',
      label: isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar',
      lottieData: isDarkMode ? lightExpandAnimData : expandAnimData,
      lottieRef: expandLottieRef,
      onClick: () => setIsExpanded(!isExpanded),
      hasDot: false,
    },
  ];

  const dockBottomItems = [
    {
      id: 'profile',
      label: `Profile: ${profileName}`,
      icon: (
        <div
          className="w-full h-full rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold shadow-sm"
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          {profileInitial}
        </div>
      ),
      onClick: () => setShowProfilePopup((prev) => !prev),
      hasDot: false,
    },
  ];

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

  useEffect(() => {
    if (!titleMenuRef.current) return;

    if (isTitleMenuOpen) {
      titleMenuRef.current.style.pointerEvents = 'auto';
      gsap.fromTo(
        titleMenuRef.current,
        { opacity: 0, y: -8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power3.out' }
      );
    } else {
      gsap.to(titleMenuRef.current, {
        opacity: 0,
        y: -8,
        scale: 0.96,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => {
          if (titleMenuRef.current) {
            titleMenuRef.current.style.pointerEvents = 'none';
          }
        },
      });
    }
  }, [isTitleMenuOpen]);

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

  /* Hero entrance: bottom-to-top reveal + h1 Text 3D Flip */
  useLayoutEffect(() => {
    if (hasSentMessage) return;

    const root = heroRef.current;
    const titleEl = heroTitleRef.current;
    const subtitleEl = heroSubtitleRef.current;
    const inputWrap = heroInputWrapRef.current;
    const suggestionsEl = heroSuggestionsRef.current;
    const badgeEl = heroBadgeRef.current;
    if (!root || !titleEl || !subtitleEl || !inputWrap) return;

    const ctx = gsap.context(() => {
      // 1. Set initial states for elements
      gsap.set([inputWrap, subtitleEl, badgeEl].filter(Boolean), {
        opacity: 0,
        y: 40,
      });

      const chars = titleEl.querySelectorAll('.hero-title-char');
      gsap.set(chars, {
        opacity: 0,
        rotationX: -95,
        y: 40,
        transformOrigin: '50% 100% -20px',
      });

      if (suggestionsEl) {
        gsap.set(suggestionsEl, { opacity: 0, y: 20 });
      }

      // 2. Timeline
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      // Bottom → Top staggered animation
      tl.to(inputWrap, { opacity: 1, y: 0, duration: 0.85 })
        .to(subtitleEl, { opacity: 1, y: 0, duration: 0.65 }, '-=0.5')
        .to(chars, {
          opacity: 1,
          rotationX: 0,
          y: 0,
          duration: 0.8,
          stagger: 0.02,
          ease: 'back.out(2.0)',
        }, '-=0.45')
        .to(badgeEl, { opacity: 1, y: 0, duration: 0.6 }, '-=0.6');

      if (suggestionsEl) {
        const pills = suggestionsEl.querySelectorAll('.hero-suggestion-card');
        tl.to(suggestionsEl, { opacity: 1, y: 0, duration: 0.55 }, '-=0.5');
        if (pills.length > 0) {
          gsap.set(pills, { opacity: 0, scale: 0.92 });
          tl.to(pills, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'back.out(1.8)',
          }, '-=0.4');
        }
      }
    }, root);

    return () => ctx.revert();
  }, [hasSentMessage]);

  // ── Cycle to the next word ──
  const triggerCycle = useCallback(() => {
    if (hasSentMessage || isCyclingAnimating.current) return;
    
    const titleEl = heroTitleRef.current;
    if (!titleEl) return;

    const currentLetters = titleEl.querySelectorAll('.hero-cycling-char');
    const loaderWrap = titleEl.querySelector('.hero-cycling-loader-wrap');
    if (currentLetters.length === 0) return;

    isCyclingAnimating.current = true;

    // 1. Animate current letters and loader out (rotateX: 90)
    const targets = loaderWrap ? [loaderWrap, ...currentLetters] : currentLetters;
    gsap.to(targets, {
      rotateX: 90,
      opacity: 0,
      duration: 0.45,
      stagger: 0.04,
      ease: 'power2.in',
      onComplete: () => {
        // 2. Once out, change state to alternate between word and thinking
        setIsThinking((prev) => {
          if (prev) {
            setCurrentWordIdx((idx) => (idx + 1) % CYCLING_WORDS.length);
            return false;
          } else {
            return true;
          }
        });
      },
    });
  }, [hasSentMessage]);

  // ── Handle incoming (mounted) letters animation ──
  useLayoutEffect(() => {
    if (hasSentMessage) return;

    const titleEl = heroTitleRef.current;
    if (!titleEl) return;

    const newLetters = titleEl.querySelectorAll('.hero-cycling-char');
    const loaderWrap = titleEl.querySelector('.hero-cycling-loader-wrap');
    if (newLetters.length === 0) return;

    // 1. Immediately set initial state for new letters and loader (rotateX: -90)
    const targets = loaderWrap ? [loaderWrap, ...newLetters] : newLetters;
    gsap.set(targets, {
      rotateX: -90,
      opacity: 0,
      transformPerspective: 1000,
    });

    // 2. Animate them in (rotateX: 0)
    gsap.to(targets, {
      rotateX: 0,
      opacity: 1,
      duration: isThinking ? 0.45 : 0.55,
      stagger: isThinking ? 0.06 : 0.05, // slightly slower stagger for typing feel
      ease: isThinking ? 'power2.out' : 'back.out(1.4)',
      onComplete: () => {
        isCyclingAnimating.current = false;
        
        // Schedule next cycle
        if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
        cycleTimeoutRef.current = setTimeout(triggerCycle, isThinking ? 2200 : 3200);
      },
    });
  }, [currentWordIdx, isThinking, triggerCycle, hasSentMessage]);

  // ── Start initial cycle timeout ──
  useEffect(() => {
    if (hasSentMessage) return;

    // Initial delay before first cycle (e.g. 4 seconds)
    cycleTimeoutRef.current = setTimeout(triggerCycle, 4200);

    return () => {
      if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    };
  }, [triggerCycle, hasSentMessage]);

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

  const handleSelectChat = (chatId) => {
    if (chatId === 1) {
      setMessages([
        { id: 1, text: 'Can you analyze this suspicious email link for me: http://secure-login-update-bank.com?', sender: 'user' },
        {
          id: 2,
          text: 'Security scan completed for http://secure-login-update-bank.com. Here is the report:',
          sender: 'bot',
          status: 'completed',
          overallStatus: 'suspicious',
          duration: 3.4,
          report: {
            risk_level: 'Suspicious',
            risk_score: 74,
            brand_impersonation: { detected: true, brand: 'Chase Bank', confidence: 0.92 },
            summary: 'The target website displays characteristics of a credential harvesting page mimicking Chase Bank. It utilizes look-alike domain spelling and contains suspicious login form structures.',
            findings: [
              { category: 'Visual Signal', severity: 'High', detail: 'Matches Chase Bank logo and color scheme with 92% confidence.' },
              { category: 'Lexical Signal', severity: 'Medium', detail: 'Domain age is 2 days and contains brand keywords.' }
            ],
            safety_advice: 'Do NOT input any credentials on this page. It is highly likely to be a phishing site.'
          }
        }
      ]);
      setHasSentMessage(true);
    } else if (chatId === 2) {
      setMessages([
        { id: 1, text: 'What is spear phishing?', sender: 'user' },
        { id: 2, text: 'Spear phishing is a highly targeted phishing method where attackers customize their emails/messages specifically for a particular individual or organization, often using personal details to build trust.', sender: 'bot' }
      ]);
      setHasSentMessage(true);
    } else if (chatId === 3) {
      setMessages([
        { id: 1, text: 'Please check domain.com', sender: 'user' },
        {
          id: 2,
          text: 'Security scan completed for http://domain.com. Here is the report:',
          sender: 'bot',
          status: 'completed',
          overallStatus: 'safe',
          duration: 1.8,
          report: {
            risk_level: 'Safe',
            risk_score: 5,
            brand_impersonation: { detected: false },
            summary: 'The website http://domain.com appears to be completely safe with no phishing signals or brand impersonation detected.',
            findings: [
              { category: 'Domain Info', severity: 'Low', detail: 'Domain is 15 years old and has a valid SSL certificate.' }
            ],
            safety_advice: 'The site is safe to visit.'
          }
        }
      ]);
      setHasSentMessage(true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans text-gray-800 dark:text-gray-200">
      {/* ── macOS-Style Sidebar Dock (floating, centered left) ── */}
      <SidebarDock
        items={dockTopItems}
        bottomItems={dockBottomItems}
        isDarkMode={isDarkMode}
        activeItemId={null}
        isExpanded={isExpanded}
        onSelectChat={handleSelectChat}
      />

      {/* Profile Bottom Sheet (positioned absolutely) */}
      <ProfileBottomSheet
        isOpen={showProfilePopup}
        onClose={() => setShowProfilePopup(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        profileName={profileName}
        profileEmail={profileEmail}
      />

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
          <div className="relative flex items-center gap-3">
            <div className="font-semibold text-lg text-gray-700 dark:text-gray-300">Scan Chatgpt site</div>
            <button
              type="button"
              onClick={() => setIsTitleMenuOpen((prev) => !prev)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/80 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-[#2a2a2a]/80 dark:text-gray-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 cursor-pointer"
              aria-label="Open scan dashboard actions"
            >
              {isTitleMenuOpen ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
            </button>

            <div
              ref={titleMenuRef}
              className="absolute left-0 top-12 w-44 rounded-2xl border border-gray-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-gray-700 dark:bg-[#1f1f1f]/95"
              style={{ opacity: 0, transformOrigin: 'top left', pointerEvents: 'none' }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100"
              >
                <Pencil size={14} />
                Rename
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
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

        {/* Centered hero + input — only visible before first message */}
        {!hasSentMessage && (
          <div
            ref={heroRef}
            className="flex-1 flex items-center justify-center px-4 md:px-8"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <div className="w-full max-w-3xl flex flex-col items-center text-center text-slate-500 dark:text-slate-400 select-none">
              <div
                ref={heroBadgeRef}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-500/12 dark:text-indigo-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                </span>
                PhishLens AI Agent Beta
              </div>

              <h1
                ref={heroTitleRef}
                className="text-3xl md:text-5xl font-black tracking-tight mb-4 min-h-[1.2em] flex flex-wrap justify-center gap-x-2.5 gap-y-1.5"
                aria-label="How can I assist your security?"
                style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
              >
                {/* Static Prefix: "How can I assist your" */}
                {HERO_TITLE_PREFIX.split(' ').map((word, wIdx) => (
                  <span key={wIdx} className="inline-flex whitespace-nowrap" style={{ transformStyle: 'preserve-3d' }}>
                    {word.split('').map((char, cIdx) => (
                      <span
                        key={cIdx}
                        className="hero-title-char inline-block bg-gradient-to-r from-gray-900 via-indigo-800 to-violet-700 bg-clip-text text-transparent dark:from-white dark:via-indigo-200 dark:to-violet-300 origin-bottom transform-gpu"
                        style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                ))}

                {/* Dynamic Cycling Word */}
                {isThinking ? (
                  <span className="inline-flex items-center gap-3 whitespace-nowrap" style={{ transformStyle: 'preserve-3d' }}>
                    <span className="inline-flex shrink-0 hero-cycling-loader-wrap" style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}>
                      <DotmHex2 bloom={true} size={28} dotSize={4.5} className="text-indigo-600 dark:text-indigo-400" />
                    </span>
                    <span className="inline-flex" style={{ transformStyle: 'preserve-3d' }}>
                      {"Thinking...".split('').map((char, cIdx) => (
                        <span
                          key={cIdx}
                          className="hero-cycling-char inline-block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400 origin-bottom transform-gpu"
                          style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex whitespace-nowrap" style={{ transformStyle: 'preserve-3d' }}>
                    {CYCLING_WORDS[currentWordIdx].split('').map((char, cIdx) => (
                      <span
                        key={cIdx}
                        className="hero-cycling-char inline-block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400 origin-bottom transform-gpu"
                        style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                      >
                        {char}
                      </span>
                    ))}
                    {/* Append question mark at the end of the word */}
                    <span
                      className="hero-cycling-char inline-block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400 origin-bottom transform-gpu"
                      style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                    >
                      ?
                    </span>
                  </span>
                )}
              </h1>

              <p
                ref={heroSubtitleRef}
                className="text-sm md:text-base text-gray-550 dark:text-gray-405 max-w-xl leading-relaxed font-medium"
              >
                Real-time URL scanning, email snippet analysis, and threat intelligence models to protect your credentials, domains, and inboxes.
              </p>

              <div className="mt-8 w-full max-w-2xl">
                <div
                  ref={(el) => {
                    inputBarRef.current = el;
                    heroInputWrapRef.current = el;
                  }}
                  className="relative z-20 w-full"
                >
                  <div
                    className="absolute -inset-1 pointer-events-none rounded-[32px] opacity-60 blur-xl"
                    style={{
                      background: 'linear-gradient(90deg, rgba(66,46,168,0.35), rgba(138,43,226,0.28), rgba(99,102,241,0.35))',
                    }}
                    aria-hidden="true"
                  />

                  <div className="relative mx-auto w-full" style={{ zIndex: 1 }}>
                    <form
                      onSubmit={handleSend}
                      className="hero-input-form relative flex items-center shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/80 dark:focus-within:ring-indigo-400/80 transition-all rounded-[28px] bg-white/75 dark:bg-[#2a2a2a]/85 backdrop-blur-2xl border border-white/50 dark:border-gray-600/50"
                      style={{
                        boxShadow: '0 12px 40px 0 rgba(66,46,168,0.16), 0 2px 12px 0 rgba(138,43,226,0.12)',
                      }}
                    >
                      <div className="pl-4 pr-1 flex items-center text-indigo-500 dark:text-indigo-400 shrink-0">
                        <ShieldAlert size={18} strokeWidth={2.25} />
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder=""
                          disabled={isLoading}
                          className="w-full bg-transparent py-4 pl-2 pr-14 outline-none text-[15px] text-gray-700 dark:text-gray-200 placeholder-transparent"
                        />
                        {!input && (
                          <PlaceholderCycler leftPaddingClass="left-2" />
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={"absolute right-2.5 p-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 duration-300 " + (input.trim() && !isLoading ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:shadow-white/10" : "bg-gray-200/80 text-gray-400 dark:bg-[#3d3d3d] dark:text-gray-500")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                      </button>
                    </form>
                  </div>
                </div>

                <div
                  ref={heroSuggestionsRef}
                  className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl px-4 sm:px-0"
                >
                  {HERO_SUGGESTIONS.map((suggestion, sIdx) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setInput(suggestion.value)}
                        className={`hero-suggestion-card group relative overflow-hidden flex flex-col items-start text-left p-4.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 ${suggestion.bg} ${suggestion.border} ${suggestion.hoverBorder}`}
                      >
                        {/* Large watermark background icon */}
                        <div className="absolute right-1 top-1 opacity-[0.09] group-hover:opacity-[0.19] transition-opacity duration-300 pointer-events-none select-none">
                          <Icon size={50} strokeWidth={2} className={suggestion.color} />
                        </div>

                        {/* Pulsing dot status badge */}
                        <div className="mb-3.5 flex items-center gap-2 relative z-10">
                          <span className="relative flex h-2 w-2">
                            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${suggestion.pingBg}`} />
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${suggestion.dotBg}`} />
                          </span>
                        </div>

                        {/* Text section aligned to the bottom */}
                        <div className="space-y-1 relative z-10 mt-auto">
                          <h3 className="font-bold text-[13.5px] text-gray-800 dark:text-gray-200 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">
                            {suggestion.title}
                          </h3>
                          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 leading-normal font-medium">
                            {suggestion.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input bar wrapper (shown after scan starts) */}
        {hasSentMessage && (
          <div
            ref={inputBarRef}
            className="absolute bottom-0 left-0 w-full px-4 md:px-12 pt-16 pb-6 bg-gradient-to-t from-white dark:from-[#212121] via-white/80 dark:via-[#212121]/80 to-transparent"
            style={{ zIndex: 20 }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
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
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder=""
                    disabled={isLoading}
                    className="w-full bg-transparent py-4 pl-5 pr-14 outline-none text-[15px] text-gray-700 dark:text-gray-200 placeholder-transparent"
                  />
                  {!input && (
                    <PlaceholderCycler leftPaddingClass="left-5" />
                  )}
                </div>
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
        )}
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

