import { useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import GetStartedSection from '../components/GetStartedSection';
import Footer from '../components/Footer';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

export default function LandingPage() {
  const navigate = useNavigate();

  /* Setup GSAP ScrollSmoother for smooth momentum scrolling with proper React lifecycle */
  useLayoutEffect(() => {
    let smoother;
    const ctx = gsap.context(() => {
      if (typeof window !== 'undefined' && ScrollSmoother) {
        try {
          // Kill any lingering ScrollSmoother instance before creating a new one
          const existing = ScrollSmoother.get();
          if (existing) {
            existing.kill();
          }

          smoother = ScrollSmoother.create({
            wrapper: '#smooth-wrapper',
            content: '#smooth-content',
            smooth: 1.2,
            effects: true,
            smoothTouch: 0.1,
            normalizeScroll: false,
            ignoreMobileResize: true,
          });
        } catch (err) {
          console.warn('ScrollSmoother initialization skipped:', err);
        }
      }
    });

    // Refresh ScrollTrigger positions after child components and images render
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(timer);
      ctx.revert();
      if (smoother) {
        smoother.kill();
      }
      ScrollTrigger.refresh();
    };
  }, []);

  const handlePrimaryAction = () => {
    navigate('/chat');
  };

  const handleSecondaryAction = () => {
    navigate('/login');
  };

  return (
    <div className="index-page-scope relative w-full min-h-screen bg-black text-white selection:bg-white/20">
      {/* ── Modern Translucent Floating Navigation Bar (Fixed outside smooth-wrapper) ── */}
      <Navbar
        brandName="PhishLens Agent"
        onActionClick={() => navigate('/chat')}
      />

      {/* ── GSAP ScrollSmoother Structure ── */}
      <div id="smooth-wrapper" className="w-full bg-black">
        <div id="smooth-content" className="w-full flex flex-col min-h-screen justify-between bg-black">
          {/* ── Hero, Features & Get Started Sections ── */}
          <main className="w-full flex flex-col flex-1">
            <HeroSection
              badgeTag="EARLY BETA"
              badgeTitle="PhishLens Agent is here"
              badgeLinkText="Read the launch post"
              badgeUrl="#"
              titlePrefix="Meet"
              titleSuffix="PhishLens Agent"
              subtitle="AI cybersecurity teammates you can give real work to. Agents can scan inboxes, inspect suspicious URLs, analyze threat telemetry, and protect your digital assets in real time."
              primaryActionText="Sign Up for Early Access"
              secondaryActionText="Contact sales"
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
            />

            {/* ── Lateral Pinned GSAP Features Section ── */}
            <FeaturesSection />

            {/* ── 3-Step Get Started Guide ── */}
            <GetStartedSection
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
            />
          </main>

          {/* ── Rich LangChain-style Footer with Giant Watermark & Mascot ── */}
          <Footer />
        </div>
      </div>
    </div>
  );
}
