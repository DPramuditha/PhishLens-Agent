import { useState, useRef, useEffect } from 'react';
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

export default function HomePage() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const profileName = 'Dimuthu Pramuditha';
  const profileEmail = 'dimuthu@example.com';
  const profileInitial = profileName.trim().charAt(0).toUpperCase();

  const chatLottieRef = useRef(null);
  const searchLottieRef = useRef(null);
  const historyLottieRef = useRef(null);
  const chatbotLottieRef = useRef(null);

  const bottomSheetRef = useRef(null);
  const overlayRef = useRef(null);

  const closeBottomSheet = () => {
    if (bottomSheetRef.current && overlayRef.current) {
      gsap.to(bottomSheetRef.current, { y: '100%', duration: 0.3, ease: 'power3.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power3.in', onComplete: () => setShowProfilePopup(false) });
    } else {
      setShowProfilePopup(false);
    }
  };

  useEffect(() => {
    if (showProfilePopup && bottomSheetRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        bottomSheetRef.current,
        { y: '100%' },
        { y: '0%', duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [showProfilePopup]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message
    const newMsg = { text: input, isUser: true };
    setMessages([...messages, newMsg]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "I am analyzing the input for phishing threats...", 
        isUser: false 
      }]);
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

          {/* Bottom Sheet Profile Popup */}
          {showProfilePopup && (
            <div className="fixed inset-0 z-[100] flex justify-center items-end pointer-events-none">
              <div 
                ref={overlayRef}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={closeBottomSheet}
              />
              
              <div 
                ref={bottomSheetRef}
                className="relative w-full max-w-sm bg-white/95 dark:bg-[#2a2a2a]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-3xl p-6 mb-2 pointer-events-auto flex flex-col gap-4 transform translate-y-full"
              >
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2" />
                
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">User Settings</h2>
                  <button 
                    onClick={closeBottomSheet}
                    className="p-2 rounded-full transition-colors cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 duration-300 hover:scale-110"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-gray-500 dark:text-gray-400 group-hover:hidden transition-all duration-300 hover:scale-110">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-red-500 hidden group-hover:block transition-all duration-300 hover:scale-110">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Profile Details */}
                <div className="flex items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                    {profileInitial}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{profileName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profileEmail}</p>
                    <button className="text-sm text-indigo-500 mt-1 hover:underline cursor-pointer">Edit Profile</button>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />
                
                {/* Settings & Theme */}
                <div className="flex flex-col gap-2">
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 text-left rounded-xl cursor-pointer">
                    {/* <Settings size={20} /> */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                      <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
                      <path fill-rule="evenodd" d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z" clip-rule="evenodd" />
                    </svg>
                    <span className="font-medium">Account Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                        setIsDarkMode(!isDarkMode);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 text-left rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isDarkMode ? 
                      // <Moon size={20} />
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                        <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd" />
                      </svg>
                       : 
                      //  <Sun size={20} />
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                        <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
                      </svg>

                       }
                      <span className="font-medium">Dark Theme</span>
                    </div>
                    <div className={"w-11 h-6 rounded-full flex items-center p-1 transition-colors " + (isDarkMode ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600")}>
                      <div className={"w-4 h-4 bg-white rounded-full transition-transform " + (isDarkMode ? "translate-x-5" : "")} />
                    </div>
                  </button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />

                {/* Logout */}
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500 text-left rounded-xl cursor-pointer"
                >
                  {/* <LogOut size={20} /> */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                    <path fill-rule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                  </svg>
                  <span className="font-medium">Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#212121] text-slate-700 dark:text-slate-400 relative transition-colors duration-300">
        <header className="h-16 flex items-center justify-between px-6">
          <div className="font-semibold text-lg text-gray-700 dark:text-gray-300">New Chat</div>
        </header>

        <section className="flex-1 overflow-y-auto px-4 pb-24 md:px-12 w-full max-w-4xl mx-auto flex flex-col gap-6 pt-8">
          {messages.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500 -mt-16">
               {/* <ShieldAlert size={56} className="mb-6 text-indigo-500 dark:text-indigo-400" /> */}
                <div className="w-50 h-50 shrink-0">
                <Lottie
                  lottieRef={chatbotLottieRef}
                  animationData={chatbotAnimData}
                  autoplay={true}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
               <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">How can I assist your security?</h1>
               <p className="text-sm text-gray-500 dark:text-gray-400">Paste a suspicious URL, email snippet, or ask about phishing trends.</p>
             </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={"flex w-full " + (msg.isUser ? "justify-end" : "justify-start")}>
                <div className={"max-w-[85%] sm:max-w-[70%] px-5 py-3.5 text-[15px] leading-relaxed " + (msg.isUser ? "bg-gray-200 dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 rounded-3xl rounded-tr-sm" : "text-gray-700 dark:text-gray-200")}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </section>

        <footer className="absolute bottom-0 left-0 w-full pt-12 pb-6 px-4 md:px-12 bg-gradient-to-t from-white via-white dark:from-[#212121] dark:via-[#212121] to-transparent">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend} className="relative flex items-center shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400 transition-all rounded-2xl bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-600">
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
                className={"absolute right-3 p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer " + (input.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-black dark:hover:bg-gray-200" : "bg-gray-300 text-gray-500 dark:bg-[#424242] dark:text-gray-500")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </form>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2.5">
              PhishLens can make mistakes. Verify important security warnings.
            </p>
          </div>
        </footer>
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
