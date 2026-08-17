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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

import chatAnimData from '../sidebar_images/chat.json';
import darkChatAnimData from '../sidebar_images/dark-chat.json';
import searchAnimData from '../sidebar_images/search.json';
import darkSearchAnimData from '../sidebar_images/dark-search.json';
import historyAnimData from '../sidebar_images/history.json';
import darkHistoryAnimData from '../sidebar_images/dark-history.json';
import chatbotAnimData from '../sidebar_images/claude.json';
import expandAnimData from '../sidebar_images/expand.json';
import lightExpandAnimData from '../sidebar_images/light-mode-expand.json';
import torchImage from '../sidebar_images/Main_image.webp';

import SearchChat from './SearchChat';
import ProfileBottomSheet from '../components/ProfileBottomSheet';
import SidebarDock from '../components/SidebarDock';
import ReportDashboard from '../components/ReportDashboard';
import { DotmHex2 } from '../components/ui/dotm-hex-2';
import OrchestratorProgress from '../components/OrchestratorProgress';
import { useToast } from '../components/ToastContext';
import MessageActionBar from '../components/MessageActionBar';
import WelcomeCharacterAnimation from '../components/WelcomeCharacterAnimation';
import AppleTopControls from '../components/AppleTopControls';

const PLACEHOLDERS = [
  'Paste URL to scan for phishing...',
  'Analyze suspicious email links for safety...',
  'Check domain registry age and SSL status...',
  'Verify brand similarity warnings...',
  'Scan for credential harvesting risks...'
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function WelcomeTitle({ name }) {
  const containerRef = useRef(null);
  const nameWrapRef = useRef(null);
  const isHoverAnimating = useRef(false);
  const greeting = getGreeting();
  const fullText = `${greeting}, `;

  // Initial entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll('.welcome-char');
    if (chars.length === 0) return;

    gsap.fromTo(chars,
      {
        opacity: 0,
        rotationX: -90,
        y: 30,
        transformOrigin: '50% 100%',
      },
      {
        opacity: 1,
        rotationX: 0,
        y: 0,
        duration: 0.7,
        stagger: 0.04,
        ease: 'back.out(1.7)',
      }
    );
  }, []);

  // Hover handler: 3D flip each name letter with stagger
  const handleNameHover = useCallback(() => {
    if (isHoverAnimating.current || !nameWrapRef.current) return;
    isHoverAnimating.current = true;
    const nameChars = nameWrapRef.current.querySelectorAll('.name-char');
    if (nameChars.length === 0) { isHoverAnimating.current = false; return; }

    gsap.to(nameChars, {
      rotationX: 360,
      duration: 0.6,
      stagger: 0.05,
      ease: 'back.out(1.7)',
      onComplete: () => {
        gsap.set(nameChars, { rotationX: 0 });
        isHoverAnimating.current = false;
      },
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap items-center justify-center gap-x-0 font-habibi"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Torch icon */}
      <img
        src={torchImage}
        alt="PhishLens torch"
        className="welcome-char torch-icon-float"
        style={{
          width: 50,
          height: 50,
          objectFit: 'contain',
          marginRight: 12,
          display: 'inline-block',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          filter: 'drop-shadow(0 0 12px rgba(193, 91, 43, 0.45))',
        }}
      />
      {/* Greeting text — solid white/dark typography */}
      {fullText.split('').map((char, idx) => (
        <span
          key={`g-${idx}`}
          className="welcome-char inline-block origin-bottom transform-gpu text-gray-900 dark:text-white"
          style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char}
        </span>
      ))}
      {/* Name with #C15B2B color + hover 3D flip */}
      <span
        ref={nameWrapRef}
        className="inline-flex cursor-pointer"
        style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
        onMouseEnter={handleNameHover}
      >
        {name.split('').map((char, idx) => (
          <span
            key={`n-${idx}`}
            className="welcome-char name-char inline-block origin-bottom transform-gpu"
            style={{
              color: '#C15B2B',
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}
          >
            {char}
          </span>
        ))}
      </span>
    </div>
  );
}

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
const USER_FIRST_NAME = 'Dimuthu';
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
    title: 'Verify Bank Update',
    description: 'Check credentials risk and phishing flags.',
    value: 'http://secure-login-update-bank.com',
    icon: FileText,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-gradient-to-br from-violet-50/90 to-violet-50/30 dark:from-violet-950/20 dark:to-violet-950/5',
    border: 'border-violet-100/90 dark:border-violet-900/40',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-500/30',
    dotBg: 'bg-violet-500',
    pingBg: 'bg-violet-400'
  },
  {
    title: 'Verify Google Safety',
    description: 'Scan Google domain for SSL and geo indicators.',
    value: 'https://google.com',
    icon: BarChart3,
    color: 'text-emerald-550 dark:text-emerald-405',
    bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-50/30 dark:from-emerald-950/20 dark:to-emerald-950/5',
    border: 'border-emerald-100/90 dark:border-emerald-900/40',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
    dotBg: 'bg-emerald-500',
    pingBg: 'bg-emerald-400'
  }
];

