import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { Client } from '@/types';

const STORAGE_KEY = '@clients';

const DEMO_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Carlos García',
    phone: '+593991234567',
    countryCode: 'EC',
    email: 'carlos@example.com',
    address: 'Av. Amazonas N35-140, Quito',
    documentNumber: '01234567-8',
    notes: 'Cliente frecuente, prefiere pagos en efectivo',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'María López',
    phone: '+593987654321',
    countryCode: 'EC',
    email: 'maria@example.com',
    address: 'Cumbayá, Calle de los Establos, Quito',
    documentNumber: '09876543-2',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const [ClientsProvider, useClients] = createContextHook(() => {
  const [clients, setClients] = useState<Client[]>(DEMO_CLIENTS);

  const loadClients = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setClients(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const saveClients = async (newClients: Client[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newClients));
      setClients(newClients);
    } catch (error) {
      console.error('Error saving clients:', error);
    }
  };

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await saveClients([...clients, newClient]);
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const updated = clients.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    await saveClients(updated);
  };

  const deleteClient = async (id: string) => {
    const filtered = clients.filter((c) => c.id !== id);
    await saveClients(filtered);
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

  return {
    clients,
    loadClients,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    searchClients,
  };
});
