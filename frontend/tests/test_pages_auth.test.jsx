import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage';
import RegisterPage from '../src/pages/RegisterPage';
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

describe('Authentication Pages (LoginPage & RegisterPage)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('LoginPage Component', () => {
    it('renders step 1 with email input and social sign-in options', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
      expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
    });

    it('advances to step 2 on valid email and allows password entry', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'analyst@phishlens.ai');

      const continueBtn = screen.getByRole('button', { name: /continue with email/i });
      await user.click(continueBtn);

      // Should now display password input and Sign In button
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /sign in to phishlens/i })).toBeInTheDocument();
      expect(screen.getByTitle(/previous step/i)).toBeInTheDocument();
    }, 15000);

    it('submits credentials and handles failed login error message', async () => {
      const user = userEvent.setup({ delay: null });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid email or password.' }),
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'analyst@phishlens.ai');
      await user.click(screen.getByRole('button', { name: /continue with email/i }));

      const passwordInput = await screen.findByPlaceholderText(/enter your password/i);
      await user.type(passwordInput, 'WrongPass123!');
      await user.click(screen.getByRole('button', { name: /sign in to phishlens/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('RegisterPage Component', () => {
    it('renders step 1 with name input', () => {
      renderWithProviders(<RegisterPage />);

      expect(screen.getByPlaceholderText(/enter your full name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('steps from Name -> Email -> Password with live criteria validation', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<RegisterPage />);

      // Step 1: Enter name
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      await user.type(nameInput, 'Kasun Perera');
      await user.click(screen.getByRole('button', { name: /continue with email/i }));

      // Step 2: Enter email
      const emailInput = await screen.findByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'kasun@phishlens.ai');
      await user.click(screen.getByRole('button', { name: /continue with email/i }));

      // Step 3: Password input and criteria checklist
      const passwordInput = await screen.findByPlaceholderText(/create a secure password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument();

      // Type weak password
      await user.type(passwordInput, 'weak');
      expect(screen.getByText(/8\+ chars/i)).toBeInTheDocument();

      // Type strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongSec#2026!');
      expect(screen.getByRole('button', { name: /complete registration/i })).not.toBeDisabled();
    }, 15000);
  });
});
