import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Workshop } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { handleDatabaseError } from '@/lib/errors';

type DbWorkshop = Database['public']['Tables']['workshops']['Row'];
type DbWorkshopInsert = Database['public']['Tables']['workshops']['Insert'];
type DbWorkshopUpdate = Database['public']['Tables']['workshops']['Update'];
const REFRESH_INTERVAL_MS = 30000;

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
    const refreshWorkshops = () => {
      void loadWorkshops().catch((error) => {
        console.error('[WorkshopsContext] Error refreshing workshops:', error);
      });
    };

    refreshWorkshops();
    const refreshInterval = setInterval(refreshWorkshops, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
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
        throw handleDatabaseError(error, 'WorkshopsContext:addWorkshop');
      }

      if (result) {
        // Automatically link the owner to this workshop
        await supabase
          .from('users')
          .update({ workshop_id: result.id })
          .eq('id', result.owner_id);

        const newWorkshop = mapDbWorkshopToWorkshop(result);
        setWorkshops([newWorkshop, ...workshops]);
        return newWorkshop;
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'WorkshopsContext:addWorkshop');
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
        throw handleDatabaseError(error, 'WorkshopsContext:updateWorkshop');
      }

      if (data) {
        // If owner changed, update the new owner's workshop_id
        if (updates.ownerId) {
          await supabase
            .from('users')
            .update({ workshop_id: data.id })
            .eq('id', data.owner_id);
        }

        const updatedWorkshop = mapDbWorkshopToWorkshop(data);
        setWorkshops(workshops.map((w) => (w.id === id ? updatedWorkshop : w)));
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'WorkshopsContext:updateWorkshop');
    }
  };

  const deleteWorkshop = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', id);

      if (error) {
        throw handleDatabaseError(error, 'WorkshopsContext:deleteWorkshop');
      }

      setWorkshops(workshops.filter((w) => w.id !== id));
    } catch (error) {
      if (error instanceof Error) throw error;
      throw handleDatabaseError(error, 'WorkshopsContext:deleteWorkshop');
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
