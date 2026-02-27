import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';

type UserType = {
  token: string;
  role: 'client' | 'pro';
};


export type AuthContextType = {
  user: { token: string; role: string } | null;
  loading: boolean;
  login: (data: { token: string; role: string }) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ token: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');
      if (token && role) setUser({ token, role });
      setLoading(false);
    };
    loadUser();
  }, []);
  

  const login = async (data: { token: string; role: string }) => {
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('role', data.role);
    setUser(data);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    setUser(null);
  };

  
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};