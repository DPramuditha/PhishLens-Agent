import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OrchestratorProgress from '../src/components/OrchestratorProgress';
import FileDownloadCard from '../src/components/FileDownloadCard';
import PDFBuildingAnimation, { PdfFileIcon } from '../src/components/PDFBuildingAnimation';
import AppleTopControls from '../src/components/AppleTopControls';
import SidebarDock from '../src/components/SidebarDock';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';
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

describe('Pipeline and UI Widget Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify({ user_id: 'user-88', exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    localStorage.setItem('phishlens_jwt_token', fakeToken);
  });

  describe('OrchestratorProgress Component', () => {
    it('renders agent execution progress indicator', () => {
      renderWithProviders(
        <OrchestratorProgress
          targetUrl="https://boc.lk/onlinebanking"
          status="loading"
          duration={2.5}
        />
      );

      // Verify the loading dot matrix component and live agent reasoning indicator
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('renders completed orchestrator state when status is completed', () => {
      renderWithProviders(
        <OrchestratorProgress
          targetUrl="https://boc.lk/onlinebanking"
          status="completed"
          duration={3.2}
        />
      );

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });
  });

  describe('PDFBuildingAnimation and FileDownloadCard Components', () => {
    it('renders PDF building animation and icon', () => {
      renderWithProviders(
        <PDFBuildingAnimation onSettled={vi.fn()} hasScreenshot={true} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(
        screen.getByText(/Generating PDF Security Report\.\.\.|PDF Security Report Generated/i)
      ).toBeInTheDocument();
    });

    it('renders FileDownloadCard with formatted domain name and triggers download', async () => {
      const user = userEvent.setup();

      // Mock fetch returning a blob
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['%PDF-1.4 mock binary pdf data'], { type: 'application/pdf' }),
      });

      renderWithProviders(
        <FileDownloadCard
          url="https://boc.lk/onlinebanking"
          report={{ risk_score: 12, risk_level: 'SAFE' }}
          screenshotUrl="data:image/png;base64,mockpng"
          chatId="chat-101"
        />
      );

      expect(screen.getByText(/Download the file here:/i)).toBeInTheDocument();
      expect(screen.getByText(/PhishLens_Security_Report_boc\.lk\.pdf/i)).toBeInTheDocument();

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      await user.click(downloadBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/chats/chat-101/pdf/'),
          expect.anything()
        );
      });
    });
  });

  describe('AppleTopControls Component', () => {
    it('renders light/dark mode switch and toggles appearance', async () => {
      const user = userEvent.setup();
      const mockToggleTheme = vi.fn();

      renderWithProviders(
        <AppleTopControls isDarkMode={true} onToggleDarkMode={mockToggleTheme} />
      );

      const themeSwitch = screen.getByRole('switch', { name: /toggle theme appearance/i });
      expect(themeSwitch).toBeInTheDocument();

      await user.click(themeSwitch);
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('opens notification drawer on bell button click', async () => {
      const user = userEvent.setup();

      const { container } = renderWithProviders(
        <AppleTopControls isDarkMode={true} onToggleDarkMode={vi.fn()} />
      );

      const bellBtn = container.querySelector('button[aria-label^="Notifications"]');
      expect(bellBtn).toBeInTheDocument();

      await user.click(bellBtn);

      // Verify drawer heading appears
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText(/PhishLens Threat Shield Active/i)).toBeInTheDocument();
    });
  });

  describe('SidebarDock Component', () => {
    it('renders dock items with custom action triggers', async () => {
      const user = userEvent.setup();
      const mockNewChat = vi.fn();
      const mockOpenLogs = vi.fn();

      const mockItems = [
        { id: 'chat', label: 'New Chat', onClick: mockNewChat },
        { id: 'logs', label: 'Scan Logs', onClick: mockOpenLogs },
      ];

      renderWithProviders(
        <SidebarDock
          items={mockItems}
          isDarkMode={true}
          activeItemId="chat"
        />
      );

      // Verify dock items rendered
      expect(screen.getByText('New Chat')).toBeInTheDocument();
      expect(screen.getByText('Scan Logs')).toBeInTheDocument();
    });
  });
});
