import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../src/components/ToastContext';
import ToastContainer from '../src/components/ToastContainer';

function TestToastConsumer() {
  const {
    toasts,
    addToast,
    removeToast,
    notifications,
    addNotification,
    markAllAsRead,
    clearAllNotifications,
    unreadCount,
  } = useToast();

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="notif-count">{notifications.length}</div>
      <button
        data-testid="add-success-toast"
        onClick={() => addToast({ type: 'success', title: 'Scan Completed', message: 'Legitimate domain verified.' })}
      >
        Add Success Toast
      </button>
      <button
        data-testid="add-error-toast"
        onClick={() => addToast({ type: 'error', title: 'Phishing Alert', message: 'Credential stealer detected.' })}
      >
        Add Error Toast
      </button>
      <button
        data-testid="add-custom-notif"
        onClick={() => addNotification({ type: 'danger', title: 'Critical Alert', description: 'Immediate block advised.' })}
      >
        Add Custom Notif
      </button>
      <button data-testid="mark-read-btn" onClick={markAllAsRead}>
        Mark All Read
      </button>
      <button data-testid="clear-all-notifs-btn" onClick={clearAllNotifications}>
        Clear All Notifs
      </button>
      {toasts.map((t) => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          <span>{t.title}</span>
          <button data-testid={`dismiss-${t.id}`} onClick={() => removeToast(t.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

describe('ToastContext and ToastContainer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds and dismisses transient floating toasts', () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    expect(screen.getByTestId('toast-count').textContent).toBe('0');

    act(() => {
      screen.getByTestId('add-success-toast').click();
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');
    expect(screen.getByText('Scan Completed')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('add-error-toast').click();
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('2');

    // Dismiss first toast
    const dismissBtns = screen.getAllByText('Dismiss');
    act(() => {
      dismissBtns[0].click();
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');
  });

  it('records persistent notification items and tracks unread count', () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    const initialUnread = Number(screen.getByTestId('unread-count').textContent);

    act(() => {
      screen.getByTestId('add-custom-notif').click();
    });

    expect(Number(screen.getByTestId('unread-count').textContent)).toBe(initialUnread + 1);

    act(() => {
      screen.getByTestId('mark-read-btn').click();
    });

    expect(screen.getByTestId('unread-count').textContent).toBe('0');

    act(() => {
      screen.getByTestId('clear-all-notifs-btn').click();
    });

    expect(screen.getByTestId('notif-count').textContent).toBe('0');
  });

  it('renders ToastContainer with live toasts', () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-success-toast').click();
    });

    const titles = screen.getAllByText('Scan Completed');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Legitimate domain verified.')).toBeInTheDocument();
  });
});
