import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import gsap from 'gsap';
import { ShieldCheck, Mail, User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import registerSideImage from '../assets/register-side-image.png';

const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithGoogle, registerWithEmail } = useAuth();
  const { addToast } = useToast();

  /* refs */
  const pageRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const headingRef = useRef(null);
  const formRef = useRef(null);
  const imageRef = useRef(null);
  const inputRef = useRef(null);

  /* state */
  const [step, setStep] = useState(1); // 1: Name, 2: Email, 3: Password
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to /chat
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/chat';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  /* ── GSAP entrance animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out' },
      );

      gsap.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.25 },
      );

      gsap.fromTo(
        formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.5 },
      );

      gsap.fromTo(
        rightRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 },
      );

      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { opacity: 0, scale: 1.03 },
          { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out', delay: 0.4 },
        );
      }
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Focus input on step change & animate input field
  useEffect(() => {
    setErrorMsg('');
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [step]);

  /* ── Google OAuth login hook ── */
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSubmitting(true);
      try {
        const result = await loginWithGoogle(null, tokenResponse.access_token);
        if (result.success) {
          addToast({
            title: 'Welcome to PhishLens',
            message: `Signed in as ${result.user?.name || result.user?.email}`,
            type: 'success',
          });

          const destination = location.state?.from?.pathname || '/chat';
          gsap.to(formRef.current, {
            scale: 0.96,
            opacity: 0,
            duration: 0.35,
            onComplete: () => navigate(destination, { replace: true }),
          });
        } else {
          addToast({
            title: 'Authentication Error',
            message: result.error || 'Could not verify Google credentials.',
            type: 'error',
          });
        }
      } catch (err) {
        addToast({
          title: 'Sign In Failed',
          message: err.message || 'Unexpected authentication failure.',
          type: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      console.error('Google Sign In Error:', error);
      addToast({
        title: 'Google Sign In',
        message: 'Google login popup closed or was cancelled.',
        type: 'error',
      });
      setIsSubmitting(false);
    },
  });

  const handleGoogleClick = () => {
    if (isSubmitting) return;
    triggerGoogleLogin();
  };

  /* ── Step-by-Step Progressive Handler ── */
  const handleStepSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (step === 1) {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMsg('Please enter your full name (at least 2 characters).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setErrorMsg('Please enter a valid email address (e.g. name@company.com).');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      handleFinalRegister();
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleFinalRegister = async () => {
    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMsg('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setErrorMsg('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMsg('Password must contain at least one number (0-9).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      setErrorMsg('Password must contain at least one special character (!@#$%).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await registerWithEmail({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        addToast({
          title: 'Account Created',
          message: `Welcome to PhishLens, ${result.user?.name || name}!`,
          type: 'success',
        });

        gsap.to(formRef.current, {
          scale: 0.96,
          opacity: 0,
          duration: 0.35,
          onComplete: () => navigate('/chat', { replace: true }),
        });
      } else {
        setErrorMsg(result.error || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstName = name.trim().split(' ')[0] || 'there';

  return (
    <div ref={pageRef} className="flex h-screen min-h-screen w-full max-w-full font-[Cabin,system-ui,sans-serif] overflow-hidden">

      {/* ====== LEFT PANEL ====== */}
      <div
        ref={leftRef}
        className="w-full md:w-1/2 min-w-0 h-full relative flex items-center justify-center bg-[#1a1a1a] px-6 sm:px-8 py-4 sm:py-6 overflow-hidden select-none shrink-0"
      >
        {/* floating gradient orbs */}
        <div
          className="absolute w-[420px] h-[420px] rounded-full bg-[#7c3aed] opacity-[0.22] blur-[100px] pointer-events-none -top-[120px] -left-[80px]"
          style={{ animation: 'login-float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[340px] h-[340px] rounded-full bg-[#a855f7] opacity-[0.22] blur-[100px] pointer-events-none -bottom-[100px] -right-[60px]"
          style={{ animation: 'login-float-reverse 10s ease-in-out infinite' }}
        />

        <div className="relative z-[2] w-full max-w-[420px]">
          {/* heading */}
          <div ref={headingRef} className="mb-4 sm:mb-6">
            <h1 className="font-[Habibi,Georgia,'Times_New_Roman',serif] font-normal text-[clamp(28px,3.5vw,42px)] leading-[1.15] text-stone-100 m-0 mb-2 sm:mb-3 tracking-tight">
              Create account,<br />
              protect faster
            </h1>
            <p className="text-sm sm:text-[15px] text-stone-400 m-0 tracking-wide">
              {step === 1 && 'AI-powered phishing detection with '}
              {step === 2 && `Step 2: Enter email for `}
              {step === 3 && `Step 3: Secure account for `}
              <span className="text-purple-400 font-semibold">
                {step === 1 ? 'PhishLens' : step === 2 ? firstName : email}
              </span>
            </p>
          </div>

          {/* form card */}
          <div
            ref={formRef}
            className="bg-white/[0.04] border border-white/[0.08] rounded-[20px] px-6 py-5 sm:px-7 sm:py-6 backdrop-blur-[12px]"
          >
            {/* Google button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleClick}
              className={`w-full flex items-center justify-center gap-2.5 bg-white/[0.06] text-stone-200 border border-white/[0.12] rounded-xl font-[inherit] text-[15px] font-semibold cursor-pointer transition-all duration-250 py-2.5 px-4 hover:bg-white/10 hover:border-white/20 hover:-translate-y-px ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting && !password ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connecting to Google...
                </span>
              ) : (
                <>
                  <svg className="shrink-0" viewBox="0 0 24 24" width="20" height="20">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0 0 12 23Z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.35-2.09V7.07H2.18A10.998 10.998 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.94 10.94 0 0 0 12 1 10.998 10.998 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* divider */}
            <div className="flex items-center my-3.5 sm:my-4 gap-3.5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs font-semibold text-stone-500 tracking-widest">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Step Indicators Bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-purple-400">
                Step {step} of 3
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => s < step && setStep(s)}
                    disabled={s > step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      s === step
                        ? 'w-6 bg-purple-400'
                        : s < step
                        ? 'w-2 bg-emerald-400 cursor-pointer'
                        : 'w-2 bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step-by-Step Adaptive Input Form */}
            <form onSubmit={handleStepSubmit} className="space-y-3">
              {/* STEP 1: Full Name */}
              {step === 1 && (
                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2.5 px-4 pl-[42px] bg-white/5 border border-white/10 rounded-xl text-stone-200 font-[inherit] text-[15px] outline-none transition-all duration-250 placeholder:text-stone-500 focus:border-purple-400 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(192,132,252,0.12)] box-border"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              {/* STEP 2: Email Address */}
              {step === 2 && (
                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 px-4 pl-[42px] bg-white/5 border border-white/10 rounded-xl text-stone-200 font-[inherit] text-[15px] outline-none transition-all duration-250 placeholder:text-stone-500 focus:border-purple-400 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(192,132,252,0.12)] box-border"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              )}

              {/* STEP 3: Password */}
              {step === 3 && (
                <div className="space-y-2">
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
                    />
                    <input
                      ref={inputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-2.5 px-4 pl-[42px] pr-10 bg-white/5 border border-white/10 rounded-xl text-stone-200 font-[inherit] text-[15px] outline-none transition-all duration-250 placeholder:text-stone-500 focus:border-purple-400 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(192,132,252,0.12)] box-border"
                      placeholder="Create a secure password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password rules mini checklist */}
                  {password.length > 0 && (
                    <div className="text-[11px] text-stone-400 px-1 pt-1 grid grid-cols-2 gap-1">
                      <span className={password.length >= 8 ? 'text-emerald-400' : 'text-stone-500'}>
                        • 8+ chars
                      </span>
                      <span className={/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-stone-500'}>
                        • 1 uppercase
                      </span>
                      <span className={/[0-9]/.test(password) ? 'text-emerald-400' : 'text-stone-500'}>
                        • 1 number
                      </span>
                      <span className={/[!@#$%^&*]/.test(password) ? 'text-emerald-400' : 'text-stone-500'}>
                        • 1 symbol
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Buttons Row */}
              <div className="flex items-center gap-2 pt-1">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="p-2.5 bg-white/5 border border-white/10 text-stone-300 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    title="Previous step"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-[#1a1a1a] border border-transparent rounded-xl font-[inherit] text-[15px] font-semibold cursor-pointer transition-all py-2.5 px-4 hover:bg-white hover:scale-102 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-stone-800/30 border-t-stone-800 animate-spin" />
                      Creating account...
                    </span>
                  ) : step === 3 ? (
                    <>
                      <span>Complete registration</span>
                      <ShieldCheck size={17} />
                    </>
                  ) : (
                    <>
                      <span>Continue with email</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-3.5 sm:mt-4 text-center text-xs text-stone-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 font-semibold hover:text-purple-300 transition-colors underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ====== RIGHT PANEL ====== */}
      <div
        ref={rightRef}
        className="hidden md:block md:w-1/2 min-w-0 h-full relative overflow-hidden bg-[#07070b] select-none shrink-0"
      >
        <img
          ref={imageRef}
          src={registerSideImage}
          alt="PhishLens Security Platform"
          className="w-full h-full object-cover object-left pointer-events-none"
        />
      </div>
    </div>
  );
}
