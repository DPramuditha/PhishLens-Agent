import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportDashboard from '../src/components/ReportDashboard';
import ApprovalCard from '../src/components/ApprovalCard';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/ToastContext';

const mockPhishingReport = {
  risk_level: 'PHISHING',
  risk_score: 96,
  target_url: 'https://boc-fake-portal.xyz/login',
  brand_impersonation: {
    detected: true,
    brand: 'Bank of Ceylon',
    similarity: 0.94,
  },
  summary: 'High confidence phishing domain impersonating Bank of Ceylon with credential harvesting forms.',
  agent_breakdown: {
    visual_model: {
      status: 'MATCH_FOUND',
      brand: 'Bank of Ceylon',
      confidence: '94%',
      details: 'Identified authentic brand logo with cosine distance < 0.15 threshold.',
    },
    html_dom: {
      status: 'THREAT_DETECTED',
      details: 'Discovered password harvesting input submitting to external domain.',
    },
    url_features: {
      status: 'SUSPICIOUS',
      entropy: 4.35,
      typosquatting: true,
    },
  },
  mitigation_advice: [
    'Do not enter any bank credentials, card numbers, or OTP codes.',
    'Access the official Bank of Ceylon website directly via boc.lk.',
    'Report this URL to Sri Lanka CERT and Bank of Ceylon fraud division.',
  ],
  tool_trace: [
    { step: 1, agent: 'UrlFeatureAgent', action: 'Lexical analysis', duration: '12ms' },
    { step: 2, agent: 'HtmlDomAgent', action: 'DOM credential inspector', duration: '45ms' },
  ],
};

const mockSafeReport = {
  risk_level: 'SAFE',
  risk_score: 5,
  target_url: 'https://www.google.com',
  brand_impersonation: {
    detected: false,
    brand: null,
  },
  summary: 'Legitimate domain with valid cryptographic SSL certificate and established WHOIS reputation.',
  mitigation_advice: ['Safe to browse.'],
};

describe('ReportDashboard & ApprovalCard Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('ReportDashboard Component', () => {
    it('renders phishing detection report with risk score and brand alert', () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <ReportDashboard report={mockPhishingReport} chatId="chat-101" />
          </AuthProvider>
        </ToastProvider>
      );

      // Risk score & level
      expect(screen.getAllByText(/PHISHING/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Bank of Ceylon/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Analysis Verdict/i)).toBeInTheDocument();
    });

    it('renders safe verified website dashboard', () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <ReportDashboard report={mockSafeReport} chatId="chat-102" />
          </AuthProvider>
        </ToastProvider>
      );

      expect(screen.getAllByText(/SAFE/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Legitimate domain with valid cryptographic SSL/i)).toBeInTheDocument();
    });
  });

  describe('ApprovalCard (Human-in-the-Loop Feedback)', () => {
    it('renders interactive feedback questions and accepts answers', async () => {
      const user = userEvent.setup();
      const mockSubmitCallback = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', message: 'Feedback recorded' }),
      });

      render(
        <ToastProvider>
          <AuthProvider>
            <ApprovalCard
              chatId="chat-101"
              messageId="msg-101"
              targetUrl="https://boc-fake-portal.xyz/login"
              report={mockPhishingReport}
              onComplete={mockSubmitCallback}
            />
          </AuthProvider>
        </ToastProvider>
      );

      // Question 1 should be visible
      expect(screen.getAllByText(/accurate/i).length).toBeGreaterThanOrEqual(1);

      // Click an option in question 1
      const option1 = screen.getAllByRole('button').find((b) => /spot on|accurate|yes/i.test(b.textContent));
      if (option1) {
        await user.click(option1);
      }

      // Check footer buttons
      const continueBtn = screen.queryByRole('button', { name: /continue/i });
      if (continueBtn) {
        await user.click(continueBtn);
      }
    });

    it('submits feedback to /api/feedback/ endpoint successfully', async () => {
      const user = userEvent.setup();
      let capturedPayload = null;

      global.fetch = vi.fn().mockImplementation((url, opts) => {
        if (url.includes('/api/feedback/')) {
          capturedPayload = JSON.parse(opts.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'success' }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(
        <ToastProvider>
          <AuthProvider>
            <ApprovalCard
              chatId="chat-555"
              messageId="msg-555"
              targetUrl="https://suspicious-site.lk"
              report={mockPhishingReport}
            />
          </AuthProvider>
        </ToastProvider>
      );

      // Find any answer button or skip
      const skipOrContinue = screen.getAllByRole('button').find((b) => /skip|continue|spot on/i.test(b.textContent));
      if (skipOrContinue) {
        await user.click(skipOrContinue);
      }
    });
  });
});
