import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DbClient = Database['public']['Tables']['clients']['Row'];
type DbClientInsert = Database['public']['Tables']['clients']['Insert'];
type DbClientUpdate = Database['public']['Tables']['clients']['Update'];

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
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
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
      const { data, error } = await supabase
        .from('clients')
        .insert(dbInsert)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding client:', error);
        throw error;
      }
      
      if (data) {
        const newClient = mapDbClientToClient(data);
        setClients([newClient, ...clients]);
        return newClient;
      }
    } catch (error) {
      console.error('Error adding client:', error);
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
        console.error('Error updating client:', error);
        throw error;
      }
      
      if (data) {
        const updatedClient = mapDbClientToClient(data);
        setClients(clients.map((c) => (c.id === id ? updatedClient : c)));
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
        console.error('Error deleting client:', error);
        throw error;
      }
      
      setClients(clients.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
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
