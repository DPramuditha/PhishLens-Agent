import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Trash2, X, Loader2 } from 'lucide-react';

export default function DeleteChatModal({
  isOpen,
  onClose,
  onConfirm,
  chatTitle = '',
  isDeleting = false,
  isDarkMode = true,
}) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.94,
        opacity: 0,
        y: 8,
        duration: 0.18,
        ease: 'power2.in',
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  }, [isDeleting, onClose]);

  // Entrance & Exit animation
  useEffect(() => {
    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.killTweensOf([overlayRef.current, modalRef.current]);
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
      gsap.fromTo(
        modalRef.current,
        { scale: 0.92, opacity: 0, y: 12 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' }
      );
    }
  }, [isOpen]);

  // Keyboard handler for Escape & Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isDeleting) {
          handleClose();
        }
      } else if (e.key === 'Enter' && !isDeleting) {
        onConfirm?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onConfirm, handleClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none font-inter"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Frosted Glass Backdrop */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 transition-opacity ${
          isDarkMode ? 'bg-black/70 backdrop-blur-md' : 'bg-black/45 backdrop-blur-md'
        }`}
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-sm rounded-3xl p-6 z-10 overflow-hidden backdrop-blur-2xl transition-colors font-inter ${
          isDarkMode
            ? 'bg-[#1e1e24]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-stone-100'
            : 'bg-white/95 border border-gray-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-gray-800'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-chat-title"
      >
        {/* Ambient Red Glow */}
        <div
          className={`absolute -top-16 -left-16 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
            isDarkMode ? 'bg-rose-500/15' : 'bg-rose-500/10'
          }`}
        />

        {/* Header Icon + Close Button */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isDarkMode
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-rose-50 border border-rose-200 text-rose-500 shadow-xs'
            }`}
          >
            <Trash2 className="w-5 h-5" />
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className={`p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'text-stone-400 hover:text-white hover:bg-white/10'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h3
          id="delete-chat-title"
          className={`text-lg font-bold tracking-tight mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Delete Chat Session?
        </h3>

        {/* Optional Chat Title Tag */}
        {chatTitle && (
          <div
            className={`mb-3 px-3 py-2 rounded-xl text-xs font-semibold truncate border ${
              isDarkMode
                ? 'bg-white/[0.04] border-white/10 text-stone-300'
                : 'bg-gray-100/90 border-gray-200 text-gray-700'
            }`}
            title={chatTitle}
          >
            <span className="opacity-60 font-normal mr-1.5">Chat:</span>
            {chatTitle}
          </div>
        )}

        {/* Body Message */}
        <p
          className={`text-xs leading-relaxed mb-6 ${
            isDarkMode ? 'text-stone-400' : 'text-gray-600'
          }`}
        >
          Are you sure you want to delete this scan session? All scan reports, AI threat traces, and messages in this chat will be permanently removed. This action cannot be undone.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-white/[0.06] hover:bg-white/10 border border-white/10 text-stone-300'
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs tracking-wide shadow-[0_4px_16px_rgba(225,29,72,0.35)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Chat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
