import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Navbar from '../src/components/Navbar';
import ProtectedRoute from '../src/components/ProtectedRoute';
import MessageActionBar from '../src/components/MessageActionBar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';

describe('Navigation, Protection, and Message Action Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Navbar Component', () => {
    it('renders brand title and desktop navigation links', () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <AuthProvider>
              <Navbar brandName="PhishLens Agent" />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('PhishLens Agent')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /docs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Component', () => {
    it('redirects unauthenticated users to /login', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <div>Secret Dashboard Content</div>
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<div>Login Page Target</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      });
      expect(screen.queryByText('Secret Dashboard Content')).not.toBeInTheDocument();
    });

    it('renders children when authenticated user is present', async () => {
      // Mock authenticated token and user
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        btoa(JSON.stringify({ user_id: 'user-77', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.signature';
      localStorage.setItem('phishlens_jwt_token', fakeToken);
      localStorage.setItem(
        'phishlens_user_data',
        JSON.stringify({ id: 'user-77', name: 'Analyst Security', email: 'analyst@phishlens.lk' })
      );

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/auth/me/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              user: { id: 'user-77', name: 'Analyst Security', email: 'analyst@phishlens.lk' },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <div>Secret Dashboard Content</div>
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<div>Login Page Target</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Dashboard Content')).toBeInTheDocument();
      });
    });
  });

  describe('MessageActionBar Component', () => {
    it('copies report summary to clipboard and supports rescan trigger', async () => {
      const user = userEvent.setup();
      const mockRescan = vi.fn();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      // Mock navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        configurable: true,
        value: {
          writeText: writeTextMock,
        },
      });

      const mockMsg = {
        id: 'msg-999',
        isUser: false,
        url: 'https://fake-login-example.com',
        report: {
          risk_level: 'PHISHING',
          risk_score: 98,
          domain_age_days: 2,
          registrar: 'NameCheap Fake',
        },
      };

      render(<MessageActionBar msg={mockMsg} onRescan={mockRescan} isLoadingGlobal={false} />);

      // Copy button
      const copyBtn = screen.getByTitle(/copy message/i);
      await user.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('PhishLens Scan Report for: https://fake-login-example.com')
      );

      // Rescan button
      const rescanBtn = screen.getByTitle(/rescan/i);
      await user.click(rescanBtn);
      expect(mockRescan).toHaveBeenCalledWith('msg-999', 'https://fake-login-example.com');
    });
  });
});
