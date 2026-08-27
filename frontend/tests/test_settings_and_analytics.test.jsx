import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AccountSettingsSheet from '../src/components/AccountSettingsSheet';
import ProfileBottomSheet from '../src/components/ProfileBottomSheet';
import AnalyticsDashboardModal from '../src/components/AnalyticsDashboardModal';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';

const mockAnalyticsData = {
  timeframe: '24h',
  total_scans: 142,
  phishing_detected: 38,
  legitimate_verified: 104,
  avg_duration_sec: 1.82,
  accuracy_rate: 0.985,
  models: [
    { name: 'URL Lexical Engine', accuracy: '99.1%', speed: '12ms', status: 'Operational' },
    { name: 'HTML Structure Heuristics', accuracy: '97.8%', speed: '45ms', status: 'Operational' },
    { name: 'Siamese ResNet-50 CV', accuracy: '98.4%', speed: '210ms', status: 'Operational' },
    { name: 'Tavily Threat OSINT', accuracy: '96.5%', speed: '380ms', status: 'Operational' },
  ],
  radar_metrics: [
    { subject: 'Lexical Entropy', value: 92, fullMark: 100 },
    { subject: 'Visual Logo ML', value: 96, fullMark: 100 },
    { subject: 'DOM Credential', value: 94, fullMark: 100 },
    { subject: 'WHOIS & SSL', value: 88, fullMark: 100 },
    { subject: 'Threat OSINT', value: 90, fullMark: 100 },
    { subject: 'Long-Term Memory', value: 85, fullMark: 100 },
  ],
};

import ToastContainer from '../src/components/ToastContainer';

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ToastContainer />
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Settings, Profile, and Analytics Modals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify({ user_id: 'user-88', exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    localStorage.setItem('phishlens_jwt_token', fakeToken);
    localStorage.setItem(
      'phishlens_user_data',
      JSON.stringify({ id: 'user-88', name: 'Dimuthu Pramuditha', email: 'dimuthu@phishlens.lk' })
    );

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/auth/me/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: { id: 'user-88', name: 'Dimuthu Pramuditha', email: 'dimuthu@phishlens.lk' },
          }),
        });
      }
      if (url.includes('/api/analytics/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAnalyticsData,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  describe('AccountSettingsSheet Component', () => {
    it('renders profile tab and switches to security password tab', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccountSettingsSheet
          isOpen={true}
          onClose={vi.fn()}
          profileName="Dimuthu Pramuditha"
          profileEmail="dimuthu@phishlens.lk"
          isDarkMode={true}
        />
      );

      expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dimuthu Pramuditha')).toBeInTheDocument();

      // Click Security Tab
      const securityTab = screen.getByRole('button', { name: /security/i });
      await user.click(securityTab);

      expect(screen.getByPlaceholderText(/Enter current password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Min 8 characters/i)).toBeInTheDocument();
    });

    it('validates password mismatch on password form submit', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccountSettingsSheet
          isOpen={true}
          onClose={vi.fn()}
          profileName="Dimuthu Pramuditha"
          profileEmail="dimuthu@phishlens.lk"
          isDarkMode={true}
        />
      );

      // Switch to security tab
      const securityTab = screen.getByRole('button', { name: /security/i });
      await user.click(securityTab);

      const newPwInput = screen.getByPlaceholderText(/Min 8 characters/i);
      const confirmPwInput = screen.getByPlaceholderText(/Re-enter password/i);

      await user.type(newPwInput, 'Password123!@');
      await user.type(confirmPwInput, 'DifferentPassword123!');

      const savePwBtn = screen.getByRole('button', { name: /update password|save password|change password/i });
      await user.click(savePwBtn);

      await waitFor(() => {
        expect(screen.getByText('Mismatch')).toBeInTheDocument();
      });
    });
  });

  describe('ProfileBottomSheet Component', () => {
    it('renders profile sheet with name, email, and action items', async () => {
      const mockToggleDark = vi.fn();
      const mockClose = vi.fn();

      renderWithProviders(
        <ProfileBottomSheet
          isOpen={true}
          onClose={mockClose}
          isDarkMode={true}
          onToggleDarkMode={mockToggleDark}
          profileName="Dimuthu Pramuditha"
          profileEmail="dimuthu@phishlens.lk"
        />
      );

      expect(screen.getByText('Dimuthu Pramuditha')).toBeInTheDocument();
      expect(screen.getByText('dimuthu@phishlens.lk')).toBeInTheDocument();

      // Settings action button
      const settingsBtn = screen.getByRole('button', { name: /account settings/i });
      expect(settingsBtn).toBeInTheDocument();
    });
  });

  describe('AnalyticsDashboardModal Component', () => {
    it('fetches and displays analytics modal and timeframe filters', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AnalyticsDashboardModal isOpen={true} onClose={vi.fn()} isDarkMode={true} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Security Analytics & ML Intelligence/i)).toBeInTheDocument();
      });

      // Verify Real-time badge or header
      expect(screen.getByText(/Real-Time Stream/i)).toBeInTheDocument();

      // Click 7d timeframe filter
      const btn7d = screen.getAllByRole('button').find((b) => /7d|7 days/i.test(b.textContent));
      if (btn7d) {
        await user.click(btn7d);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/analytics/'),
          expect.anything()
        );
      }
    });
  });
});
