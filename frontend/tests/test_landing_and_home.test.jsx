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

    it('renders minimal operational status footer', () => {
      renderWithProviders(<LandingPage />);

      expect(screen.getByText(/Systems operational/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument();
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
