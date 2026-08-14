import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

/**
 * WelcomeCharacterAnimation
 * 
 * Renders the exact background SVG vector from `frontend/src/assets/background_image.svg`
 * with amplified, expressive Apple-calibrated fluid motion:
 * - High-range GSAP pointer tracking with critically damped spring interpolation
 * - Natural organic eye blinking (with occasional lifelike double-blinks)
 * - Attentive gaze response when user focuses or types into the input bar
 * - Expressive idle micro-saccades and pointer-down micro-reactions
 * - Theme-aware stroke styling preserving the exact line geometry
 */
export default function WelcomeCharacterAnimation({
  isInputFocused = false,
  isTyping = false,
  isDarkMode = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const headOutlineRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftEyeWrapRef = useRef(null);
  const rightEyeWrapRef = useRef(null);
  const glowRef = useRef(null);

  // References for tracking state
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isIdleRef = useRef(true);
  const idleTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const isBlinkingRef = useRef(false);

  // Amplified, expressive eye movement with smooth GSAP damping
  const lookAt = useCallback((targetX, targetY, duration = 0.3, ease = 'power2.out') => {
    if (!leftEyeWrapRef.current || !rightEyeWrapRef.current) return;
    
    // Smooth translation with slight parallax depth and subtle expressive tilt
    gsap.to(leftEyeWrapRef.current, {
      x: targetX * 0.94,
      y: targetY * 0.96,
      rotation: targetX * 0.12,
      duration,
      ease,
      overwrite: 'auto',
      transformOrigin: '50% 50%',
    });

    gsap.to(rightEyeWrapRef.current, {
      x: targetX * 1.06,
      y: targetY * 1.04,
      rotation: targetX * 0.12,
      duration,
      ease,
      overwrite: 'auto',
      transformOrigin: '50% 50%',
    });
  }, []);

  // Organic blinking animation
  const triggerBlink = useCallback(() => {
    if (isBlinkingRef.current || !leftEyeRef.current || !rightEyeRef.current) return;
    isBlinkingRef.current = true;

    const isDoubleBlink = Math.random() < 0.24; // ~24% chance of natural double-blink
    const eyes = [leftEyeRef.current, rightEyeRef.current];

    const tl = gsap.timeline({
      onComplete: () => {
        isBlinkingRef.current = false;
        scheduleNextBlink();
      },
    });

    // First blink down & up
    tl.to(eyes, {
      scaleY: 0.05,
      duration: 0.075,
      ease: 'power2.in',
      transformOrigin: '50% 50%',
    })
    .to(eyes, {
      scaleY: 1,
      duration: 0.12,
      ease: 'power2.out',
      transformOrigin: '50% 50%',
    });

    // Optional second rapid blink
    if (isDoubleBlink) {
      tl.to(eyes, {
        scaleY: 0.05,
        duration: 0.065,
        delay: 0.08,
        ease: 'power2.in',
        transformOrigin: '50% 50%',
      })
      .to(eyes, {
        scaleY: 1,
        duration: 0.11,
        ease: 'power2.out',
        transformOrigin: '50% 50%',
      });
    }
  }, []);

  const scheduleNextBlink = useCallback(() => {
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    // Random interval between 2.8s and 5.2s
    const nextInterval = 2800 + Math.random() * 2400;
    blinkTimerRef.current = setTimeout(triggerBlink, nextInterval);
  }, [triggerBlink]);

  // Handle pointer tracking, click reaction & idle saccades
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!containerRef.current) return;
      isIdleRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate normalized offset [-1, 1] relative to viewport / container center
      const maxDistX = Math.max(window.innerWidth / 2, 380);
      const maxDistY = Math.max(window.innerHeight / 2, 320);

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxDistX));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxDistY));

      mousePosRef.current = { x: normX, y: normY };

      // Amplified expressive eye translation bounds (±36px horizontally, ±22px vertically)
      let targetX = normX * 36;
      let targetY = normY * 22;

      // If user is focused on the input bar, tilt gaze downward
      if (isInputFocused || isTyping) {
        targetY = Math.max(targetY, 12) + 8;
      }

      lookAt(targetX, targetY, 0.28, 'power2.out');

      // Set idle timer to trigger spontaneous natural micro-glances
      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        triggerIdleGlance();
      }, 2000);
    };

    const triggerIdleGlance = () => {
      if (!isIdleRef.current || isInputFocused || isTyping) return;
      
      // Expressive random glance offset
      const randomGlanceX = (Math.random() - 0.5) * 32;
      const randomGlanceY = (Math.random() - 0.5) * 18;
      
      lookAt(randomGlanceX, randomGlanceY, 0.45, 'power2.inOut');

      // Return to near-center or next glance after 1.2-2.2s
      idleTimerRef.current = setTimeout(() => {
        if (!isIdleRef.current) return;
        lookAt(0, isInputFocused ? 14 : 0, 0.6, 'power2.out');
        idleTimerRef.current = setTimeout(triggerIdleGlance, 1800 + Math.random() * 1800);
      }, 1200);
    };

    const handlePointerDown = () => {
      if (!leftEyeRef.current || !rightEyeRef.current) return;
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        scale: 1.08,
        duration: 0.12,
        ease: 'power2.out',
        transformOrigin: '50% 50%',
        yoyo: true,
        repeat: 1,
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    scheduleNextBlink();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [lookAt, isInputFocused, isTyping, scheduleNextBlink]);

  // Respond to input focus or typing changes
  useEffect(() => {
    if (!leftEyeWrapRef.current || !rightEyeWrapRef.current) return;

    if (isTyping) {
      // Attentive, distinct downward gaze with slight squint focus
      lookAt(mousePosRef.current.x * 12, 20, 0.22, 'power2.out');
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        scaleX: 1.05,
        scaleY: 0.92,
        duration: 0.2,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
    } else if (isInputFocused) {
      // Distinct downward gaze towards input bar
      lookAt(mousePosRef.current.x * 16, 16, 0.28, 'power2.out');
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        scaleX: 1,
        scaleY: 1,
        duration: 0.25,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
    } else {
      // Normal state
      lookAt(mousePosRef.current.x * 36, mousePosRef.current.y * 22, 0.35, 'power2.out');
      gsap.to([leftEyeRef.current, rightEyeRef.current], {
        scaleX: 1,
        scaleY: 1,
        duration: 0.3,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
    }
  }, [isInputFocused, isTyping, lookAt]);

  // Initial entrance animation with cool transition
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Set initial states
      if (headOutlineRef.current) {
        gsap.set(headOutlineRef.current, { opacity: 0, scale: 0.92, y: 15, transformOrigin: '50% 100%' });
      }
      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        gsap.set([leftEyeWrapRef.current, rightEyeWrapRef.current], { opacity: 0, scaleY: 0, y: 12, transformOrigin: '50% 50%' });
      }
      if (glowRef.current) {
        gsap.set(glowRef.current, { opacity: 0, scale: 0.75 });
      }

      const entranceTl = gsap.timeline({
        delay: 0.4, // Wait for greeting text to reveal first
        defaults: { ease: 'power3.out' },
      });

      // 1. Glow blooms in background
      if (glowRef.current) {
        entranceTl.to(glowRef.current, { opacity: 0.55, scale: 1, duration: 1.2, ease: 'power2.out' }, 0);
      }

      // 2. Head dome materializes
      if (headOutlineRef.current) {
        entranceTl.to(headOutlineRef.current, {
          opacity: 0.9,
          scale: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          onComplete: () => {
            // Start ambient floating
            gsap.to(headOutlineRef.current, {
              y: -5,
              duration: 4.5,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });
          }
        }, 0.1);
      }

      // 3. Eyes wake up and pop open with spring physics
      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        entranceTl.to([leftEyeWrapRef.current, rightEyeWrapRef.current], {
          opacity: 0.92,
          scaleY: 1,
          y: 0,
          duration: 0.75,
          ease: 'back.out(2.0)',
        }, 0.35);
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const primaryStroke = '#4A4A4A'; // Exact color from background_image.svg

  return (
    <div
      ref={containerRef}
      className={`relative select-none pointer-events-none flex items-center justify-center ${className}`}
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
      }}
      aria-hidden="true"
    >
      {/* Soft Apple-style ambient radial depth glow */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] rounded-full pointer-events-none"
        style={{
          background: isDarkMode
            ? 'radial-gradient(ellipse at center, rgba(193, 91, 43, 0.09) 0%, rgba(99, 102, 241, 0.05) 45%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(193, 91, 43, 0.06) 0%, rgba(99, 102, 241, 0.04) 45%, transparent 70%)',
          filter: 'blur(45px)',
          zIndex: 0,
        }}
      />

      {/* SVG Container with EXACT vector coordinates from background_image.svg */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 701 434"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-auto drop-shadow-sm"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id="welcome_character_clip">
            <rect width="701" height="434" fill="white" />
          </clipPath>
        </defs>

        <g clipPath="url(#welcome_character_clip)">
          {/* Head Dome outline - exact path from background_image.svg */}
          <path
            ref={headOutlineRef}
            opacity="0.9"
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            stroke={primaryStroke}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />

          {/* Left Eye Group - exact geometry with amplified GSAP tracking and blinking */}
          <g ref={leftEyeWrapRef}>
            <rect
              ref={leftEyeRef}
              opacity="0.92"
              x="297.542"
              y="222.161"
              width="53"
              height="117.345"
              rx="26.5"
              transform="rotate(-5 297.542 222.161)"
              stroke={primaryStroke}
              strokeWidth="3"
              fill={isDarkMode ? 'rgba(74, 74, 74, 0.16)' : 'rgba(74, 74, 74, 0.05)'}
              className="transition-colors duration-300"
            />
          </g>

          {/* Right Eye Group - exact geometry with amplified GSAP tracking and blinking */}
          <g ref={rightEyeWrapRef}>
            <rect
              ref={rightEyeRef}
              opacity="0.92"
              x="449.542"
              y="213.161"
              width="53"
              height="117.345"
              rx="26.5"
              transform="rotate(-5 449.542 213.161)"
              stroke={primaryStroke}
              strokeWidth="3"
              fill={isDarkMode ? 'rgba(74, 74, 74, 0.16)' : 'rgba(74, 74, 74, 0.05)'}
              className="transition-colors duration-300"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
