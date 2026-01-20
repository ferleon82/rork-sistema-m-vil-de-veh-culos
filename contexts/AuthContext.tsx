import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

const STORAGE_KEY = '@auth_user';

type DbUser = Database['public']['Tables']['users']['Row'];

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  password: dbUser.password,
  clientId: dbUser.client_id || undefined,
});

type AppTabName =
  | 'index'
  | 'vehicles'
  | 'work-orders'
  | 'workshops'
  | 'clients'
  | 'users'
  | 'settings';

type RolePermissions = {
  canManageWorkshops: boolean;
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canManageClients: boolean;
  canManageWorkOrders: boolean;
  canAssignWorkOrders: boolean;
  viewOnlyAssignedWorkOrders: boolean;
  accessibleTabs: readonly AppTabName[];
  assignableRoles: readonly UserRole[];
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
    accessibleTabs: ['index', 'vehicles', 'work-orders', 'workshops', 'clients', 'users', 'settings'],
    assignableRoles: ['admin', 'technician', 'mechanic'],
  },
  technician: {
    canManageWorkshops: false,
    canManageUsers: true,
    canManageVehicles: true,
    canManageClients: true,
    canManageWorkOrders: true,
    canAssignWorkOrders: true,
    viewOnlyAssignedWorkOrders: false,
    accessibleTabs: ['index', 'vehicles', 'work-orders', 'clients', 'users', 'settings'],
    assignableRoles: ['mechanic'],
  },
  mechanic: {
    canManageWorkshops: false,
    canManageUsers: false,
    canManageVehicles: false,
    canManageClients: false,
    canManageWorkOrders: false,
    canAssignWorkOrders: false,
    viewOnlyAssignedWorkOrders: true,
    accessibleTabs: ['index', 'work-orders', 'settings'],
    assignableRoles: [],
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
        const cachedUser = JSON.parse(stored);
        setUser(cachedUser);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', cachedUser.id)
          .single();
        
        if (data && !error) {
          const freshUser = mapDbUserToUser(data);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
          setUser(freshUser);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (data && !error) {
        const foundUser = mapDbUserToUser(data);
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

export type { RolePermissions, AppTabName };
