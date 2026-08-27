import bloubSquircleMainSvg from '../assets/bloub-squircle-surpris-orange-anime-main.svg';

/**
 * WelcomeCharacterAnimation
 * 
 * Displays only the main animated Bloub squircle character SVG
 * (frontend/src/assets/bloub-squircle-surpris-orange-anime-main.svg).
 */
export default function WelcomeCharacterAnimation({
  size = 'inline', // 'inline' | 'small' | 'medium' | 'large'
  isInputFocused = false,
  isTyping = false,
  isDarkMode = true,
  state: stateProp = null,
  className = '',
  style = {},
}) {
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
      className={`relative inline-flex items-center justify-center select-none pointer-events-none bg-transparent border-0 shadow-none ${className}`}
      style={{
        ...getDimensionsStyle(),
        ...style,
      }}
      title="PhishLens Animated Assistant"
      aria-label="PhishLens Animated Assistant"
    >
      <img
        src={bloubSquircleMainSvg}
        alt="PhishLens Bloub Animated Mascot"
        draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none"
        loading="eager"
      />
    </div>
  );
}
