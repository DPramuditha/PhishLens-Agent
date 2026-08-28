import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const STORAGE_TOKEN_KEY = 'phishlens_jwt_token';
const STORAGE_USER_KEY = 'phishlens_user_data';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Helper to check if a token is valid & not expired
  const isTokenValid = useCallback((jwtToken) => {
    if (!jwtToken) return false;
    try {
      const decoded = jwtDecode(jwtToken);
      if (!decoded.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch {
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (storedToken) {
        fetch(`${API_BASE}/api/auth/logout/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${storedToken}` },
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  // Sync / verify session on app mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (storedToken && isTokenValid(storedToken)) {
        try {
          // Verify with backend /api/auth/me/
          const res = await fetch(`${API_BASE}/api/auth/me/`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
          } else {
            // Token rejected by server
            logout();
          }
        } catch {
          // If server is temporarily unreachable, fallback to decoded token user claims
          try {
            const decoded = jwtDecode(storedToken);
            setUser({
              id: decoded.user_id,
              email: decoded.email,
              name: decoded.name,
              picture: decoded.picture || '',
            });
            setToken(storedToken);
          } catch {
            logout();
          }
        }
      } else {
        logout();
      }
      setIsLoading(false);
    }

    initAuth();
  }, [isTokenValid]);

  // Login with Google OAuth Credential (ID Token) or OAuth Access Token
  const loginWithGoogle = async (credential, accessToken = null) => {
    setIsLoading(true);
    try {
      const payload = {};
      if (credential) payload.credential = credential;
      if (accessToken) payload.access_token = accessToken;

      const res = await fetch(`${API_BASE}/api/auth/google/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Google sign-in failed');
      }

      const receivedToken = data.token;
      const receivedUser = data.user;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem(STORAGE_TOKEN_KEY, receivedToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(receivedUser));

      return { success: true, user: receivedUser };
    } catch (err) {
      console.error('Auth error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register with Name, Email & Password (saved to PostgreSQL backend)
  const registerWithEmail = async ({ name, email, password }) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Registration failed');
      }

      const receivedToken = data.token;
      const receivedUser = data.user;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem(STORAGE_TOKEN_KEY, receivedToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(receivedUser));

      return { success: true, user: receivedUser };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Login with Email & Password
  const loginWithEmail = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Invalid email or password');
      }

      const receivedToken = data.token;
      const receivedUser = data.user;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem(STORAGE_TOKEN_KEY, receivedToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(receivedUser));

      return { success: true, user: receivedUser };
    } catch (err) {
      console.error('Email login error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Update User Profile
  const updateUserProfile = async (profileData) => {
    try {
      const res = await authFetch(`${API_BASE}/api/auth/profile/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to update profile');
      }
      if (data.token) {
        setToken(data.token);
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
      }
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      }
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, error: err.message };
    }
  };

  // Change User Password
  const changeUserPassword = async ({ currentPassword, newPassword }) => {
    try {
      const res = await authFetch(`${API_BASE}/api/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to change password');
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Change password error:', err);
      return { success: false, error: err.message };
    }
  };

  // Upload Custom Profile Picture / Avatar
  const uploadAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const activeToken = token || localStorage.getItem(STORAGE_TOKEN_KEY);
      const headers = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch(`${API_BASE}/api/auth/profile/avatar/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to upload profile picture');
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
      }
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      }
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      console.error('Upload avatar error:', err);
      return { success: false, error: err.message };
    }
  };

  // Remove Custom Profile Picture / Avatar
  const removeAvatar = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/auth/profile/avatar/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to remove profile picture');
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
      }
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      }
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      console.error('Remove avatar error:', err);
      return { success: false, error: err.message };
    }
  };

  // Authenticated fetch wrapper
  const authFetch = async (url, options = {}) => {
    const activeToken = token || localStorage.getItem(STORAGE_TOKEN_KEY);
    const headers = {
      ...(options.headers || {}),
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Expired or invalid token
      logout();
      window.location.href = '/login';
    }

    return res;
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    updateUserProfile,
    uploadAvatar,
    removeAvatar,
    changeUserPassword,
    logout,
    authFetch,
    API_BASE,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
