import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { handleDatabaseError } from '@/lib/errors';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];
type DbUserUpdate = Database['public']['Tables']['users']['Update'];
const REFRESH_INTERVAL_MS = 30000;

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  authUserId: dbUser.auth_user_id || undefined,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  clientId: dbUser.client_id || undefined,
  workshopId: dbUser.workshop_id || undefined,
  status: (dbUser.status as User['status']) || 'pending',
  lastLoginAt: dbUser.last_login_at,
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at,
});

const mapUserToDbInsert = (user: Omit<User, 'id'>): DbUserInsert => ({
  email: user.email,
  name: user.name,
  role: user.role,
  country_code: user.countryCode,
  password: null,
  phone: user.phone || null,
  client_id: user.clientId || null,
  workshop_id: user.workshopId || null,
  status: user.status || 'pending',
});

export const [UsersProvider, useUsers] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    const refreshUsers = () => {
      void loadUsers().catch((error) => {
        console.error('[UsersContext] Error refreshing users:', error);
      });
    };

    refreshUsers();
    const refreshInterval = setInterval(refreshUsers, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      console.log('[UsersContext] Loading users for role:', currentUser?.role);
      console.log('[UsersContext] Current user workshopId:', currentUser?.workshopId);

      let query = supabase.from('users').select('*');

      if (currentUser?.role === 'technician') {
        if (!currentUser.workshopId) {
          console.log('[UsersContext] Technician has no workshopId, returning empty');
          setUsers([]);
          setIsLoading(false);
          return;
        }
        console.log('[UsersContext] Applying technician filter: workshopId =', currentUser.workshopId);
        query = query
          .eq('workshop_id', currentUser.workshopId);
      } else if (currentUser?.role === 'mechanic') {
        // Mechanics probably only need to see themselves or other mechanics in the same workshop
        // For now, let's filter by workshop just like technician but including themselves
        if (!currentUser.workshopId) {
          setUsers([]);
          setIsLoading(false);
          return;
        }
        query = query.eq('workshop_id', currentUser.workshopId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[UsersContext] Error loading users:', error);
        throw error;
      }

      if (data) {
        console.log('[UsersContext] Loaded users count:', data.length);
        const mappedUsers = data.map(mapDbUserToUser);
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('[UsersContext] Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      console.log('[UsersContext] Adding user:', { ...user });
      console.log('[UsersContext] User workshopId:', user.workshopId);
      console.log('[UsersContext] Current user workshopId:', currentUser?.workshopId);

      const dbInsert = mapUserToDbInsert(user);

      // Safety: if technician is adding, force their workshopId
      if (currentUser?.role === 'technician' && currentUser.workshopId) {
        console.log('[UsersContext] Forcing technician workshopId:', currentUser.workshopId);
        dbInsert.workshop_id = currentUser.workshopId;
      }

      console.log('[UsersContext] DB Insert payload:', { ...dbInsert });

      const { data, error } = await supabase
        .from('users')
        .insert(dbInsert)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'UsersContext:addUser');
      }

      if (data) {
        console.log('[UsersContext] User added successfully:', data.id);
        await loadUsers();
        const newUser = mapDbUserToUser(data);
        return newUser;
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'UsersContext:addUser');
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      console.log('[UsersContext] Updating user:', id, { ...updates });
      const dbUpdate: DbUserUpdate = {};
      if (updates.email !== undefined) dbUpdate.email = updates.email;
      if (updates.name !== undefined) dbUpdate.name = updates.name;
      if (updates.role !== undefined) dbUpdate.role = updates.role;
      if (updates.countryCode !== undefined) dbUpdate.country_code = updates.countryCode;
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone || null;
      if (updates.clientId !== undefined) dbUpdate.client_id = updates.clientId || null;
      if (updates.workshopId !== undefined) dbUpdate.workshop_id = updates.workshopId || null;
      if (updates.status !== undefined) dbUpdate.status = updates.status;
      if (updates.authUserId !== undefined) dbUpdate.auth_user_id = updates.authUserId || null;

      // Safety: technicians can only update users within their workshop
      if (currentUser?.role === 'technician' && currentUser.workshopId) {
        dbUpdate.workshop_id = currentUser.workshopId;
      }

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'UsersContext:updateUser');
      }

      if (data) {
        console.log('[UsersContext] User updated successfully');
        await loadUsers();
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'UsersContext:updateUser');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        throw handleDatabaseError(error, 'UsersContext:deleteUser');
      }

      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'UsersContext:deleteUser');
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
    getUsersByWorkshop,
  };
});
