import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ brandName = "PhishLens", onActionClick }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', href: '#overview' },
    { label: 'Features', href: '#features' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Security', href: '#security' },
    { label: 'Docs', href: '#docs' },
  ];

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center px-4 pointer-events-none">
      {/* ── Floating Rounded Capsule Navbar ── */}
      <div
        className={`w-full max-w-5xl h-14 px-4 sm:px-6 flex items-center justify-between rounded-full pointer-events-auto transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0e0e10]/90 backdrop-blur-2xl border border-white/[0.14] shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.12)]'
            : 'bg-[#141416]/75 backdrop-blur-xl border border-white/[0.10] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]'
        }`}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <span className="text-white font-semibold text-[15px] sm:text-[16px] tracking-[-0.02em]">
            {brandName}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-zinc-400 hover:text-white text-[13.5px] font-medium tracking-[-0.01em] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 bg-white text-black font-semibold text-[13px] px-4 py-1.5 rounded-full hover:bg-zinc-100 active:scale-[0.97] transition-all duration-150 cursor-pointer"
            >
              {user?.picture && (
                <img src={user.picture} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
              )}
              <span>Go to Chat</span>
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13.5px] font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors duration-200"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (onActionClick) onActionClick();
                  else navigate('/chat');
                }}
                className="bg-white text-black font-semibold text-[13px] px-4 py-1.5 rounded-full hover:bg-zinc-100 active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu (Rounded Floating Card) */}
      {isMobileMenuOpen && (
        <div className="w-full max-w-5xl mt-2 rounded-3xl bg-[#121214]/95 backdrop-blur-2xl border border-white/[0.12] p-5 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-300 hover:text-white text-[15px] font-medium py-2 px-2 rounded-xl flex items-center justify-between hover:bg-white/[0.05] transition-colors"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </a>
            ))}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-zinc-300 bg-white/[0.06] border border-white/10 font-medium text-[14px]"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onActionClick) onActionClick();
                  else navigate('/chat');
                }}
                className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-[14px] shadow-lg active:scale-[0.98]"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
