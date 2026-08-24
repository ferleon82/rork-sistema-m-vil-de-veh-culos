import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type DbUser = Database['public']['Tables']['users']['Row'];
export type CreateUserInput = Omit<User, 'id'>;

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  clientId: dbUser.client_id || undefined,
  workshopId: dbUser.workshop_id || undefined,
});

const invokeUserManager = async <T,>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    let message = error.message || 'No se pudo gestionar el usuario';
    const response = (error as { context?: Response }).context;
    if (response?.json) {
      const responseBody = await response.clone().json().catch(() => null) as { error?: unknown } | null;
      if (typeof responseBody?.error === 'string') message = responseBody.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};

export const [UsersProvider, useUsers] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mechanics have no Users tab and are intentionally forbidden from the
    // management Edge Function. Avoid a needless 403 during every login.
    if (currentUser && currentUser.role !== 'mechanic') {
      void loadUsers();
    } else {
      setUsers([]);
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const result = await invokeUserManager<{ users: DbUser[] }>({ action: 'list' });
      setUsers((result.users || []).map(mapDbUserToUser));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUser = async (user: CreateUserInput) => {
    const result = await invokeUserManager<{ user: DbUser }>({ action: 'create', user });
    const newUser = mapDbUserToUser(result.user);
    setUsers((current) => [newUser, ...current]);
    return newUser;
  };

  const updateUser = async (id: string, updates: Omit<User, 'id'>) => {
    const result = await invokeUserManager<{ user: DbUser; requiresGoogleSignIn?: boolean }>({ action: 'update', userId: id, user: updates });
    const updatedUser = mapDbUserToUser(result.user);
    setUsers((current) => current.map((user) => user.id === id ? updatedUser : user));
    return { user: updatedUser, requiresGoogleSignIn: !!result.requiresGoogleSignIn };
  };

  const deleteUser = async (id: string) => {
    await invokeUserManager({ action: 'delete', userId: id });
    setUsers((current) => current.filter((user) => user.id !== id));
  };

  const getUserById = (id: string) => users.find((user) => user.id === id);
  const getUsersByRole = (role: UserRole) => users.filter((user) => user.role === role);
  const getMechanics = () => getUsersByRole('mechanic');
  const getUsersByWorkshop = (workshopId: string) => users.filter((user) => user.workshopId === workshopId);

  return { users, isLoading, loadUsers, addUser, updateUser, deleteUser, getUserById, getUsersByRole, getMechanics, getUsersByWorkshop };
});
