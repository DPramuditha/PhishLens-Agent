import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

const generateUniqueId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const MAX_TOASTS = 2;

const INITIAL_NOTIFICATIONS = [
  {
    id: 'init-1',
    title: 'PhishLens Threat Shield Active',
    description: 'Real-time proactive phishing defense and SSL integrity scanning enabled.',
    time: 'Just now',
    type: 'safe',
    unread: true,
    timestamp: Date.now(),
  },
  {
    id: 'init-2',
    title: 'ML Models Initialized',
    description: 'Stage 1 (EfficientNet-B0) and Stage 2 (ResNet-50 Siamese) models online.',
    time: '2m ago',
    type: 'ai',
    unread: true,
    timestamp: Date.now() - 120000,
  },
  {
    id: 'init-3',
    title: 'Zero-Day Watchdog Ready',
    description: 'Autonomous multi-agent consensus verification standing by.',
    time: '15m ago',
    type: 'info',
    unread: false,
    timestamp: Date.now() - 900000,
  },
];

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('phishlens_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set();
          return parsed.map((item, idx) => {
            let id = item.id;
            if (!id || seenIds.has(id)) {
              id = generateUniqueId(`notif-${idx}`);
            }
            seenIds.add(id);
            return { ...item, id };
          });
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const lastToastRef = useRef({ title: '', message: '', time: 0 });

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem('phishlens_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const mapToastTypeToNotifType = (toastType) => {
    if (toastType === 'error' || toastType === 'danger') return 'danger';
    if (toastType === 'warning') return 'danger';
    if (toastType === 'success') return 'safe';
    if (toastType === 'ai') return 'ai';
    return 'info';
  };

  const addToast = useCallback(({ type = 'info', title, message, duration = 4500, skipNotificationCenter = false }) => {
    const now = Date.now();
    // Deduplicate identical spam within 1.2 seconds
    if (
      lastToastRef.current.title === title &&
      lastToastRef.current.message === message &&
      now - lastToastRef.current.time < 1200
    ) {
      return null;
    }
    lastToastRef.current = { title, message, time: now };

    const id = generateUniqueId('toast');
    const toast = { id, type, title, message, duration };

    // Add to transient floating toasts
    setToasts((prev) => {
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(prev.length - (MAX_TOASTS - 1)) : prev;
      return [...trimmed, toast];
    });

    // Also add to persistent real-time notification drawer
    if (!skipNotificationCenter && title) {
      const notifId = generateUniqueId('notif');
      const notifItem = {
        id: notifId,
        title,
        description: message || title,
        time: 'Just now',
        type: mapToastTypeToNotifType(type),
        unread: true,
        timestamp: now,
      };

      setNotifications((prev) => [notifItem, ...prev.slice(0, 40)]);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback(({ type = 'info', title, description, url = null, chatId = null }) => {
    const notifId = generateUniqueId('notif');
    const notifItem = {
      id: notifId,
      title,
      description: description || title,
      time: 'Just now',
      type: mapToastTypeToNotifType(type),
      unread: true,
      url,
      chatId,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [notifItem, ...prev.slice(0, 40)]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        notifications,
        addNotification,
        markAllAsRead,
        clearAllNotifications,
        toggleNotificationRead,
        deleteNotification,
        unreadCount,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
