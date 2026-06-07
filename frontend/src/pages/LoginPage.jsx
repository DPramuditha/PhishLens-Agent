import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ShieldCheck, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const elementsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Background animation
      gsap.fromTo(containerRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 1, ease: 'power2.inOut' }
      );

      // Card animation
      gsap.fromTo(cardRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.2 }
      );

      // Input and button animations
      gsap.fromTo(elementsRef.current,
        { x: -20, opacity: 0 },
        { 
          x: 0, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.1, 
          ease: 'power2.out',
          delay: 0.5
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const addToRefs = (el) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    gsap.to(cardRef.current, {
      scale: 0.95,
      opacity: 0,
      duration: 0.3,
      onComplete: () => navigate('/')
    });
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div 
        ref={cardRef}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden"
      >
        {/* Decorative background shapes */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4 text-indigo-600 shadow-inner">
            <ShieldCheck size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">PhishLens</h1>
          <p className="text-gray-500 mt-2">Secure access to your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div ref={addToRefs} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center mb-1 pointer-events-none text-gray-400">
              <Mail size={20} />
            </div>
            <input 
              type="email" 
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-700" 
              placeholder="Email Address" 
              required
            />
          </div>

          <div ref={addToRefs} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center mb-1 pointer-events-none text-gray-400">
              <Lock size={20} />
            </div>
            <input 
              type="password" 
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-700" 
              placeholder="Password" 
              required
            />
            <div className="absolute right-0 top-full mt-1">
              <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Forgot password?</a>
            </div>
          </div>

          <div ref={addToRefs} className="pt-4">
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              Sign In
              <ArrowRight size={20} />
            </button>
          </div>
        </form>

        <div ref={addToRefs} className="mt-8 text-center relative z-10">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <a href="#" className="flex items-center justify-center gap-1 mt-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
              <UserPlus size={18} />
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}