import { useEffect, useRef, useCallback, useId } from 'react';
import gsap from 'gsap';

/**
 * WelcomeCharacterAnimation
 * 
 * Renders the full circular SVG character vector from background_image.svg with fluid motion
 * and chromatic iridescent gradients across both the circle outline and eye contours:
 * - Transparent background (clean, floating circular vector)
 * - Full circular head outline with chromatic liquid-light gradient & glowing aura
 * - Large expressive chromatic iridescent eyes with dynamic gaze tracking
 * - Continuous liquid-light gradient angle rotation
 * - Organic breathing shimmer cycle & hover reactions
 * - Tactile spring interactions & lifelike blinking engine
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
  const leftEyeStrokeRef = useRef(null);
  const rightEyeStrokeRef = useRef(null);
  const leftEyeAuraRef = useRef(null);
  const rightEyeAuraRef = useRef(null);
  const headGradRef = useRef(null);
  const leftGradRef = useRef(null);
  const rightGradRef = useRef(null);
  const isHoveredRef = useRef(false);

  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const headGradId = `char_grad_head_${idPrefix}`;
  const leftGradId = `char_grad_left_${idPrefix}`;
  const rightGradId = `char_grad_right_${idPrefix}`;
  const bloomFilterId = `char_bloom_${idPrefix}`;

  const isInline = size === 'inline' || size === 'small';

  // References for tracking state
  const mousePosRef = useRef({ x: 0, y: 0 });
  const blinkTimerRef = useRef(null);
  const isBlinkingRef = useRef(false);
  const breathingTlRef = useRef(null);

  // Autonomous Lifelike Real Eye Movement Engine
  const isUserTrackingRef = useRef(false);
  const userTrackingTimeoutRef = useRef(null);
  const ocularLoopTimeoutRef = useRef(null);
  const currentGazePosRef = useRef({ x: 0, y: 0 });

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

  // Autonomous ocular movements for normal situation
  const runAutonomousOcularMovements = useCallback(() => {
    if (isUserTrackingRef.current || isHoveredRef.current) return;

    if (isTyping) {
      const readX = (Math.random() - 0.5) * 26;
      const readY = 18 + Math.random() * 8;
      lookAt(readX, readY, 0.18, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, 380 + Math.random() * 600);
      return;
    }

    if (isInputFocused) {
      const glanceUp = Math.random() < 0.22;
      const targetX = (Math.random() - 0.5) * 24;
      const targetY = glanceUp ? (Math.random() - 0.5) * 12 : 16 + Math.random() * 8;
      lookAt(targetX, targetY, glanceUp ? 0.24 : 0.2, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, glanceUp ? 750 : 1100 + Math.random() * 1100);
      return;
    }

    const patternType = Math.random();
    let targetX = 0;
    let targetY = 0;
    let duration = 0.22;
    let holdDuration = 1000;
    let ease = 'power3.out';

    if (patternType < 0.30) {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (26 + Math.random() * 18);
      targetY = (Math.random() - 0.5) * 22;
      duration = 0.18 + Math.random() * 0.08;
      holdDuration = 650 + Math.random() * 1100;
      ease = 'back.out(1.35)';
    } else if (patternType < 0.54) {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (16 + Math.random() * 20);
      targetY = -(12 + Math.random() * 15);
      duration = 0.22 + Math.random() * 0.06;
      holdDuration = 850 + Math.random() * 1300;
      ease = 'power3.out';
    } else if (patternType < 0.74) {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (14 + Math.random() * 22);
      targetY = 12 + Math.random() * 14;
      duration = 0.2;
      holdDuration = 750 + Math.random() * 1150;
      ease = 'power2.out';
    } else if (patternType < 0.88) {
      targetX = (Math.random() - 0.5) * 14;
      targetY = (Math.random() - 0.5) * 10;
      duration = 0.32;
      holdDuration = 1100 + Math.random() * 1500;
      ease = 'power2.inOut';
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * 36;
      targetY = (Math.random() - 0.5) * 16;
      duration = 0.15;
      holdDuration = 300;
      ease = 'power4.out';
    }

    currentGazePosRef.current = { x: targetX, y: targetY };
    lookAt(targetX, targetY, duration, ease);

    ocularLoopTimeoutRef.current = setTimeout(() => {
      if (!isUserTrackingRef.current && !isHoveredRef.current && Math.random() < 0.5) {
        const driftX = targetX + (Math.random() - 0.5) * 7;
        const driftY = targetY + (Math.random() - 0.5) * 5;
        lookAt(driftX, driftY, 0.35, 'sine.inOut');
      }
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, holdDuration);
    }, duration * 1000);
  }, [lookAt, isTyping, isInputFocused]);

  // Organic blinking animation
  const triggerBlink = useCallback(() => {
    if (isBlinkingRef.current || !leftEyeInnerRef.current || !rightEyeInnerRef.current) return;
    isBlinkingRef.current = true;

    const isDoubleBlink = Math.random() < 0.24;
    const eyeInners = [leftEyeInnerRef.current, rightEyeInnerRef.current];

    if (!isUserTrackingRef.current && !isHoveredRef.current && !isTyping && !isInputFocused && Math.random() < 0.55) {
      const shiftX = (Math.random() - 0.5) * 38;
      const shiftY = (Math.random() - 0.5) * 22;
      lookAt(shiftX, shiftY, 0.18, 'power2.out');
    }

    const tl = gsap.timeline({
      onComplete: () => {
        isBlinkingRef.current = false;
        scheduleNextBlink();
      },
    });

    tl.to(eyeInners, {
      scaleY: 0.05,
      duration: 0.075,
      ease: 'power2.in',
      transformOrigin: '50% 50%',
    })
    .to(eyeInners, {
      scaleY: 1,
      duration: 0.12,
      ease: 'power2.out',
      transformOrigin: '50% 50%',
    });

    if (isDoubleBlink) {
      tl.to(eyeInners, {
        scaleY: 0.05,
        duration: 0.065,
        delay: 0.08,
        ease: 'power2.in',
        transformOrigin: '50% 50%',
      })
      .to(eyeInners, {
        scaleY: 1,
        duration: 0.11,
        ease: 'power2.out',
        transformOrigin: '50% 50%',
      });
    }
  }, [lookAt, isTyping, isInputFocused]);

  const scheduleNextBlink = useCallback(() => {
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    const nextInterval = 2800 + Math.random() * 2400;
    blinkTimerRef.current = setTimeout(triggerBlink, nextInterval);
  }, [triggerBlink]);

  // Dynamic Chromatic Shimmer Wave & Breathing Cycle across Circle Outline & Eyes
  useEffect(() => {
    const auras = [headAuraRef.current, leftEyeAuraRef.current, rightEyeAuraRef.current].filter(Boolean);
    const strokes = [headOutlineRef.current, leftEyeStrokeRef.current, rightEyeStrokeRef.current].filter(Boolean);
    if (!auras.length || !strokes.length) return;

    // Continuous liquid-light gradient angle rotation across head circle and eyes
    const gradObj = { angle: 0 };
    const gradTween = gsap.to(gradObj, {
      angle: 360,
      duration: 8,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        if (headGradRef.current) {
          headGradRef.current.setAttribute('gradientTransform', `rotate(${gradObj.angle} 370 326)`);
        }
        if (leftGradRef.current) {
          leftGradRef.current.setAttribute('gradientTransform', `rotate(${gradObj.angle} 324 281)`);
        }
        if (rightGradRef.current) {
          rightGradRef.current.setAttribute('gradientTransform', `rotate(${gradObj.angle + 60} 476 272)`);
        }
      },
    });

    if (!isTyping && !isInputFocused) {
      breathingTlRef.current = gsap.timeline({ repeat: -1, repeatDelay: 1.8 });

      breathingTlRef.current
        .set(strokes, { opacity: isInline ? 0.85 : 0.65 })
        .set(auras, { opacity: isInline ? 0.38 : 0.20 })
        .to(strokes, {
          opacity: 1.0,
          duration: 1.4,
          ease: 'power2.inOut',
        }, '+=1.0')
        .to(auras, {
          opacity: 0.85,
          duration: 1.4,
          ease: 'power2.inOut',
        }, '<')
        .to(strokes, {
          opacity: 1.0,
          duration: 1.8,
          ease: 'sine.inOut',
        })
        .to(auras, {
          opacity: 0.88,
          duration: 1.8,
          ease: 'sine.inOut',
        }, '<')
        .to(strokes, {
          opacity: isInline ? 0.85 : 0.65,
          duration: 1.6,
          ease: 'power2.inOut',
        })
        .to(auras, {
          opacity: isInline ? 0.32 : 0.16,
          duration: 1.6,
          ease: 'power2.inOut',
        }, '<');
    }

    return () => {
      gradTween.kill();
      if (breathingTlRef.current) breathingTlRef.current.kill();
    };
  }, [isTyping, isInputFocused, isInline]);

  // Pointer tracking across the viewport
  useEffect(() => {
    runAutonomousOcularMovements();

    const handlePointerMove = (e) => {
      if (!containerRef.current || isHoveredRef.current) return;
      isUserTrackingRef.current = true;
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);
      if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const maxDistX = Math.max(window.innerWidth / 2, 380);
      const maxDistY = Math.max(window.innerHeight / 2, 320);

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxDistX));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxDistY));

      mousePosRef.current = { x: normX, y: normY };

      let targetX = normX * 38;
      let targetY = normY * 24;

      if (isInputFocused || isTyping) {
        targetY = Math.max(targetY, 12) + 8;
      }

      lookAt(targetX, targetY, 0.25, 'power2.out');

      userTrackingTimeoutRef.current = setTimeout(() => {
        isUserTrackingRef.current = false;
        runAutonomousOcularMovements();
      }, 600);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    scheduleNextBlink();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);
      if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [lookAt, isInputFocused, isTyping, scheduleNextBlink, runAutonomousOcularMovements]);

  // Initial entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headOutlineRef.current) {
        gsap.set(headOutlineRef.current, { opacity: 0, scale: 0.92, y: 10, transformOrigin: '50% 50%' });
      }
      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        gsap.set([leftEyeWrapRef.current, rightEyeWrapRef.current], { opacity: 0, scaleY: 0, y: 8, transformOrigin: '50% 50%' });
      }

      const entranceTl = gsap.timeline({
        delay: isInline ? 0.15 : 0.4,
        defaults: { ease: 'power3.out' },
      });

      if (headOutlineRef.current) {
        entranceTl.to(headOutlineRef.current, {
          opacity: 0.92,
          scale: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          onComplete: () => {
            gsap.to([headOutlineRef.current, headAuraRef.current].filter(Boolean), {
              y: -2.5,
              duration: 3.2,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });
          }
        }, 0.05);
      }

      if (leftEyeWrapRef.current && rightEyeWrapRef.current) {
        entranceTl.to([leftEyeWrapRef.current, rightEyeWrapRef.current], {
          opacity: 0.95,
          scaleY: 1,
          y: 0,
          duration: 0.6,
          ease: 'back.out(2.0)',
        }, 0.18);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isInline]);

  // Primary outline stroke color fallback
  const primaryStroke = isDarkMode ? '#9CA3AF' : '#4B5563';

  // ── Hover & Tap Dynamics ──
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (!containerRef.current) return;

    // 1. Tactile bounce
    gsap.to(containerRef.current, {
      scale: 1.14,
      duration: 0.35,
      ease: 'back.out(2.2)',
      overwrite: 'auto',
    });

    // 2. Inquisitive upward gaze
    lookAt(0, -18, 0.22, 'back.out(1.8)');

    // 3. Circle outline & Eyes chromatic bloom surge
    const auras = [headAuraRef.current, leftEyeAuraRef.current, rightEyeAuraRef.current].filter(Boolean);
    const strokes = [headOutlineRef.current, leftEyeStrokeRef.current, rightEyeStrokeRef.current].filter(Boolean);
    if (auras.length && strokes.length) {
      gsap.to(strokes, { opacity: 1, duration: 0.25, overwrite: 'auto' });
      gsap.to(auras, { opacity: 0.95, duration: 0.25, overwrite: 'auto' });
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!containerRef.current) return;

    // 1. Reset scale
    gsap.to(containerRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    // 2. Resume gaze tracking
    lookAt(mousePosRef.current.x * 36, mousePosRef.current.y * 22, 0.35, 'power2.out');
  };

  // Click reaction
  const handlePointerDown = () => {
    if (leftEyeInnerRef.current && rightEyeInnerRef.current) {
      gsap.to([leftEyeInnerRef.current, rightEyeInnerRef.current], {
        scale: 1.14,
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
      }}
      title="PhishLens Animated Character"
      aria-label="PhishLens Animated Character"
    >
      {/* SVG Container with EXACT full circular vector from background_image.svg */}
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
          {/* Head Circle Chromatic Spectrum Gradient (Matching Eyes Spectrum) */}
          <linearGradient
            ref={headGradRef}
            id={headGradId}
            gradientUnits="userSpaceOnUse"
            x1="100"
            y1="60"
            x2="640"
            y2="600"
          >
            <stop offset="0%" stopColor="#FF6363" />
            <stop offset="18%" stopColor="#FFA066" />
            <stop offset="38%" stopColor="#F43F5E" />
            <stop offset="58%" stopColor="#D946EF" />
            <stop offset="76%" stopColor="#8B5CF6" />
            <stop offset="90%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FF6363" />
          </linearGradient>

          {/* Left Eye Chromatic Spectrum Gradient */}
          <linearGradient
            ref={leftGradRef}
            id={leftGradId}
            gradientUnits="userSpaceOnUse"
            x1="280"
            y1="190"
            x2="368"
            y2="370"
          >
            <stop offset="0%" stopColor="#FF6363" />
            <stop offset="18%" stopColor="#FFA066" />
            <stop offset="38%" stopColor="#F43F5E" />
            <stop offset="58%" stopColor="#D946EF" />
            <stop offset="76%" stopColor="#8B5CF6" />
            <stop offset="90%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FF6363" />
          </linearGradient>

          {/* Right Eye Chromatic Spectrum Gradient */}
          <linearGradient
            ref={rightGradRef}
            id={rightGradId}
            gradientUnits="userSpaceOnUse"
            x1="430"
            y1="180"
            x2="522"
            y2="360"
          >
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="18%" stopColor="#8B5CF6" />
            <stop offset="38%" stopColor="#D946EF" />
            <stop offset="58%" stopColor="#F43F5E" />
            <stop offset="78%" stopColor="#FFA066" />
            <stop offset="90%" stopColor="#FF6363" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          {/* Atmospheric Chromatic Glow / Bloom Filter */}
          <filter id={bloomFilterId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isInline ? "2.0" : "4.5"} result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation={isInline ? "4.2" : "9.5"} result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
          {/* ── 1. Full Circle Head Outline (Layered Chromatic Glowing Stroke) ── */}
          {/* Soft Atmospheric Chromatic Aura Ring */}
          <path
            ref={headAuraRef}
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            fill="none"
            stroke={`url(#${headGradId})`}
            strokeWidth={isInline ? "5.5" : "7.0"}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            filter={`url(#${bloomFilterId})`}
            opacity="0.38"
            style={{
              mixBlendMode: isDarkMode ? 'screen' : 'multiply',
              pointerEvents: 'none',
            }}
          />

          {/* Sharp High-Definition Chromatic Iridescent Head Circle */}
          <path
            ref={headOutlineRef}
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            fill="none"
            stroke={`url(#${headGradId})`}
            strokeWidth={isInline ? "2.6" : "3.2"}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            opacity="0.92"
          />

          {/* ── 2. Left Eye Group ── */}
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
                className="transition-colors duration-300"
              />

              {/* Soft Atmospheric Chromatic Aura */}
              <rect
                ref={leftEyeAuraRef}
                x="288"
                y="203"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 288 203)"
                fill="none"
                stroke={`url(#${leftGradId})`}
                strokeWidth={isInline ? "5.5" : "7.0"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                filter={`url(#${bloomFilterId})`}
                opacity="0.4"
                style={{
                  mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                  pointerEvents: 'none',
                }}
              />

              {/* Sharp High-Definition Chromatic Iridescent Outline */}
              <rect
                ref={leftEyeStrokeRef}
                x="288"
                y="203"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 288 203)"
                fill="none"
                stroke={`url(#${leftGradId})`}
                strokeWidth={isInline ? "2.4" : "3.2"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                opacity="0.45"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          </g>

          {/* ── 3. Right Eye Group ── */}
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
                className="transition-colors duration-300"
              />

              {/* Soft Atmospheric Chromatic Aura */}
              <rect
                ref={rightEyeAuraRef}
                x="440"
                y="194"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 440 194)"
                fill="none"
                stroke={`url(#${rightGradId})`}
                strokeWidth={isInline ? "5.5" : "7.0"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                filter={`url(#${bloomFilterId})`}
                opacity="0.4"
                style={{
                  mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                  pointerEvents: 'none',
                }}
              />

              {/* Sharp High-Definition Chromatic Iridescent Outline */}
              <rect
                ref={rightEyeStrokeRef}
                x="440"
                y="194"
                width="72"
                height="156"
                rx="36"
                transform="rotate(-5 440 194)"
                fill="none"
                stroke={`url(#${rightGradId})`}
                strokeWidth={isInline ? "2.4" : "3.2"}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                opacity="0.45"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
