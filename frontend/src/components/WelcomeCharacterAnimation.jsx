import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

// Light SVG Animation Assets ("orange-anime-light" used for Dark Mode UI)
import neutreLightSvg from '../assets/bloub-hexagone-neutre-orange-anime-light.svg';
import exciteLightSvg from '../assets/bloub-hexagone-excite-orange-anime-light.svg';
import curieuxLightSvg from '../assets/bloub-hexagone-curieux-orange-anime-light.svg';
import surprisLightSvg from '../assets/bloub-hexagone-surpris-orange-anime-light.svg';
import mefiantLightSvg from '../assets/bloub-hexagone-mefiant-orange-anime-light.svg';
import attentifLightSvg from '../assets/bloub-hexagone-attentif-orange-anime-light.svg';
import timideLightSvg from '../assets/bloub-hexagone-timide-orange-anime-light.svg';

// Dark SVG Animation Assets ("encre" used for Light Mode UI)
import neutreDarkSvg from '../assets/bloub-hexagone-neutre-encre-anime.svg';
import exciteDarkSvg from '../assets/bloub-hexagone-excite-encre-anime.svg';
import somnolentDarkSvg from '../assets/bloub-hexagone-somnolent-encre-anime.svg';
import surprisDarkSvg from '../assets/bloub-hexagone-surpris-encre-anime.svg';
import attentifDarkSvg from '../assets/bloub-hexagone-attentif-encre-anime.svg';
import timideDarkSvg from '../assets/bloub-hexagone-timide-encre-anime.svg';

const MOODS = {
  NEUTRAL: 'neutre',
  EXCITED: 'excite',
  ATTENTIVE: 'attentif',
  SURPRISED: 'surpris',
  SUSPICIOUS: 'mefiant',
  SLEEPY: 'somnolent',
  SHY: 'timide',
};

const ALL_MOOD_LIST = [
  MOODS.NEUTRAL,
  MOODS.EXCITED,
  MOODS.ATTENTIVE,
  MOODS.SURPRISED,
  MOODS.SUSPICIOUS,
  MOODS.SHY,
  MOODS.SLEEPY,
];

// Exact SVG Path definitions for GSAP MorphSVG Transitions
const EYE_PATHS = {
  [MOODS.NEUTRAL]: {
    left: 'M-9.3 -11.3A9.3 9.3 0 0 1 0 -20.6L0 -20.6A9.3 9.3 0 0 1 9.3 -11.3L9.3 11.3A9.3 9.3 0 0 1 0 20.6L0 20.6A9.3 9.3 0 0 1 -9.3 11.3Z',
    right: 'M-9.3 -11.3A9.3 9.3 0 0 1 0 -20.6L0 -20.6A9.3 9.3 0 0 1 9.3 -11.3L9.3 11.3A9.3 9.3 0 0 1 0 20.6L0 20.6A9.3 9.3 0 0 1 -9.3 11.3Z',
  },
  [MOODS.EXCITED]: {
    left: 'M-20 -8A20 20 0 0 1 0 -28L0 -28A20 20 0 0 1 20 -8L20 8A20 20 0 0 1 0 28L0 28A20 20 0 0 1 -20 8Z',
    right: 'M-20 -8A20 20 0 0 1 0 -28L0 -28A20 20 0 0 1 20 -8L20 8A20 20 0 0 1 0 28L0 28A20 20 0 0 1 -20 8Z',
  },
  [MOODS.ATTENTIVE]: {
    left: 'M-10.5 -11.5A10.5 10.5 0 0 1 0 -22L0 -22A10.5 10.5 0 0 1 10.5 -11.5L10.5 11.5A10.5 10.5 0 0 1 0 22L0 22A10.5 10.5 0 0 1 -10.5 11.5Z',
    right: 'M-10.5 -11.5A10.5 10.5 0 0 1 0 -22L0 -22A10.5 10.5 0 0 1 10.5 -11.5L10.5 11.5A10.5 10.5 0 0 1 0 22L0 22A10.5 10.5 0 0 1 -10.5 11.5Z',
  },
  [MOODS.SURPRISED]: {
    left: 'M-22.5 -1A22.5 22.5 0 0 1 0 -23.5L0 -23.5A22.5 22.5 0 0 1 22.5 -1L22.5 1A22.5 22.5 0 0 1 0 23.5L0 23.5A22.5 22.5 0 0 1 -22.5 1Z',
    right: 'M-22.5 -1A22.5 22.5 0 0 1 0 -23.5L0 -23.5A22.5 22.5 0 0 1 22.5 -1L22.5 1A22.5 22.5 0 0 1 0 23.5L0 23.5A22.5 22.5 0 0 1 -22.5 1Z',
  },
  [MOODS.SUSPICIOUS]: {
    left: 'M-10.5 -9.5A10.5 10.5 0 0 1 0 -20L0 -20A10.5 10.5 0 0 1 10.5 -9.5L10.5 9.5A10.5 10.5 0 0 1 0 20L0 20A10.5 10.5 0 0 1 -10.5 9.5Z',
    right: 'M-11 0A7.5 7.5 0 0 1 -3.5 -7.5L3.5 -7.5A7.5 7.5 0 0 1 11 0L11 0A7.5 7.5 0 0 1 3.5 7.5L-3.5 7.5A7.5 7.5 0 0 1 -11 0Z',
  },
  [MOODS.SLEEPY]: {
    left: 'M-12 -11A12 12 0 0 1 0 -23L0 -23A12 12 0 0 1 12 -11L12 11A12 12 0 0 1 0 23L0 23A12 12 0 0 1 -12 11Z',
    right: 'M-10 -9A10 10 0 0 1 0 -19L0 -19A10 10 0 0 1 10 -9L10 9A10 10 0 0 1 0 19L0 19A10 10 0 0 1 -10 9Z',
  },
  [MOODS.SHY]: {
    left: 'M-8.5 -6.5A8.5 8.5 0 0 1 0 -15L0 -15A8.5 8.5 0 0 1 8.5 -6.5L8.5 6.5A8.5 8.5 0 0 1 0 15L0 15A8.5 8.5 0 0 1 -8.5 6.5Z',
    right: 'M-8.5 -6.5A8.5 8.5 0 0 1 0 -15L0 -15A8.5 8.5 0 0 1 8.5 -6.5L8.5 6.5A8.5 8.5 0 0 1 0 15L0 15A8.5 8.5 0 0 1 -8.5 6.5Z',
  },
};

