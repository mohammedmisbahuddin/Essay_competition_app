'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'registration_desk' | 'invigilator' | 'evaluator';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider useEffect running');
    
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      console.log('Server side, setting loading to false');
      setLoading(false);
      return;
    }

    console.log('Client side, initializing auth');
    
    // Use setTimeout to ensure this runs after hydration
    setTimeout(() => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      console.log('Token exists:', !!token);
      console.log('Saved user exists:', !!savedUser);

      if (token && savedUser) {
        try {
          // Parse the saved user data
          const userData = JSON.parse(savedUser);
          setUser(userData);
          console.log('User loaded from localStorage:', userData);
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('No token or user found');
        setUser(null);
      }
      
      console.log('Setting loading to false');
      setLoading(false);
    }, 100);
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;

      // Only access localStorage on client side
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      setUser(userData);
      console.log('Login successful, user set:', userData);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

