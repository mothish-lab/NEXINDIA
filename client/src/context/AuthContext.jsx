import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('civic_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function fetchProfile() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('civic_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }

  async function register(data) {
    const res = await api.post('/auth/register', data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('civic_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }

  function logout() {
    localStorage.removeItem('civic_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
