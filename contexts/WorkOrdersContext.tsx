import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { handleDatabaseError } from '@/lib/errors';
import { notifyMechanicAssignedOrder, prepareOrderAssignmentNotifications } from '@/utils/orderAssignmentNotifications';

type DbWorkOrder = Database['public']['Tables']['work_orders']['Row'];
type DbWorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
type DbWorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];
const REFRESH_INTERVAL_MS = 5000;

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
  aiDiagnosticGuide: dbWorkOrder.ai_diagnostic_guide || undefined,
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
  ai_diagnostic_guide: workOrder.aiDiagnosticGuide || null,
});

const ensureVehicleClientWorkshop = async (vehicleId?: string, assignedTo?: string | null) => {
  if (!vehicleId || !assignedTo) return;

  const { data: assignedUser, error: userError } = await supabase
    .from('users')
    .select('workshop_id')
    .eq('id', assignedTo)
    .maybeSingle();

  if (userError || !assignedUser?.workshop_id) return;

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('client_id, clients(workshop_id)')
    .eq('id', vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle?.client_id) return;

  const clientRelation = Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients;
  if (clientRelation?.workshop_id) return;

  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update({ workshop_id: assignedUser.workshop_id })
    .eq('id', vehicle.client_id);

  if (clientUpdateError) {
    console.error('[WorkOrdersContext] Error syncing client workshop from assigned mechanic:', clientUpdateError);
  }
};

export const [WorkOrdersProvider, useWorkOrders] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const knownAssignedOrderIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedAssignedOrdersRef = useRef<boolean>(false);
  const notifiedAssignedOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    knownAssignedOrderIdsRef.current = new Set();
    hasLoadedAssignedOrdersRef.current = false;
    notifiedAssignedOrderIdsRef.current = new Set();

    if (!currentUser) {
      setWorkOrders([]);
      setIsLoading(false);
      return;
    }

    if (currentUser.role === 'mechanic') {
      void prepareOrderAssignmentNotifications();
    }

    const refreshWorkOrders = () => {
      void loadWorkOrders().catch((error) => {
        console.error('[WorkOrdersContext] Error refreshing work orders:', error);
      });
    };

    refreshWorkOrders();
    const refreshInterval = setInterval(refreshWorkOrders, REFRESH_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshWorkOrders();
      }
    });
    const changesChannel = supabase
      .channel(`work-orders-changes-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_orders' },
        () => {
          refreshWorkOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => {
          refreshWorkOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          refreshWorkOrders();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[WorkOrdersContext] Realtime channel error');
        }
      });

    return () => {
      clearInterval(refreshInterval);
      appStateSubscription.remove();
      void supabase.removeChannel(changesChannel);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.workshopId]);

  const notifyNewAssignedOrders = (orders: WorkOrder[]) => {
    if (currentUser?.role !== 'mechanic') return;

    const activeAssignedOrders = orders.filter(
      (order) =>
        order.assignedTo === currentUser.id &&
        order.status !== 'completed' &&
        order.status !== 'cancelled'
    );
    const nextKnownIds = new Set(activeAssignedOrders.map((order) => order.id));

    if (!hasLoadedAssignedOrdersRef.current) {
      knownAssignedOrderIdsRef.current = nextKnownIds;
      hasLoadedAssignedOrdersRef.current = true;
      return;
    }

    activeAssignedOrders.forEach((order) => {
      const alreadyKnown = knownAssignedOrderIdsRef.current.has(order.id);
      const alreadyNotified = notifiedAssignedOrderIdsRef.current.has(order.id);

      if (!alreadyKnown && !alreadyNotified) {
        notifiedAssignedOrderIdsRef.current.add(order.id);
        void notifyMechanicAssignedOrder(order);
      }
    });

    knownAssignedOrderIdsRef.current = nextKnownIds;
  };

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('work_orders')
        .select('*, vehicles!inner(client_id, clients!inner(workshop_id))');

      if (currentUser?.role === 'mechanic') {
        query = query.eq('assigned_to', currentUser.id);
      } else if (currentUser?.role === 'technician' && currentUser.workshopId) {
        query = query.eq('vehicles.clients.workshop_id', currentUser.workshopId);
      } else if (currentUser?.role === 'technician' && !currentUser.workshopId) {
        setWorkOrders([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw handleDatabaseError(error, 'WorkOrdersContext:loadWorkOrders');
      }

      if (data) {
        const mappedOrders = data.map(mapDbWorkOrderToWorkOrder);
        notifyNewAssignedOrders(mappedOrders);
        setWorkOrders(mappedOrders);
      }
    } catch (error) {
      throw handleDatabaseError(error, 'WorkOrdersContext:loadWorkOrders');
    } finally {
      setIsLoading(false);
    }
  };



  const addWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'totalCost'>) => {
    try {
      await ensureVehicleClientWorkshop(workOrder.vehicleId, workOrder.assignedTo);

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
        throw handleDatabaseError(error, 'WorkOrdersContext:addWorkOrder');
      }

      if (data) {
        await ensureVehicleClientWorkshop(data.vehicle_id, data.assigned_to);
        const newWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders([newWorkOrder, ...workOrders]);
      }
    } catch (error) {
      throw handleDatabaseError(error, 'WorkOrdersContext:addWorkOrder');
    }
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    try {
      console.log('[WorkOrdersContext] Updating work order:', { id, updates });
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
      if (updates.aiDiagnosticGuide !== undefined) dbUpdate.ai_diagnostic_guide = updates.aiDiagnosticGuide || null;

      console.log('[WorkOrdersContext] DB update payload:', JSON.stringify(dbUpdate, null, 2));
      console.log('[WorkOrdersContext] Updating work order with ID:', id);

      const { data, error } = await supabase
        .from('work_orders')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'WorkOrdersContext:updateWorkOrder');
      }

      if (data) {
        console.log('[WorkOrdersContext] Successfully updated work order:', data);
        await ensureVehicleClientWorkshop(data.vehicle_id, data.assigned_to);
        const updatedWorkOrder = mapDbWorkOrderToWorkOrder(data);
        setWorkOrders(workOrders.map((wo) => (wo.id === id ? updatedWorkOrder : wo)));
      }
    } catch (error) {
      throw handleDatabaseError(error, 'WorkOrdersContext:updateWorkOrder');
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
        throw handleDatabaseError(error, 'WorkOrdersContext:deleteWorkOrder');
      }

      setWorkOrders(workOrders.filter((wo) => wo.id !== id));
    } catch (error) {
      throw handleDatabaseError(error, 'WorkOrdersContext:deleteWorkOrder');
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

  const generateAIGuide = async (orderId: string, vehicleInfo: string, problemDescription: string) => {
    try {
      console.log('[WorkOrdersContext] Generating AI Guide for order:', orderId);
      const { data, error } = await supabase.functions.invoke('generate-diagnostic-guide', {
        body: {
          vehicleInfo,
          problemDescription,
        },
      });

      if (error) throw error;

      if (data?.guide) {
        await updateWorkOrder(orderId, { aiDiagnosticGuide: data.guide });
        return data.guide;
      }
    } catch (error) {
      console.error('[WorkOrdersContext] Error generating AI guide:', error);
      throw error;
    }
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
    generateAIGuide,
  };
});
