import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;
const MAX_TOASTS = 2;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ title: '', message: '', time: 0 });

  const addToast = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
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

    const id = ++toastIdCounter;
    const toast = { id, type, title, message, duration };

    setToasts((prev) => {
      // Keep at most 2 active notifications (drop oldest if exceeding MAX_TOASTS)
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(prev.length - (MAX_TOASTS - 1)) : prev;
      return [...trimmed, toast];
    });

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
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