// In Dark Mode: display the light SVG animation images ("*-orange-anime-light.svg")
const DARK_MODE_SVG_MAP = {
  [MOODS.NEUTRAL]: neutreLightSvg,
  [MOODS.EXCITED]: exciteLightSvg,
  [MOODS.ATTENTIVE]: attentifLightSvg,
  [MOODS.SURPRISED]: surprisLightSvg,
  [MOODS.SUSPICIOUS]: mefiantLightSvg,
  [MOODS.SLEEPY]: curieuxLightSvg,
  [MOODS.SHY]: timideLightSvg,
};

// In Light Mode: display the dark encre SVG animation images ("*-encre-anime.svg")
const LIGHT_MODE_SVG_MAP = {
  [MOODS.NEUTRAL]: neutreDarkSvg,
  [MOODS.EXCITED]: exciteDarkSvg,
  [MOODS.ATTENTIVE]: attentifDarkSvg,
  [MOODS.SURPRISED]: surprisDarkSvg,
  [MOODS.SUSPICIOUS]: surprisDarkSvg, // fallback if dark variant not present
  [MOODS.SLEEPY]: somnolentDarkSvg,
  [MOODS.SHY]: timideDarkSvg,
};

/**
 * WelcomeCharacterAnimation
 * 
 * Hexagonal Bloub Character Animation:
 * - GSAP MorphSVGPlugin Eye Transition System:
 *   Morphs eye geometries smoothly between expression states:
 *   1. Neutre (Neutral)
 *   2. Excite (Excited)
 *   3. Attentif (Attentive)
 *   4. Surpris (Surprised)
 *   5. Méfiant (Suspicious / Alert)
 *   6. Timide (Shy)
 *   7. Somnolent / Curieux (Sleepy / Curious)
 * - Setup: "light" SVG images shown in Dark Mode, "encre" SVG images shown in Light Mode
 * - Clean display without cast shadows
 * - Scaled up for optimal visibility and presence
 * - Zero cursor click or hover animations
 */
