import { useEffect, useRef, useCallback, useId } from 'react';
import gsap from 'gsap';

/**
 * WelcomeCharacterAnimation
 * 
 * High-performance, GPU-accelerated character vector with lifelike eye tracking and blinking:
 * - Ultra-lightweight rendering with 0% main-thread blocking
 * - Hardware-accelerated CSS glows instead of heavy SVG filters
 * - Single-pass autonomous eye gaze & blink engine with proper timer cleanup
 * - Smooth pointer tracking with stable refs
 */
export default function WelcomeCharacterAnimation({
  size = 'inline', // 'inline' | 'small' | 'large'
  isInputFocused = false,
  isTyping = false,
  isDarkMode = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const headOutlineRef = useRef(null);
  const headAuraRef = useRef(null);
  const leftEyeWrapRef = useRef(null);
  const rightEyeWrapRef = useRef(null);
  const leftEyeInnerRef = useRef(null);
  const rightEyeInnerRef = useRef(null);
  const isHoveredRef = useRef(false);

  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const headGradId = `char_grad_head_${idPrefix}`;
  const leftGradId = `char_grad_left_${idPrefix}`;
  const rightGradId = `char_grad_right_${idPrefix}`;

  const isInline = size === 'inline' || size === 'small';

  // Stable refs for props to avoid effect re-triggers
  const isTypingRef = useRef(isTyping);
  const isInputFocusedRef = useRef(isInputFocused);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    isInputFocusedRef.current = isInputFocused;
  }, [isInputFocused]);

  // Timers and tracking state
  const mousePosRef = useRef({ x: 0, y: 0 });
  const blinkTimerRef = useRef(null);
  const isBlinkingRef = useRef(false);
  const isUserTrackingRef = useRef(false);
  const userTrackingTimeoutRef = useRef(null);
  const ocularLoopTimeoutRef = useRef(null);

  // Amplified, expressive eye movement with smooth GSAP damping
  const lookAt = useCallback((targetX, targetY, duration = 0.25, ease = 'power2.out') => {
    if (!leftEyeWrapRef.current || !rightEyeWrapRef.current) return;

    gsap.to(leftEyeWrapRef.current, {
      x: targetX * 0.94,
      y: targetY * 0.96,
      rotation: targetX * 0.14,
      duration,
      ease,
      overwrite: 'auto',
      transformOrigin: '50% 50%',
    });

    gsap.to(rightEyeWrapRef.current, {
      x: targetX * 1.06,
      y: targetY * 1.04,
      rotation: targetX * 0.14,
      duration,
      ease,
      overwrite: 'auto',
      transformOrigin: '50% 50%',
    });
  }, []);

  // Autonomous ocular movements
  const runAutonomousOcularMovements = useCallback(() => {
    if (isUserTrackingRef.current || isHoveredRef.current) return;
    if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);

    const typingNow = isTypingRef.current;
    const inputFocusedNow = isInputFocusedRef.current;

    if (typingNow) {
      const readX = (Math.random() - 0.5) * 26;
      const readY = 18 + Math.random() * 8;
      lookAt(readX, readY, 0.18, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, 400 + Math.random() * 600);
      return;
    }

    if (inputFocusedNow) {
      const glanceUp = Math.random() < 0.22;
      const targetX = (Math.random() - 0.5) * 24;
      const targetY = glanceUp ? (Math.random() - 0.5) * 12 : 16 + Math.random() * 8;
      lookAt(targetX, targetY, glanceUp ? 0.24 : 0.2, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, glanceUp ? 800 : 1200 + Math.random() * 1000);
      return;
    }

    const patternType = Math.random();
    let targetX = 0;
    let targetY = 0;
    let duration = 0.22;
    let holdDuration = 1200;
    let ease = 'power3.out';

    if (patternType < 0.35) {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (24 + Math.random() * 16);
      targetY = (Math.random() - 0.5) * 20;
      duration = 0.2;
      holdDuration = 800 + Math.random() * 1000;
      ease = 'back.out(1.35)';
    } else if (patternType < 0.65) {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (14 + Math.random() * 18);
      targetY = -(10 + Math.random() * 14);
      duration = 0.22;
      holdDuration = 900 + Math.random() * 1200;
      ease = 'power3.out';
    } else {
      targetX = (Math.random() - 0.5) * 14;
      targetY = (Math.random() - 0.5) * 10;
      duration = 0.3;
      holdDuration = 1200 + Math.random() * 1400;
      ease = 'power2.inOut';
    }

    lookAt(targetX, targetY, duration, ease);

    ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, holdDuration);
  }, [lookAt]);

  // Organic blinking animation
  const scheduleNextBlink = useCallback(() => {
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    const nextInterval = 3000 + Math.random() * 2600;
    blinkTimerRef.current = setTimeout(() => {
      if (isBlinkingRef.current || !leftEyeInnerRef.current || !rightEyeInnerRef.current) {
        scheduleNextBlink();
        return;
      }
      isBlinkingRef.current = true;

      const eyeInners = [leftEyeInnerRef.current, rightEyeInnerRef.current];
      const tl = gsap.timeline({
        onComplete: () => {
          isBlinkingRef.current = false;
          scheduleNextBlink();
        },
      });

      tl.to(eyeInners, {
        scaleY: 0.05,
        duration: 0.08,
        ease: 'power2.in',
        transformOrigin: '50% 50%',
      })
      .to(eyeInners, {
        scaleY: 1,
        duration: 0.12,
        ease: 'power2.out',
        transformOrigin: '50% 50%',
      });
    }, nextInterval);
  }, []);

  // Main lifecycle: Setup autonomous loops & mouse listeners once
  useEffect(() => {
    runAutonomousOcularMovements();
    scheduleNextBlink();

    const handlePointerMove = (e) => {
      if (!containerRef.current || isHoveredRef.current) return;
      isUserTrackingRef.current = true;
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const maxDistX = Math.max(window.innerWidth / 2, 380);
      const maxDistY = Math.max(window.innerHeight / 2, 320);

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxDistX));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxDistY));

      mousePosRef.current = { x: normX, y: normY };

      let targetX = normX * 36;
      let targetY = normY * 22;

      if (isInputFocusedRef.current || isTypingRef.current) {
        targetY = Math.max(targetY, 12) + 8;
      }

      lookAt(targetX, targetY, 0.25, 'power2.out');

      userTrackingTimeoutRef.current = setTimeout(() => {
        isUserTrackingRef.current = false;
        runAutonomousOcularMovements();
      }, 700);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);
      if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [lookAt, runAutonomousOcularMovements, scheduleNextBlink]);

  // Entrance & breathing animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headOutlineRef.current) {
        gsap.set(headOutlineRef.current, { opacity: 0, scale: 0.92, y: 10, transformOrigin: '50% 50%' });
      }
      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        gsap.set([leftEyeWrapRef.current, rightEyeWrapRef.current], { opacity: 0, scaleY: 0, y: 8, transformOrigin: '50% 50%' });
      }

      const entranceTl = gsap.timeline({
        delay: isInline ? 0.1 : 0.3,
        defaults: { ease: 'power3.out' },
      });

      if (headOutlineRef.current) {
        entranceTl.to(headOutlineRef.current, {
          opacity: 0.95,
          scale: 1,
          y: 0,
          duration: 0.6,
          onComplete: () => {
            if (headOutlineRef.current) {
              gsap.to(headOutlineRef.current, {
                y: -2.5,
                duration: 3.2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              });
            }
          }
        }, 0.05);
      }

      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        entranceTl.to([leftEyeWrapRef.current, rightEyeWrapRef.current], {
          opacity: 0.95,
          scaleY: 1,
          y: 0,
          duration: 0.55,
          ease: 'back.out(2.0)',
        }, 0.15);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isInline]);

  // Primary outline stroke color fallback
  const primaryStroke = isDarkMode ? '#9CA3AF' : '#4B5563';

  // Hover & Tap Dynamics
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (!containerRef.current) return;

    gsap.to(containerRef.current, {
      scale: 1.12,
      duration: 0.3,
      ease: 'back.out(2.0)',
      overwrite: 'auto',
    });

    lookAt(0, -18, 0.22, 'back.out(1.8)');
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!containerRef.current) return;

    gsap.to(containerRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    lookAt(mousePosRef.current.x * 36, mousePosRef.current.y * 22, 0.35, 'power2.out');
  };

  const handlePointerDown = () => {
    if (leftEyeInnerRef.current && rightEyeInnerRef.current) {
      gsap.to([leftEyeInnerRef.current, rightEyeInnerRef.current], {
        scale: 1.12,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      });
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      className={`relative inline-flex items-center justify-center select-none pointer-events-auto cursor-pointer bg-transparent border-0 shadow-none transition-transform duration-200 ${className}`}
      style={{
        width: isInline ? 'clamp(58px, 6.8vw, 84px)' : '100%',
        height: isInline ? 'clamp(58px, 6.8vw, 84px)' : 'auto',
        maxWidth: isInline ? undefined : '580px',
        aspectRatio: isInline ? '1 / 1' : undefined,
        verticalAlign: 'middle',
        willChange: 'transform',
      }}
      title="PhishLens Animated Character"
      aria-label="PhishLens Animated Character"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="80 40 580 580"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient
            id={headGradId}
            gradientUnits="userSpaceOnUse"
            x1="100"
            y1="60"
            x2="640"
            y2="600"
          >
            <stop offset="0%" stopColor="#FF6363" />
            <stop offset="25%" stopColor="#FFA066" />
            <stop offset="50%" stopColor="#D946EF" />
            <stop offset="75%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <linearGradient
            id={leftGradId}
            gradientUnits="userSpaceOnUse"
            x1="280"
            y1="190"
            x2="368"
            y2="370"
          >
            <stop offset="0%" stopColor="#FF6363" />
            <stop offset="50%" stopColor="#D946EF" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <linearGradient
            id={rightGradId}
            gradientUnits="userSpaceOnUse"
            x1="430"
            y1="180"
            x2="522"
            y2="360"
          >
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#D946EF" />
            <stop offset="100%" stopColor="#FF6363" />
          </linearGradient>
        </defs>

        <g>
          {/* Head Aura Glow (Hardware Accelerated) */}
          <path
            ref={headAuraRef}
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            fill="none"
            stroke={`url(#${headGradId})`}
            strokeWidth={isInline ? "6.0" : "8.0"}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            opacity="0.32"
            style={{
              filter: 'blur(4px)',
              mixBlendMode: isDarkMode ? 'screen' : 'multiply',
              pointerEvents: 'none',
            }}
          />

          {/* Sharp Head Circle */}
          <path
            ref={headOutlineRef}
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            fill="none"
            stroke={`url(#${headGradId})`}
            strokeWidth={isInline ? "2.6" : "3.2"}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Left Eye Group */}
          <g ref={leftEyeWrapRef}>
            <g ref={leftEyeInnerRef}>
              <rect
                opacity="0.92"
                x="288"
                y="203"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 288 203)"
                stroke={primaryStroke}
                strokeWidth={isInline ? "2.2" : "2.5"}
                vectorEffect="non-scaling-stroke"
                fill={isDarkMode ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)'}
              />
              <rect
                x="288"
                y="203"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 288 203)"
                fill="none"
                stroke={`url(#${leftGradId})`}
                strokeWidth={isInline ? "2.4" : "3.0"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                opacity="0.55"
              />
            </g>
          </g>

          {/* Right Eye Group */}
          <g ref={rightEyeWrapRef}>
            <g ref={rightEyeInnerRef}>
              <rect
                opacity="0.92"
                x="440"
                y="194"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 440 194)"
                stroke={primaryStroke}
                strokeWidth={isInline ? "2.2" : "2.5"}
                vectorEffect="non-scaling-stroke"
                fill={isDarkMode ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)'}
              />
              <rect
                x="440"
                y="194"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 440 194)"
                fill="none"
                stroke={`url(#${rightGradId})`}
                strokeWidth={isInline ? "2.4" : "3.0"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                opacity="0.55"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
