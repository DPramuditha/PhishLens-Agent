import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Browser APIs Polyfills & Mocks for JSDOM
// ---------------------------------------------------------------------------

// window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver mock
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver;

// ResizeObserver mock
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver;

// window.scrollTo
window.scrollTo = vi.fn();

// URL object URLs
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-object-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock lottie-react to prevent canvas rendering errors in JSDOM
vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie-animation-mock" />,
}));

// Mock gsap animations
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
    })),
    set: vi.fn(),
    killTweensOf: vi.fn(),
  },
}));

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => children,
  GoogleLogin: ({ onSuccess }) => (
    <button
      data-testid="mock-google-login-btn"
      onClick={() => onSuccess && onSuccess({ credential: 'mock-google-id-token' })}
    >
      Sign in with Google
    </button>
  ),
  useGoogleLogin: (config) => () => {
    if (config?.onSuccess) {
      config.onSuccess({ access_token: 'mock-google-access-token' });
    }
  },
}));
