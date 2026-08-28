import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useToast } from './ToastContext';
import squircleAttentifSvg from '../assets/bloub-squircle-attentif-orange-anime-index.svg';

/* Social SVG Icons */
function LinkedInIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XTwitterIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function YouTubeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
    </svg>
  );
}

const FOOTER_COLUMNS = [
  {
    title: 'Products',
    links: [
      { name: 'Multi-Agent Orchestrator', href: '#features' },
      { name: 'Siamese Vision Classifier', href: '#features' },
      { name: 'Sandboxed DOM Capture', href: '#features' },
      { name: 'Forensic PDF Reports', href: '#features' },
      { name: 'Threat Intelligence API', href: '#features' },
      { name: 'Brand Verification Engine', href: '#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Documentation', href: '#docs' },
      { name: 'API Reference', href: '#api' },
      { name: 'Heuristics Research', href: '#research' },
      { name: 'Phishing Dataset', href: '#dataset' },
      { name: 'Changelog & Releases', href: '#changelog' },
      { name: 'Security Whitepaper', href: '#whitepaper' },
    ],
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const toast = useToast();

  const textContainerRef = useRef(null);
  const [spotlight, setSpotlight] = useState({ x: -500, y: -500, opacity: 0 });
  const glowState = useRef({ x: -500, y: -500, opacity: 0 });

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      if (toast?.error) toast.error('Please enter a valid email address.');
      return;
    }
    setIsSubscribed(true);
    if (toast?.success) {
      toast.success('Thank you for subscribing to PhishLens security alerts!');
    }
  };

  /* GSAP Point-Based Spotlight Hover: Lights up only the specific point hovered over */
  const handleMouseMove = (e) => {
    if (!textContainerRef.current) return;
    const rect = textContainerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    gsap.to(glowState.current, {
      x: relX,
      y: relY,
      opacity: 1,
      duration: 0.12,
      ease: 'power2.out',
      onUpdate: () => {
        setSpotlight({
          x: glowState.current.x,
          y: glowState.current.y,
          opacity: glowState.current.opacity,
        });
      },
    });
  };

  const handleMouseEnter = (e) => {
    if (!textContainerRef.current) return;
    const rect = textContainerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    glowState.current.x = relX;
    glowState.current.y = relY;

    gsap.to(glowState.current, {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        setSpotlight({
          x: glowState.current.x,
          y: glowState.current.y,
          opacity: glowState.current.opacity,
        });
      },
    });
  };

  const handleMouseLeave = () => {
    gsap.to(glowState.current, {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        setSpotlight({
          x: glowState.current.x,
          y: glowState.current.y,
          opacity: glowState.current.opacity,
        });
      },
    });
  };

  return (
    <footer id="footer" className="w-full bg-transparent text-white selection:bg-white/20 border-t border-white/[0.08] relative pt-8 sm:pt-10 pb-6 sm:pb-8" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Top Section: Products, Resources & Newsletter ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 lg:gap-12 pb-8 sm:pb-10">
          {/* Grouped Left Columns: Products & Resources with compact gap */}
          <div className="flex gap-10 sm:gap-14 lg:gap-20">
            {/* Column 1: Products */}
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-white mb-3">
                {FOOTER_COLUMNS[0].title}
              </h3>
              <ul className="space-y-2">
                {FOOTER_COLUMNS[0].links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-[13px] text-zinc-400 hover:text-white transition-colors duration-150 block whitespace-nowrap"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Resources */}
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-white mb-3">
                {FOOTER_COLUMNS[1].title}
              </h3>
              <ul className="space-y-2">
                {FOOTER_COLUMNS[1].links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-[13px] text-zinc-400 hover:text-white transition-colors duration-150 block whitespace-nowrap"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Newsletter & Socials */}
          <div className="w-full md:max-w-xs lg:max-w-sm flex flex-col justify-start">
            <h3 className="text-sm font-semibold tracking-tight text-white mb-2.5">
              Sign up for our newsletter to stay up to date
            </h3>

            {isSubscribed ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-1">
                ✓ You are subscribed to PhishLens threat intel updates.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full px-3.5 py-2 rounded-xl bg-transparent border border-white/[0.12] text-white placeholder:text-zinc-500 font-mono text-xs focus:outline-none focus:border-white/[0.3] transition-all"
                  aria-label="Email address for newsletter"
                />
                <button
                  type="submit"
                  className="self-end px-4 py-1.5 rounded-xl bg-white text-black font-mono font-semibold text-xs hover:bg-zinc-200 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Giant Outlined 'PhishLens' Brand Name & Mascot with Interactive HTML Text Spotlight ── */}
        <div className="relative border-t border-white/[0.08] pt-6 sm:pt-8 select-none overflow-hidden">
          <div className="flex items-center justify-center gap-3.5 sm:gap-6 lg:gap-8 flex-nowrap max-w-5xl mx-auto">
            {/* Squircle Mascot Icon (Clean, Static, No Animation/Shadow) */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src={squircleAttentifSvg}
                alt="PhishLens Squircle Mascot"
                className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-44 object-contain block select-none pointer-events-none"
                loading="lazy"
              />
            </div>

            {/* Giant Outlined 'PhishLens' Original HTML Typography with Cursor Spotlight Light-Up */}
            <div
              ref={textContainerRef}
              className="relative inline-flex items-center justify-center cursor-default select-none overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Base Original Outline Typography (Always visible) */}
              <span
                className="block text-[48px] sm:text-[84px] md:text-[120px] lg:text-[160px] xl:text-[190px] font-black tracking-[-0.03em] leading-none text-transparent whitespace-nowrap text-center"
                style={{
                  WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.22)',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                PhishLens
              </span>

              {/* Active Glowing Spotlight Layer (Masked to cursor coordinate point) */}
              <span
                className="absolute inset-0 block text-[48px] sm:text-[84px] md:text-[120px] lg:text-[160px] xl:text-[190px] font-black tracking-[-0.03em] leading-none text-transparent whitespace-nowrap text-center pointer-events-none"
                style={{
                  WebkitTextStroke: '2px rgba(255, 255, 255, 1)',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.5))',
                  opacity: spotlight.opacity,
                  maskImage: `radial-gradient(circle 140px at ${spotlight.x}px ${spotlight.y}px, black 0%, rgba(0,0,0,0.5) 45%, transparent 100%)`,
                  WebkitMaskImage: `radial-gradient(circle 140px at ${spotlight.x}px ${spotlight.y}px, black 0%, rgba(0,0,0,0.5) 45%, transparent 100%)`,
                }}
                aria-hidden="true"
              >
                PhishLens
              </span>
            </div>
          </div>
        </div>

        {/* ── Bottom Operational, Social & Legal Bar (Social Icons in Center) ── */}
        <div className="pt-5 mt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
          {/* Left: Operational status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational · PhishLens Agent v1.0 Early Beta</span>
          </div>

          {/* Center: Social Media Icons */}
          <div className="flex items-center gap-4 text-zinc-400">
            <a href="#linkedin" aria-label="LinkedIn" className="hover:text-white transition-colors duration-150">
              <LinkedInIcon className="w-4 h-4" />
            </a>
            <a href="#twitter" aria-label="X Twitter" className="hover:text-white transition-colors duration-150">
              <XTwitterIcon className="w-3.5 h-3.5" />
            </a>
            <a href="#github" aria-label="GitHub" className="hover:text-white transition-colors duration-150">
              <GitHubIcon className="w-4 h-4" />
            </a>
            <a href="#youtube" aria-label="YouTube" className="hover:text-white transition-colors duration-150">
              <YouTubeIcon className="w-4 h-4" />
            </a>
          </div>

          {/* Right: Copyright */}
          <div>
            © {new Date().getFullYear()} PhishLens Agent. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
