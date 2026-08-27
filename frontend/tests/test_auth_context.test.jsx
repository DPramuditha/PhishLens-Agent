import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// Helper component to consume and test useAuth hook values and methods
function TestAuthConsumer({ onAction }) {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="user-email">{auth.user?.email || 'guest'}</div>
      <div data-testid="user-name">{auth.user?.name || 'none'}</div>
      <div data-testid="token-status">{auth.token ? 'has-token' : 'no-token'}</div>
      <div data-testid="loading-status">{auth.isLoading ? 'loading' : 'ready'}</div>
      <button
        data-testid="login-btn"
        onClick={async () => {
          const res = await auth.loginWithEmail('analyst@phishlens.ai', 'Password123!');
          if (res?.success) {
            onAction?.('login_success');
          } else {
            onAction?.(`login_error: ${res?.error}`);
          }
        }}
      >
        Login
      </button>
      <button
        data-testid="register-btn"
        onClick={async () => {
          const res = await auth.registerWithEmail('Security Analyst', 'new@phishlens.ai', 'Secret999!');
          if (res?.success) {
            onAction?.('register_success');
          } else {
            onAction?.(`register_error: ${res?.error}`);
          }
        }}
      >
        Register
      </button>
      <button
        data-testid="google-btn"
        onClick={async () => {
          const res = await auth.loginWithGoogle('mock-id-token');
          if (res?.success) {
            onAction?.('google_success');
          } else {
            onAction?.(`google_error: ${res?.error}`);
          }
        }}
      >
        Google
      </button>
      <button
        data-testid="update-profile-btn"
        onClick={async () => {
          try {
            await auth.updateUserProfile({ name: 'Updated Analyst' });
            onAction?.('update_success');
          } catch (err) {
            onAction?.(`update_error: ${err.message}`);
          }
        }}
      >
        Update
      </button>
      <button
        data-testid="logout-btn"
        onClick={() => {
          auth.logout();
          onAction?.('logged_out');
        }}
      >
        Logout
      </button>
    </div>
  );
}

describe('AuthContext and useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with guest user when localStorage is empty', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('ready');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('guest');
    expect(screen.getByTestId('token-status').textContent).toBe('no-token');
  });

  it('performs successful email login and persists token', async () => {
    const mockUser = { id: 1, email: 'analyst@phishlens.ai', name: 'Analyst' };
    const mockToken = 'mock.jwt.token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: mockToken,
        user: mockUser,
      }),
    });

    const actionCallback = vi.fn();
    render(
      <AuthProvider>
        <TestAuthConsumer onAction={actionCallback} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('ready');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(actionCallback).toHaveBeenCalledWith('login_success');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('analyst@phishlens.ai');
    expect(screen.getByTestId('token-status').textContent).toBe('has-token');
    expect(localStorage.getItem('phishlens_jwt_token')).toBe(mockToken);
  });

  it('handles login failure gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Invalid email or password.',
      }),
    });

    const actionCallback = vi.fn();
    render(
      <AuthProvider>
        <TestAuthConsumer onAction={actionCallback} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('ready');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(actionCallback).toHaveBeenCalledWith('login_error: Invalid email or password.');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('guest');
    expect(screen.getByTestId('token-status').textContent).toBe('no-token');
  });

  it('performs successful registration', async () => {
    const mockUser = { id: 2, email: 'new@phishlens.ai', name: 'Security Analyst' };
    const mockToken = 'mock.register.token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: mockToken,
        user: mockUser,
      }),
    });

    const actionCallback = vi.fn();
    render(
      <AuthProvider>
        <TestAuthConsumer onAction={actionCallback} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('ready');
    });

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    await waitFor(() => {
      expect(actionCallback).toHaveBeenCalledWith('register_success');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('new@phishlens.ai');
    expect(localStorage.getItem('phishlens_jwt_token')).toBe(mockToken);
  });

  it('performs Google OAuth token exchange', async () => {
    const mockUser = { id: 3, email: 'google.user@gmail.com', name: 'Google User' };
    const mockToken = 'google.jwt.token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: mockToken,
        user: mockUser,
      }),
    });

    const actionCallback = vi.fn();
    render(
      <AuthProvider>
        <TestAuthConsumer onAction={actionCallback} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('ready');
    });

    await act(async () => {
      screen.getByTestId('google-btn').click();
    });

    await waitFor(() => {
      expect(actionCallback).toHaveBeenCalledWith('google_success');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('google.user@gmail.com');
  });

  it('clears state on logout', async () => {
    localStorage.setItem('phishlens_jwt_token', 'initial.token');
    localStorage.setItem('phishlens_user_data', JSON.stringify({ email: 'saved@test.com' }));

    const actionCallback = vi.fn();
    render(
      <AuthProvider>
        <TestAuthConsumer onAction={actionCallback} />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(actionCallback).toHaveBeenCalledWith('logged_out');
    expect(screen.getByTestId('user-email').textContent).toBe('guest');
    expect(screen.getByTestId('token-status').textContent).toBe('no-token');
    expect(localStorage.getItem('phishlens_jwt_token')).toBeNull();
  });
});
