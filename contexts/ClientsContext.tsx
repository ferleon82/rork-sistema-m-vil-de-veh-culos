import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { handleDatabaseError } from '@/lib/errors';

type DbClient = Database['public']['Tables']['clients']['Row'];
type DbClientInsert = Database['public']['Tables']['clients']['Insert'];
type DbClientUpdate = Database['public']['Tables']['clients']['Update'];
const REFRESH_INTERVAL_MS = 30000;

const mapDbClientToClient = (dbClient: DbClient): Client => ({
  id: dbClient.id,
  name: dbClient.name,
  phone: dbClient.phone,
  countryCode: dbClient.country_code,
  email: dbClient.email || undefined,
  address: dbClient.address || undefined,
  documentNumber: dbClient.document_number || undefined,
  notes: dbClient.notes || undefined,
  workshopId: dbClient.workshop_id || undefined,
  createdAt: dbClient.created_at,
});

const mapClientToDbInsert = (client: Omit<Client, 'id' | 'createdAt'>): DbClientInsert => ({
  name: client.name,
  phone: client.phone,
  country_code: client.countryCode,
  email: client.email || null,
  address: client.address || null,
  document_number: client.documentNumber || null,
  notes: client.notes || null,
  workshop_id: client.workshopId || null,
});

export const [ClientsProvider, useClients] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    const refreshClients = () => {
      void loadClients().catch((error) => {
        console.error('[ClientsContext] Error refreshing clients:', error);
      });
    };

    refreshClients();
    const refreshInterval = setInterval(refreshClients, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('clients').select('*');

      if ((currentUser?.role === 'technician' || currentUser?.role === 'mechanic') && currentUser.workshopId) {
        query = query.eq('workshop_id', currentUser.workshopId);
      } else if ((currentUser?.role === 'technician' || currentUser?.role === 'mechanic') && !currentUser.workshopId) {
        setClients([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading clients:', error);
        return;
      }

      if (data) {
        setClients(data.map(mapDbClientToClient));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const dbInsert = mapClientToDbInsert(client);
      console.log('[ClientsContext] Adding client with payload:', dbInsert);

      const { data, error } = await supabase
        .from('clients')
        .insert(dbInsert)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'ClientsContext:addClient');
      }

      if (data) {
        const newClient = mapDbClientToClient(data);
        setClients([newClient, ...clients]);
        return newClient;
      }
    } catch (error) {
      console.error('[ClientsContext] Error in addClient:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const dbUpdate: DbClientUpdate = {};
      if (updates.name !== undefined) dbUpdate.name = updates.name;
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone;
      if (updates.countryCode !== undefined) dbUpdate.country_code = updates.countryCode;
      if (updates.email !== undefined) dbUpdate.email = updates.email || null;
      if (updates.address !== undefined) dbUpdate.address = updates.address || null;
      if (updates.documentNumber !== undefined) dbUpdate.document_number = updates.documentNumber || null;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes || null;
      if (updates.workshopId !== undefined) dbUpdate.workshop_id = updates.workshopId || null;

      const { data, error } = await supabase
        .from('clients')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'ClientsContext:updateClient');
      }

      if (data) {
        const updatedClient = mapDbClientToClient(data);
        setClients(clients.map((c) => (c.id === id ? updatedClient : c)));

        // Sync vital client info to vehicles table
        const vehicleUpdates: any = {};
        if (updates.name !== undefined) vehicleUpdates.owner_name = updates.name;
        if (updates.phone !== undefined) vehicleUpdates.owner_phone = updates.phone;
        if (updates.email !== undefined) vehicleUpdates.owner_email = updates.email || null;
        
        if (Object.keys(vehicleUpdates).length > 0) {
          const { error: vehicleUpdateError } = await supabase
            .from('vehicles')
            .update(vehicleUpdates)
            .eq('client_id', id);
          
          if (vehicleUpdateError) {
            console.error('[ClientsContext] Error syncing client updates to vehicles:', vehicleUpdateError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        throw handleDatabaseError(error, 'ClientsContext:deleteClient');
      }

      setClients(clients.filter((c) => c.id !== id));
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'ClientsContext:deleteClient');
    }
  };

  const getClientById = (id: string) => {
    return clients.find((c) => c.id === id);
  };

  const searchClients = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.documentNumber?.includes(query)
    );
  };

  const getClientsByWorkshop = (workshopId: string) => {
    return clients.filter((c) => c.workshopId === workshopId);
  };

  return {
    clients,
    isLoading,
    loadClients,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    searchClients,
    getClientsByWorkshop,
  };
});
