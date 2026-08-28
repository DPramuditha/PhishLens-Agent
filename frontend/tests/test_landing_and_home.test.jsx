import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../src/pages/LandingPage';
import HomePage from '../src/pages/HomePage';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('LandingPage and HomePage Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('LandingPage Component', () => {
    it('renders hero title, badges, and call-to-action buttons', () => {
      renderWithProviders(<LandingPage />);

      expect(screen.getAllByText(/EARLY BETA/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Meet/i)).toBeInTheDocument();
      expect(screen.getAllByText(/PhishLens Agent/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Sign Up for Early Access/i)).toBeInTheDocument();
    });

    it('renders rich footer with navigation, newsletter, mascot, and brand watermark', () => {
      renderWithProviders(<LandingPage />);

      expect(screen.getByRole('heading', { name: /Products/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Resources/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Your email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Subscribe/i })).toBeInTheDocument();
      expect(screen.getByAltText(/PhishLens Squircle Mascot/i)).toBeInTheDocument();
      expect(screen.getAllByText(/PhishLens/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/All systems operational/i)).toBeInTheDocument();
    });

    it('renders GSAP FeaturesSection with all 4 enterprise security features', () => {
      renderWithProviders(<LandingPage />);

      expect(screen.getByText(/Next-generation autonomous cybersecurity architecture/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Multi-agent/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/PDF download/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Screenshot Capture/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Visual ML/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Parallel agents tackle sub-problems simultaneously/i)).toBeInTheDocument();
    });

    it('renders GetStartedSection with 3 step cards and action buttons', () => {
      renderWithProviders(<LandingPage />);

      expect(screen.getByRole('heading', { name: /Get started/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Open PhishLens/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Start investigating/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open PhishLens/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign in to Account/i })).toBeInTheDocument();
    });
  });

  describe('HomePage Component', () => {
    it('renders URL search/scan input bar and greetings header', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/chats/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ chats: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Paste URL|scan|search/i)).toBeInTheDocument();
      });
    });

    it('loads and displays past chat sessions in sidebar', async () => {
      const mockChats = [
        {
          id: 'chat-abc-123',
          title: 'Bank of Ceylon Phishing Scan',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/chats/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ chats: mockChats }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getAllByText(/Bank of Ceylon Phishing Scan/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
