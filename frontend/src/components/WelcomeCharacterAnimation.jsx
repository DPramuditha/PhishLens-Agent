import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

/**
 * WelcomeCharacterAnimation
 * 
 * Renders the background SVG character vector with Apple-calibrated fluid motion
 * and an iridescent chromatic outline glow effect on the eyes (matching the reference image):
 * - Chromatic liquid-light spectrum: coral pink, amber peach, fuchsia, violet, cyan
 * - Outline-only layered rendering (sharp iridescent stroke + atmospheric blurred aura)
 * - Periodic "not always" breathing shimmer wave (organic idle surge & settle)
 * - Dynamic interactive awakening (flares into peak radiance during typing/input focus/clicks)
 * - Fluid gaze tracking, natural blinking, and micro-saccades
 */
export default function WelcomeCharacterAnimation({
  isInputFocused = false,
  isTyping = false,
  isDarkMode = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const headOutlineRef = useRef(null);
  const leftEyeWrapRef = useRef(null);
  const rightEyeWrapRef = useRef(null);
  const leftEyeInnerRef = useRef(null);
  const rightEyeInnerRef = useRef(null);
  const leftEyeStrokeRef = useRef(null);
  const rightEyeStrokeRef = useRef(null);
  const leftEyeAuraRef = useRef(null);
  const rightEyeAuraRef = useRef(null);
  const glowRef = useRef(null);

  // References for tracking state
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isIdleRef = useRef(true);
  const idleTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const isBlinkingRef = useRef(false);
  const breathingTlRef = useRef(null);

  // Autonomous Lifelike Real Eye Movement Engine (Saccades, Fixations & Scanning)
  const isUserTrackingRef = useRef(false);
  const userTrackingTimeoutRef = useRef(null);
  const ocularLoopTimeoutRef = useRef(null);
  const currentGazePosRef = useRef({ x: 0, y: 0 });

  // Amplified, expressive eye movement with smooth GSAP damping
  const lookAt = useCallback((targetX, targetY, duration = 0.25, ease = 'power2.out') => {
    if (!leftEyeWrapRef.current || !rightEyeWrapRef.current) return;
    
    // Smooth translation with slight parallax depth and subtle expressive tilt
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

  // Autonomous ocular movements for normal situation (mimics real human/living eye behavior)
  const runAutonomousOcularMovements = useCallback(() => {
    if (isUserTrackingRef.current) return;

    if (isTyping) {
      // While typing: active reading-like saccades across the text input
      const readX = (Math.random() - 0.5) * 26;
      const readY = 18 + Math.random() * 8;
      lookAt(readX, readY, 0.18, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, 380 + Math.random() * 600);
      return;
    }

    if (isInputFocused) {
      // While input is focused: attentive downward gaze with occasional curious glance up
      const glanceUp = Math.random() < 0.22;
      const targetX = (Math.random() - 0.5) * 24;
      const targetY = glanceUp ? (Math.random() - 0.5) * 12 : 16 + Math.random() * 8;
      lookAt(targetX, targetY, glanceUp ? 0.24 : 0.2, 'power2.out');
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, glanceUp ? 750 : 1100 + Math.random() * 1100);
      return;
    }

    // Normal Idle Situation: Rich, lifelike ocular exploration patterns
    const patternType = Math.random();
    let targetX = 0;
    let targetY = 0;
    let duration = 0.22;
    let holdDuration = 1000;
    let ease = 'power3.out';

    if (patternType < 0.30) {
      // 1. Wide horizontal exploratory scan (looking left or right horizon)
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (26 + Math.random() * 18); // ±26px to ±44px
      targetY = (Math.random() - 0.5) * 22;      // ±11px
      duration = 0.18 + Math.random() * 0.08;
      holdDuration = 650 + Math.random() * 1100;
      ease = 'back.out(1.35)'; // crisp ocular snap with natural slight settle
    } else if (patternType < 0.54) {
      // 2. Inquisitive upward thinking gaze
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (16 + Math.random() * 20);
      targetY = -(12 + Math.random() * 15); // looking up
      duration = 0.22 + Math.random() * 0.06;
      holdDuration = 850 + Math.random() * 1300;
      ease = 'power3.out';
    } else if (patternType < 0.74) {
      // 3. Contemplative downward/ground gaze
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * (14 + Math.random() * 22);
      targetY = 12 + Math.random() * 14; // looking down
      duration = 0.2;
      holdDuration = 750 + Math.random() * 1150;
      ease = 'power2.out';
    } else if (patternType < 0.88) {
      // 4. Center direct engagement with subtle ocular drift
      targetX = (Math.random() - 0.5) * 14;
      targetY = (Math.random() - 0.5) * 10;
      duration = 0.32;
      holdDuration = 1100 + Math.random() * 1500;
      ease = 'power2.inOut';
    } else {
      // 5. Quick double saccade glance
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = side * 36;
      targetY = (Math.random() - 0.5) * 16;
      duration = 0.15;
      holdDuration = 300; // very short hold before next rapid saccade
      ease = 'power4.out';
    }

    currentGazePosRef.current = { x: targetX, y: targetY };
    lookAt(targetX, targetY, duration, ease);

    // Subtle head follow tilt for extra realism
    if (headOutlineRef.current) {
      gsap.to(headOutlineRef.current, {
        x: targetX * 0.09,
        rotation: targetX * 0.035,
        duration: duration * 1.5,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    // Schedule next eye movement with organic micro-drift in between
    ocularLoopTimeoutRef.current = setTimeout(() => {
      // Micro-drift before full saccade (subconscious ocular tremor)
      if (!isUserTrackingRef.current && Math.random() < 0.5) {
        const driftX = targetX + (Math.random() - 0.5) * 7;
        const driftY = targetY + (Math.random() - 0.5) * 5;
        lookAt(driftX, driftY, 0.35, 'sine.inOut');
      }
      ocularLoopTimeoutRef.current = setTimeout(runAutonomousOcularMovements, holdDuration);
    }, duration * 1000);
  }, [lookAt, isTyping, isInputFocused]);

  // Organic blinking animation (scales the entire eye group synchronously)
  const triggerBlink = useCallback(() => {
    if (isBlinkingRef.current || !leftEyeInnerRef.current || !rightEyeInnerRef.current) return;
    isBlinkingRef.current = true;

    const isDoubleBlink = Math.random() < 0.24; // ~24% chance of natural double-blink
    const eyeInners = [leftEyeInnerRef.current, rightEyeInnerRef.current];

    // During blink, naturally shift gaze position (saccadic suppression)
    if (!isUserTrackingRef.current && !isTyping && !isInputFocused && Math.random() < 0.55) {
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

    // First blink down & up
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

    // Optional second rapid blink
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
    // Random interval between 2.8s and 5.2s
    const nextInterval = 2800 + Math.random() * 2400;
    blinkTimerRef.current = setTimeout(triggerBlink, nextInterval);
  }, [triggerBlink]);

  // Dynamic Chromatic Shimmer Wave & Breathing Cycle ("Not Always")
  useEffect(() => {
    const auras = [leftEyeAuraRef.current, rightEyeAuraRef.current].filter(Boolean);
    const strokes = [leftEyeStrokeRef.current, rightEyeStrokeRef.current].filter(Boolean);
    if (!auras.length || !strokes.length) return;

    // Continuous liquid-light gradient angle rotation
    const gradObj = { angle: 0 };
    const gradTween = gsap.to(gradObj, {
      angle: 360,
      duration: 8,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        const leftGrad = document.getElementById('eye_chromatic_grad_left');
        const rightGrad = document.getElementById('eye_chromatic_grad_right');
        if (leftGrad) {
          leftGrad.setAttribute('gradientTransform', `rotate(${gradObj.angle} 324 281)`);
        }
        if (rightGrad) {
          rightGrad.setAttribute('gradientTransform', `rotate(${gradObj.angle + 60} 476 272)`);
        }
      },
    });

    // Organic periodic breathing cycle ("not always" on at peak)
    if (!isTyping && !isInputFocused) {
      breathingTlRef.current = gsap.timeline({ repeat: -1, repeatDelay: 1.8 });

      breathingTlRef.current
        // 1. Resting phase
        .set(strokes, { opacity: 0.25 })
        .set(auras, { opacity: 0.15 })
        // 2. Chromatic wave blooms into vibrant radiance (matches reference image glow)
        .to(strokes, {
          opacity: 0.95,
          duration: 1.4,
          ease: 'power2.inOut',
        }, '+=1.0')
        .to(auras, {
          opacity: 0.85,
          duration: 1.4,
          ease: 'power2.inOut',
        }, '<')
        // 3. Holds radiant peak
        .to(strokes, {
          opacity: 0.98,
          duration: 1.8,
          ease: 'sine.inOut',
        })
        .to(auras, {
          opacity: 0.88,
          duration: 1.8,
          ease: 'sine.inOut',
        }, '<')
        // 4. Softly recedes back to gentle resting ambient
        .to(strokes, {
          opacity: 0.22,
          duration: 1.6,
          ease: 'power2.inOut',
        })
        .to(auras, {
          opacity: 0.12,
          duration: 1.6,
          ease: 'power2.inOut',
        }, '<');
    }

    return () => {
      gradTween.kill();
      if (breathingTlRef.current) breathingTlRef.current.kill();
    };
  }, [isTyping, isInputFocused]);

  // Handle pointer tracking, click reaction & autonomous real eye loop
  useEffect(() => {
    // Start autonomous eye movements immediately in normal situation
    runAutonomousOcularMovements();

    const handlePointerMove = (e) => {
      if (!containerRef.current) return;
      isUserTrackingRef.current = true;
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);
      if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate normalized offset [-1, 1] relative to viewport / container center
      const maxDistX = Math.max(window.innerWidth / 2, 380);
      const maxDistY = Math.max(window.innerHeight / 2, 320);

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxDistX));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxDistY));

      mousePosRef.current = { x: normX, y: normY };

      // Amplified expressive eye translation bounds (±38px horizontally, ±24px vertically)
      let targetX = normX * 38;
      let targetY = normY * 24;

      // If user is focused on the input bar, tilt gaze downward
      if (isInputFocused || isTyping) {
        targetY = Math.max(targetY, 12) + 8;
      }

      lookAt(targetX, targetY, 0.25, 'power2.out');

      if (headOutlineRef.current) {
        gsap.to(headOutlineRef.current, {
          x: targetX * 0.08,
          rotation: targetX * 0.03,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      // If mouse rests for > 600ms, seamlessly resume natural autonomous eye movements
      userTrackingTimeoutRef.current = setTimeout(() => {
        isUserTrackingRef.current = false;
        runAutonomousOcularMovements();
      }, 600);
    };

    const handlePointerDown = () => {
      if (!leftEyeInnerRef.current || !rightEyeInnerRef.current) return;
      
      // Eye squish on pointer down
      gsap.to([leftEyeInnerRef.current, rightEyeInnerRef.current], {
        scale: 1.08,
        duration: 0.12,
        ease: 'power2.out',
        transformOrigin: '50% 50%',
        yoyo: true,
        repeat: 1,
      });

      // Chromatic glow surge on tap
      const auras = [leftEyeAuraRef.current, rightEyeAuraRef.current].filter(Boolean);
      const strokes = [leftEyeStrokeRef.current, rightEyeStrokeRef.current].filter(Boolean);
      if (auras.length && strokes.length) {
        gsap.to(strokes, { opacity: 1, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
        gsap.to(auras, { opacity: 0.95, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    scheduleNextBlink();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (userTrackingTimeoutRef.current) clearTimeout(userTrackingTimeoutRef.current);
      if (ocularLoopTimeoutRef.current) clearTimeout(ocularLoopTimeoutRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [lookAt, isInputFocused, isTyping, scheduleNextBlink, runAutonomousOcularMovements]);

  // Respond to input focus or typing changes (interactive awakening)
  useEffect(() => {
    if (!leftEyeWrapRef.current || !rightEyeWrapRef.current) return;
    const auras = [leftEyeAuraRef.current, rightEyeAuraRef.current].filter(Boolean);
    const strokes = [leftEyeStrokeRef.current, rightEyeStrokeRef.current].filter(Boolean);
    const inners = [leftEyeInnerRef.current, rightEyeInnerRef.current].filter(Boolean);

    if (isTyping) {
      // Attentive, distinct downward gaze with slight squint focus + Peak Chromatic Aura Bloom
      lookAt(mousePosRef.current.x * 12, 20, 0.22, 'power2.out');
      gsap.to(inners, {
        scaleX: 1.05,
        scaleY: 0.92,
        duration: 0.2,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
      if (strokes.length && auras.length) {
        gsap.to(strokes, { opacity: 1.0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(auras, { opacity: 0.9, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      }
    } else if (isInputFocused) {
      // Distinct downward gaze towards input bar + Elevated Chromatic Aura
      lookAt(mousePosRef.current.x * 16, 16, 0.28, 'power2.out');
      gsap.to(inners, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.25,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
      if (strokes.length && auras.length) {
        gsap.to(strokes, { opacity: 0.85, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(auras, { opacity: 0.72, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
    } else {
      // Normal state
      lookAt(mousePosRef.current.x * 36, mousePosRef.current.y * 22, 0.35, 'power2.out');
      gsap.to(inners, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.3,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      });
    }
  }, [isInputFocused, isTyping, lookAt]);

  // Initial entrance animation
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
          opacity: 0.95,
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

          {/* Left Eye Chromatic Spectrum Gradient (Matching Reference Image) */}
          <linearGradient
            id="eye_chromatic_grad_left"
            gradientUnits="userSpaceOnUse"
            x1="290"
            y1="210"
            x2="355"
            y2="345"
          >
            <stop offset="0%" stopColor="#FF6363" />
            <stop offset="18%" stopColor="#FFA066" />
            <stop offset="38%" stopColor="#F43F5E" />
            <stop offset="58%" stopColor="#D946EF" />
            <stop offset="76%" stopColor="#8B5CF6" />
            <stop offset="90%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FF6363" />
          </linearGradient>

          {/* Right Eye Chromatic Spectrum Gradient (Phase Shifted for Dynamic Liquid Depth) */}
          <linearGradient
            id="eye_chromatic_grad_right"
            gradientUnits="userSpaceOnUse"
            x1="440"
            y1="200"
            x2="510"
            y2="335"
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
          <filter id="eye_chromatic_bloom" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="9.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#welcome_character_clip)">
          {/* Head Dome outline - exact path from background_image.svg (Preserved Minimal Silhouette) */}
          <path
            ref={headOutlineRef}
            opacity="0.9"
            d="M359.821 66.2488L368.249 66.0845C511.732 63.2873 630.316 177.336 633.114 320.82C635.911 464.303 521.863 582.888 378.379 585.686L369.95 585.85C226.466 588.647 107.882 474.598 105.084 331.114C102.287 187.63 216.337 69.0462 359.821 66.2488Z"
            stroke={primaryStroke}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />

          {/* Left Eye Group - Multi-Layered Outline with Chromatic Iris Aura */}
          <g ref={leftEyeWrapRef}>
            <g ref={leftEyeInnerRef}>
              {/* Base Eye Fill & Neutral Contour */}
              <rect
                opacity="0.9"
                x="297.542"
                y="222.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 297.542 222.161)"
                stroke={primaryStroke}
                strokeWidth="2.5"
                fill={isDarkMode ? 'rgba(74, 74, 74, 0.16)' : 'rgba(74, 74, 74, 0.05)'}
                className="transition-colors duration-300"
              />

              {/* Soft Atmospheric Chromatic Aura (Glowing Blurred Ring Halo) */}
              <rect
                ref={leftEyeAuraRef}
                x="297.542"
                y="222.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 297.542 222.161)"
                fill="none"
                stroke="url(#eye_chromatic_grad_left)"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#eye_chromatic_bloom)"
                opacity="0.25"
                style={{
                  mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                  pointerEvents: 'none',
                }}
              />

              {/* Sharp High-Definition Chromatic Iridescent Outline */}
              <rect
                ref={leftEyeStrokeRef}
                x="297.542"
                y="222.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 297.542 222.161)"
                fill="none"
                stroke="url(#eye_chromatic_grad_left)"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.35"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          </g>

          {/* Right Eye Group - Multi-Layered Outline with Chromatic Iris Aura */}
          <g ref={rightEyeWrapRef}>
            <g ref={rightEyeInnerRef}>
              {/* Base Eye Fill & Neutral Contour */}
              <rect
                opacity="0.9"
                x="449.542"
                y="213.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 449.542 213.161)"
                stroke={primaryStroke}
                strokeWidth="2.5"
                fill={isDarkMode ? 'rgba(74, 74, 74, 0.16)' : 'rgba(74, 74, 74, 0.05)'}
                className="transition-colors duration-300"
              />

              {/* Soft Atmospheric Chromatic Aura (Glowing Blurred Ring Halo) */}
              <rect
                ref={rightEyeAuraRef}
                x="449.542"
                y="213.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 449.542 213.161)"
                fill="none"
                stroke="url(#eye_chromatic_grad_right)"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#eye_chromatic_bloom)"
                opacity="0.25"
                style={{
                  mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                  pointerEvents: 'none',
                }}
              />

              {/* Sharp High-Definition Chromatic Iridescent Outline */}
              <rect
                ref={rightEyeStrokeRef}
                x="449.542"
                y="213.161"
                width="53"
                height="117.345"
                rx="26.5"
                transform="rotate(-5 449.542 213.161)"
                fill="none"
                stroke="url(#eye_chromatic_grad_right)"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.35"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

