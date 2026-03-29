import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      console.log('[UsersContext] Loading users for role:', currentUser?.role);
      console.log('[UsersContext] Current user workshopId:', currentUser?.workshopId);
      
      let query = supabase.from('users').select('*');
      
      if (currentUser?.role === 'technician') {
        console.log('[UsersContext] Applying technician filter: only mechanics from workshop', currentUser.workshopId);
        query = query
          .eq('role', 'mechanic')
          .eq('workshop_id', currentUser.workshopId);
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
      console.log('[UsersContext] Adding user:', { ...user, password: '***' });
      console.log('[UsersContext] User workshopId:', user.workshopId);
      console.log('[UsersContext] Current user workshopId:', currentUser?.workshopId);
      const dbInsert = mapUserToDbInsert(user);
      console.log('[UsersContext] DB Insert payload:', { ...dbInsert, password: '***' });
      console.log('[UsersContext] DB Insert workshopId:', dbInsert.workshop_id);
      
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
      console.log('[UsersContext] Deleting user:', id);
      
      const userToDelete = users.find(u => u.id === id);
      console.log('[UsersContext] User to delete:', userToDelete);
      
      const { data: workshopsData, error: workshopsCheckError } = await supabase
        .from('workshops')
        .select('id, name')
        .eq('owner_id', id);
      
      if (workshopsCheckError) {
        console.error('[UsersContext] Error checking workshops:', workshopsCheckError);
        throw new Error('Error al verificar talleres asociados');
      }
      
      if (workshopsData && workshopsData.length > 0) {
        const workshopNames = workshopsData.map(w => w.name).join(', ');
        throw new Error(`No se puede eliminar este usuario porque es dueño de los siguientes talleres: ${workshopNames}. Elimina primero los talleres o cambia el propietario.`);
      }
      
      console.log('[UsersContext] Updating work orders assigned to user...');
      const { error: updateWorkOrdersError } = await supabase
        .from('work_orders')
        .update({ assigned_to: null })
        .eq('assigned_to', id);
      
      if (updateWorkOrdersError) {
        console.error('[UsersContext] Error updating work orders:', updateWorkOrdersError);
        throw new Error('Error al actualizar las órdenes de trabajo asociadas');
      }
      
      console.log('[UsersContext] Deleting user from database...');
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('[UsersContext] Error deleting user:', deleteError);
        throw new Error(deleteError.message || 'Error al eliminar el usuario');
      }
      
      console.log('[UsersContext] User deleted successfully');
      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      console.error('[UsersContext] Error in deleteUser:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al eliminar el usuario');
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
