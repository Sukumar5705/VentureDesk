import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../api/auth';
import * as authApi from '../api/auth';
import { onSessionExpired } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role: 'founder' | 'investor') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  // Register session-expired handler once
  useEffect(() => {
    onSessionExpired(() => {
      if (user !== null) {
        clearSession();
        navigateRef.current?.('/login');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore session on app load
  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const u = await authApi.me();
    setUser(u);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string, role: 'founder' | 'investor') => {
    await authApi.register(fullName, email, password, role);
    const u = await authApi.me();
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Always clear regardless
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      <NavigateCapture navigateRef={navigateRef} />
      {children}
    </AuthContext.Provider>
  );
}

// Helper to capture navigate inside a Router context
function NavigateCapture({ navigateRef }: { navigateRef: React.MutableRefObject<ReturnType<typeof useNavigate> | null> }) {
  const navigate = useNavigate();
  useEffect(() => { navigateRef.current = navigate; }, [navigate, navigateRef]);
  return null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function roleDashboard(role: string): string {
  if (role === 'founder') return '/founder/dashboard';
  if (role === 'investor') return '/investor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/';
}
