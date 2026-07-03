export default function FlickerSpinner({ size = 20 }) {
  return (
    <svg
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        '--on': '#C15B2B',
        '--off': 'var(--spinner-off, #e5e5e5)',
        '--dur': '2.400s'
      }}
      className="shrink-0"
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes fs0000010000000000 { 0% { opacity: 0; } 31.24% { opacity: 0; } 31.25% { opacity: 1; } 37.49% { opacity: 1; } 37.50% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0000100000000000 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 31.24% { opacity: 1; } 31.25% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0001100011110000 { 0% { opacity: 0; } 18.74% { opacity: 0; } 18.75% { opacity: 1; } 31.24% { opacity: 1; } 31.25% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0001000111100000 { 0% { opacity: 0; } 18.74% { opacity: 0; } 18.75% { opacity: 1; } 24.99% { opacity: 1; } 25.00% { opacity: 0; } 43.74% { opacity: 0; } 43.75% { opacity: 1; } 68.74% { opacity: 1; } 68.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0000000111000000 { 0% { opacity: 0; } 43.74% { opacity: 0; } 43.75% { opacity: 1; } 62.49% { opacity: 1; } 62.50% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0000111000000000 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 43.74% { opacity: 1; } 43.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0001110001111000 { 0% { opacity: 0; } 18.74% { opacity: 0; } 18.75% { opacity: 1; } 37.49% { opacity: 1; } 37.50% { opacity: 0; } 56.24% { opacity: 0; } 56.25% { opacity: 1; } 81.24% { opacity: 1; } 81.25% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0011000111110000 { 0% { opacity: 0; } 12.49% { opacity: 0; } 12.50% { opacity: 1; } 24.99% { opacity: 1; } 25.00% { opacity: 0; } 43.74% { opacity: 0; } 43.75% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0000001111110000 { 0% { opacity: 0; } 37.49% { opacity: 0; } 37.50% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0000001111100000 { 0% { opacity: 0; } 37.49% { opacity: 0; } 37.50% { opacity: 1; } 68.74% { opacity: 1; } 68.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0011111100001000 { 0% { opacity: 0; } 12.49% { opacity: 0; } 12.50% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 74.99% { opacity: 0; } 75.00% { opacity: 1; } 81.24% { opacity: 1; } 81.25% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes fs0111111111111100 { 0% { opacity: 0; } 6.24% { opacity: 0; } 6.25% { opacity: 1; } 87.49% { opacity: 1; } 87.50% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle className="on" cx="3" cy="3" r="2" opacity={0} style={{ animation: 'fs0000010000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={0} style={{ animation: 'fs0000100000000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'fs0001100011110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={0} style={{ animation: 'fs0001000111100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'fs0000000111000000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={0} style={{ animation: 'fs0000111000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'fs0001110001111000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'fs0011000111110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'fs0000001111110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'fs0000001111100000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={0} style={{ animation: 'fs0000111000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'fs0011111100001000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'fs0111111111111100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'fs0011111100001000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'fs0000111000000000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'fs0000001111100000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'fs0000001111110000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'fs0011000111110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'fs0001110001111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'fs0000111000000000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'fs0000000111000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'fs0001000111100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'fs0001100011110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'fs0000100000000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'fs0000010000000000 var(--dur) linear infinite' }} />
    </svg>
  );
}
