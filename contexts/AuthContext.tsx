import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types';

const STORAGE_KEY = '@auth_user';
const USERS_STORAGE_KEY = '@users';

const INITIAL_USERS: User[] = [
  {
    id: '1',
    email: 'admin@taller.com',
    name: 'Administrador',
    role: 'admin',
    countryCode: 'SV',
    phone: '+50312345678',
  },
  {
    id: '2',
    email: 'tecnico@taller.com',
    name: 'Técnico Juan',
    role: 'technician',
    countryCode: 'SV',
    phone: '+50387654321',
  },
  {
    id: '3',
    email: 'mecanico@taller.com',
    name: 'Mecánico Pedro',
    role: 'mechanic',
    countryCode: 'SV',
    phone: '+50399887766',
  },
];

type RolePermissions = {
  canManageWorkshops: boolean;
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canManageClients: boolean;
  canManageWorkOrders: boolean;
  canAssignWorkOrders: boolean;
  viewOnlyAssignedWorkOrders: boolean;
};

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageWorkshops: true,
    canManageUsers: true,
    canManageVehicles: true,
    canManageClients: true,
    canManageWorkOrders: true,
    canAssignWorkOrders: true,
    viewOnlyAssignedWorkOrders: false,
  },
  technician: {
    canManageWorkshops: false,
    canManageUsers: true,
    canManageVehicles: true,
    canManageClients: true,
    canManageWorkOrders: true,
    canAssignWorkOrders: true,
    viewOnlyAssignedWorkOrders: false,
  },
  mechanic: {
    canManageWorkshops: false,
    canManageUsers: false,
    canManageVehicles: false,
    canManageClients: false,
    canManageWorkOrders: false,
    canAssignWorkOrders: false,
    viewOnlyAssignedWorkOrders: true,
  },
};

const getPermissions = (role?: UserRole): RolePermissions => {
  if (!role) {
    return ROLE_PERMISSIONS.mechanic;
  }
  return ROLE_PERMISSIONS[role];
};

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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;
      
      const foundUser = users.find((u) => u.email === email);
      
      if (foundUser && password === 'admin123') {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(foundUser));
        setUser(foundUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.replace('/login' as any);
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isMechanic = user?.role === 'mechanic';
  const permissions = getPermissions(user?.role);

  return {
    user,
    isLoading,
    login,
    logout,
    isAdmin,
    isTechnician,
    isMechanic,
    permissions,
  };
});

export type { RolePermissions };
