import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Vehicle } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { handleDatabaseError } from '@/lib/errors';

type DbVehicle = Database['public']['Tables']['vehicles']['Row'];
type DbVehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type DbVehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
const REFRESH_INTERVAL_MS = 30000;

const mapDbVehicleToVehicle = (dbVehicle: DbVehicle): Vehicle => ({
  id: dbVehicle.id,
  vin: dbVehicle.vin,
  plate: dbVehicle.plate,
  brand: dbVehicle.brand,
  model: dbVehicle.model,
  year: dbVehicle.year,
  currentKm: dbVehicle.current_km,
  clientId: dbVehicle.client_id,
  ownerName: dbVehicle.owner_name,
  ownerPhone: dbVehicle.owner_phone,
  ownerEmail: dbVehicle.owner_email || undefined,
  photoUrl: dbVehicle.photo_url || undefined,
  createdAt: dbVehicle.created_at,
});

const mapVehicleToDbInsert = (vehicle: Omit<Vehicle, 'id' | 'createdAt'>): DbVehicleInsert => ({
  vin: vehicle.vin,
  plate: vehicle.plate,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  current_km: vehicle.currentKm,
  client_id: vehicle.clientId,
  owner_name: vehicle.ownerName,
  owner_phone: vehicle.ownerPhone,
  owner_email: vehicle.ownerEmail || null,
  photo_url: vehicle.photoUrl || null,
});

export const [VehiclesProvider, useVehicles] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) {
      setVehicles([]);
      setIsLoading(false);
      return;
    }

    const refreshVehicles = () => {
      void loadVehicles().catch((error) => {
        console.error('[VehiclesContext] Error refreshing vehicles:', error);
      });
    };

    refreshVehicles();
    const refreshInterval = setInterval(refreshVehicles, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('vehicles').select('*, clients!inner(workshop_id)');

      if ((currentUser?.role === 'technician' || currentUser?.role === 'mechanic') && currentUser.workshopId) {
        query = query.eq('clients.workshop_id', currentUser.workshopId);
      } else if ((currentUser?.role === 'technician' || currentUser?.role === 'mechanic') && !currentUser.workshopId) {
        setVehicles([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading vehicles:', error);
        return;
      }

      if (data) {
        setVehicles(data.map(mapDbVehicleToVehicle));
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    try {
      const dbInsert = mapVehicleToDbInsert(vehicle);
      const { data, error } = await supabase
        .from('vehicles')
        .insert(dbInsert)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'VehiclesContext:addVehicle');
      }

      if (data) {
        const newVehicle = mapDbVehicleToVehicle(data);
        setVehicles([newVehicle, ...vehicles]);
        return newVehicle;
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'VehiclesContext:addVehicle');
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const dbUpdate: DbVehicleUpdate = {};
      if (updates.vin !== undefined) dbUpdate.vin = updates.vin;
      if (updates.plate !== undefined) dbUpdate.plate = updates.plate;
      if (updates.brand !== undefined) dbUpdate.brand = updates.brand;
      if (updates.model !== undefined) dbUpdate.model = updates.model;
      if (updates.year !== undefined) dbUpdate.year = updates.year;
      if (updates.currentKm !== undefined) dbUpdate.current_km = updates.currentKm;
      if (updates.clientId !== undefined) dbUpdate.client_id = updates.clientId;
      if (updates.ownerName !== undefined) dbUpdate.owner_name = updates.ownerName;
      if (updates.ownerPhone !== undefined) dbUpdate.owner_phone = updates.ownerPhone;
      if (updates.ownerEmail !== undefined) dbUpdate.owner_email = updates.ownerEmail || null;
      if (updates.photoUrl !== undefined) dbUpdate.photo_url = updates.photoUrl || null;

      const { data, error } = await supabase
        .from('vehicles')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'VehiclesContext:updateVehicle');
      }

      if (data) {
        const updatedVehicle = mapDbVehicleToVehicle(data);
        setVehicles(vehicles.map((v) => (v.id === id ? updatedVehicle : v)));
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'VehiclesContext:updateVehicle');
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) {
        throw handleDatabaseError(error, 'VehiclesContext:deleteVehicle');
      }

      setVehicles(vehicles.filter((v) => v.id !== id));
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'VehiclesContext:deleteVehicle');
    }
  };

  const getVehicleById = (id: string) => {
    return vehicles.find((v) => v.id === id);
  };

  return {
    vehicles,
    isLoading,
    loadVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleById,
  };
});
