import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function AnimatedCircularProgressBar({
  value = 0,
  min = 0,
  max = 100,
  className = '',
}) {
  const circleRef = useRef(null);
  const containerRef = useRef(null);
  const [animatedValue, setAnimatedValue] = useState(0);

  // Determine colors based on risk score (value)
  // 0-20: safe (green)
  // 21-40: low (yellow)
  // 41-60: medium (orange)
  // 61-80: high (rose)
  // 81-100: critical (red)
  const getRiskDetails = (val) => {
    if (val <= 20) {
      return {
        colorClass: 'stroke-emerald-500 dark:stroke-emerald-400',
        textClass: 'text-emerald-500 dark:text-emerald-400',
        glowClass: 'shadow-emerald-500/20 dark:shadow-emerald-400/20',
      };
    } else if (val <= 40) {
      return {
        colorClass: 'stroke-amber-500 dark:stroke-amber-400',
        textClass: 'text-amber-500 dark:text-amber-400',
        glowClass: 'shadow-amber-500/20 dark:shadow-amber-400/20',
      };
    } else if (val <= 60) {
      return {
        colorClass: 'stroke-orange-500 dark:stroke-orange-400',
        textClass: 'text-orange-500 dark:text-orange-400',
        glowClass: 'shadow-orange-500/20 dark:shadow-orange-400/20',
      };
    } else if (val <= 80) {
      return {
        colorClass: 'stroke-rose-500 dark:stroke-rose-400',
        textClass: 'text-rose-500 dark:text-rose-400',
        glowClass: 'shadow-rose-500/20 dark:shadow-rose-400/20',
      };
    } else {
      return {
        colorClass: 'stroke-red-500 dark:stroke-red-400',
        textClass: 'text-red-500 dark:text-red-400',
        glowClass: 'shadow-red-500/20 dark:shadow-red-400/20',
      };
    }
  };

  const { colorClass, textClass } = getRiskDetails(value);

  // SVG parameters
  const radius = 45;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius; // 282.74

  useEffect(() => {
    if (!circleRef.current) return;

    // Calculate progress fraction
    const progress = Math.max(min, Math.min(max, value));
    const targetOffset = circumference - (progress / (max - min)) * circumference;

    const ctx = gsap.context(() => {
      // 1. Animate the progress bar circle draw-in
      gsap.fromTo(
        circleRef.current,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: targetOffset,
          duration: 1.6,
          ease: 'power4.out',
        }
      );

      // 2. Count up the animated text value
      const counter = { val: 0 };
      gsap.to(counter, {
        val: value,
        duration: 1.6,
        ease: 'power4.out',
        onUpdate: () => {
          setAnimatedValue(Math.round(counter.val));
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [value, max, min, circumference]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center transition-transform hover:scale-105 duration-300 ${className}`}
      style={{ width: 100, height: 100 }}
    >
      <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
        {/* Track circle (Background) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-gray-100 dark:stroke-gray-800/80"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle (Animated) */}
        <circle
          ref={circleRef}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={`transition-all duration-300 ${colorClass}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage label in center */}
      <div className="absolute flex flex-col items-center justify-center select-none">
        <span className={`text-2xl font-extrabold tracking-tighter ${textClass}`}>
          {animatedValue}%
        </span>
        <span className="text-[8px] uppercase font-bold tracking-widest opacity-60 text-gray-400 dark:text-gray-500">
          Risk
        </span>
      </div>
    </div>
  );
}
