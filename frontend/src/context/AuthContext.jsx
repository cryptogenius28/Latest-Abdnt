import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken, AUTH_TOKEN_KEY } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Always try /auth/me — backend accepts either the Bearer token
      // (sent by the axios interceptor from localStorage) OR the HttpOnly
      // access_token cookie. Gating on localStorage broke deep-linking
      // to /admin when only the cookie path was available.
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.access_token) setAuthToken(res.data.access_token);
    setUser(res.data);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.data?.access_token) setAuthToken(res.data.access_token);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch (_) { /* noop */ }
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
