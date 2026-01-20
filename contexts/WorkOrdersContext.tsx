import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DbWorkOrder = Database['public']['Tables']['work_orders']['Row'];
type DbWorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
type DbWorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];

const mapDbWorkOrderToWorkOrder = (dbWorkOrder: DbWorkOrder): WorkOrder => ({
  id: dbWorkOrder.id,
  code: dbWorkOrder.code,
  vehicleId: dbWorkOrder.vehicle_id,
  status: dbWorkOrder.status,
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
  status: workOrder.status,
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
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
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
      
      const { count } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });
      
      const orderNumber = (count || 0) + 1;
      const code = `OT-${new Date().getFullYear()}-${orderNumber.toString().padStart(3, '0')}`;
      
      const dbInsert = {
        ...mapWorkOrderToDbInsert(workOrder),
        code,
        total_cost: totalCost,
      };
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert(dbInsert as any)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding work order:', error);
        throw error;
      }
      
      if (data) {
        const newWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders([newWorkOrder, ...workOrders]);
      }
    } catch (error) {
      console.error('Error adding work order:', error);
      throw error;
    }
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    try {
      const dbUpdate: DbWorkOrderUpdate = {};
      if (updates.vehicleId !== undefined) dbUpdate.vehicle_id = updates.vehicleId;
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
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating work order:', error);
        throw error;
      }
      
      if (data) {
        const updatedWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders(workOrders.map((wo) => (wo.id === id ? updatedWorkOrder : wo)));
      }
    } catch (error) {
      console.error('Error updating work order:', error);
      throw error;
    }
  };

  const updateWorkOrderStatus = async (id: string, status: WorkOrderStatus) => {
    const updates: Partial<WorkOrder> = { status };
    
    if (status === 'in_progress' && !workOrders.find((wo) => wo.id === id)?.startedAt) {
      updates.startedAt = new Date().toISOString();
    }
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    
    await updateWorkOrder(id, updates);
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting work order:', error);
        throw error;
      }
      
      setWorkOrders(workOrders.filter((wo) => wo.id !== id));
    } catch (error) {
      console.error('Error deleting work order:', error);
      throw error;
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
