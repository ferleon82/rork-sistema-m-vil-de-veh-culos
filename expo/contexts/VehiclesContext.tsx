import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Vehicle } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type DbVehicle = Database['public']['Tables']['vehicles']['Row'];
type DbVehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type DbVehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

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
  workshopId: dbVehicle.workshop_id || undefined,
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
  workshop_id: vehicle.workshopId || null,
});

export const [VehiclesProvider, useVehicles] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (currentUser) {
      void loadVehicles();
    } else {
      setVehicles([]);
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('vehicles')
        .select('*');

      if (currentUser?.role === 'technician') {
        if (!currentUser.workshopId) {
          setVehicles([]);
          return;
        }
        query = query.eq('workshop_id', currentUser.workshopId);
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
        console.error('Error adding vehicle:', error);
        throw error;
      }
      
      if (data) {
        const newVehicle = mapDbVehicleToVehicle(data);
        setVehicles([newVehicle, ...vehicles]);
        return newVehicle;
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      throw error;
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
      if (updates.workshopId !== undefined) dbUpdate.workshop_id = updates.workshopId || null;
      
      const { data, error } = await supabase
        .from('vehicles')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating vehicle:', error);
        throw error;
      }
      
      if (data) {
        const updatedVehicle = mapDbVehicleToVehicle(data);
        setVehicles(vehicles.map((v) => (v.id === id ? updatedVehicle : v)));
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
      }
      
      setVehicles(vehicles.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
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
