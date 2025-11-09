import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, removeToken, setToken } from '../services/pduService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null); // ✅ TAMBAHKAN STATE TOKEN
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const storedToken = getToken();
    console.log('🔐 Checking auth, token found:', !!storedToken);

    if (storedToken) {
      try {
        // Decode token untuk mendapatkan user info
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        console.log('🔓 Decoded token payload:', payload);

        setUser({
          userId: payload.userId,
          name: payload.name,
          username: payload.username,
          role: payload.role,
        });
        setTokenState(storedToken); // ✅ SET TOKEN STATE
        setIsAuthenticated(true);
        console.log('✅ User authenticated:', payload.name);
      } catch (error) {
        console.error('❌ Error decoding token:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = (newToken, userData = null, remember = false) => {
    console.log('🔑 Login function called with token:', !!newToken);

    setToken(newToken, remember);
    setTokenState(newToken); // ✅ SET TOKEN STATE

    // Jika userData tidak provided, decode dari token
    if (!userData) {
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        userData = {
          userId: payload.userId,
          name: payload.name,
          username: payload.username,
          role: payload.role,
        };
      } catch (error) {
        console.error('❌ Error decoding token during login:', error);
        return;
      }
    }

    setUser(userData);
    setIsAuthenticated(true);
    console.log('✅ User logged in successfully:', userData.name);
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    removeToken();
    setUser(null);
    setTokenState(null); // ✅ RESET TOKEN STATE
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    token, // ✅ EXPORT TOKEN
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
