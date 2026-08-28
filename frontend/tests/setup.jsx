import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Browser APIs Polyfills & Mocks for JSDOM
// ---------------------------------------------------------------------------

// window.matchMedia
const createMatchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

window.matchMedia = window.matchMedia || createMatchMedia;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => createMatchMedia(query),
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
  default: () => React.createElement('div', { 'data-testid': 'lottie-animation-mock' }),
}));

// Mock gsap animations
const createMockTween = (onComplete) => {
  if (typeof onComplete === 'function') onComplete();
  return {
    kill: vi.fn(),
    revert: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    restart: vi.fn(),
    timeScale: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
  };
};

vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target, vars) => createMockTween(vars?.onComplete)),
    from: vi.fn((target, vars) => createMockTween(vars?.onComplete)),
    fromTo: vi.fn((target, fromVars, toVars) => createMockTween(toVars?.onComplete)),
    timeline: vi.fn(() => createMockTween()),
    set: vi.fn(),
    getProperty: vi.fn(() => 0),
    killTweensOf: vi.fn(),
    registerPlugin: vi.fn(),
    context: vi.fn((fn) => {
      if (typeof fn === 'function') fn();
      return { revert: vi.fn(), add: vi.fn(), clear: vi.fn(), kill: vi.fn() };
    }),
  },
}));

// Mock gsap/ScrollTrigger
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: vi.fn(() => ({
      kill: vi.fn(),
      revert: vi.fn(),
      refresh: vi.fn(),
    })),
    registerPlugin: vi.fn(),
    getAll: vi.fn(() => []),
    getById: vi.fn(),
    refresh: vi.fn(),
    update: vi.fn(),
    batch: vi.fn(),
  },
}));

// Mock gsap/ScrollSmoother
vi.mock('gsap/ScrollSmoother', () => ({
  ScrollSmoother: {
    create: vi.fn(() => ({
      kill: vi.fn(),
      revert: vi.fn(),
      paused: vi.fn(),
      scrollTo: vi.fn(),
      scrollTop: vi.fn(() => 0),
    })),
    get: vi.fn(() => null),
    registerPlugin: vi.fn(),
  },
}));

// Mock gsap/SplitText
vi.mock('gsap/SplitText', () => ({
  SplitText: {
    create: vi.fn(() => ({
      words: [],
      chars: [],
      lines: [],
      revert: vi.fn(),
    })),
    registerPlugin: vi.fn(),
  },
}));

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => children,
  GoogleLogin: ({ onSuccess }) =>
    React.createElement(
      'button',
      {
        'data-testid': 'mock-google-login-btn',
        onClick: () => onSuccess && onSuccess({ credential: 'mock-google-id-token' }),
      },
      'Sign in with Google'
    ),
  useGoogleLogin: (config) => () => {
    if (config?.onSuccess) {
      config.onSuccess({ access_token: 'mock-google-access-token' });
    }
  },
}));

// Mock recharts ResponsiveContainer to render children reliably in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children, width, height }) =>
      React.createElement(
        'div',
        {
          style: { width: width || 800, height: height || 400 },
          'data-testid': 'responsive-container',
        },
        children
      ),
  };
});
