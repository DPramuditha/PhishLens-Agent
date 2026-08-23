import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function SearchChat({ isOpen, onClose, isDarkMode }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Fetch chats from PostgreSQL API
  const fetchChats = useCallback(async (query = '') => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/?q=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchChats(searchQuery);
    }
  }, [isOpen, searchQuery, fetchChats]);

  const handleClose = () => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.2, ease: 'power2.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleSelectChat = (chatId) => {
    handleClose();
    navigate(`/chat/${chatId}`);
  };

  const handleStartRename = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = async (e, chatId) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/${chatId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      if (res.ok) {
        setChatHistory((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: editTitle.trim() } : c))
        );
        addToast({ type: 'success', title: 'Renamed', message: 'Chat title updated.' });
      }
    } catch (err) {
      console.error('Error renaming chat:', err);
    } finally {
      setEditingChatId(null);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/${chatId}/`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
        addToast({ type: 'success', title: 'Deleted', message: 'Chat session removed.' });
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
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
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#2a2a2a]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl flex flex-col pointer-events-auto overflow-hidden"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>

          <input 
            type="text" 
            placeholder="Search scans and chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-2 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 font-medium text-[15px]"
            autoFocus
          />

          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 hover:text-red-500 cursor-pointer duration-200 hover:scale-105"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Results / History List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-12 px-6 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              Loading chat sessions...
            </div>
          ) : chatHistory.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {chatHistory.map((chat) => {
                const isEditing = editingChatId === chat.id;
                const riskLevel = chat.last_message?.risk_level;
                const riskScore = chat.last_message?.risk_score;

                let badgeColor = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                if (riskScore !== null && riskScore !== undefined) {
                  if (riskScore >= 61) badgeColor = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/40';
                  else if (riskScore >= 41) badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40';
                  else badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
                }

                return (
                  <li key={chat.id}>
                    <div 
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors text-left group cursor-pointer overflow-hidden relative"
                      role="button"
                      tabIndex={0}
                      onClick={() => !isEditing && handleSelectChat(chat.id)}
                    >
                      <div className="flex items-center gap-3.5 truncate flex-1 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                          </svg>
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(e, chat.id);
                              if (e.key === 'Escape') setEditingChatId(null);
                            }}
                            onBlur={(e) => handleSaveRename(e, chat.id)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="bg-white dark:bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-sm text-gray-900 dark:text-white outline-none w-full"
                          />
                        ) : (
                          <div className="flex flex-col min-w-0 truncate">
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate text-[14px]">
                              {chat.title}
                            </span>
                            {chat.last_message?.target_url && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                {chat.last_message.target_url}
                              </span>
                            )}
                          </div>
                        )}

                        {riskLevel && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 shrink-0 ${badgeColor}`}>
                            {riskLevel} {riskScore !== null ? `(${riskScore}%)` : ''}
                          </span>
                        )}
                      </div>
                      
                      {/* Right Side: Date AND Actions */}
                      <div className="relative flex items-center justify-end shrink-0 w-28 h-8 overflow-hidden">
                        <span className="absolute right-2 text-xs text-gray-400 whitespace-nowrap group-hover:opacity-0 group-hover:-translate-y-4 transition-all duration-300 ease-in-out">
                          {formatRelativeTime(chat.updated_at || chat.created_at)}
                        </span>
                        
                        <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <button 
                            className="p-1.5 text-gray-400 hover:text-indigo-500 transition-all duration-200 translate-y-4 group-hover:translate-y-0 hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                            title="Open scan session"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectChat(chat.id);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>
                              <path d="m21 3-9 9"/>
                              <path d="M15 3h6v6"/>
                            </svg>
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-emerald-500 transition-all duration-200 translate-y-4 group-hover:translate-y-0 hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                            title="Rename"
                            onClick={(e) => handleStartRename(e, chat)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 21h8"/>
                              <path d="m15 5 4 4"/>
                              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                            </svg>
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-all duration-200 translate-y-4 group-hover:translate-y-0 hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-600/50"
                            title="Delete chat"
                            onClick={(e) => handleDeleteChat(e, chat.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-12 px-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery ? `No chats found matching "${searchQuery}".` : 'No previous scan sessions found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
