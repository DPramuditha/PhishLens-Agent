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
  Moon
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
import chatbotAnimData from '../sidebar_images/AI Spark_ Interactive Assistant.json';

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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const isFirst = !hasSentMessage;
    const newMsg = { text: input, isUser: true };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    if (isFirst) {
      setHasSentMessage(true);
    }

    triggerOrbAnimation();

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: 'I am analyzing the input for phishing threats...', isUser: false },
      ]);
    }, 1000);
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans text-gray-800 dark:text-gray-200">
      {/* Sidebar */}
      <aside 
        className={"bg-gray-50 dark:bg-[#3a3a3a] transition-all duration-300 ease-in-out flex flex-col border-r border-gray-200 dark:border-gray-700 relative " + (isExpanded ? "w-56" : "w-[72px]")}
      >
        <div className={"flex items-center h-14 border-b border-gray-200 dark:border-gray-700 px-4 cursor-pointer " + (isExpanded ? "justify-start" : "justify-center")}>
           {isExpanded ? (
             <div className="flex items-center gap-3 font-bold text-lg text-indigo-600 dark:text-indigo-400">
              <div className="w-13 h-13 shrink-0">
                <Lottie
                  lottieRef={chatbotLottieRef}
                  animationData={chatbotAnimData}
                  autoplay={true}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
               <span className="truncate">PhishLens</span>
             </div>
           ) : (
            //  <ShieldAlert size={28} className="text-indigo-400 shrink-0" />
            <div className="w-12 h-12 shrink-0">
              <Lottie
                lottieRef={chatbotLottieRef}
                animationData={chatbotAnimData}
                autoplay={true}
                loop={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
           )}
        </div>

        <nav className="flex-1 py-2 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-2">
          <button className={"w-full flex items-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 " + (isExpanded ? "p-2" : "p-2 justify-center")}>
            <div className="w-6 flex justify-center shrink-0 hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-[#48484A] dark:text-gray-200">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                </svg>

            </div>
            <span className={"ml-4 whitespace-nowrap truncate transition-all duration-300 font-bold text-gray-700 dark:text-white text-sm hover:scale-105 " + (isExpanded ? "opacity-100" : "opacity-0 hidden")}>New Scan</span>
          </button>

          <button 
            onClick={() => setIsSearchOpen(true)}
            className={"w-full flex items-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 " + (isExpanded ? "p-2" : "p-2 justify-center")}
            onMouseEnter={() => searchLottieRef.current?.play()}
            onMouseLeave={() => searchLottieRef.current?.stop()}
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
            <span className={"ml-4 whitespace-nowrap truncate transition-all duration-300 font-bold text-gray-700 dark:text-white hover:scale-105 text-sm " + (isExpanded ? "opacity-100" : "opacity-0 hidden")}>Search</span>
          </button>

          {/* <div className="my-2 border-t border-gray-200 dark:border-gray-700 mx-2 shrink-0"></div> */}

          <button 
            className={"w-full flex items-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 " + (isExpanded ? "p-2" : "p-2 justify-center")}
            onMouseEnter={() => chatLottieRef.current?.play()}
            onMouseLeave={() => chatLottieRef.current?.stop()}
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
            <span className={"ml-4 whitespace-nowrap truncate transition-all duration-300 font-bold text-gray-700 dark:text-white hover:scale-105 text-sm " + (isExpanded ? "opacity-100" : "opacity-0 hidden")}>Chat</span>
          </button>

          <button 
            className={"w-full flex items-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left shrink-0 cursor-pointer min-w-0 " + (isExpanded ? "p-2" : "p-2 justify-center")}
            onMouseEnter={() => historyLottieRef.current?.play()}
            onMouseLeave={() => historyLottieRef.current?.stop()}
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
            <span className={"ml-4 whitespace-nowrap truncate transition-all duration-300 font-bold text-gray-700 dark:text-white hover:scale-105 text-sm " + (isExpanded ? "opacity-100" : "opacity-0 hidden")}>Chat History</span>
          </button>
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 relative">
          {/* Sidebar Toggle Button on the Border near Profile */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="absolute -top-1/30 -translate-y-1/2 -right-3.5 w-7 h-7 bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer z-50 hover:scale-110 shadow-sm transition-all duration-300"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? (
              // <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-icon lucide-chevrons-left"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
            ) : (
              // <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-right-icon lucide-chevrons-right"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>
            )}
          </button>
          
          <button 
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            className={"w-full flex items-center rounded-xl hover:scale-105 transition-all cursor-pointer duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-left shrink-0 relative min-w-0 " + (isExpanded ? "p-3" : "p-3 justify-center")}
          >
            <div className="w-6 flex justify-center shrink-0">
              <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold aspect-square hover:scale-105 transition-all duration-300">
                {profileInitial}
              </div>
            </div>
            <div className={"ml-4 transition-opacity duration-300 min-w-0 " + (isExpanded ? "opacity-100" : "opacity-0 hidden")}>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{profileName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profileEmail}</p>
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
          <div className="font-semibold text-lg text-gray-700 dark:text-gray-300">New Chat</div>
        </header>

        {/* Messages area — only visible after first message */}
        {hasSentMessage && (
          <section
            className="flex-1 overflow-y-auto px-4 pb-36 md:px-12 w-full max-w-4xl mx-auto flex flex-col gap-6 pt-4"
            style={{ position: 'relative', zIndex: 10 }}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={"flex w-full " + (msg.isUser ? "justify-end" : "justify-start")}>
                <div className={"max-w-[85%] sm:max-w-[70%] px-5 py-3.5 text-[15px] leading-relaxed " + (msg.isUser ? "bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 rounded-3xl rounded-tr-sm" : "text-gray-700 dark:text-gray-200")}>
                  {msg.text}
                </div>
              </div>
            ))}
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

        {/*
          Input bar wrapper.
          • Before first message: flex-col centering pushes it below the hero, centred vertically
            in the lower portion of the screen (not absolute, so it participates in flex flow).
          • After first message: absolute-positioned at the bottom with a gradient fade.
          The GSAP animation on `inputBarRef` animates it into place on state change.
        */}
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

          <div className="max-w-3xl w-full mx-auto relative" style={{ zIndex: 1 }}>
            <form
              onSubmit={handleSend}
              className="relative flex items-center shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400 transition-all rounded-2xl bg-white/60 dark:bg-[#2f2f2f]/70 backdrop-blur-2xl border border-white/40 dark:border-gray-600/60"
              style={{
                boxShadow: '0 8px 32px 0 rgba(66,46,168,0.18), 0 1.5px 8px 0 rgba(138,43,226,0.10)',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message PhishLens AI..."
                className="w-full bg-transparent py-4 pl-5 pr-14 outline-none text-[15px] text-gray-700 dark:text-gray-200 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={"absolute right-3 p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 duration-500 " + (input.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-black dark:hover:bg-gray-200" : "bg-gray-300 text-gray-500 dark:bg-[#424242] dark:text-gray-500")}
              >
                {/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg> */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
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
