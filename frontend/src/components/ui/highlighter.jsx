import { useEffect, useState, useRef } from 'react';

/**
 * Highlight component that mimics the hand-drawn wobbly marker stroke effect of Rough Notation.
 * It dynamically calculates the client rects of the child text relative to its parent block container.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Text or element to highlight
 * @param {string} props.className - Additional classes for container
 * @param {'yellow' | 'red' | 'green' | 'blue'} props.color - Highlighter color
 * @param {number} props.delay - Animation delay in seconds
 * @param {number} props.duration - Animation duration in seconds
 * @param {boolean} props.trigger - Trigger to start the highlight animation
 */
export function Highlight({ children, className = '', color = 'yellow', delay = 0.1, duration = 0.6, trigger = true }) {
  const [active, setActive] = useState(false);
  const [rects, setRects] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // Calculates coordinates relative to the closest positioned block parent
  const updateRects = () => {
    if (!textRef.current || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!textRef.current || !containerRef.current) return;
      const parentElement = containerRef.current.parentElement;
      if (!parentElement) return;

      const parentRect = parentElement.getBoundingClientRect();
      const clientRects = textRef.current.getClientRects();
      
      const localRects = [];
      for (let i = 0; i < clientRects.length; i++) {
        const r = clientRects[i];
        if (r.width < 1 || r.height < 1) continue;
        
        localRects.push({
          left: r.left - parentRect.left,
          top: r.top - parentRect.top,
          width: r.width,
          height: r.height
        });
      }
      
      setRects(localRects);
      setDimensions({ width: parentRect.width, height: parentRect.height });
    });
  };

  useEffect(() => {
    updateRects();
    
    // Recalculate on window resize
    window.addEventListener('resize', updateRects);
    return () => window.removeEventListener('resize', updateRects);
  }, [trigger, children]);

  useEffect(() => {
    if (!trigger) {
      setActive(false);
      return;
    }
    const timer = setTimeout(() => {
      setActive(true);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [trigger, delay]);

  // Translucent marker colors
  const colorMap = {
    yellow: 'rgba(253, 224, 71, 0.45)', // Translucent Yellow
    red: 'rgba(239, 68, 68, 0.28)',      // Translucent Red
    green: 'rgba(34, 197, 94, 0.28)',    // Translucent Green
    blue: 'rgba(59, 130, 246, 0.28)',    // Translucent Blue
  };

  const strokeColor = colorMap[color] || colorMap.yellow;

  return (
    <span ref={containerRef} className={`inline ${className}`}>
      {/* Absolute SVG overlay drawing a highlighter for each line of text relative to the parent block */}
      {active && rects.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: dimensions.width,
            height: dimensions.height,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {rects.map((rect, idx) => {
            const { left, top, width, height } = rect;
            const midY = top + height / 2;
            
            // Draw two wobbly lines per text line to simulate the sketchy marker pass
            const path1 = `M ${left - 2},${midY - 1} Q ${left + width/2},${midY + 1.5} ${left + width + 2},${midY - 1}`;
            const path2 = `M ${left - 1},${midY + 2.5} Q ${left + width/2 - 5},${midY - 1.5} ${left + width + 1},${midY + 1}`;
            
            const strokeWidth = height * 0.95; // Scale height dynamically
            const dashArray = width + 20;
            
            // Stagger animations so lines highlight sequentially from top to bottom
            const lineDelay = idx * (duration * 0.45);

            return (
              <g key={idx}>
                {/* Stroke 1 */}
                <path
                  d={path1}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: dashArray,
                    strokeDashoffset: dashArray,
                    animation: `drawHighlighter ${duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    animationDelay: `${lineDelay}s`
                  }}
                />
                {/* Stroke 2 */}
                <path
                  d={path2}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth * 0.85}
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: dashArray,
                    strokeDashoffset: dashArray,
                    animation: `drawHighlighter ${duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    animationDelay: `${lineDelay + duration * 0.15}s`
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
      
      {/* Inner span containing the text */}
      <span ref={textRef} className="relative z-10">
        {children}
      </span>
      
      {/* Inline styles for the drawing keyframes */}
      <style>{`
        @keyframes drawHighlighter {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </span>
  );
}
