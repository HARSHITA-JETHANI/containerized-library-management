
import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({ token: null, user: null });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setAuth({ token, user: JSON.parse(user) });
    }
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', {
      username,
      password,
    });

    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setAuth({ token, user });
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
    navigate('/login');
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${auth.token}`,
  });

  return (
    <AuthContext.Provider value={{ auth, login, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};
