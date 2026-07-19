import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    const initSession = async () => {
      try {
        const profile = await authService.syncSession();
        if (active) {
          if (profile?.id) {
            const { checkServerOrderHistoryAndLock } = await import('../utils/userLockGuard');
            const lockExpiresAt = await checkServerOrderHistoryAndLock(profile.id);
            if (lockExpiresAt) {
              await authService.logout();
              setUser(null);
              return;
            }
          }
          setUser(profile);
        }
      } catch (err) {
        console.error('Session sync error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    initSession();
    
    return () => {
      active = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await authService.syncSession();
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedIn = await authService.login(credentials);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    logout,
    refreshUser,
  }), [user, loading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The provider and hook intentionally share one module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
