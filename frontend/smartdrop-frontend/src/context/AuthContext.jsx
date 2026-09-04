import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext); // 👈 Importante exportar este hook

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  };

  const registerClient = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    return data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, registerClient, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

