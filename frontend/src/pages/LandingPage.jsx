import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';

export default function LandingPage() {
  const navigate = useNavigate();
  const [downloadCount, setDownloadCount] = useState(0);

  const handlePrimaryAction = () => {
    navigate('/chat');
  };

  const handleSecondaryAction = () => {
    navigate('/login');
  };

  return (
    <div className="index-page-scope min-h-screen bg-black text-white selection:bg-white/20 flex flex-col justify-between overflow-x-hidden">
      {/* ── Modern Translucent Navigation Bar ── */}
      <Navbar
        brandName="PhishLens Agent"
        onActionClick={() => navigate('/chat')}
      />

      {/* ── Hero Section matching exact reference style ── */}
      <main className="flex-1 flex flex-col justify-center">
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
      </main>

      {/* ── Minimal Footer with crisp hairline border ── */}
      <footer className="w-full border-t border-white/[0.06] py-6 px-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems operational · PhishLens Agent v1.0 Early Beta</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
            <a href="#security" className="hover:text-zinc-400 transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
