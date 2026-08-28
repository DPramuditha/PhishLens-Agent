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
import { useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
import ScreenshotsGalleryModal from '../components/ScreenshotsGalleryModal';
import ScanLogsModal from '../components/ScanLogsModal';
import PDFReportsModal from '../components/PDFReportsModal';
import AnalyticsDashboardModal from '../components/AnalyticsDashboardModal';
import ProfileBottomSheet from '../components/ProfileBottomSheet';
import SidebarDock from '../components/SidebarDock';
import ReportDashboard from '../components/ReportDashboard';
import DeleteChatModal from '../components/DeleteChatModal';
import { DotmSquare19 } from '../components/ui/dotm-square-19';
import OrchestratorProgress from '../components/OrchestratorProgress';
import { useToast } from '../components/ToastContext';
import MessageActionBar from '../components/MessageActionBar';
import RealtimeTodoList from '../components/RealtimeTodoList';
import WelcomeCharacterAnimation from '../components/WelcomeCharacterAnimation';
import AppleTopControls from '../components/AppleTopControls';
import ApprovalCard from '../components/ApprovalCard';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDERS = [
  'Paste URL to scan for phishing...',
  'Analyze suspicious email links for safety...',
  'Check domain registry age and SSL status...',
  'Verify brand similarity warnings...',
  'Scan for credential harvesting risks...'
];

function getGreetingParts() {
  const hour = new Date().getHours();
  if (hour < 12) return { prefix: 'Good', timeOfDay: 'morning' };
  if (hour < 17) return { prefix: 'Good', timeOfDay: 'afternoon' };
  return { prefix: 'Good', timeOfDay: 'evening' };
}

function WelcomeTitle({ name, isInputFocused, isTyping, isDarkMode }) {
  const containerRef = useRef(null);
  const nameWrapRef = useRef(null);
  const isHoverAnimating = useRef(false);
  const { prefix, timeOfDay } = getGreetingParts();
  const timeOfDayWithComma = `${timeOfDay}, `;

  // Initial entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll('.welcome-char');
    if (chars.length === 0) return;

    const ctx = gsap.context(() => {
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
          stagger: 0.035,
          ease: 'back.out(1.7)',
        }
      );
    }, containerRef);

    return () => ctx.revert();
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
      className="flex flex-wrap items-center justify-center gap-y-2 font-habibi"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* 1. First word "Good" */}
      <span className="inline-flex items-center">
        {prefix.split('').map((char, idx) => (
          <span
            key={`p-${idx}`}
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
      </span>

      {/* 2. Inline Animated Character (from background_image.svg) */}
      <span
        className="welcome-char inline-flex items-center justify-center mx-2.5 sm:mx-3.5 align-middle select-none origin-bottom transform-gpu"
        style={{
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          verticalAlign: 'middle',
        }}
      >
        <WelcomeCharacterAnimation
          size="inline"
          isInputFocused={isInputFocused}
          isTyping={isTyping}
          isDarkMode={isDarkMode}
        />
      </span>

      {/* 3. Time of day ("evening, " or "morning, " / "afternoon, ") */}
      <span className="inline-flex items-center">
        {timeOfDayWithComma.split('').map((char, idx) => (
          <span
            key={`t-${idx}`}
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
      </span>

      {/* 4. User Name with #C15B2B color + hover 3D flip */}
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
    let currentWords = null;
    const interval = setInterval(() => {
      if (isAnimatingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const words = container.querySelectorAll('.placeholder-word');
      if (words.length === 0) return;

      isAnimatingRef.current = true;
      currentWords = words;

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

    return () => {
      clearInterval(interval);
      if (currentWords) gsap.killTweensOf(currentWords);
    };
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
    const tween = gsap.to(words, {
      y: 0,
      opacity: 1,
      duration: 0.45,
      stagger: 0.02,
      ease: 'power2.out',
      onComplete: () => {
        isAnimatingRef.current = false;
      }
    });

    return () => {
      tween.kill();
    };
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
function BackgroundOrbs({ hasSentMessage, isDarkMode = true }) {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  useEffect(() => {
    if (!orb1Ref.current || !orb2Ref.current) return;

    /* float orb1 */
    const tween1 = gsap.to(orb1Ref.current, {
      x: 50,
      y: -30,
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      force3D: true,
    });

    /* float orb2 */
    const tween2 = gsap.to(orb2Ref.current, {
      x: -40,
      y: 40,
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1,
      force3D: true,
    });

    return () => {
      tween1.kill();
      tween2.kill();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, contain: 'strict' }}
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
          opacity: isDarkMode ? 0.28 : 0.08,
          bottom: hasSentMessage ? '-80px' : '8%',
          left: hasSentMessage ? '-80px' : '15%',
          willChange: 'transform',
          transform: 'translate3d(0, 0, 0)',
          transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1), left 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
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
          opacity: isDarkMode ? 0.28 : 0.08,
          bottom: hasSentMessage ? '-60px' : '6%',
          right: hasSentMessage ? '-80px' : '10%',
          willChange: 'transform',
          transform: 'translate3d(0, 0, 0)',
          transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1), right 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
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
            <DotmSquare19 bloom={true} size={28} dotSize={4.5} color="#C15B2B" className="text-[#C15B2B]" />
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
  const { id: routeChatId } = useParams();
  const { user, token, authFetch } = useAuth();
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [chatTitle, setChatTitle] = useState('New Scan');
  const [activeChatId, setActiveChatId] = useState(routeChatId || null);
  const [messages, setMessages] = useState([]);
  const mainRef = useRef(null);
  const [input, setInput] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScreenshotsOpen, setIsScreenshotsOpen] = useState(false);
  const [isScanLogsOpen, setIsScanLogsOpen] = useState(false);
  const [isPdfReportsOpen, setIsPdfReportsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('phishlens_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    } catch {
      // ignore
    }
    return true;
  });
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [showOrbs, setShowOrbs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentTasks, setShowAgentTasks] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showApprovalCard, setShowApprovalCard] = useState(false);
  const [approvalContext, setApprovalContext] = useState(null);
  const [chatHasFeedback, setChatHasFeedback] = useState(false);

  const handleDeleteCurrentChat = async () => {
    const targetChatId = activeChatId || routeChatId;
    if (!targetChatId) return;
    setIsDeletingChat(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/${targetChatId}/`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        addToast({ type: 'success', title: 'Deleted', message: 'Chat session removed.' });
        setHistoryRefreshKey((prev) => prev + 1);
        setIsDeleteModalOpen(false);
        setIsTitleMenuOpen(false);
        navigate('/chat');
      }
    } catch (err) {
      console.error('Error deleting current chat:', err);
    } finally {
      setIsDeletingChat(false);
    }
  };

  // ── Load Chat Session from PostgreSQL by unique ID (/chat/:id) ──
  useEffect(() => {
    if (!routeChatId) {
      setActiveChatId(null);
      setMessages([]);
      setHasSentMessage(false);
      setChatTitle('New Scan');
      setShowAgentTasks(false);
      setChatHasFeedback(false);
      setShowApprovalCard(false);
      setApprovalContext(null);
      return;
    }

    setActiveChatId(routeChatId);
    let isCancelled = false;

    const loadChat = async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`http://localhost:8000/api/chats/${routeChatId}/`, { headers });
        if (!res.ok) return;

        const data = await res.json();
        if (isCancelled) return;

        if (data.title) setChatTitle(data.title);
        setChatHasFeedback(Boolean(data.has_feedback));

        if (data.messages && data.messages.length > 0) {
          const formatted = data.messages.map((msg) => ({
            id: msg.id,
            isUser: msg.sender === 'user',
            text: msg.text,
            url: msg.target_url,
            status: msg.overall_status === 'FAILED' ? 'failed' : 'completed',
            report: msg.report,
            screenshotUrl: msg.screenshot_url,
            annotatedScreenshotUrl: msg.annotated_screenshot_url || msg.annotated_screenshot_data || null,
            urlAnalysisData: msg.url_analysis_data,
            toolTrace: msg.tool_trace,
            overallStatus: msg.overall_status,
            duration: msg.duration_sec,
            error: msg.error,
            isLive: false,
          }));

          setMessages(formatted);
          setHasSentMessage(true);
          setShowAgentTasks(true);

          const lastAssistant = formatted.filter((m) => !m.isUser).slice(-1)[0];
          if (lastAssistant) {
            setApprovalContext({
              targetUrl: lastAssistant.url || data.title,
              llmResponse: lastAssistant.report || { text: lastAssistant.text },
              chatId: routeChatId,
              messageId: lastAssistant.id,
              questions: data.hitl_questions || null,
            });
            setShowApprovalCard(false);
          }
        } else {
          setMessages([]);
          setHasSentMessage(false);
          setShowAgentTasks(false);
        }
      } catch (err) {
        console.error('Error loading chat session:', err);
      }
    };

    loadChat();
    return () => {
      isCancelled = true;
    };
  }, [routeChatId, token]);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const isCyclingAnimating = useRef(false);

  const profileName = user?.name || user?.email || 'User';
  const profileEmail = user?.email || '';
  const profilePicture = user?.picture || '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase();
  const userFirstName = user?.given_name || (user?.name ? user.name.split(' ')[0] : 'There');

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
        setShowAgentTasks(false);
        setActiveChatId(null);
        setChatHasFeedback(false);
        setShowApprovalCard(false);
        setApprovalContext(null);
        navigate('/chat');
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
      id: 'screenshots',
      label: 'Captured Screenshots',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.9451 1.25H13.0549C14.4225 1.24998 15.5248 1.24996 16.3918 1.36652C17.2919 1.48754 18.0498 1.74643 18.6517 2.34835C19.0519 2.74855 19.3004 3.2177 19.4577 3.75175C19.6692 3.75503 19.8458 3.76426 20.0084 3.79001C21.3991 4.01027 22.4898 5.10094 22.71 6.49159C22.7502 6.74548 22.7501 7.03358 22.75 7.43528C22.75 7.45653 22.75 7.4781 22.75 7.5V16.5C22.75 16.5219 22.75 16.5435 22.75 16.5647C22.7501 16.9664 22.7502 17.2545 22.71 17.5084C22.4898 18.8991 21.3991 19.9897 20.0084 20.21C19.8458 20.2357 19.6692 20.245 19.4577 20.2482C19.3004 20.7823 19.0519 21.2514 18.6517 21.6517C18.0498 22.2536 17.2919 22.5125 16.3918 22.6335C15.5248 22.75 14.4225 22.75 13.0549 22.75H10.9452C9.57756 22.75 8.47524 22.75 7.60827 22.6335C6.70816 22.5125 5.95029 22.2536 5.34837 21.6517C4.94817 21.2514 4.69961 20.7823 4.54238 20.2482C4.33086 20.245 4.15422 20.2357 3.99161 20.21C2.60096 19.9897 1.51029 18.8991 1.29004 17.5084C1.24982 17.2545 1.2499 16.9664 1.25001 16.5647C1.25002 16.5435 1.25002 16.5219 1.25002 16.5V7.5C1.25002 7.4781 1.25002 7.45652 1.25001 7.43527C1.2499 7.03357 1.24982 6.74548 1.29004 6.49159C1.51029 5.10094 2.60096 4.01027 3.99161 3.79001C4.15422 3.76426 4.33086 3.75503 4.54238 3.75175C4.69961 3.2177 4.94817 2.74855 5.34837 2.34835C5.95029 1.74643 6.70816 1.48754 7.60827 1.36652C8.47524 1.24996 9.57756 1.24998 10.9451 1.25ZM4.30193 5.26229C4.27396 5.26483 4.24942 5.26788 4.22626 5.27155C3.47745 5.39015 2.89017 5.97743 2.77157 6.72624C2.75235 6.84758 2.75002 7.00684 2.75002 7.5V16.5C2.75002 16.9932 2.75235 17.1524 2.77157 17.2738C2.89017 18.0226 3.47745 18.6099 4.22626 18.7285C4.24942 18.7321 4.27396 18.7352 4.30193 18.7377C4.24999 17.9893 4.25001 17.0995 4.25002 16.0549L4.25002 14.8166C4.25002 14.8161 4.25002 14.8156 4.25002 14.8151L4.25002 7.94512C4.25001 6.90052 4.24999 6.01069 4.30193 5.26229ZM5.75002 15.1209V16C5.75002 17.4354 5.75162 18.4365 5.85317 19.1919C5.95182 19.9257 6.13227 20.3142 6.40903 20.591C6.6858 20.8678 7.07437 21.0482 7.80814 21.1469C8.56349 21.2484 9.56461 21.25 11 21.25H13C14.4354 21.25 15.4366 21.2484 16.1919 21.1469C16.9257 21.0482 17.3143 20.8678 17.591 20.591C17.743 20.439 17.8659 20.2533 17.9622 19.9952L16.0804 18.0092C15.577 17.478 14.8816 17.4416 14.352 17.8781L14.1322 18.0591C13.216 18.8142 11.9548 18.6658 11.1952 17.7751L8.03435 14.0687C7.68431 13.6583 7.1851 13.6485 6.82776 14.0152L5.75002 15.1209ZM18.2292 18.0961L17.1692 16.9775C16.1406 15.892 14.5546 15.7673 13.398 16.7205L13.1783 16.9016C12.9228 17.1121 12.5897 17.0987 12.3365 16.8018L9.17567 13.0954C8.26393 12.0263 6.73916 11.957 5.75357 12.9682L5.75002 12.9719V8C5.75002 6.56458 5.75162 5.56347 5.85317 4.80812C5.95182 4.07435 6.13227 3.68577 6.40903 3.40901C6.6858 3.13225 7.07437 2.9518 7.80814 2.85315C8.56349 2.75159 9.56461 2.75 11 2.75H13C14.4354 2.75 15.4366 2.75159 16.1919 2.85315C16.9257 2.9518 17.3143 3.13225 17.591 3.40901C17.8678 3.68577 18.0482 4.07435 18.1469 4.80812C18.2484 5.56347 18.25 6.56458 18.25 8V16C18.25 16.8326 18.2495 17.519 18.2292 18.0961ZM19.6981 18.7377C19.7261 18.7352 19.7506 18.7321 19.7738 18.7285C20.5226 18.6099 21.1099 18.0226 21.2285 17.2738C21.2477 17.1524 21.25 16.9932 21.25 16.5V7.5C21.25 7.00684 21.2477 6.84758 21.2285 6.72624C21.1099 5.97743 20.5226 5.39015 19.7738 5.27155C19.7506 5.26788 19.7261 5.26483 19.6981 5.26229C19.7501 6.01069 19.75 6.90053 19.75 7.94513V16.0549C19.75 17.0995 19.7501 17.9893 19.6981 18.7377ZM14.5 5.75C14.0858 5.75 13.75 6.08579 13.75 6.5C13.75 6.91421 14.0858 7.25 14.5 7.25C14.9142 7.25 15.25 6.91421 15.25 6.5C15.25 6.08579 14.9142 5.75 14.5 5.75ZM12.25 6.5C12.25 5.25736 13.2574 4.25 14.5 4.25C15.7427 4.25 16.75 5.25736 16.75 6.5C16.75 7.74264 15.7427 8.75 14.5 8.75C13.2574 8.75 12.25 7.74264 12.25 6.5Z"
            fill="currentColor"
          />
        </svg>
      ),
      onClick: () => setIsScreenshotsOpen(true),
      hasDot: false,
    },
    {
      id: 'pdf-reports',
      label: 'Scanned PDF Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.25 18C8.25 17.5858 8.58579 17.25 9 17.25H15C15.4142 17.25 15.75 17.5858 15.75 18C15.75 18.4142 15.4142 18.75 15 18.75H9C8.58579 18.75 8.25 18.4142 8.25 18Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.69935 1.25001H15.3004C15.5203 1.24995 15.6888 1.2499 15.8362 1.26571C17.1903 1.41104 18.2268 2.52307 18.2897 3.87013C19.4805 4.22571 20.3289 5.3275 20.3443 6.59118C20.9453 6.77151 21.4637 7.05595 21.888 7.51432C22.54 8.21857 22.7421 9.08649 22.7498 10.1003C22.7572 11.075 22.5835 12.3067 22.3678 13.8363L21.9288 16.9499C21.7602 18.146 21.6232 19.1176 21.4101 19.879C21.1871 20.6756 20.8585 21.331 20.25 21.8349C19.6463 22.3347 18.9301 22.5502 18.0835 22.6518C17.265 22.75 16.2353 22.75 14.9532 22.75H9.04687C7.76478 22.75 6.73501 22.75 5.91647 22.6518C5.06993 22.5502 4.35372 22.3347 3.75003 21.8349C3.14152 21.331 2.81286 20.6756 2.58989 19.879C2.37676 19.1176 2.23979 18.146 2.07118 16.9499L1.63219 13.8363C1.41651 12.3067 1.24283 11.075 1.25023 10.1003C1.25792 9.08649 1.45997 8.21857 2.11196 7.51432C2.53621 7.05606 3.05445 6.77164 3.65528 6.5913C3.67058 5.3275 4.51917 4.22559 5.71005 3.87007C5.77295 2.52304 6.80943 1.41104 8.16359 1.26571C8.31094 1.2499 8.4795 1.24995 8.69935 1.25001ZM5.18902 6.32785C6.11481 6.24999 7.24973 6.25 8.61594 6.25001H15.384C16.75 6.25 17.8848 6.24999 18.8105 6.32781C18.6734 5.72018 18.1306 5.25001 17.4617 5.25001H6.53787C5.86896 5.25001 5.32618 5.72019 5.18902 6.32785ZM15.6761 2.75715C16.2263 2.8162 16.6611 3.22633 16.7677 3.75001H7.2321C7.33862 3.22633 7.77344 2.8162 8.32365 2.75715C8.37993 2.75111 8.46013 2.75001 8.74099 2.75001H15.2588C15.5396 2.75001 15.6198 2.75111 15.6761 2.75715ZM3.21267 8.53336C3.51557 8.20618 3.97106 7.98917 4.85612 7.87145C5.75726 7.75159 6.96357 7.75001 8.67239 7.75001H15.3276C17.0364 7.75001 18.2427 7.75159 19.1439 7.87145C20.0289 7.98917 20.4844 8.20618 20.7873 8.53336C21.0832 8.85293 21.2436 9.28782 21.2498 10.1117C21.2563 10.9618 21.1002 12.0828 20.8738 13.6883L20.4509 16.6883C20.2731 17.9491 20.1486 18.821 19.9656 19.4747C19.7894 20.1042 19.582 20.4405 19.2934 20.6795C18.9999 20.9225 18.6058 21.0784 17.9048 21.1625C17.1861 21.2488 16.2465 21.25 14.9046 21.25H9.09536C7.75347 21.25 6.81393 21.2488 6.09519 21.1625C5.39417 21.0784 5.00014 20.9225 4.70664 20.6795C4.41795 20.4405 4.21058 20.1042 4.03437 19.4747C3.8514 18.821 3.7269 17.9491 3.54913 16.6883L3.12616 13.6883C2.89981 12.0828 2.74373 10.9618 2.75018 10.1117C2.75644 8.28782 2.91681 8.85293 3.21267 8.53336Z"
            fill="currentColor"
          />
        </svg>
      ),
      onClick: () => setIsPdfReportsOpen(true),
      hasDot: false,
    },
    {
      id: 'analytics',
      label: 'Security Analytics & ML Performance',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
          <path
            d="M11.25 2C11.25 1.58579 11.5858 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 8.99296 2.48564 6.27316 4.47497 4.32299C4.77076 4.03302 5.24561 4.03774 5.53557 4.33353C5.82554 4.62932 5.82082 5.10417 5.52503 5.39414C3.81163 7.07382 2.75 9.41225 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75C11.5858 2.75 11.25 2.41421 11.25 2Z"
            fill="currentColor"
          />
          <path
            d="M11.25 5C11.25 4.58579 11.5858 4.25 12 4.25C16.2802 4.25 19.75 7.71979 19.75 12C19.75 16.2802 16.2802 19.75 12 19.75C7.71979 19.75 4.25 16.2802 4.25 12C4.25 11.5858 4.58579 11.25 5 11.25C5.41421 11.25 5.75 11.5858 5.75 12C5.75 15.4518 8.54822 18.25 12 18.25C15.4518 18.25 18.25 15.4518 18.25 12C18.25 8.54822 15.4518 5.75 12 5.75C11.5858 5.75 11.25 5.41421 11.25 5Z"
            fill="currentColor"
          />
          <path
            d="M12 7.25C11.5858 7.25 11.25 7.58579 11.25 8C11.25 8.41421 11.5858 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C11.5858 15.25 11.25 15.5858 11.25 16C11.25 16.4142 11.5858 16.75 12 16.75C14.6234 16.75 16.75 14.6234 16.75 12C16.75 9.37665 14.6234 7.25 12 7.25Z"
            fill="currentColor"
          />
        </svg>
      ),
      onClick: () => setIsAnalyticsOpen(true),
      hasDot: false,
    },
    {
      id: 'history',
      label: 'Scan Logs',
      lottieData: isDarkMode ? historyAnimData : darkHistoryAnimData,
      lottieRef: historyLottieRef,
      onClick: () => setIsScanLogsOpen(true),
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
      icon: profilePicture ? (
        <img
          src={profilePicture}
          alt={profileName}
          className="w-full h-full rounded-full object-cover shadow-sm border border-white/20"
        />
      ) : (
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
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('phishlens_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('phishlens_theme', 'light');
      }
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  // Refresh ScrollTrigger when messages are added or sidebar expands/collapses
  useEffect(() => {
    ScrollTrigger.refresh();
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 550);
    return () => clearTimeout(timer);
  }, [messages, isExpanded]);

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

  /* Hero entrance: bottom-to-top reveal */
  useLayoutEffect(() => {
    if (hasSentMessage) return;

    const root = heroRef.current;
    const titleEl = heroTitleRef.current;
    const inputWrap = heroInputWrapRef.current;
    const suggestionsEl = heroSuggestionsRef.current;
    const badgeEl = heroBadgeRef.current;
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

      // WelcomeTitle chars handle their entrance at t=0
      gsap.set(titleEl, { opacity: 1, y: 0 });

      if (suggestionsEl) {
        gsap.set(suggestionsEl, { opacity: 0, y: 20 });
      }

      // 2. Timeline: Greeting first -> Input bar -> Chips -> Badge
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      tl.to(inputWrap, { opacity: 1, y: dy, duration: 0.8 }, 0.45);

      if (suggestionsEl) {
        const pills = suggestionsEl.querySelectorAll('.hero-suggestion-card');
        tl.to(suggestionsEl, { opacity: 1, y: 0, duration: 0.5 }, 0.55);
        if (pills.length > 0) {
          gsap.set(pills, { opacity: 0, scale: 0.92 });
          tl.to(pills, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'back.out(1.8)',
          }, 0.6);
        }
      }

      tl.to(badgeEl, { opacity: 1, y: 0, duration: 0.6 }, 0.65);
    }, root);

    return () => ctx.revert();
  }, [hasSentMessage]);

  // ── Reset/Update Unified Input Bar position relative to its hero placeholder ──
  const resetInputPosition = useCallback(() => {
    if (hasSentMessage || !inputPlaceholderRef.current || !inputFormRef.current || !heroInputWrapRef.current) return;
    requestAnimationFrame(() => {
      if (!inputPlaceholderRef.current || !inputFormRef.current || !heroInputWrapRef.current) return;
      const rectPlaceholder = inputPlaceholderRef.current.getBoundingClientRect();
      const currentY = gsap.getProperty(heroInputWrapRef.current, "y") || 0;
      const rectForm = inputFormRef.current.getBoundingClientRect();
      const untranslatedFormTop = rectForm.top - currentY;
      const dy = rectPlaceholder.top - untranslatedFormTop;
      gsap.set(heroInputWrapRef.current, { y: dy });
    });
  }, [hasSentMessage]);

  useEffect(() => {
    resetInputPosition();
    const handleResize = () => {
      resetInputPosition();
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
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
    const isUrl = isValidUrl(query);

    // If it's not a URL and no conversation has started, prompt user
    if (!isUrl && !hasSentMessage && messages.length === 0) {
      addToast({
        type: 'error',
        title: 'Enter Target URL',
        message: 'Please enter a website URL or domain to begin analysis (e.g. google.com).'
      });
      return;
    }

    const isFirst = !hasSentMessage;
    const userMsg = { id: Date.now() + '-user', text: query, isUser: true };
    const botMsgId = Date.now() + '-bot';
    
    let processedUrl = null;
    if (isUrl) {
      processedUrl = query.startsWith('http://') || query.startsWith('https://')
        ? query
        : `https://${query}`;
    }

    const loadingBotMsg = {
      id: botMsgId,
      text: isUrl 
        ? `Scanning URL: ${processedUrl}... Processing DOM structure, lexical attributes, WHOIS details, and visual similarity features. Please wait.`
        : 'PhishLens is analyzing and recalling security context...',
      isUser: false,
      status: 'loading',
      url: processedUrl || undefined
    };

    setMessages((prev) => [...prev, userMsg, loadingBotMsg]);
    setInput('');
    setIsLoading(true);
    if (isUrl) {
      setShowAgentTasks(true);
      setChatTitle(query);
    }

    if (isFirst) {
      // 1. Run the transition timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setHasSentMessage(true);
        }
      });

      // Fade out badge, title, suggestions
      tl.to([heroBadgeRef.current, heroTitleRef.current, heroSuggestionsRef.current].filter(Boolean), {
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
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (isUrl) {
        // Fire real-time notification on scan start
        addToast({
          type: 'info',
          title: 'Analyzing Target Endpoint',
          message: `Multi-agent pipeline scanning ${processedUrl}...`,
          duration: 3200,
        });

        // Execute URL Scan with Short-Term & Long-Term Memory
        const response = await fetch('http://localhost:8000/api/scan/', {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: processedUrl, chat_id: activeChatId || undefined }),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = await response.json();

        // Update URL to /chat/<id> if we created a new session
        if (data.chat_id) {
          setActiveChatId(data.chat_id);
          if (!routeChatId || routeChatId !== data.chat_id) {
            navigate(`/chat/${data.chat_id}`, { replace: true });
          }
        }

        // Extract screenshot URL (supports Base64 data URI and remote URL)
        let resolvedScreenshotUrl = data.screenshot_url || data.screenshot_data || null;
        if (!resolvedScreenshotUrl && data.screenshot_path) {
          if (data.screenshot_path.startsWith('data:image/') || data.screenshot_path.startsWith('http://') || data.screenshot_path.startsWith('https://')) {
            resolvedScreenshotUrl = data.screenshot_path;
          } else {
            const parts = data.screenshot_path.split(/[/\\]/);
            const filename = parts[parts.length - 1];
            resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
          }
        }

        // Extract annotated screenshot (Stage 2 logo-highlighted version)
        const resolvedAnnotatedUrl = data.annotated_screenshot_url || data.annotated_screenshot_data || null;

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
                  annotatedScreenshotUrl: resolvedAnnotatedUrl,
                  urlAnalysisData: data.url_analysis_data,
                  toolTrace: data.tool_trace,
                  overallStatus: data.overall_status,
                  duration: data.total_duration_sec,
                  error: data.error,
                  isLive: true,
                }
              : msg
          )
        );

        // Fire real-time toast & notification
        if (isFailed) {
          addToast({ type: 'error', title: 'Scan Failed', message: data.error || 'Unknown error occurred during analysis.' });
        } else {
          const riskLevel = (data.report?.risk_level || 'Unknown').toUpperCase();
          const riskScore = data.report?.risk_score ?? 0;
          const isPhishing = riskScore >= 61 || riskLevel === 'PHISHING';
          const isSuspicious = !isPhishing && (riskScore >= 41 || riskLevel === 'SUSPICIOUS');
          const toastType = isPhishing ? 'error' : isSuspicious ? 'warning' : 'success';
          const toastTitle = isPhishing
            ? `Threat Detected — ${riskLevel}`
            : isSuspicious
              ? `Suspicious Warning — ${riskLevel}`
              : `Security Verified — ${riskLevel}`;

          addToast({
            type: toastType,
            title: toastTitle,
            message: `${data.target_url || query} • Risk: ${riskScore}% • Duration: ${data.total_duration_sec}s`,
          });
        }
        setApprovalContext({
          targetUrl: data.target_url || processedUrl || query,
          llmResponse: data.report || null,
          chatId: data.chat_id || activeChatId,
          messageId: botMsgId,
          questions: data.hitl_questions || null,
        });
        if (!chatHasFeedback) {
          setShowApprovalCard(true);
        }
        setHistoryRefreshKey((k) => k + 1);
      } else {
        // Execute Conversational Follow-up Message using Short-Term & Long-Term Memory
        const targetChatId = activeChatId || routeChatId || 'temp';
        const response = await fetch(`http://localhost:8000/api/chats/${targetChatId}/message/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: query }),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.chat_id) {
          setActiveChatId(data.chat_id);
          if (!routeChatId || routeChatId !== data.chat_id) {
            navigate(`/chat/${data.chat_id}`, { replace: true });
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: data.reply || 'Analysis updated.',
                  status: data.status === 'error' ? 'failed' : 'completed',
                  duration: data.duration_sec,
                  error: data.error,
                }
              : msg
          )
        );
        setApprovalContext({
          targetUrl: query,
          llmResponse: { text: data.reply },
          chatId: data.chat_id || activeChatId,
          messageId: botMsgId,
          questions: data.hitl_questions || null,
        });
        if (!chatHasFeedback) {
          setShowApprovalCard(true);
        }
        setHistoryRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
              ...msg,
              text: `Request failed: ${err.message}. Make sure Django server is running on http://localhost:8000`,
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
    setShowAgentTasks(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fire real-time notification on scan start
      addToast({
        type: 'info',
        title: 'Analyzing Target Endpoint',
        message: `Multi-agent pipeline scanning ${urlToScan}...`,
        duration: 3200,
      });

      const response = await fetch('http://localhost:8000/api/scan/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: urlToScan, chat_id: activeChatId || undefined }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      let resolvedScreenshotUrl = data.screenshot_url || data.screenshot_data || null;
      if (!resolvedScreenshotUrl && data.screenshot_path) {
        if (data.screenshot_path.startsWith('data:image/') || data.screenshot_path.startsWith('http://') || data.screenshot_path.startsWith('https://')) {
          resolvedScreenshotUrl = data.screenshot_path;
        } else {
          const parts = data.screenshot_path.split(/[/\\]/);
          const filename = parts[parts.length - 1];
          resolvedScreenshotUrl = `http://localhost:8000/media/screenshots/${filename}`;
        }
      }

      // Extract annotated screenshot (Stage 2 logo-highlighted version)
      const resolvedAnnotatedUrl = data.annotated_screenshot_url || data.annotated_screenshot_data || null;

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
              annotatedScreenshotUrl: resolvedAnnotatedUrl,
              urlAnalysisData: data.url_analysis_data,
              toolTrace: data.tool_trace,
              overallStatus: data.overall_status,
              duration: data.total_duration_sec,
              error: data.error,
              isLive: true,
            }
            : msg
        )
      );

      if (isFailed) {
        addToast({ type: 'error', title: 'Scan Failed', message: data.error || 'Unknown error occurred during analysis.' });
      } else {
        const riskLevel = (data.report?.risk_level || 'Unknown').toUpperCase();
        const riskScore = data.report?.risk_score ?? 0;
        const isPhishing = riskScore >= 61 || riskLevel === 'PHISHING';
        const isSuspicious = !isPhishing && (riskScore >= 41 || riskLevel === 'SUSPICIOUS');
        const toastType = isPhishing ? 'error' : isSuspicious ? 'warning' : 'success';
        const toastTitle = isPhishing
          ? `Threat Detected — ${riskLevel}`
          : isSuspicious
            ? `Suspicious Warning — ${riskLevel}`
            : `Security Verified — ${riskLevel}`;

        addToast({
          type: toastType,
          title: toastTitle,
          message: `${data.target_url || urlToScan} • Risk: ${riskScore}% • Duration: ${data.total_duration_sec}s`,
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
    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-gray-200 transition-colors duration-300">
      {/* ── macOS-Style Sidebar Dock (floating, centered left) ── */}
      <SidebarDock
        items={dockTopItems}
        bottomItems={dockBottomItems}
        isDarkMode={isDarkMode}
        activeItemId={null}
        isExpanded={isExpanded}
        onSelectChat={handleSelectChat}
        activeChatId={activeChatId || routeChatId}
        refreshKey={historyRefreshKey}
      />

      {/* Profile Bottom Sheet (positioned absolutely) */}
      <ProfileBottomSheet
        isOpen={showProfilePopup}
        onClose={() => setShowProfilePopup(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        profileName={profileName}
        profileEmail={profileEmail}
        profilePicture={profilePicture}
      />

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-400 relative transition-all duration-500 overflow-hidden"
        style={{
          marginLeft: isExpanded ? '330px' : '0px',
          width: isExpanded ? 'calc(100% - 330px)' : '100%',
          transition: 'margin-left 0.5s cubic-bezier(0.25, 1, 0.5, 1), width 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: 'margin-left, width',
        }}
      >

        {/* ── Persistent floating background orbs ── */}
        <BackgroundOrbs hasSentMessage={hasSentMessage} isDarkMode={isDarkMode} />

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
          className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar relative z-10 bg-white dark:bg-[#1a1a1a] transition-colors duration-300 scroll-smooth flex flex-col"
        >
          <div className="w-full flex-1 flex flex-col min-h-full">

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
                      onClick={() => {
                        setIsTitleMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
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
                          {(msg.status === 'loading' || (msg.status === 'completed' && msg.report)) && msg.url && (
                            <OrchestratorProgress
                              targetUrl={msg.url || 'Target URL'}
                              status={msg.status}
                              duration={msg.duration}
                            />
                          )}
                          {msg.status === 'loading' && !msg.url && (
                            <div className="p-4 rounded-2xl bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 text-sm flex items-center gap-3 shadow-sm max-w-[85%]">
                              <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                              <p>{msg.text || 'PhishLens is analyzing and recalling security context...'}</p>
                            </div>
                          )}
                          {msg.status === 'failed' && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm max-w-[85%] shadow-sm">
                              <AlertCircle size={20} className="shrink-0" />
                              <p>{msg.text}</p>
                            </div>
                          )}
                          {msg.status === 'completed' && msg.report && (
                            <ReportDashboard
                              report={msg.report}
                              duration={msg.duration}
                              screenshotUrl={msg.screenshotUrl}
                              annotatedScreenshotUrl={msg.annotatedScreenshotUrl}
                              toolTrace={msg.toolTrace}
                              urlAnalysisData={msg.urlAnalysisData}
                              url={msg.url}
                              chatId={activeChatId}
                              isLive={Boolean(msg.isLive)}
                            />
                          )}
                          {msg.status === 'completed' && !msg.report && msg.text && (
                            <div className="p-4 rounded-2xl bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700/80 text-gray-800 dark:text-gray-100 text-[14.5px] leading-relaxed shadow-sm max-w-[85%] whitespace-pre-wrap font-inter">
                              {msg.text}
                            </div>
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
                className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 min-h-[calc(100vh-2.5rem)] relative my-auto w-full"
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

                <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center select-none relative my-auto py-4">

                  {/* ── Greeting Title (Renders First with 3D Char Flip & Inline Character Animation) ── */}
                  <h1
                    ref={heroTitleRef}
                    className="relative z-10 text-3xl md:text-5xl font-black tracking-tight mb-6 min-h-[1.2em] w-full font-habibi flex items-center justify-center text-center"
                    aria-label={`Good evening, ${userFirstName}`}
                  >
                    <WelcomeTitle
                      name={userFirstName}
                      isInputFocused={isInputFocused}
                      isTyping={isTyping}
                      isDarkMode={isDarkMode}
                    />
                  </h1>

                  {/* ── Input Placeholder (for floating input bar alignment) ── */}
                  <div className="w-full max-w-2xl relative z-10 mx-auto">
                    <div
                      ref={inputPlaceholderRef}
                      className="w-full h-[58px] mx-auto max-w-2xl opacity-0 pointer-events-none"
                    />
                  </div>

                  {/* ── Suggestion Chips ── */}
                  <div
                    ref={heroSuggestionsRef}
                    className="relative z-10 mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-2.5 w-full max-w-2xl px-4 sm:px-0 mx-auto"
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
            willChange: 'left, width',
            bottom: 0,
          }}
        >
          <div className="max-w-2xl w-full mx-auto relative pointer-events-auto" style={{ zIndex: 1 }}>
            {/* Human-in-the-Loop Feedback Approval Card (Top of Input Bar) */}
            {hasSentMessage && !chatHasFeedback && (
              <ApprovalCard
                isOpen={showApprovalCard}
                onClose={() => setShowApprovalCard(false)}
                onSubmitted={() => {
                  setChatHasFeedback(true);
                }}
                chatId={approvalContext?.chatId || activeChatId || routeChatId}
                messageId={approvalContext?.messageId}
                targetUrl={approvalContext?.targetUrl || (messages.length > 0 ? messages[messages.length - 1]?.url : '')}
                llmResponse={approvalContext?.llmResponse || (messages.length > 0 ? messages[messages.length - 1]?.report || messages[messages.length - 1]?.text : null)}
                questions={approvalContext?.questions}
              />
            )}

            <form
              ref={inputFormRef}
              onSubmit={handleSend}
              className="relative flex items-center shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/80 dark:focus-within:ring-indigo-400/80 transition-all border border-slate-200/90 dark:border-zinc-800/80 bg-white/90 dark:bg-[#1f1f1f]/90 backdrop-blur-xl"
              style={hasSentMessage ? {
                borderRadius: '9999px',
                boxShadow: isDarkMode
                  ? '0 8px 32px 0 rgba(66,46,168,0.22), 0 1.5px 8px 0 rgba(138,43,226,0.12)'
                  : '0 8px 32px 0 rgba(0,0,0,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.04)',
              } : {
                borderRadius: '28px',
                boxShadow: isDarkMode
                  ? '0 12px 40px 0 rgba(66,46,168,0.18), 0 2px 12px 0 rgba(138,43,226,0.12)'
                  : '0 12px 40px 0 rgba(0,0,0,0.07), 0 2px 12px 0 rgba(0,0,0,0.04)',
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
                  className={"w-full bg-transparent py-4 pr-14 outline-none text-[15px] text-gray-800 dark:text-gray-200 placeholder-transparent " + (hasSentMessage ? "pl-5" : "pl-2")}
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

      <ScreenshotsGalleryModal
        isOpen={isScreenshotsOpen}
        onClose={() => setIsScreenshotsOpen(false)}
        isDarkMode={isDarkMode}
      />

      <ScanLogsModal
        isOpen={isScanLogsOpen}
        onClose={() => setIsScanLogsOpen(false)}
        isDarkMode={isDarkMode}
        onSelectChat={handleSelectChat}
      />

      <PDFReportsModal
        isOpen={isPdfReportsOpen}
        onClose={() => setIsPdfReportsOpen(false)}
        isDarkMode={isDarkMode}
        onSelectChat={handleSelectChat}
      />

      <AnalyticsDashboardModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        isDarkMode={isDarkMode}
      />

      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingChat) setIsDeleteModalOpen(false);
        }}
        onConfirm={handleDeleteCurrentChat}
        chatTitle={chatTitle}
        isDeleting={isDeletingChat}
        isDarkMode={isDarkMode}
      />

      {/* Real-time Agent Tasks To-Do list (bottom right) */}
      {showAgentTasks && (
        <RealtimeTodoList 
          isScanning={isLoading}
          status={isLoading ? 'loading' : messages[messages.length - 1]?.status || 'completed'}
          onClose={() => setShowAgentTasks(false)}
        />
      )}
    </div>
  );
}