const HERO_CHIPS = [
  { label: 'Scan URL', icon: Shield, value: 'https://' },
  { label: 'Verify Bank', icon: FileText, value: 'http://secure-login-update-bank.com' },
  { label: 'Check Safety', icon: BarChart3, value: 'https://google.com' },
  { label: 'Domain Lookup', icon: ShieldAlert, value: 'https://' },
  { label: 'Quick Scan', icon: AlertCircle, value: 'https://' },
];

const isValidUrl = (str) => {
  const trimmed = str.trim();
  if (!trimmed) return false;
  // Regex supporting:
  // 1. Optional protocol (http:// or https://)
  // 2. Domain name, localhost, or IP address
  // 3. Optional port, path, query params, hash
  const pattern = /^(https?:\/\/)?((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/;
  return pattern.test(trimmed);
};

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
      className="pointer-events-none fixed inset-0 overflow-hidden"
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


function AnimatedTitle({ title }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll('.title-char');
    if (chars.length === 0) return;

    gsap.killTweensOf(chars);
    gsap.fromTo(chars,
      { opacity: 0, y: 12, rotateX: -45 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out' }
    );
  }, [title]);

  return (
    <div
      ref={containerRef}
      className="font-semibold text-lg text-gray-700 dark:text-gray-300 flex flex-wrap"
      style={{ perspective: '1000px' }}
    >
      {title.split('').map((char, idx) => (
        <span
          key={idx}
          className="title-char inline-block origin-bottom transform-gpu"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

function AnimatedCyclingWord({ word, isThinking }) {
  const containerRef = useRef(null);
  const placeholderRef = useRef(null);
  const cursorRef = useRef(null);

  const targetText = isThinking ? "Thinking..." : word + '?';
  const [displayText, setDisplayText] = useState('');

  // Typing animation loop: reactive to targetText prop changes
  useEffect(() => {
    let timer;

    // Find longest common prefix
    let commonPrefixLength = 0;
    const minLen = Math.min(displayText.length, targetText.length);
    for (let i = 0; i < minLen; i++) {
      if (displayText[i] === targetText[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }

    if (displayText.length > commonPrefixLength) {
      // Need to delete characters from the end
      timer = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
      }, 30); // fast deletion speed
    } else if (displayText.length < targetText.length) {
      // Need to type next character
      timer = setTimeout(() => {
        setDisplayText((prev) => targetText.slice(0, prev.length + 1));
      }, 70); // smooth typing speed
    }

    return () => clearTimeout(timer);
  }, [targetText, displayText]);

  // Smooth width transition based on the placeholder
  useLayoutEffect(() => {
    if (!placeholderRef.current || !containerRef.current) return;
    const newWidth = placeholderRef.current.offsetWidth;

    gsap.to(containerRef.current, {
      width: newWidth,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }, [word, isThinking]);

  // Cursor blink timeline matching the requested animation
  useEffect(() => {
    if (!cursorRef.current) return;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(cursorRef.current, { opacity: 0, duration: 0.5, ease: 'none', delay: 0.15 })
      .to(cursorRef.current, { opacity: 1, duration: 0.5, ease: 'none', delay: 0.15 });
    return () => {
      tl.kill();
    };
  }, []);

  // Show loader only when isThinking is active and the text has deleted and started typing "Thinking..."
  const showLoader = isThinking && displayText.startsWith('T');

  return (
    <span
      ref={containerRef}
      className="inline-block relative overflow-visible vertical-middle align-middle"
      style={{ transformStyle: 'preserve-3d', perspective: '1000px', height: '1.2em' }}
    >
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center whitespace-nowrap font-black"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {showLoader && (
          <span
            className="inline-flex shrink-0 hero-cycling-loader-wrap mr-3 origin-bottom transform-gpu"
            style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
          >
            <DotmHex2 bloom={true} size={28} dotSize={4.5} className="text-indigo-600 dark:text-indigo-400" />
          </span>
        )}
        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
          {displayText}
        </span>
        <span ref={cursorRef} className="scramble-cursor inline-block text-indigo-600 dark:text-indigo-400 ml-0.5 font-bold">_</span>
      </span>

      {/* Invisible placeholder to reserve vertical height and structure */}
      <span ref={placeholderRef} className="opacity-0 select-none pointer-events-none font-black flex items-center whitespace-nowrap">
        {isThinking && (
          <span className="w-[40px] shrink-0 mr-3 inline-block" />
        )}
        <span>{targetText}</span>
        <span className="ml-0.5">_</span>
      </span>
    </span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Scan');
  const [messages, setMessages] = useState([]);
  const mainRef = useRef(null);
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

  const profileName = 'Dimuthu Pramuditha';
  const profileEmail = 'dimuthu@example.com';
  const profileInitial = profileName.trim().charAt(0).toUpperCase();

  const chatLottieRef = useRef(null);
  const searchLottieRef = useRef(null);
  const historyLottieRef = useRef(null);
  const chatbotLottieRef = useRef(null);
  const expandLottieRef = useRef(null);

  const orbLeftRef = useRef(null);
  const orbRightRef = useRef(null);
  const titleMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const smootherRef = useRef(null);

  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const heroInputWrapRef = useRef(null);
  const heroSuggestionsRef = useRef(null);
  const heroBadgeRef = useRef(null);
  const characterWrapRef = useRef(null);
  const inputPlaceholderRef = useRef(null);
  const inputFormRef = useRef(null);
  const shieldIconRef = useRef(null);
  const warningTextRef = useRef(null);

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // ── Dock item configs ──────────────────────────────────────────────────────
  const dockTopItems = [
    {
      id: 'logo',
      label: 'PhishLens Agent',
      lottieData: chatbotAnimData,
      lottieRef: chatbotLottieRef,
      onClick: () => { },
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
      onClick: () => {
        setMessages([]);
        setHasSentMessage(false);
        setChatTitle('New Scan');
      },
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
      onClick: () => { },
      hasDot: false,
    },
    {
      id: 'history',
      label: 'Scan Logs',
      lottieData: isDarkMode ? historyAnimData : darkHistoryAnimData,
      lottieRef: historyLottieRef,
      onClick: () => { },
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

  // Initialize GSAP ScrollSmoother
  useEffect(() => {
    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,
      effects: true,
    });
    smootherRef.current = smoother;

    return () => {
      smoother.kill();
    };
  }, []);

  // Refresh ScrollTrigger and ScrollSmoother when messages are added or sidebar expands/collapses
  useEffect(() => {
    ScrollTrigger.refresh();
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 550);
    return () => clearTimeout(timer);
  }, [messages, isExpanded]);

  // Autoscroll message container when new messages arrive
  useEffect(() => {
    if (smootherRef.current) {
      smootherRef.current.scrollTo(messagesEndRef.current, true);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  /* Hero entrance: bottom-to-top reveal */
  useLayoutEffect(() => {
    if (hasSentMessage) return;

    const root = heroRef.current;
    const titleEl = heroTitleRef.current;
    const inputWrap = heroInputWrapRef.current;
    const suggestionsEl = heroSuggestionsRef.current;
    const badgeEl = heroBadgeRef.current;
    const characterEl = characterWrapRef.current;
    if (!root || !titleEl || !inputWrap || !inputPlaceholderRef.current) return;

    const ctx = gsap.context(() => {
      // Calculate dy for inputWrap positioning precisely based on inputForm
      const rectPlaceholder = inputPlaceholderRef.current.getBoundingClientRect();
      const currentY = gsap.getProperty(inputWrap, "y") || 0;
      const rectForm = inputFormRef.current ? inputFormRef.current.getBoundingClientRect() : inputWrap.getBoundingClientRect();
      const untranslatedFormTop = rectForm.top - currentY;
      const dy = rectPlaceholder.top - untranslatedFormTop;

      // 1. Set initial states for elements
      gsap.set(inputWrap, {
        opacity: 0,
        y: dy + 40,
      });
      gsap.set([badgeEl].filter(Boolean), {
        opacity: 0,
        y: 20,
      });

      if (characterEl) {
        gsap.set(characterEl, {
          opacity: 0,
          y: 20,
          scale: 0.96,
        });
      }

      // WelcomeTitle chars handle their entrance at t=0
      gsap.set(titleEl, { opacity: 1, y: 0 });

      if (suggestionsEl) {
        gsap.set(suggestionsEl, { opacity: 0, y: 20 });
      }

      // 2. Timeline: Greeting first -> Character emerges -> Input bar -> Chips -> Badge
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      // Background character materializes right after greeting
      if (characterEl) {
        tl.to(characterEl, { opacity: 1, y: 0, scale: 1, duration: 0.85 }, 0.35);
      }
      tl.to(inputWrap, { opacity: 1, y: dy, duration: 0.8 }, 0.55);

      if (suggestionsEl) {
        const pills = suggestionsEl.querySelectorAll('.hero-suggestion-card');
        tl.to(suggestionsEl, { opacity: 1, y: 0, duration: 0.5 }, 0.65);
        if (pills.length > 0) {
          gsap.set(pills, { opacity: 0, scale: 0.92 });
          tl.to(pills, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'back.out(1.8)',
          }, 0.7);
        }
      }

      tl.to(badgeEl, { opacity: 1, y: 0, duration: 0.6 }, 0.75);
    }, root);

    return () => ctx.revert();
  }, [hasSentMessage]);

  // ── Reset/Update Unified Input Bar position relative to its hero placeholder ──
  const resetInputPosition = useCallback(() => {
    if (hasSentMessage || !inputPlaceholderRef.current || !inputFormRef.current || !heroInputWrapRef.current) return;
    const rectPlaceholder = inputPlaceholderRef.current.getBoundingClientRect();
    const currentY = gsap.getProperty(heroInputWrapRef.current, "y") || 0;
    const rectForm = inputFormRef.current.getBoundingClientRect();
    const untranslatedFormTop = rectForm.top - currentY;
    const dy = rectPlaceholder.top - untranslatedFormTop;
    gsap.set(heroInputWrapRef.current, { y: dy });
  }, [hasSentMessage]);

  useEffect(() => {
    resetInputPosition();
    const t = setTimeout(resetInputPosition, 50);
    window.addEventListener('resize', resetInputPosition);
    return () => {
      window.removeEventListener('resize', resetInputPosition);
      clearTimeout(t);
    };
  }, [resetInputPosition, isExpanded]);

  // ── Cycle to the next word ──
  const triggerCycle = useCallback(() => {
    if (hasSentMessage) return;
    setIsThinking((prev) => {
      if (prev) {
        setCurrentWordIdx((idx) => (idx + 1) % CYCLING_WORDS.length);
        return false;
      } else {
        return true;
      }
    });
  }, [hasSentMessage]);

  // ── Cycle scheduling ──
  useEffect(() => {
    if (hasSentMessage) return;

    const delay = isThinking ? 2200 : 3200;
    const timer = setTimeout(triggerCycle, delay);

    return () => clearTimeout(timer);
  }, [currentWordIdx, isThinking, triggerCycle, hasSentMessage]);



  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    if (!isValidUrl(query)) {
      addToast({
        type: 'error',
        title: 'Invalid URL Format',
        message: 'Please enter a valid website URL or domain name (e.g. google.com).'
      });
      return;
    }

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
      status: 'loading',
      url: processedUrl
    };

    setMessages((prev) => [...prev, userMsg, loadingBotMsg]);
    setInput('');
    setIsLoading(true);
    setChatTitle(query);

    if (isFirst) {
      // 1. Run the transition timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setHasSentMessage(true);
        }
      });

      // Fade out hero character, badge, title, suggestions
      tl.to([characterWrapRef.current, heroBadgeRef.current, heroTitleRef.current, heroSuggestionsRef.current].filter(Boolean), {
        opacity: 0,
        y: -18,
        scale: 0.97,
        duration: 0.28,
        stagger: 0.04,
        ease: 'power2.in'
      });

      // Animate input bar to bottom and reduce size
      tl.to(heroInputWrapRef.current, {
        y: 0,
        duration: 0.55,
        ease: 'power3.inOut'
      }, 0.1);

      // Animate form border radius, background, shadow
      tl.to(inputFormRef.current, {
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: '0 8px 32px 0 rgba(66,46,168,0.18), 0 1.5px 8px 0 rgba(138,43,226,0.10)',
        duration: 0.55,
        ease: 'power3.inOut'
      }, 0.1);

      // Fade out and shrink shield icon
      tl.to(shieldIconRef.current, {
        width: 0,
        opacity: 0,
        marginRight: 0,
        paddingLeft: 0,
        paddingRight: 0,
        duration: 0.4,
        ease: 'power3.inOut'
      }, 0.1);

      // Fade in warning text
      tl.to(warningTextRef.current, {
        height: 'auto',
        opacity: 1,
        marginTop: 10,
        duration: 0.4,
        ease: 'power3.out'
      }, 0.35);
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
      if (data.screenshot_path) {
        const parts = data.screenshot_path.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
      } else if (data.tool_trace) {
        // Fallback to legacy parsing if not present as top-level key
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
      const isFailed = data.overall_status === 'FAILED';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: isFailed ? `Scan failed: ${data.error || 'Unknown error occurred.'}` : null,
                status: isFailed ? 'failed' : 'completed',
                report: data.report,
                screenshotUrl: resolvedScreenshotUrl,
                urlAnalysisData: data.url_analysis_data,
                toolTrace: data.tool_trace,
                urlAnalysisData: data.url_analysis_data,
                overallStatus: data.overall_status,
                duration: data.total_duration_sec,
                error: data.error,
              }
            : msg
        )
      );

      // Fire toast notification
      if (isFailed) {
        addToast({ type: 'error', title: 'Scan Failed', message: data.error || 'Unknown error occurred during analysis.' });
      } else {
        const riskLevel = data.report?.risk_level || 'Unknown';
        const riskScore = data.report?.risk_score ?? 0;
        const toastType = riskScore >= 61 ? 'warning' : riskScore >= 41 ? 'warning' : 'success';
        addToast({
          type: toastType,
          title: `Analysis Complete — ${riskLevel}`,
          message: `Risk score: ${riskScore}% • Duration: ${data.total_duration_sec}s`,
        });
      }
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
      addToast({ type: 'error', title: 'Connection Error', message: `${err.message}. Make sure the Django server is running.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescanMessage = async (botMsgId, urlToScan) => {
    if (isLoading) return;

    // Set status to loading for this specific bot message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === botMsgId
          ? {
            ...msg,
            status: 'loading',
            text: `Scanning URL: ${urlToScan}... Processing DOM structure, lexical attributes, WHOIS details, and visual similarity features. Please wait.`,
            report: null,
            screenshotUrl: null,
            urlAnalysisData: null,
            toolTrace: null,
            overallStatus: null,
            duration: null,
            error: null,
          }
          : msg
      )
    );
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/scan/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToScan }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      let resolvedScreenshotUrl = null;
      if (data.screenshot_path) {
        const parts = data.screenshot_path.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
      } else if (data.tool_trace) {
        const screenshotStep = data.tool_trace.find(
          (step) => step.step === 'tool_result' && step.tool === 'capture_screenshot'
        );
        if (screenshotStep && screenshotStep.content_preview) {
          try {
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

      const isFailed = data.overall_status === 'FAILED';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
              ...msg,
              text: isFailed ? `Scan failed: ${data.error || 'Unknown error occurred.'}` : null,
              status: isFailed ? 'failed' : 'completed',
              report: data.report,
              screenshotUrl: resolvedScreenshotUrl,
              urlAnalysisData: data.url_analysis_data,
              toolTrace: data.tool_trace,
              overallStatus: data.overall_status,
              duration: data.total_duration_sec,
              error: data.error,
            }
            : msg
        )
      );

      if (isFailed) {
        addToast({ type: 'error', title: 'Scan Failed', message: data.error || 'Unknown error occurred during analysis.' });
      } else {
        const riskLevel = data.report?.risk_level || 'Unknown';
        const riskScore = data.report?.risk_score ?? 0;
        const toastType = riskScore >= 61 ? 'warning' : riskScore >= 41 ? 'warning' : 'success';
        addToast({
          type: toastType,
          title: `Analysis Complete — ${riskLevel}`,
          message: `Risk score: ${riskScore}% • Duration: ${data.total_duration_sec}s`,
        });
      }
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
      addToast({ type: 'error', title: 'Connection Error', message: `${err.message}. Make sure the Django server is running.` });
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
      setChatTitle('Analysis on suspicious email link');
    } else if (chatId === 2) {
      setMessages([
        { id: 1, text: 'What is spear phishing?', sender: 'user' },
        { id: 2, text: 'Spear phishing is a highly targeted phishing method where attackers customize their emails/messages specifically for a particular individual or organization, often using personal details to build trust.', sender: 'bot' }
      ]);
      setHasSentMessage(true);
      setChatTitle('What is spear phishing?');
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
      setChatTitle('Scan results for domain.com');
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
      <main
        ref={mainRef}
        className="flex-1 flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-400 relative transition-colors duration-300 overflow-hidden"
      >

        {/* ── Persistent floating background orbs ── */}
        <BackgroundOrbs hasSentMessage={hasSentMessage} />

        {/* ── Send-burst orb flash (triggered on each send) ── */}
        {showOrbs && (
          <div
            className={"pointer-events-none fixed inset-0 flex justify-center " + (hasSentMessage ? "items-end pb-20" : "items-center")}
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

        {/* ── Top-Right Apple Design Controls (Light/Dark Toggle + Notifications) ── */}
        <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 pointer-events-auto">
          <AppleTopControls
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          />
        </div>

        <div
          id="smooth-wrapper"
          className="flex-1 w-full h-full overflow-y-auto no-scrollbar relative z-10 bg-white dark:bg-[#1a1a1a] transition-colors duration-300"
          style={{
            position: 'fixed',
            top: 0,
            height: '100%',
            left: isExpanded ? '330px' : '0px',
            width: isExpanded ? 'calc(100% - 330px)' : '100%',
            transition: 'left 0.5s cubic-bezier(0.25, 1, 0.5, 1), width 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          <div id="smooth-content" className="w-full flex flex-col min-h-full">

            <header className={"flex items-center justify-center px-6 shrink-0 " + (hasSentMessage ? "h-16" : "h-6 md:h-8")} style={{ position: 'relative', zIndex: 10 }}>
              {hasSentMessage && (
                <div className="relative flex items-center gap-3">
                  <AnimatedTitle title={chatTitle} />
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
              )}
            </header>

            {/* Messages area — only visible after first message */}
            {hasSentMessage && (
              <section
                className="w-full max-w-4xl mx-auto flex flex-col gap-6 pt-4 px-4 pb-44 md:px-12"
                style={{ position: 'relative', zIndex: 10 }}
              >
                {messages.map((msg) => (
                  <div key={msg.id} className={"flex w-full mb-6 " + (msg.isUser ? "justify-end" : "justify-start")}>
                    {msg.isUser ? (
                      <div className="group relative max-w-[85%] sm:max-w-[70%] px-5 py-3.5 text-[15px] leading-relaxed bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 rounded-3xl rounded-tr-sm shadow-sm font-semibold tracking-wide border border-gray-300/20">
                        {msg.text}
                        <MessageActionBar msg={msg} onRescan={handleRescanMessage} isLoadingGlobal={isLoading} />
                      </div>
                    ) : (
                      <div className="group relative w-full">
                        <div className="flex-1 min-w-0 bg-transparent py-1.5 flex flex-col gap-4">
                          {(msg.status === 'loading' || msg.status === 'completed') && (
                            <OrchestratorProgress
                              targetUrl={msg.url || 'Target URL'}
                              status={msg.status}
                              duration={msg.duration}
                            />
                          )}
                          {msg.status === 'failed' && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm max-w-[85%] shadow-sm">
                              <AlertCircle size={20} className="shrink-0" />
                              <p>{msg.text}</p>
                            </div>
                          )}
                          {msg.status === 'completed' && (
                            <ReportDashboard
                              report={msg.report}
                              duration={msg.duration}
                              screenshotUrl={msg.screenshotUrl}
                              toolTrace={msg.toolTrace}
                              urlAnalysisData={msg.urlAnalysisData}
                            />
                          )}
                        </div>
                        <MessageActionBar msg={msg} onRescan={handleRescanMessage} isLoadingGlobal={isLoading} />
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
                className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-2 min-h-0 relative"
                style={{ position: 'relative', zIndex: 10 }}
              >
                {/* ── Apple-style Floating Status Badge (Bottom-Right) ── */}
                <div
                  ref={heroBadgeRef}
                  className="absolute right-6 bottom-6 md:right-8 md:bottom-8 z-30 inline-flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 cursor-default select-none"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  PhishLens AI Agent
                </div>

            <div className="w-full max-w-3xl flex flex-col items-center text-center select-none relative mt-auto mb-6 sm:mb-8 pb-2">

              {/* ── Background Animated Character (from background_image.svg) ── */}
              <div
                ref={characterWrapRef}
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-0 w-full max-w-[500px] sm:max-w-[580px] md:max-w-[650px]"
                style={{
                  bottom: '215px', // Places full-size character cleanly above bottom greeting title
                }}
              >
                <WelcomeCharacterAnimation
                  isInputFocused={isInputFocused}
                  isTyping={isTyping}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* ── Greeting Title (Renders First with 3D Char Flip & Floating Torch) ── */}
              <h1
                ref={heroTitleRef}
                className="relative z-10 text-3xl md:text-5xl font-black tracking-tight mb-6 min-h-[1.2em] w-full font-habibi"
                aria-label={`${getGreeting()}, ${USER_FIRST_NAME}`}
              >
                <WelcomeTitle name={USER_FIRST_NAME} />
              </h1>

              {/* ── Input Placeholder (for floating input bar alignment) ── */}
              <div className="w-full max-w-2xl relative z-10">
                <div
                  ref={inputPlaceholderRef}
                  className="w-full h-[58px] mx-auto max-w-2xl opacity-0 pointer-events-none"
                />
              </div>

              {/* ── Suggestion Chips ── */}
              <div
                ref={heroSuggestionsRef}
                className="relative z-10 mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-2.5 w-full max-w-2xl px-4 sm:px-0"
              >
                    {HERO_CHIPS.map((chip, cIdx) => {
                      const ChipIcon = chip.icon;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setInput(chip.value)}
                          className="hero-suggestion-card group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200/80 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md text-[13px] font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800/80"
                        >
                          <ChipIcon size={14} strokeWidth={2.2} className="text-gray-400 dark:text-zinc-400 group-hover:text-[#C15B2B] dark:group-hover:text-[#C15B2B] transition-colors" />
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Unified Input Bar (always mounted, animates from center to bottom) */}
        <div
          ref={heroInputWrapRef}
          className="fixed pt-6 pb-6 pointer-events-none"
          style={{
            zIndex: 20,
            paddingLeft: '16px',
            paddingRight: '16px',
            left: isExpanded ? '330px' : '0px',
            width: isExpanded ? 'calc(100% - 330px)' : '100%',
            transition: 'left 0.5s cubic-bezier(0.25, 1, 0.5, 1), width 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            bottom: 0,
          }}
        >
          <div className="max-w-2xl w-full mx-auto relative pointer-events-auto" style={{ zIndex: 1 }}>
            <form
              ref={inputFormRef}
              onSubmit={handleSend}
              className="relative flex items-center shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/80 dark:focus-within:ring-indigo-400/80 transition-all border border-slate-200 dark:border-zinc-800/80 backdrop-blur-xl"
              style={hasSentMessage ? {
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                boxShadow: '0 8px 32px 0 rgba(66,46,168,0.18), 0 1.5px 8px 0 rgba(138,43,226,0.10)',
              } : {
                borderRadius: '28px',
                backgroundColor: 'transparent',
                boxShadow: '0 12px 40px 0 rgba(66,46,168,0.16), 0 2px 12px 0 rgba(138,43,226,0.12)',
              }}
            >
              {/* Shield Alert Icon (fades out and shrinks on send) */}
              <div
                ref={shieldIconRef}
                className="pl-4 pr-1 flex items-center text-indigo-500 dark:text-indigo-400 shrink-0"
                style={hasSentMessage ? { width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0, marginRight: 0 } : {}}
              >
                <ShieldAlert size={18} strokeWidth={2.25} />
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 600);
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    setIsInputFocused(false);
                    setIsTyping(false);
                  }}
                  placeholder=""
                  disabled={isLoading}
                  className={"w-full bg-transparent py-4 pr-14 outline-none text-[15px] text-gray-700 dark:text-gray-200 placeholder-transparent " + (hasSentMessage ? "pl-5" : "pl-2")}
                />
                {!input && (
                  <PlaceholderCycler leftPaddingClass={hasSentMessage ? "left-5" : "left-2"} />
                )}
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={"absolute right-2.5 p-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 duration-300 " + (input.trim() && !isLoading ? "bg-[#C15B2B] text-white hover:bg-[#A84A1F] shadow-lg shadow-indigo-500/30 dark:bg-[#C15B2B] dark:text-white dark:hover:bg-[#A84A1F] dark:shadow-white/10" : "bg-gray-200/80 text-gray-400 dark:bg-[#3d3d3d] dark:text-gray-500")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
              </button>
            </form>

            {/* Subtext warning (only visible/fades in after first send) */}
            <div
              ref={warningTextRef}
              className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2.5"
              style={hasSentMessage ? { height: 'auto', opacity: 1, marginTop: 10 } : { height: 0, opacity: 0, overflow: 'hidden' }}
            >
              PhishLens can make mistakes. Verify important security warnings.
            </div>
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

