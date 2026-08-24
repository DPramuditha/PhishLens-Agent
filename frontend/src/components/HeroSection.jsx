import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Sparkles, ArrowRight } from 'lucide-react';
import WelcomeCharacterAnimation from './WelcomeCharacterAnimation';

/* ── Windows Logo Icon ── */
function WindowsIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802" />
    </svg>
  );
}

export default function HeroSection({
  badgeTag = "EARLY BETA",
  badgeTitle = "PhishLens Agent is here",
  badgeLinkText = "Read the launch post",
  badgeUrl = "#",
  titlePrefix = "Meet",
  titleSuffix = "PhishLens Agent",
  subtitle = "AI cybersecurity teammates you can give real work to. Agents can scan inboxes, inspect suspicious URLs, analyze threat telemetry, and protect your digital assets in real time.",
  primaryActionText = "Sign Up for Early Access",
  secondaryActionText = "Contact sales",
  onPrimaryAction,
  onSecondaryAction,
}) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-28 pb-20 overflow-hidden bg-black text-white selection:bg-white/20">
      {/* Subtle Specular Ambient Spotlight at Top Center */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[450px] opacity-40 blur-[130px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* ── 1. Announcement Pill Badge ── */}
        <div className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <a
            href={badgeUrl}
            className="group inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/[0.12] bg-[#141416]/90 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.5)] hover:border-white/[0.22] hover:bg-[#1a1a1e] transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {/* Orange EARLY BETA tag */}
            <span className="px-2 py-0.5 rounded-full border border-amber-500/70 bg-amber-500/15 text-[#f59e0b] text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              {badgeTag}
            </span>

            {/* Badge Title and Link */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] tracking-[-0.01em]">
              <span className="font-semibold text-white">
                {badgeTitle}
              </span>
              <span className="text-zinc-400">
                · {badgeLinkText}
              </span>
            </div>

            {/* Arrow Icon */}
            <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/[0.16] transition-all">
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
            </div>
          </a>
        </div>

        {/* ── 2. Hero Headline ── */}
        <h1 className="text-4xl sm:text-3xl md:text-4xl font-bold tracking-[-0.035em] text-white leading-[1.08] flex items-center justify-center gap-3 sm:gap-4 flex-wrap mb-5 sm:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span>{titlePrefix}</span>
          <WelcomeCharacterAnimation size="inline" isDarkMode={true} className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 inline-flex align-middle" />
          <span>{titleSuffix}</span>
        </h1>

        {/* ── 3. Subtitle ── */}
        <p className="text-zinc-400 text-base sm:text-lg md:text-[15px] font-normal leading-[1.55] max-w-[620px] mx-auto tracking-[-0.01em] mb-9 sm:mb-11 animate-in fade-in slide-in-from-bottom-5 duration-800">
          {subtitle}
        </p>

        {/* ── 4. Call-to-Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-900">
          {/* Primary Action Button (Sign Up for Early Access) with Icon */}
          <button
            type="button"
            onClick={() => {
              if (onPrimaryAction) onPrimaryAction();
              else navigate('/chat');
            }}
            className="group relative px-5 py-2.5 rounded-full font-semibold text-[13px] tracking-[-0.01em] text-black bg-white hover:bg-zinc-100 active:scale-[0.96] transition-all duration-200 flex items-center gap-2.5 cursor-pointer mt-3"
          >
            <Sparkles className="w-4 h-4 text-black transition-transform duration-200 group-hover:rotate-12" />
            <span>{primaryActionText}</span>
            <ArrowRight className="w-4 h-4 text-black transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
