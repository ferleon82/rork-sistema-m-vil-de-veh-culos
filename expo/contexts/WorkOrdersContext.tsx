import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type DbWorkOrder = Database['public']['Tables']['work_orders']['Row'];
type DbWorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
type DbWorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];

const mapDbWorkOrderToWorkOrder = (dbWorkOrder: DbWorkOrder): WorkOrder => ({
  id: dbWorkOrder.id,
  code: dbWorkOrder.code,
  vehicleId: dbWorkOrder.vehicle_id,
  workshopId: dbWorkOrder.workshop_id || undefined,
  // Legacy workflow states are treated as pending until migration 017 normalizes them.
  status: ['diagnosis', 'waiting_approval'].includes(dbWorkOrder.status)
    ? 'pending'
    : dbWorkOrder.status === 'approved'
      ? 'in_progress'
      : dbWorkOrder.status as WorkOrderStatus,
  approvalRequired: dbWorkOrder.approval_required,
  approvalStatus: dbWorkOrder.approval_status,
  priority: dbWorkOrder.priority,
  description: dbWorkOrder.description,
  diagnosis: dbWorkOrder.diagnosis || undefined,
  diagnosisCategoryId: dbWorkOrder.diagnosis_category_id || undefined,
  diagnosisIssueId: dbWorkOrder.diagnosis_issue_id || undefined,
  diagnosisNotes: dbWorkOrder.diagnosis_notes || undefined,
  items: dbWorkOrder.items as any,
  totalCost: Number(dbWorkOrder.total_cost),
  createdBy: dbWorkOrder.created_by,
  assignedTo: dbWorkOrder.assigned_to || undefined,
  checkInAt: dbWorkOrder.check_in_at,
  startedAt: dbWorkOrder.started_at || undefined,
  completedAt: dbWorkOrder.completed_at || undefined,
  estimatedCompletionDate: dbWorkOrder.estimated_completion_date || undefined,
  notes: dbWorkOrder.notes || undefined,
  images: dbWorkOrder.images || undefined,
  createdAt: dbWorkOrder.created_at,
});

const mapWorkOrderToDbInsert = (workOrder: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'totalCost'>): Omit<DbWorkOrderInsert, 'code' | 'total_cost'> => ({
  vehicle_id: workOrder.vehicleId,
  workshop_id: workOrder.workshopId || null,
  status: workOrder.status,
  approval_required: workOrder.approvalRequired,
  approval_status: workOrder.approvalStatus,
  priority: workOrder.priority,
  description: workOrder.description,
  diagnosis: workOrder.diagnosis || null,
  diagnosis_category_id: workOrder.diagnosisCategoryId || null,
  diagnosis_issue_id: workOrder.diagnosisIssueId || null,
  diagnosis_notes: workOrder.diagnosisNotes || null,
  items: workOrder.items as any,
  created_by: workOrder.createdBy,
  assigned_to: workOrder.assignedTo || null,
  check_in_at: workOrder.checkInAt,
  started_at: workOrder.startedAt || null,
  completed_at: workOrder.completedAt || null,
  estimated_completion_date: workOrder.estimatedCompletionDate || null,
  notes: workOrder.notes || null,
  images: workOrder.images || null,
});

