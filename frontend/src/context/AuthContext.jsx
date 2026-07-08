import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('keyflow_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
    } catch (e) {
      localStorage.removeItem('keyflow_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem('keyflow_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(username, email, password) {
    const data = await api.register({ username, email, password });
    localStorage.setItem('keyflow_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('keyflow_token');
    setUser(null);
  }

  async function updateProfile(data) {
    const res = await api.updateProfile(data);
    setUser(res.user);
    return res.user;
  }

  async function updateAvatar(file) {
    const res = await api.uploadAvatar(file);
    setUser(prev => ({ ...prev, avatar_url: res.avatar_url }));
    return res.avatar_url;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
