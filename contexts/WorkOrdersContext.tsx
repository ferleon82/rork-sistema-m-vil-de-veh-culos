import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { WorkOrder, WorkOrderStatus } from '@/types';

const STORAGE_KEY = '@work_orders';

const DEMO_WORK_ORDERS: WorkOrder[] = [
  {
    id: '1',
    code: 'OT-2025-001',
    vehicleId: '1',
    status: 'in_progress',
    priority: 'high',
    description: 'Mantenimiento preventivo 45,000 km',
    diagnosis: 'Cambio de aceite, filtros y revisión general',
    items: [
      { id: '1', description: 'Aceite sintético 5W-30', quantity: 4, unitPrice: 15, total: 60 },
      { id: '2', description: 'Filtro de aceite', quantity: 1, unitPrice: 12, total: 12 },
      { id: '3', description: 'Filtro de aire', quantity: 1, unitPrice: 18, total: 18 },
      { id: '4', description: 'Mano de obra', quantity: 1, unitPrice: 50, total: 50 },
    ],
    totalCost: 140,
    createdBy: '1',
    assignedTo: '2',
    checkInAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedCompletionDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    code: 'OT-2025-002',
    vehicleId: '2',
    status: 'waiting_approval',
    priority: 'medium',
    description: 'Revisión de frenos',
    diagnosis: 'Pastillas delanteras desgastadas al 80%, se recomienda reemplazo',
    items: [
      { id: '1', description: 'Pastillas de freno delanteras', quantity: 1, unitPrice: 85, total: 85 },
      { id: '2', description: 'Discos de freno', quantity: 2, unitPrice: 60, total: 120 },
      { id: '3', description: 'Mano de obra', quantity: 1, unitPrice: 70, total: 70 },
    ],
    totalCost: 275,
    createdBy: '2',
    assignedTo: '2',
    checkInAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date().toISOString(),
  },
];

export const [WorkOrdersProvider, useWorkOrders] = createContextHook(() => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(DEMO_WORK_ORDERS);

  const loadWorkOrders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWorkOrders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading work orders:', error);
    }
  };

  const saveWorkOrders = async (newWorkOrders: WorkOrder[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newWorkOrders));
      setWorkOrders(newWorkOrders);
    } catch (error) {
      console.error('Error saving work orders:', error);
    }
  };

  const addWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'totalCost'>) => {
    const totalCost = workOrder.items.reduce((sum, item) => sum + item.total, 0);
    const orderNumber = workOrders.length + 1;
    const code = `OT-${new Date().getFullYear()}-${orderNumber.toString().padStart(3, '0')}`;
    
    const newWorkOrder: WorkOrder = {
      ...workOrder,
      id: Date.now().toString(),
      code,
      totalCost,
      createdAt: new Date().toISOString(),
    };
    await saveWorkOrders([...workOrders, newWorkOrder]);
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    const updated = workOrders.map((wo) =>
      wo.id === id ? { ...wo, ...updates } : wo
    );
    await saveWorkOrders(updated);
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
    const filtered = workOrders.filter((wo) => wo.id !== id);
    await saveWorkOrders(filtered);
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
