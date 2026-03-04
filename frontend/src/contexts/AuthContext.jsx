import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../data/fabrics";

const AuthContext = createContext();

const GUEST_UUID_KEY = "cv_guest_uuid";
const TOKEN_KEY = "cv_auth_token";

function getGuestUUID() {
  let uuid = localStorage.getItem(GUEST_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(GUEST_UUID_KEY, uuid);
  }
  return uuid;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [guestUUID] = useState(getGuestUUID);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) setUser(data.user);
          else logout();
        })
        .catch(() => logout());
    }
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const checkRateLimit = useCallback(async () => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const resp = await fetch(
        `${API_BASE}/api/rate-limit/status?guest_uuid=${guestUUID}`,
        { headers }
      );
      if (!resp.ok) return { allowed: true, count: 0, limit: 999 };
      const data = await resp.json();
      // Ensure allowed is always a boolean — missing field defaults to true
      return { allowed: true, ...data };
    } catch {
      return { allowed: true, count: 0, limit: 999 };
    }
  }, [token, guestUUID]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        guestUUID,
        login,
        logout,
        showAuthModal,
        setShowAuthModal,
        isAuthenticated: !!user,
        checkRateLimit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
