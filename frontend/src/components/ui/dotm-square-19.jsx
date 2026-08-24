import { useMemo } from 'react';
import { DotMatrixBase } from './dotmatrix-core';
import { useDotMatrixPhases, usePrefersReducedMotion, useSteppedCycle } from './dotmatrix-hooks';

const STEP_COUNT = 48;
const BASE_OPACITY = 0.08;
const SECONDARY_TRAIL_OPACITY = 0.32;
const PRIMARY_TRAIL_OPACITY = 0.62;
const PEAK_OPACITY = 1;
const CURVE_OPACITY = 0.2;

const CURVE_SAMPLES = Array.from({ length: 96 }, (_, index) => {
  const t = (index / 96) * Math.PI * 2;
  return {
    x: Math.sin(t),
    y: 0.58 * Math.sin(2 * t)
  };
});

function gridPoint(row, col) {
  return {
    x: (col - 2) / 2,
    y: (2 - row) / 2
  };
}

function loopPoint(step) {
  const t = ((step % STEP_COUNT) / STEP_COUNT) * Math.PI * 2;
  return {
    x: Math.sin(t),
    y: 0.58 * Math.sin(2 * t)
  };
}

function squaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function minCurveDistanceSq(point) {
  let min = Number.POSITIVE_INFINITY;
  for (const sample of CURVE_SAMPLES) {
    min = Math.min(min, squaredDistance(point, sample));
  }
  return min;
}

function headInfluence(dot, head) {
  const distSq = squaredDistance(dot, head);
  return Math.exp(-distSq / 0.19);
}

export function DotmSquare19({
  speed = 1,
  pattern = "full",
  animated = true,
  hoverAnimated = false,
  color = "#C15B2B",
  ...rest
}) {
  const reducedMotion = usePrefersReducedMotion();
  const { phase: matrixPhase, onMouseEnter, onMouseLeave } = useDotMatrixPhases({
    animated: Boolean(animated && !reducedMotion),
    hoverAnimated: Boolean(hoverAnimated && !reducedMotion),
    speed
  });
  const step = useSteppedCycle({
    active: !reducedMotion && matrixPhase !== "idle",
    cycleMsBase: 1700,
    steps: STEP_COUNT,
    speed,
  });

  const resolver = useMemo(() => {
    return ({ isActive, row, col, phase }) => {
      if (!isActive) {
        return { className: "dmx-inactive" };
      }

      const dot = gridPoint(row, col);

      if (reducedMotion || phase === "idle") {
        const curveGlow = Math.exp(-minCurveDistanceSq(dot) / 0.2);
        const centerBoost = Math.exp(-(dot.x * dot.x + dot.y * dot.y) / 0.06);
        return {
          style: {
            opacity: Math.min(PEAK_OPACITY, BASE_OPACITY + curveGlow * CURVE_OPACITY + centerBoost * 0.18)
          }
        };
      }

      const headA = loopPoint(step);
      const headB = loopPoint(step + STEP_COUNT / 2);
      const trailA = loopPoint(step - 4);
      const trailB = loopPoint(step + STEP_COUNT / 2 - 4);

      const lead = Math.max(headInfluence(dot, headA), headInfluence(dot, headB));
      const trail = Math.max(headInfluence(dot, trailA), headInfluence(dot, trailB));
      const centerPulse = Math.exp(-(dot.x * dot.x + dot.y * dot.y) / 0.05) * (0.45 + 0.55 * lead);

      const opacity =
        BASE_OPACITY +
        SECONDARY_TRAIL_OPACITY * trail +
        PRIMARY_TRAIL_OPACITY * lead +
        0.16 * centerPulse;

      return { style: { opacity: Math.min(PEAK_OPACITY, opacity) } };
    };
  }, [reducedMotion, step]);

  return (
    <DotMatrixBase
      {...rest}
      color={color}
      speed={speed}
      pattern={pattern}
      animated={animated}
      phase={matrixPhase}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      reducedMotion={reducedMotion}
      animationResolver={resolver}
    />
  );
}

export default DotmSquare19;
