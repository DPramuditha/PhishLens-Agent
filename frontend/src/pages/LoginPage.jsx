import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import gsap from 'gsap';
import { ShieldCheck, ChevronDown, Check, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

/* ───────── Progress items for right panel ───────── */
const PROGRESS_ITEMS = [
  'Scan inbox for phishing emails',
  'Analyze suspicious URLs & links',
  'Detect social-engineering patterns',
  'Generate threat-intel report',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const { addToast } = useToast();

  /* refs */
  const pageRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const headingRef = useRef(null);
  const formRef = useRef(null);
  const cardRef = useRef(null);
  const itemsRef = useRef([]);

  /* state */
  const [email, setEmail] = useState('');
  const [progressOpen, setProgressOpen] = useState(true);
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
        { opacity: 0, x: 60 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: 0.4 },
      );

      gsap.fromTo(
        cardRef.current,
        { y: 30, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)', delay: 0.8 },
      );

      gsap.fromTo(
        itemsRef.current,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power2.out',
          delay: 1.1,
        },
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

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

  const handleEmailLogin = (e) => {
    e.preventDefault();
    if (!email) return;
    addToast({
      title: 'Email Sign In',
      message: 'Email & Password authentication will be configured next.',
      type: 'info',
    });
  };

  const addItemRef = (el) => {
    if (el && !itemsRef.current.includes(el)) itemsRef.current.push(el);
  };

  /* ──────────────────── JSX ──────────────────── */
  return (
    <div ref={pageRef} className="flex min-h-svh w-full font-[Cabin,system-ui,sans-serif] overflow-hidden">

      {/* ====== LEFT PANEL ====== */}
      <div
        ref={leftRef}
        className="flex-1 relative flex items-center justify-center bg-[#1a1a1a] px-8 py-10 overflow-hidden"
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
          <div ref={headingRef} className="mb-12">
            <h1 className="font-[Habibi,Georgia,'Times_New_Roman',serif] font-normal text-[clamp(36px,5vw,52px)] leading-[1.15] text-stone-100 m-0 mb-4 tracking-tight">
              Detect fast,<br />
              protect faster
            </h1>
            <p className="text-base text-stone-400 m-0 tracking-wide">
              AI-powered phishing detection with{' '}
              <span className="text-purple-400 font-semibold">PhishLens</span>
            </p>
          </div>

          {/* form card */}
          <div
            ref={formRef}
            className="bg-white/[0.04] border border-white/[0.08] rounded-[20px] px-7 pt-8 pb-6 backdrop-blur-[12px]"
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
              {isSubmitting ? (
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
            <div className="flex items-center my-5 gap-3.5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs font-semibold text-stone-500 tracking-widest">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* email form */}
            <form onSubmit={handleEmailLogin}>
              <div className="relative mb-4">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2.5 px-4 pl-[42px] bg-white/5 border border-white/10 rounded-xl text-stone-200 font-[inherit] text-[16px] outline-none transition-all duration-250 placeholder:text-stone-500 focus:border-purple-400 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(192,132,252,0.12)] box-border"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 bg-stone-100 text-[#1a1a1a] border border-transparent rounded-xl font-[inherit] text-[17px] font-semibold cursor-pointer transition-all py-2 px-4 mb-2 hover:bg-white hover:scale-102 duration-300"
              >
                Continue with email
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-stone-500 leading-relaxed">
              By continuing, you acknowledge PhishLens's{' '}
              <a
                href="#"
                className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ====== RIGHT PANEL ====== */}
      <div
        ref={rightRef}
        className="flex-1 flex items-center justify-center bg-stone-100 relative px-8 py-10 overflow-hidden max-md:px-6 max-md:py-12"
      >
        {/* subtle radial gradient overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(192,132,252,0.06)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.04)_0%,transparent_50%)] pointer-events-none" />

        <div className="relative z-[2] w-full max-w-[400px]">

          {/* progress card */}
          <div
            ref={cardRef}
            className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <button
              type="button"
              className="flex items-center justify-between w-full py-6 px-7 bg-transparent border-none cursor-pointer font-[inherit] border-b border-b-stone-100"
              onClick={() => setProgressOpen((o) => !o)}
            >
              <span className="text-lg font-semibold text-stone-900 -tracking-wide">
                Progress
              </span>
              <ChevronDown
                size={20}
                className={`text-stone-400 transition-transform duration-300 ${
                  progressOpen ? '' : '-rotate-90'
                }`}
              />
            </button>

            {progressOpen && (
              <ul className="list-none m-0 px-7 pt-3 pb-6 flex flex-col gap-1">
                {PROGRESS_ITEMS.map((text, i) => (
                  <li
                    key={i}
                    ref={addItemRef}
                    className="flex items-center gap-3.5 py-3 border-b border-stone-50 last:border-b-0"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <span className="text-[15px] text-stone-500 line-through decoration-stone-300">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}