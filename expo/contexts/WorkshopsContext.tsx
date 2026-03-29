import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Workshop } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DbWorkshop = Database['public']['Tables']['workshops']['Row'];
type DbWorkshopInsert = Database['public']['Tables']['workshops']['Insert'];
type DbWorkshopUpdate = Database['public']['Tables']['workshops']['Update'];

const mapDbWorkshopToWorkshop = (dbWorkshop: DbWorkshop): Workshop => ({
  id: dbWorkshop.id,
  name: dbWorkshop.name,
  ownerId: dbWorkshop.owner_id,
  countryCode: dbWorkshop.country_code,
  phone: dbWorkshop.phone || undefined,
  address: dbWorkshop.address || undefined,
  email: dbWorkshop.email || undefined,
  notes: dbWorkshop.notes || undefined,
  createdAt: dbWorkshop.created_at,
});

const mapWorkshopToDbInsert = (workshop: Omit<Workshop, 'id' | 'createdAt'>): DbWorkshopInsert => ({
  name: workshop.name,
  owner_id: workshop.ownerId,
  country_code: workshop.countryCode,
  phone: workshop.phone || null,
  address: workshop.address || null,
  email: workshop.email || null,
  notes: workshop.notes || null,
});

export const [WorkshopsProvider, useWorkshops] = createContextHook(() => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading workshops:', error);
        return;
      }
      
      if (data) {
        setWorkshops(data.map(mapDbWorkshopToWorkshop));
      }
    } catch (error) {
      console.error('Error loading workshops:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addWorkshop = async (data: Omit<Workshop, 'id' | 'createdAt'>) => {
    try {
      const dbInsert = mapWorkshopToDbInsert(data);
      const { data: result, error } = await supabase
        .from('workshops')
        .insert(dbInsert)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding workshop:', error);
        throw error;
      }
      
      if (result) {
        const newWorkshop = mapDbWorkshopToWorkshop(result);
        setWorkshops([newWorkshop, ...workshops]);
        return newWorkshop;
      }
    } catch (error) {
      console.error('Error adding workshop:', error);
      throw error;
    }
  };

  const updateWorkshop = async (id: string, updates: Partial<Workshop>) => {
    try {
      const dbUpdate: DbWorkshopUpdate = {};
      if (updates.name !== undefined) dbUpdate.name = updates.name;
      if (updates.ownerId !== undefined) dbUpdate.owner_id = updates.ownerId;
      if (updates.countryCode !== undefined) dbUpdate.country_code = updates.countryCode;
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone || null;
      if (updates.address !== undefined) dbUpdate.address = updates.address || null;
      if (updates.email !== undefined) dbUpdate.email = updates.email || null;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes || null;
      
      const { data, error } = await supabase
        .from('workshops')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating workshop:', error);
        throw error;
      }
      
      if (data) {
        const updatedWorkshop = mapDbWorkshopToWorkshop(data);
        setWorkshops(workshops.map((w) => (w.id === id ? updatedWorkshop : w)));
      }
    } catch (error) {
      console.error('Error updating workshop:', error);
      throw error;
    }
  };

  const deleteWorkshop = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting workshop:', error);
        throw error;
      }
      
      setWorkshops(workshops.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Error deleting workshop:', error);
      throw error;
    }
  };

  const getWorkshopsByOwner = (ownerId: string) =>
    workshops.filter((workshop) => workshop.ownerId === ownerId);

  return {
    workshops,
    isLoading,
    loadWorkshops,
    addWorkshop,
    updateWorkshop,
    deleteWorkshop,
    getWorkshopsByOwner,
  };
});