export const [WorkOrdersProvider, useWorkOrders] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (currentUser) {
      void loadWorkOrders();
      const channel = supabase
        .channel(`work-orders-${currentUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'work_orders' },
          () => void loadWorkOrders(),
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } else {
      setWorkOrders([]);
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('work_orders')
        .select('*');

      if (currentUser?.role === 'technician') {
        if (!currentUser.workshopId) {
          setWorkOrders([]);
          return;
        }
        query = query.eq('workshop_id', currentUser.workshopId);
      } else if (currentUser?.role === 'mechanic') {
        query = query.eq('assigned_to', currentUser.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading work orders:', error);
        return;
      }
      
      if (data) {
        setWorkOrders(data.map(mapDbWorkOrderToWorkOrder));
      }
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'totalCost'>) => {
    try {
      const totalCost = workOrder.items.reduce((sum, item) => sum + item.total, 0);

      // Supabase generates the unique code atomically. Generating it from a
      // client-side count produces duplicates when records already exist or
      // two technicians submit at the same time.
      const dbInsert = {
        ...mapWorkOrderToDbInsert(workOrder),
        total_cost: totalCost,
      };
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert(dbInsert as any)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding work order:', error);
        const errorMessage = error.message || error.details || error.hint || 'Error desconocido al crear la orden';
        throw new Error(errorMessage);
      }
      
      if (data) {
        const newWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders([newWorkOrder, ...workOrders]);
      }
    } catch (error) {
      console.error('Error adding work order:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al crear la orden');
    }
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    try {
      console.log('[WorkOrdersContext] Updating work order:', { id, updates });
      const dbUpdate: DbWorkOrderUpdate = {};
      if (updates.vehicleId !== undefined) dbUpdate.vehicle_id = updates.vehicleId;
      if (updates.workshopId !== undefined) dbUpdate.workshop_id = updates.workshopId || null;
      if (updates.status !== undefined) dbUpdate.status = updates.status;
      if (updates.priority !== undefined) dbUpdate.priority = updates.priority;
      if (updates.description !== undefined) dbUpdate.description = updates.description;
      if (updates.diagnosis !== undefined) dbUpdate.diagnosis = updates.diagnosis || null;
      if (updates.diagnosisCategoryId !== undefined) dbUpdate.diagnosis_category_id = updates.diagnosisCategoryId || null;
      if (updates.diagnosisIssueId !== undefined) dbUpdate.diagnosis_issue_id = updates.diagnosisIssueId || null;
      if (updates.diagnosisNotes !== undefined) dbUpdate.diagnosis_notes = updates.diagnosisNotes || null;
      if (updates.items !== undefined) dbUpdate.items = updates.items as any;
      if (updates.totalCost !== undefined) dbUpdate.total_cost = updates.totalCost;
      if (updates.assignedTo !== undefined) dbUpdate.assigned_to = updates.assignedTo || null;
      if (updates.checkInAt !== undefined) dbUpdate.check_in_at = updates.checkInAt;
      if (updates.startedAt !== undefined) dbUpdate.started_at = updates.startedAt || null;
      if (updates.completedAt !== undefined) dbUpdate.completed_at = updates.completedAt || null;
      if (updates.estimatedCompletionDate !== undefined) dbUpdate.estimated_completion_date = updates.estimatedCompletionDate || null;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes || null;
      if (updates.images !== undefined) dbUpdate.images = updates.images || null;
      
      console.log('[WorkOrdersContext] DB update payload:', JSON.stringify(dbUpdate, null, 2));
      console.log('[WorkOrdersContext] Updating work order with ID:', id);
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[WorkOrdersContext] ===== SUPABASE ERROR DETAILS =====');
        console.error('[WorkOrdersContext] Error object:', error);
        console.error('[WorkOrdersContext] Error message:', error.message);
        console.error('[WorkOrdersContext] Error details:', error.details);
        console.error('[WorkOrdersContext] Error hint:', error.hint);
        console.error('[WorkOrdersContext] Error code:', error.code);
        console.error('[WorkOrdersContext] Full error JSON:', JSON.stringify(error, null, 2));
        console.error('[WorkOrdersContext] =====================================');
        
        const errorParts = [];
        if (error.message) errorParts.push(error.message);
        if (error.details) errorParts.push(`Detalles: ${error.details}`);
        if (error.hint) errorParts.push(`Sugerencia: ${error.hint}`);
        if (error.code) errorParts.push(`Código: ${error.code}`);
        
        const errorMessage = errorParts.length > 0 
          ? errorParts.join(' | ') 
          : 'Error desconocido al actualizar la orden';
        
        throw new Error(errorMessage);
      }
      
      if (data) {
        console.log('[WorkOrdersContext] Successfully updated work order:', data);
        const updatedWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders(workOrders.map((wo) => (wo.id === id ? updatedWorkOrder : wo)));
      }
    } catch (error) {
      console.error('[WorkOrdersContext] ===== CATCH BLOCK ERROR =====');
      console.error('[WorkOrdersContext] Error type:', typeof error);
      console.error('[WorkOrdersContext] Error instanceof Error:', error instanceof Error);
      console.error('[WorkOrdersContext] Error object:', error);
      
      if (error instanceof Error) {
        console.error('[WorkOrdersContext] Error.message:', error.message);
        console.error('[WorkOrdersContext] Error.stack:', error.stack);
        throw error;
      }
      
      let errorStr = 'Error desconocido';
      try {
        if (error && typeof error === 'object') {
          errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        } else {
          errorStr = String(error);
        }
      } catch (stringifyError) {
        errorStr = 'Error al serializar el error';
      }
      
      console.error('[WorkOrdersContext] Stringified error:', errorStr);
      console.error('[WorkOrdersContext] ================================');
      throw new Error(`Error al actualizar la orden: ${errorStr}`);
    }
  };

  const updateWorkOrderStatus = async (id: string, status: WorkOrderStatus) => {
    const { data, error } = await supabase
      .rpc('transition_work_order_status', { p_order_id: id, p_next_status: status })
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo actualizar el estado de la orden.');
    }

    const updatedWorkOrder = mapDbWorkOrderToWorkOrder(data as DbWorkOrder);
    setWorkOrders((current) => current.map((workOrder) =>
      workOrder.id === id ? updatedWorkOrder : workOrder
    ));
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting work order:', error);
        const errorMessage = error.message || error.details || error.hint || 'Error desconocido al eliminar la orden';
        throw new Error(errorMessage);
      }
      
      setWorkOrders(workOrders.filter((wo) => wo.id !== id));
    } catch (error) {
      console.error('Error deleting work order:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al eliminar la orden');
    }
  };

  const getWorkOrderById = (id: string) => {
    return workOrders.find((wo) => wo.id === id);
  };

  const getWorkOrdersByStatus = (status: WorkOrderStatus) => {
    return workOrders.filter((wo) => wo.status === status);
  };

  const getWorkOrdersByVehicle = (vehicleId: string) => {
    return workOrders.filter((wo) => wo.vehicleId === vehicleId);
  };

  return {
    workOrders,
    isLoading,
    loadWorkOrders,
    addWorkOrder,
    updateWorkOrder,
    updateWorkOrderStatus,
    deleteWorkOrder,
    getWorkOrderById,
    getWorkOrdersByStatus,
    getWorkOrdersByVehicle,
  };
});
