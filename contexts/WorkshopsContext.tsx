import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Workshop } from '@/types';

const STORAGE_KEY = '@workshops';

const INITIAL_WORKSHOPS: Workshop[] = [
  {
    id: 'w1',
    name: 'Mecánica Central',
    ownerId: '2',
    countryCode: 'EC',
    phone: '+593970123456',
    address: 'Av. De los Shyris y Portugal, Quito',
    email: 'contacto@mecanicacentral.com',
    notes: 'Especialistas en transmisiones automáticas y diagnóstico electrónico.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w2',
    name: 'Torque Plus Garage',
    ownerId: '2',
    countryCode: 'EC',
    phone: '+593978904567',
    address: 'Av. León Febres-Cordero, Guayaquil',
    email: 'hola@torqueplus.com',
    notes: 'Atención premium para flotas corporativas.',
    createdAt: new Date().toISOString(),
  },
];

export const [WorkshopsProvider, useWorkshops] = createContextHook(() => {
  const [workshops, setWorkshops] = useState<Workshop[]>(INITIAL_WORKSHOPS);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Workshop[] = JSON.parse(stored);
        setWorkshops(parsed);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_WORKSHOPS));
      }
    } catch (error) {
      console.error('Error loading workshops:', error);
    }
  };

  const persist = async (next: Workshop[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setWorkshops(next);
    } catch (error) {
      console.error('Error saving workshops:', error);
    }
  };

  const addWorkshop = async (data: Omit<Workshop, 'id' | 'createdAt'>) => {
    const newWorkshop: Workshop = {
      ...data,
      id: `w${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await persist([...workshops, newWorkshop]);
    return newWorkshop;
  };

  const updateWorkshop = async (id: string, updates: Partial<Workshop>) => {
    const next = workshops.map((workshop) =>
      workshop.id === id ? { ...workshop, ...updates } : workshop
    );
    await persist(next);
  };

  const deleteWorkshop = async (id: string) => {
    const next = workshops.filter((workshop) => workshop.id !== id);
    await persist(next);
  };

  const getWorkshopsByOwner = (ownerId: string) =>
    workshops.filter((workshop) => workshop.ownerId === ownerId);

  return {
    workshops,
    addWorkshop,
    updateWorkshop,
    deleteWorkshop,
    getWorkshopsByOwner,
  };
});
