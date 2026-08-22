import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { LogOut, X, ChevronRight, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';
import AccountSettingsSheet from './AccountSettingsSheet';

export default function ProfileBottomSheet({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  profileName,
  profileEmail,
  profilePicture,
  settingsWidthClass = 'w-full max-w-xl',
  settingsHeightClass = 'max-h-[82vh]',
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { addToast } = useToast();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const sheetRef = useRef(null);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  const profileInitial = profileName?.trim().charAt(0).toUpperCase() ?? 'U';

  // Open animation for main profile sheet
  useEffect(() => {
    if (isOpen && !showAccountSettings && sheetRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(sheetRef.current, { y: '100%' }, { y: '0%', duration: 0.4, ease: 'power3.out' });
    }
  }, [isOpen, showAccountSettings]);

  // Reset internal states on open/close
  useEffect(() => {
    if (!isOpen) {
      setShowAccountSettings(false);
      setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  // Animate confirmation modal when opened
  useEffect(() => {
    if (showLogoutConfirm && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0, y: 15 },
        { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' }
      );
    }
  }, [showLogoutConfirm]);

  const handleClose = () => {
    setShowLogoutConfirm(false);
    setShowAccountSettings(false);
    if (sheetRef.current && overlayRef.current) {
      gsap.to(sheetRef.current, { y: '100%', duration: 0.3, ease: 'power3.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power3.in', onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleConfirmLogout = () => {
    logout();
    addToast({
      title: 'Logged Out',
      message: 'You have safely ended your security session.',
      type: 'info',
    });
    setShowLogoutConfirm(false);
    handleClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  // If user clicked "Account Settings", render the Account Settings Bottom Sheet
  if (showAccountSettings) {
    return (
      <AccountSettingsSheet
        isOpen={true}
        onClose={handleClose}
        onBack={() => setShowAccountSettings(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        profileName={profileName}
        profileEmail={profileEmail}
        profilePicture={profilePicture}
        widthClass={settingsWidthClass}
        heightClass={settingsHeightClass}
      />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex justify-center items-end pointer-events-none font-inter"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Backdrop */}
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={handleClose}
        />

        {/* Profile Sheet */}
        <div
          ref={sheetRef}
          className="relative w-full max-w-sm bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 mb-0 sm:mb-2 pointer-events-auto flex flex-col gap-4 transform translate-y-full overflow-hidden transition-colors font-inter"
        >
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto shrink-0 mb-1" />

          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              User Settings
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full transition-colors cursor-pointer group hover:bg-gray-100 dark:hover:bg-white/10 duration-200 hover:scale-110"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>

          {/* Avatar + info */}
          <div className="flex items-center gap-4 py-2">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={profileName}
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 border-2 border-[#C15B2B]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#C15B2B] text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0 border-2 border-white/20">
                {profileInitial}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {profileName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{profileEmail}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-full mt-1.5">
                Active Session
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200/80 dark:border-white/10" />

          {/* Action rows */}
          <div className="flex flex-col gap-2">
            {/* Account Settings Button */}
            <button
              type="button"
              onClick={() => setShowAccountSettings(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors text-gray-700 dark:text-gray-200 text-left rounded-xl cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[#C15B2B] group-hover:scale-110 transition-transform">
                  <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
                  <path fillRule="evenodd" d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Account Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors text-gray-700 dark:text-gray-200 text-left rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[#C15B2B]">
                    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[#C15B2B]">
                    <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
                  </svg>
                )}
                <span className="font-semibold text-sm">Dark Theme</span>
              </div>
              <div className={"w-11 h-6 rounded-full flex items-center p-0.5 transition-colors " + (isDarkMode ? "bg-[#34C759]" : "bg-gray-300 dark:bg-gray-600")}>
                <div className={"w-5 h-5 bg-white rounded-full transition-transform " + (isDarkMode ? "translate-x-5" : "")} />
              </div>
            </button>
          </div>

          <div className="border-t border-gray-200/80 dark:border-white/10" />

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500 text-left rounded-xl cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Log out</span>
          </button>
        </div>
      </div>

      {/* ====== LOGOUT CONFIRMATION POPUP MODAL ====== */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-inter"
          style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          {/* Frosted Backdrop */}
          <div
            className={`absolute inset-0 transition-opacity ${
              isDarkMode ? 'bg-black/70 backdrop-blur-md' : 'bg-black/40 backdrop-blur-md'
            }`}
            onClick={() => setShowLogoutConfirm(false)}
          />

          {/* Modal Dialog Card */}
          <div
            ref={modalRef}
            className={`relative w-full max-w-sm rounded-3xl p-6 z-10 select-none overflow-hidden backdrop-blur-2xl transition-colors font-inter ${
              isDarkMode
                ? 'bg-[#1e1e24]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-stone-100'
                : 'bg-white/95 border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-gray-800'
            }`}
          >
            {/* Ambient Red Glow */}
            <div
              className={`absolute -top-16 -left-16 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                isDarkMode ? 'bg-red-500/15' : 'bg-red-500/10'
              }`}
            />

            {/* Header Icon */}
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    : 'bg-red-50 border border-red-100 text-red-500 shadow-sm'
                }`}
              >
                <LogOut className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'text-stone-400 hover:text-white hover:bg-white/10'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <h3
              className={`text-xl font-bold tracking-tight mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Log out of PhishLens?
            </h3>
            <p
              className={`text-sm leading-relaxed mb-6 ${
                isDarkMode ? 'text-stone-400' : 'text-gray-600'
              }`}
            >
              You will need to sign in again to access your security scans and active chat investigations.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/[0.06] hover:bg-white/10 border border-white/10 text-stone-300'
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-[0_4px_16px_rgba(220,38,38,0.4)] transition-all active:scale-95 cursor-pointer"
              >
                Yes, Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
