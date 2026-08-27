import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import {
  User,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Mail,
  Smartphone,
  CheckCircle2,
  X,
  ChevronLeft,
  Save,
  Camera,
  UploadCloud,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';

const AVATAR_COLORS = [
  'bg-[#C15B2B]',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
];

export default function AccountSettingsSheet({
  isOpen,
  onClose,
  onBack,
  isDarkMode,
  onToggleDarkMode,
  profileName,
  profileEmail,
  profilePicture,
  widthClass = 'w-full max-w-xl',
  heightClass = 'max-h-[82vh]',
  className = '',
}) {
  const { user, updateUserProfile, uploadAvatar, removeAvatar, changeUserPassword } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [selectedColor, setSelectedColor] = useState('bg-[#C15B2B]');

  // Profile Form State
  const [fullName, setFullName] = useState(profileName || user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const sheetRef = useRef(null);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const activeName = fullName || profileName || user?.name || 'User';
  const activeEmail = profileEmail || user?.email || '';
  const profileInitial = activeName.trim().charAt(0).toUpperCase() || 'U';
  const activePicture = avatarPreview || user?.picture || profilePicture || '';

  useEffect(() => {
    if (profileName) setFullName(profileName);
  }, [profileName]);

  useEffect(() => {
    setImageLoadError(false);
  }, [user?.picture, profilePicture, avatarPreview]);


  // Entrance animation
  useEffect(() => {
    if (isOpen && sheetRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        sheetRef.current,
        { y: '100%' },
        { y: '0%', duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // Tab change animation
  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
      );
    }
  }, [activeTab]);

  const handleClose = () => {
    if (sheetRef.current && overlayRef.current) {
      gsap.to(sheetRef.current, { y: '100%', duration: 0.3, ease: 'power3.in' });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so re-selecting the same file triggers onChange
    e.target.value = '';

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      addToast({
        title: 'Invalid File',
        message: 'Please choose a valid JPG, PNG, WEBP, or GIF image.',
        type: 'error',
      });
      return;
    }

    // Validate size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      addToast({
        title: 'File Too Large',
        message: 'Profile picture must be less than 5 MB.',
        type: 'warning',
      });
      return;
    }

    // Create optimistic local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      const result = await uploadAvatar(file);
      if (result.success) {
        addToast({
          title: 'Avatar Updated',
          message: 'Your profile picture has been uploaded and saved.',
          type: 'success',
        });
      } else {
        setAvatarPreview(null);
        addToast({
          title: 'Upload Failed',
          message: result.error || 'Failed to upload profile picture.',
          type: 'error',
        });
      }
    } catch {
      setAvatarPreview(null);
      addToast({
        title: 'Upload Error',
        message: 'An unexpected error occurred during image upload.',
        type: 'error',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    try {
      const result = await removeAvatar();
      if (result.success) {
        setAvatarPreview(null);
        setImageLoadError(false);
        addToast({
          title: 'Avatar Removed',
          message: 'Custom profile picture removed.',
          type: 'info',
        });
      } else {
        addToast({
          title: 'Removal Failed',
          message: result.error || 'Could not remove profile picture.',
          type: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        message: 'An unexpected error occurred while removing picture.',
        type: 'error',
      });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      addToast({
        title: 'Validation Error',
        message: 'Please enter a valid display name.',
        type: 'error',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const result = await updateUserProfile({ name: fullName.trim() });
      if (result.success) {
        addToast({
          title: 'Profile Updated',
          message: 'Your account display name has been saved successfully.',
          type: 'success',
        });
      } else {
        addToast({
          title: 'Update Failed',
          message: result.error || 'Failed to update profile settings.',
          type: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        message: 'An unexpected error occurred while saving profile.',
        type: 'error',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };


  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      addToast({
        title: 'Error',
        message: 'Please enter a new password.',
        type: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({
        title: 'Mismatch',
        message: 'New password and confirmation password do not match.',
        type: 'error',
      });
      return;
    }
    if (strengthScore < 4) {
      addToast({
        title: 'Weak Password',
        message: 'Please fulfill the required password complexity rules.',
        type: 'warning',
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await changeUserPassword({
        currentPassword,
        newPassword,
      });
      if (result.success) {
        addToast({
          title: 'Password Changed',
          message: 'Your security password has been updated successfully.',
          type: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        addToast({
          title: 'Password Update Failed',
          message: result.error || 'Could not update password. Verify current password.',
          type: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        message: 'An unexpected error occurred while updating password.',
        type: 'error',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-end pointer-events-none font-inter"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={handleClose}
      />

      {/* Account Settings Sheet Container */}
      <div
        ref={sheetRef}
        className={`relative ${widthClass} ${heightClass} ${className} bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 mb-0 sm:mb-2 pointer-events-auto flex flex-col gap-4 transform translate-y-full overflow-hidden transition-colors font-inter`}
      >
        {/* Top Grab Handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto shrink-0 mb-1" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 -ml-1 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Back to user settings"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <div className="h-4 w-px bg-gray-300 dark:bg-white/10 mx-0.5" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#C15B2B]" />
                Account Settings
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all duration-200 hover:scale-110 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apple Segmented Navigation Tabs (Profile & Security) */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-white/[0.06] rounded-2xl shrink-0 gap-1 border border-gray-200/50 dark:border-white/5 font-inter">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-250 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#2c2c34] text-[#C15B2B] shadow-sm font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-250 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white dark:bg-[#2c2c34] text-[#C15B2B] shadow-sm font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Security</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable without visible scrollbar) */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto pr-1.5 space-y-4 max-h-[58vh] no-scrollbar font-inter"
        >
          {/* ═══════════ TAB 1: PROFILE ═══════════ */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 font-inter">
              {/* Avatar & Account Banner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.08]">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Avatar Display with Hover Overlay */}
                <div className="relative group shrink-0">
                  <div
                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                    className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden cursor-pointer shadow-md border-2 border-[#C15B2B]/60 group-hover:border-[#C15B2B] transition-all duration-200 group-hover:scale-105"
                    title="Click to upload profile picture"
                  >
                    {activePicture && !imageLoadError ? (
                      <img
                        src={activePicture}
                        alt={activeName}
                        onError={() => setImageLoadError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full ${selectedColor} text-white flex items-center justify-center text-2xl font-bold border-2 border-white/20`}
                      >
                        {profileInitial}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 backdrop-blur-[2px]">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">Change</span>
                    </div>

                    {/* Loading Overlay */}
                    {(isUploadingAvatar || isRemovingAvatar) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white backdrop-blur-sm">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#C15B2B]" />
                      </div>
                    )}
                  </div>

                  {/* Camera Badge Icon */}
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#C15B2B] text-white shadow-md hover:bg-[#aa4e23] hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-[#1e1e24]"
                    title="Upload Photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-start gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate text-left">
                      {fullName || activeName}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Analyst
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-left truncate mt-0.5 select-all">
                    {activeEmail || 'Protected PhishLens Account'}
                  </p>

                  {/* Photo Action Buttons */}
                  <div className="mt-2.5 flex items-center justify-start gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-[#C15B2B]" />
                      <span>{activePicture && !imageLoadError ? 'Replace Photo' : 'Upload Photo'}</span>
                    </button>

                    {activePicture && !imageLoadError && (
                      <button
                        type="button"
                        disabled={isRemovingAvatar || isUploadingAvatar}
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Avatar Theme Color Picker when no picture */}
                  {(!activePicture || imageLoadError) && (
                    <div className="mt-2.5 flex items-center justify-start gap-1.5">
                      <span className="text-[11px] text-gray-400 mr-1">Avatar Theme:</span>
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`w-4.5 h-4.5 rounded-full ${c} transition-transform duration-200 cursor-pointer ${
                            selectedColor === c
                              ? 'scale-125 ring-2 ring-[#C15B2B] ring-offset-2 dark:ring-offset-[#1e1e24]'
                              : 'hover:scale-110 opacity-80'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

              </div>


              {/* Editable Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dimuthu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C15B2B]/70 focus:border-[#C15B2B] transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={activeEmail}
                      disabled
                      className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/5 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed select-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C15B2B] hover:bg-[#aa4e23] active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#C15B2B]/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* ═══════════ TAB 2: SECURITY ═══════════ */}
          {activeTab === 'security' && (
            <div className="space-y-4 font-inter">
              {/* Password Change Form */}
              <form
                onSubmit={handleSavePassword}
                className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.08] space-y-3"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#C15B2B]" />
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Change Password
                    </h4>
                  </div>
                  <span className="text-[10px] text-gray-400">Encrypted</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C15B2B]/70 focus:border-[#C15B2B] text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C15B2B]/70 focus:border-[#C15B2B] text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C15B2B]/70 focus:border-[#C15B2B] text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 dark:text-gray-400">Strength:</span>
                      <span
                        className={`font-semibold ${
                          strengthScore <= 2
                            ? 'text-rose-500'
                            : strengthScore <= 4
                            ? 'text-amber-500'
                            : 'text-[#34C759]'
                        }`}
                      >
                        {strengthScore <= 2 ? 'Weak' : strengthScore <= 4 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 1 ? 'bg-rose-500 flex-1' : 'bg-transparent'
                        }`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 3 ? 'bg-amber-500 flex-1' : 'bg-transparent'
                        }`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 5 ? 'bg-[#34C759] flex-1' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingPassword || !newPassword}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C15B2B] hover:bg-[#aa4e23] active:scale-95 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPassword ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" />
                    )}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>

              {/* 2FA Toggle Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.08]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#C15B2B]/10 text-[#C15B2B] mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Two-Factor Authentication (2FA)
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Extra security layer using one-time verification codes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    addToast({
                      title: !twoFactorEnabled ? '2FA Enabled' : '2FA Disabled',
                      message: !twoFactorEnabled
                        ? 'Two-Factor Authentication active.'
                        : 'Two-Factor Authentication disabled.',
                      type: !twoFactorEnabled ? 'success' : 'warning',
                    });
                  }}
                  className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors cursor-pointer shrink-0 ${
                    twoFactorEnabled ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      twoFactorEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