export default function WelcomeCharacterAnimation({
  size = 'inline', // 'inline' | 'small' | 'medium' | 'large'
  isInputFocused = false,
  isTyping = false,
  isDarkMode = true,
  state: stateProp = null,
  className = '',
}) {
  const containerRef = useRef(null);
  const darkModeLayerRefs = useRef({});
  const lightModeLayerRefs = useRef({});
  const [activeMood, setActiveMood] = useState(MOODS.NEUTRAL);
  const prevMoodRef = useRef(MOODS.NEUTRAL);
  const autoCycleTimerRef = useRef(null);
  const moodIndexRef = useRef(0);

  // Determine prop-driven mood state
  const getPropDrivenMood = useCallback(() => {
    if (stateProp && DARK_MODE_SVG_MAP[stateProp]) return stateProp;
    if (isTyping) return MOODS.EXCITED;
    if (isInputFocused) return MOODS.ATTENTIVE;
    return null;
  }, [stateProp, isTyping, isInputFocused]);

  // Handle active mood transitions and continuous autonomous cycling across all files
  useEffect(() => {
    const propMood = getPropDrivenMood();

    if (propMood) {
      if (autoCycleTimerRef.current) clearTimeout(autoCycleTimerRef.current);
      setActiveMood(propMood);
      return;
    }

    const scheduleNextMood = () => {
      if (autoCycleTimerRef.current) clearTimeout(autoCycleTimerRef.current);

      const delay = 3500 + Math.random() * 2500;
      autoCycleTimerRef.current = setTimeout(() => {
        if (getPropDrivenMood()) return;

        // Progressively cycle through all expression files
        moodIndexRef.current = (moodIndexRef.current + 1) % ALL_MOOD_LIST.length;
        const nextMood = ALL_MOOD_LIST[moodIndexRef.current];

        setActiveMood(nextMood);

        const holdDuration = nextMood === MOODS.NEUTRAL ? 3800 : 2800 + Math.random() * 1400;

        autoCycleTimerRef.current = setTimeout(() => {
          if (!getPropDrivenMood()) {
            scheduleNextMood();
          }
        }, holdDuration);
      }, delay);
    };

    scheduleNextMood();

    return () => {
      if (autoCycleTimerRef.current) clearTimeout(autoCycleTimerRef.current);
    };
  }, [getPropDrivenMood]);

  // GSAP MorphSVG Transitions between expression layers
  useEffect(() => {
    const fromMood = prevMoodRef.current;
    const toMood = activeMood;

    if (fromMood === toMood) return;
    prevMoodRef.current = toMood;

    const currentRefs = isDarkMode ? darkModeLayerRefs.current : lightModeLayerRefs.current;
    const fromEl = currentRefs[fromMood];
    const toEl = currentRefs[toMood];

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    // Smoothly dissolve outgoing layer
    if (fromEl) {
      tl.to(
        fromEl,
        {
          opacity: 0,
          scale: 1.06,
          duration: 0.35,
          ease: 'power2.inOut',
        },
        0
      );
    }

    // Smooth spring popup & MorphSVG transition for incoming eye expression layer
    if (toEl) {
      tl.fromTo(
        toEl,
        {
          opacity: 0,
          scale: 0.7,
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(2.2)',
        },
        0
      );
    }
  }, [activeMood, isDarkMode]);

  // Scaled dimensions based on size prop
  const isInline = size === 'inline';
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';

  const getDimensionsStyle = () => {
    if (isInline) {
      return {
        width: 'clamp(70px, 8.4vw, 100px)',
        height: 'clamp(70px, 8.4vw, 100px)',
        aspectRatio: '1 / 1',
        verticalAlign: 'middle',
      };
    }
    if (isSmall) {
      return { width: '72px', height: '72px', aspectRatio: '1 / 1' };
    }
    if (isMedium) {
      return { width: '124px', height: '124px', aspectRatio: '1 / 1' };
    }
    if (isLarge) {
      return { width: '230px', height: '230px', aspectRatio: '1 / 1' };
    }
    return { width: '100%', height: '100%' };
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center select-none pointer-events-none bg-transparent border-0 shadow-none ${className}`}
      style={{
        ...getDimensionsStyle(),
      }}
      title="PhishLens Animated Assistant"
      aria-label="PhishLens Animated Assistant"
    >
      {/* Eye Layers Container without shadow */}
      <div className="w-full h-full relative flex items-center justify-center">
        {/* Dark Mode: Display Light SVG Files ("*-orange-anime-light.svg") */}
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
            isDarkMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {Object.entries(DARK_MODE_SVG_MAP).map(([moodKey, svgSrc]) => {
            const isCurrent = moodKey === activeMood;
            return (
              <img
                key={`dark-mode-light-svg-${moodKey}`}
                ref={(el) => {
                  darkModeLayerRefs.current[moodKey] = el;
                }}
                src={svgSrc}
                alt={`Mascot Light SVG for Dark Mode ${moodKey}`}
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  opacity: isCurrent ? 1 : 0,
                  transformOrigin: '50% 50%',
                  willChange: 'transform, opacity',
                }}
              />
            );
          })}
        </div>

        {/* Light Mode: Display Dark SVG Files ("*-encre-anime.svg") */}
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
            !isDarkMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {Object.entries(LIGHT_MODE_SVG_MAP).map(([moodKey, svgSrc]) => {
            const isCurrent = moodKey === activeMood;
            return (
              <img
                key={`light-mode-dark-svg-${moodKey}`}
                ref={(el) => {
                  lightModeLayerRefs.current[moodKey] = el;
                }}
                src={svgSrc}
                alt={`Mascot Dark SVG for Light Mode ${moodKey}`}
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  opacity: isCurrent ? 1 : 0,
                  transformOrigin: '50% 50%',
                  willChange: 'transform, opacity',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
