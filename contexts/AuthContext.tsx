import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { User } from '@/types';
import { useUsers } from './UsersContext';

const STORAGE_KEY = '@auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inLoginScreen = segments[0] === 'login';

    if (!user && !inLoginScreen) {
      router.replace('/login' as any);
    } else if (user && inLoginScreen) {
      router.replace('/(tabs)' as any);
    }
  }, [user, segments, isLoading, router]);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { authenticateUser } = useUsers();

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = authenticateUser(email, password);
    
    if (foundUser) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser));
      setUser(foundUser);
      return true;
    }
    
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.replace('/login' as any);
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
  };
});
