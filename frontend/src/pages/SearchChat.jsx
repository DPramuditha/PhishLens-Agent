import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Lottie from 'lottie-react';
import chatAnimData from '../sidebar_images/chat.json';
import darkChatAnimData from '../sidebar_images/dark-chat.json';

export default function SearchChat({ isOpen, onClose, isDarkMode }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy chat history data
  const chatHistory = [
    { id: 1, title: 'Analysis on suspicious email link', date: '2 hours ago' },
    { id: 2, title: 'What is spear phishing?', date: 'Yesterday' },
    { id: 3, title: 'Scan results for domain.com', date: 'May 18, 2026' },
  ];

  const filteredHistory = chatHistory.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClose = () => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.2, ease: 'power2.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        modalRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-center items-center pointer-events-none px-4">
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#2a2a2a]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl flex flex-col pointer-events-auto"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5 text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg> */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>

          <input 
            type="text" 
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-2 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 font-medium text-[15px]"
            autoFocus
          />
          <button 
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 hover:text-red-500 cursor-pointer duration-300 hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Results / History List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredHistory.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {filteredHistory.map((chat) => (
                <li key={chat.id}>
                  <div 
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors text-left group cursor-pointer overflow-hidden relative"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-4 truncate">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300">
                         {/* <Lottie
                            animationData={isDarkMode ? chatAnimData : darkChatAnimData}
                            autoplay={false}
                            loop={false}
                            style={{ width: 20, height: 20 }}
                          /> */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200 truncate pr-4">
                        {chat.title}
                      </span>
                    </div>
                    
                    {/* Right Side: Date AND Actions container */}
                    <div className="relative flex items-center justify-end shrink-0 w-28 h-8 overflow-hidden">
                      {/* Date (Fades out and moves up on hover) */}
                      <span className="absolute right-2 text-xs text-gray-400 whitespace-nowrap group-hover:opacity-0 group-hover:-translate-y-4 transition-all duration-300 ease-in-out">
                        {chat.date}
                      </span>
                      
                      {/* Action Icons (Fade in and move up on hover with staggered delays) */}
                      <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                        <button 
                          className="p-1.5 text-gray-400 hover:text-indigo-500 transition-all duration-300 translate-y-4 group-hover:translate-y-0 group-hover:delay-[50ms] hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Open in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg> */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-arrow-out-up-right-icon lucide-square-arrow-out-up-right"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/></svg>
                        </button>
                        <button 
                          className="p-1.5 text-gray-400 hover:text-emerald-500 transition-all duration-300 translate-y-4 group-hover:translate-y-0 group-hover:delay-[100ms] hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Rename"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg> */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line-icon lucide-pencil-line"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                        </button>
                        <button 
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-all duration-300 translate-y-4 group-hover:translate-y-0 group-hover:delay-[150ms] hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete chat"
                          onClick={(e) => e.stopPropagation()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 px-6 text-center text-gray-500 dark:text-gray-400">
              No chats found. Try a different search term.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
