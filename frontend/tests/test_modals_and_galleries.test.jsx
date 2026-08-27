import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ScreenshotsGalleryModal from '../src/components/ScreenshotsGalleryModal';
import ScanLogsModal from '../src/components/ScanLogsModal';
import PDFReportsModal from '../src/components/PDFReportsModal';
import DeleteChatModal from '../src/components/DeleteChatModal';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';

const mockScreenshotsData = {
  screenshots: [
    {
      id: 101,
      chat_id: 'chat-001',
      target_url: 'https://fake-boc-portal.xyz/login',
      risk_level: 'PHISHING',
      risk_score: 95,
      screenshot_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      created_at: new Date().toISOString(),
    },
  ],
};

const mockLogsData = {
  logs: [
    {
      id: 201,
      chat_id: 'chat-001',
      target_url: 'https://fake-boc-portal.xyz/login',
      overall_status: 'COMPLETED',
      duration_sec: 1.45,
      report: {
        risk_level: 'PHISHING',
        risk_score: 95,
        summary: 'Impersonating Bank of Ceylon login.',
      },
      created_at: new Date().toISOString(),
    },
  ],
};

function renderModal(ui) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Modals and Galleries Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('ScreenshotsGalleryModal Component', () => {
    it('fetches and renders screenshots with risk badges', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockScreenshotsData,
      });

      renderModal(<ScreenshotsGalleryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/fake-boc-portal\.xyz/i)).toBeInTheDocument();
      });
      expect(screen.getAllByText(/PHISHING/i).length).toBeGreaterThanOrEqual(1);
    });

    it('does not render content when closed', () => {
      renderModal(<ScreenshotsGalleryModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText(/Screenshots Gallery/i)).not.toBeInTheDocument();
    });
  });

  describe('ScanLogsModal Component', () => {
    it('fetches and displays telemetry scan history logs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLogsData,
      });

      renderModal(<ScanLogsModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getAllByText(/fake-boc-portal\.xyz/i).length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText(/Scan Logs & History/i)).toBeInTheDocument();
    });
  });

  describe('PDFReportsModal Component', () => {
    it('renders PDF reports modal and shows export options', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLogsData,
      });

      renderModal(<PDFReportsModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Scanned PDF Reports/i)).toBeInTheDocument();
      });
    });
  });

  describe('DeleteChatModal Component', () => {
    it('renders deletion confirmation and handles cancel/confirm actions', async () => {
      const user = userEvent.setup();
      const mockClose = vi.fn();
      const mockConfirm = vi.fn();

      renderModal(
        <DeleteChatModal
          isOpen={true}
          onClose={mockClose}
          onConfirm={mockConfirm}
          chatTitle="Bank of Ceylon Investigation"
        />
      );

      expect(screen.getByText(/Delete Chat Session/i)).toBeInTheDocument();
      expect(screen.getByText(/Bank of Ceylon Investigation/i)).toBeInTheDocument();

      // Cancel button
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);
      expect(mockClose).toHaveBeenCalled();

      // Confirm button
      const deleteBtn = screen.getByRole('button', { name: /delete chat|delete/i });
      await user.click(deleteBtn);
      expect(mockConfirm).toHaveBeenCalled();
    });
  });
});
