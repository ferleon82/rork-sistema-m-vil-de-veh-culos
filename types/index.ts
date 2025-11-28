export type UserRole = 'admin' | 'technician' | 'mechanic';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  photoUrl?: string;
  createdAt: string;
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled';

export interface WorkOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface WorkOrder {
  id: string;
  code: string;
  vehicleId: string;
  vehicle?: Vehicle;
  status: WorkOrderStatus;
  priority: 'low' | 'medium' | 'high';
  description: string;
  diagnosis?: string;
  items: WorkOrderItem[];
  totalCost: number;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionDate?: string;
  notes?: string;
  images?: string[];
}

export interface Budget {
  id: string;
  workOrderId: string;
  items: WorkOrderItem[];
  totalCost: number;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface Notification {
  id: string;
  type: 'status_update' | 'budget_sent' | 'budget_approved' | 'work_completed';
  workOrderId: string;
  message: string;
  phoneNumber: string;
  sentAt: string;
  delivered: boolean;
}
