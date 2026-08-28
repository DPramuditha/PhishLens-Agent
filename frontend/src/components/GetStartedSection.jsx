import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

const STEPS_DATA = [
  {
    step: '01',
    title: 'Open PhishLens',
    description: 'Go to phishlens.ai on web, or launch the real-time browser extension and scanner.',
  },
  {
    step: '02',
    title: 'Sign in',
    description: 'Use your Google or email account to sync investigation sessions and alerts across every device.',
  },
  {
    step: '03',
    title: 'Start investigating',
    description: 'Ask anything — paste suspicious URLs, inspect headers, or analyze threats with multi-agent reasoning.',
  },
];

export default function GetStartedSection({ onPrimaryAction, onSecondaryAction }) {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const descRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Text entrance animation on scroll with clearProps
      if (headingRef.current) {
        gsap.from(headingRef.current, {
          y: 25,
          opacity: 0,
          duration: 0.65,
          ease: 'power3.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: headingRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }

      if (descRef.current) {
        gsap.from(descRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.65,
          delay: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: descRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }

      // 2. Safe, guaranteed 3-Card entrance animation with clearProps
      if (cardsRef.current && cardsRef.current.children.length > 0) {
        const cards = Array.from(cardsRef.current.children);
        gsap.fromTo(
          cards,
          {
            y: 35,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 0.65,
            ease: 'power3.out',
            clearProps: 'all',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 88%',
              once: true,
              invalidateOnRefresh: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handlePrimary = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      navigate('/chat');
    }
  };

  const handleSecondary = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      navigate('/login');
    }
  };

  return (
    <section
      id="get-started"
      ref={sectionRef}
      className="relative py-16 sm:py-20 lg:py-24 bg-black text-white selection:bg-white/20 overflow-hidden border-t border-white/[0.08]"
      aria-label="Get Started Guide"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Header with Compact Text Size */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <h2 ref={headingRef} className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Get started
          </h2>
          <p ref={descRef} className="text-[#8e8e93] text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
            Free to try on the web and in the apps. Upgrade to Enterprise for higher limits and multi-agent reasoning.
          </p>
        </div>

        {/* 3-Column Steps Cards Grid with Transparent Background and Clean Borders */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-12 sm:mb-14">
          {STEPS_DATA.map((item) => (
            <div
              key={item.step}
              className="group relative rounded-2xl border border-white/[0.12] bg-transparent p-6 sm:p-7 hover:border-white/[0.25] transition-all duration-200 flex flex-col justify-start"
            >
              {/* Step Number */}
              <span className="font-mono text-xs font-semibold text-zinc-500 tracking-wider">
                {item.step}
              </span>

              {/* Card Title */}
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-3 mb-2">
                {item.title}
              </h3>

              {/* Card Description */}
              <p className="text-[#8e8e93] text-sm leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Centered Action Pill Buttons */}
        <div className="flex items-center justify-center gap-3 sm:gap-3.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex items-center gap-1.5 bg-white text-black font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-full hover:bg-zinc-100 active:scale-[0.98] transition-all duration-150 shadow-[0_2px_12px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            <span>Open PhishLens</span>
            <ChevronRight className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={handleSecondary}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#141416]/90 text-white font-medium text-xs sm:text-sm px-5 sm:px-6 py-2.5 hover:bg-[#1e1e23] hover:border-white/[0.24] active:scale-[0.98] transition-all duration-150 cursor-pointer backdrop-blur-md"
          >
            <span>Sign in to Account</span>
          </button>
        </div>
      </div>
    </section>
  );
}
