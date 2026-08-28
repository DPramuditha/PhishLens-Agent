import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const isLanding = pathname === '/' || pathname === '/landing';
    const wasLanding = prevPathnameRef.current === '/' || prevPathnameRef.current === '/landing';
    prevPathnameRef.current = pathname;

    // When navigating to any non-landing page (Login, Register, Chat)
    if (!isLanding) {
      try {
        document.body.style.removeProperty('height');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.documentElement.style.removeProperty('height');
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('position');
      } catch {
        // ignore
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    } else if (!wasLanding && isLanding) {
      // When navigating back into landing page from another page
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      setTimeout(() => {
        if (typeof window !== 'undefined' && ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      }, 100);
    }
  }, [pathname]);

  return null;
}
