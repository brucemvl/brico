import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';

type UserType = {
  token: string;
  role: 'client' | 'pro';
  userId: string;
};

export type AuthContextType = {
  user: UserType | null;
  loading: boolean;
  login: (data: UserType) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');
        const userId = await AsyncStorage.getItem('userId');

        if (token && role && userId) {
          setUser({
            token,
            role: role as 'client' | 'pro',
            userId,
          });
        }
      } catch (err) {
        console.error('Erreur loadUser:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (data: UserType) => {
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('role', data.role);
    await AsyncStorage.setItem('userId', data.userId);

    setUser(data);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    await AsyncStorage.removeItem('userId');

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};