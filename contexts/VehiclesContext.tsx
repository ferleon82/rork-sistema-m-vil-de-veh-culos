import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { Vehicle } from '@/types';

const STORAGE_KEY = '@vehicles';

const DEMO_VEHICLES: Vehicle[] = [
  {
    id: '1',
    vin: 'JH4KA7532MC123456',
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    currentKm: 45000,
    clientId: '1',
    ownerName: 'Carlos García',
    ownerPhone: '+50312345678',
    ownerEmail: 'carlos@example.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    vin: 'WBADT43452G123789',
    plate: 'XYZ-5678',
    brand: 'Honda',
    model: 'Civic',
    year: 2019,
    currentKm: 62000,
    clientId: '2',
    ownerName: 'María López',
    ownerPhone: '+50387654321',
    ownerEmail: 'maria@example.com',
    createdAt: new Date().toISOString(),
  },
];

export const [VehiclesProvider, useVehicles] = createContextHook(() => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES);

  const loadVehicles = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVehicles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const saveVehicles = async (newVehicles: Vehicle[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newVehicles));
      setVehicles(newVehicles);
    } catch (error) {
      console.error('Error saving vehicles:', error);
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await saveVehicles([...vehicles, newVehicle]);
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    const updated = vehicles.map((v) =>
      v.id === id ? { ...v, ...updates } : v
    );
    await saveVehicles(updated);
  };

  const deleteVehicle = async (id: string) => {
    const filtered = vehicles.filter((v) => v.id !== id);
    await saveVehicles(filtered);
  };

  const getVehicleById = (id: string) => {
    return vehicles.find((v) => v.id === id);
  };

  return {
    vehicles,
    loadVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleById,
  };
});
