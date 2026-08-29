import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import DeleteChatModal from '../components/DeleteChatModal';

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
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleClose = useCallback(() => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.2, ease: 'power2.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  }, [onClose]);

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

  const handleRequestDelete = (e, chat) => {
    e.stopPropagation();
    setChatToDelete(chat);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    setIsDeleting(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/chats/${chatToDelete.id}/`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        const deletedId = chatToDelete.id;
        setChatHistory((prev) => prev.filter((c) => c.id !== deletedId));
        addToast({ type: 'success', title: 'Deleted', message: 'Chat session removed.' });
        if (window.location.pathname === `/chat/${deletedId}`) {
          handleClose();
          navigate('/chat');
        }
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    } finally {
      setIsDeleting(false);
      setChatToDelete(null);
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
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex justify-center items-center pointer-events-none px-4 history-scope font-inter"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#2a2a2a]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl flex flex-col pointer-events-auto overflow-hidden history-scope font-inter"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
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
        <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
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
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="size-4.5">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M11 2.75C6.44365 2.75 2.75 6.44365 2.75 11C2.75 15.5563 6.44365 19.25 11 19.25C15.5563 19.25 19.25 15.5563 19.25 11C19.25 6.44365 15.5563 2.75 11 2.75ZM1.25 11C1.25 5.61522 5.61522 1.25 11 1.25C16.3848 1.25 20.75 5.61522 20.75 11C20.75 16.3848 16.3848 20.75 11 20.75C5.61522 20.75 1.25 16.3848 1.25 11ZM8.04893 7.68594C8.73546 6.81164 9.80214 6.25 11 6.25C12.1979 6.25 13.2645 6.81164 13.9511 7.68594L14.6646 7.32918C15.0351 7.14394 15.4856 7.29411 15.6708 7.66459C15.8561 8.03507 15.7059 8.48558 15.3354 8.67082L14.6226 9.02723C14.7057 9.33746 14.75 9.66356 14.75 10V10.25H15.5C15.9142 10.25 16.25 10.5858 16.25 11C16.25 11.4142 15.9142 11.75 15.5 11.75H14.75V12C14.75 12.3364 14.7057 12.6625 14.6226 12.9728L15.3354 13.3292C15.7059 13.5144 15.8561 13.9649 15.6708 14.3354C15.4856 14.7059 15.0351 14.8561 14.6646 14.6708L13.9511 14.3141C13.2645 15.1884 12.1979 15.75 11 15.75C9.80214 15.75 8.73546 15.1884 8.04893 14.3141L7.33541 14.6708C6.96493 14.8561 6.51442 14.7059 6.32918 14.3354C6.14394 13.9649 6.29411 13.5144 6.66459 13.3292L7.3774 12.9728C7.29431 12.6625 7.25 12.3364 7.25 12V11.75H6.5C6.08579 11.75 5.75 11.4142 5.75 11C5.75 10.5858 6.08579 10.25 6.5 10.25H7.25V10C7.25 9.66356 7.29431 9.33746 7.3774 9.02723L6.66459 8.67082C6.29411 8.48558 6.14394 8.03507 6.32918 7.66459C6.51442 7.29411 6.96493 7.14394 7.33541 7.32918L8.04893 7.68594ZM8.75 10.75V12C8.75 12.9797 9.37611 13.8131 10.25 14.122V10.75H8.75ZM11.75 10.75V14.122C12.6239 13.8131 13.25 12.9797 13.25 12V10.75H11.75ZM13.122 9.25H8.87803C9.18691 8.37611 10.0203 7.75 11 7.75C11.9797 7.75 12.8131 8.37611 13.122 9.25ZM20.1579 19.7511C19.9264 19.7335 19.7335 19.9264 19.7511 20.1579C19.7514 20.1592 19.7553 20.1848 19.7746 20.2573C19.7974 20.3424 19.8312 20.4554 19.8828 20.6277C19.9301 20.7857 19.9609 20.8881 19.9862 20.9641C20.0121 21.0419 20.021 21.0568 20.0171 21.0496C20.1225 21.2465 20.3745 21.31 20.5607 21.1867C20.5538 21.1912 20.5688 21.1824 20.6284 21.1261C20.6868 21.0712 20.7624 20.9957 20.8791 20.8791C20.9957 20.7624 21.0712 20.6868 21.1261 20.6284C21.1727 20.579 21.1868 20.5602 21.1877 20.5592C21.3093 20.3736 21.2463 20.1236 21.0511 20.018C21.0499 20.0175 21.0287 20.0077 20.9641 19.9862C20.8881 19.9609 20.7857 19.9301 20.6277 19.8828C20.4554 19.8312 20.3424 19.7974 20.2573 19.7746C20.1848 19.7553 20.1591 19.7514 20.1579 19.7511ZM18.2564 20.2833C18.1612 19.1267 19.1267 18.1612 20.2833 18.2564C20.4833 18.2728 20.7251 18.3457 20.9862 18.4242C21.0101 18.4314 21.0341 18.4387 21.0583 18.4459C21.0801 18.4524 21.1018 18.4589 21.1234 18.4654C21.3632 18.5369 21.5881 18.604 21.7576 18.6948C22.7335 19.2173 23.0485 20.4659 22.4373 21.3889C22.3312 21.5492 22.165 21.715 21.9878 21.8917C21.9719 21.9076 21.9558 21.9236 21.9397 21.9397C21.9236 21.9558 21.9076 21.9719 21.8917 21.9878C21.7149 22.165 21.5492 22.3312 21.3889 22.4373C20.4659 23.0485 19.2173 22.7335 18.6948 21.7576C18.604 21.5881 18.5369 21.3632 18.4654 21.1234C18.4589 21.1018 18.4524 21.0801 18.4459 21.0583C18.4387 21.0341 18.4314 21.0101 18.4242 20.9862C18.3457 20.7252 18.2728 20.4833 18.2564 20.2833Z"
                              fill="currentColor"
                            />
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
                            onClick={(e) => handleRequestDelete(e, chat)}
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

      {/* Delete Confirmation Popup Modal */}
      <DeleteChatModal
        isOpen={Boolean(chatToDelete)}
        onClose={() => {
          if (!isDeleting) setChatToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        chatTitle={chatToDelete?.title || ''}
        isDeleting={isDeleting}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
