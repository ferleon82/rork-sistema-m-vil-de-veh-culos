import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];
type DbUserUpdate = Database['public']['Tables']['users']['Update'];

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  password: dbUser.password,
  clientId: dbUser.client_id || undefined,
  workshopId: dbUser.workshop_id || undefined,
});

const mapUserToDbInsert = (user: Omit<User, 'id'>): DbUserInsert => ({
  email: user.email,
  name: user.name,
  role: user.role,
  country_code: user.countryCode,
  phone: user.phone || null,
  password: user.password,
  client_id: user.clientId || null,
  workshop_id: user.workshopId || null,
});

export const [UsersProvider, useUsers] = createContextHook(() => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading users:', error);
        return;
      }
      
      if (data) {
        setUsers(data.map(mapDbUserToUser));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      console.log('[UsersContext] Adding user:', { ...user, password: '***' });
      const dbInsert = mapUserToDbInsert(user);
      console.log('[UsersContext] DB Insert payload:', { ...dbInsert, password: '***' });
      
      const { data, error } = await supabase
        .from('users')
        .insert(dbInsert)
        .select()
        .single();
      
      if (error) {
        console.error('[UsersContext] Supabase error:', error);
        console.error('[UsersContext] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Error al crear usuario');
      }
      
      if (data) {
        console.log('[UsersContext] User added successfully:', data.id);
        await loadUsers();
        const newUser = mapDbUserToUser(data);
        return newUser;
      }
    } catch (error) {
      console.error('[UsersContext] Catch block error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al crear usuario');
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      console.log('[UsersContext] Updating user:', id, { ...updates, password: updates.password ? '***' : undefined });
      const dbUpdate: DbUserUpdate = {};
      if (updates.email !== undefined) dbUpdate.email = updates.email;
      if (updates.name !== undefined) dbUpdate.name = updates.name;
      if (updates.role !== undefined) dbUpdate.role = updates.role;
      if (updates.countryCode !== undefined) dbUpdate.country_code = updates.countryCode;
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone || null;
      if (updates.password !== undefined) dbUpdate.password = updates.password;
      if (updates.clientId !== undefined) dbUpdate.client_id = updates.clientId || null;
      if (updates.workshopId !== undefined) dbUpdate.workshop_id = updates.workshopId || null;
      
      const { data, error } = await supabase
        .from('users')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[UsersContext] Supabase error:', error);
        console.error('[UsersContext] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Error al actualizar usuario');
      }
      
      if (data) {
        console.log('[UsersContext] User updated successfully');
        await loadUsers();
      }
    } catch (error) {
      console.error('[UsersContext] Catch block error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al actualizar usuario');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
      
      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const getUserById = (id: string) => {
    return users.find((u) => u.id === id);
  };

  const getUsersByRole = (role: UserRole) => {
    return users.filter((u) => u.role === role);
  };

  const getMechanics = () => {
    return users.filter((u) => u.role === 'mechanic');
  };

  const getUsersByWorkshop = (workshopId: string) => {
    return users.filter((u) => u.workshopId === workshopId);
  };

  const authenticateUser = (email: string, password: string) => {
    const foundUser = users.find((u) => u.email === email);
    if (foundUser && foundUser.password === password) {
      return foundUser;
    }
    return null;
  };

  return {
    users,
    isLoading,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByRole,
    getMechanics,
    authenticateUser,
    getUsersByWorkshop,
  };
});
