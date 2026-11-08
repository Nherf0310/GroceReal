'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setToken, getToken, clearToken, apiFetch } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'STORE_MANAGER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'CUSTOMER' | 'STORE_MANAGER' | 'DRIVER';
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from stored JWT on client side
  useEffect(() => {
    let cancelled = false;

    // Defer restoration so state updates don't run synchronously in the effect.
    void Promise.resolve().then(async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as {
          sub: string;
          email: string;
          role: User['role'];
        };
        try {
          const profile = await apiFetch<User>('/users/me');
          if (!cancelled) setUser({ ...profile, id: payload.sub, role: payload.role });
        } catch {
          if (!cancelled) {
            setUser({ id: payload.sub, name: '', email: payload.email, role: payload.role, isActive: true });
          }
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken, user } = await apiFetch<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(accessToken);
    setUser(user);
  };

  const register = async (data: RegisterForm) => {
    const { accessToken, user } = await apiFetch<{ accessToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(accessToken);
    setUser(user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
