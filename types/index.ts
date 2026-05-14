export type UserRole = 'admin' | 'technician' | 'mechanic';
export type UserStatus = 'pending' | 'active' | 'disabled';

export interface Client {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email?: string;
  address?: string;
  documentNumber?: string;
  notes?: string;
  workshopId?: string;
  createdAt?: string | null;
}

export interface User {
  id: string;
  authUserId?: string;
  email: string;
  name: string;
  role: UserRole;
  countryCode: string;
  phone?: string;
  clientId?: string;
  workshopId?: string;
  status?: UserStatus;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Workshop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  countryCode: string;
  ownerId: string;
  notes?: string;
  createdAt?: string | null;
}

export interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  clientId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  photoUrl?: string;
  createdAt?: string | null;
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  code: string;
  vehicleId: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string;
  diagnosis?: string;
  diagnosisCategoryId?: string;
  diagnosisIssueId?: string;
  diagnosisNotes?: string;
  items: any[];
  totalCost: number;
  createdBy: string;
  assignedTo?: string;
  checkInAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionDate?: string;
  notes?: string;
  images?: string[];
  aiDiagnosticGuide?: string;
  createdAt?: string | null;
}

export interface BudgetItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'part' | 'labor';
}

export interface Budget {
  id: string;
  totalCost: number;
  items: BudgetItem[];
  notes?: string;
  sentAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string | null;
}

export interface WorkOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface WorkOrderFormState {
  vehicleId: string;
  description: string;
  diagnosisCategoryId: string;
  diagnosisIssueId: string;
  diagnosisNotes: string;
  priority: WorkOrderPriority;
  assignedTo: string;
  checkInDate: string;
  checkInTime: string;
  items: WorkOrderItem[];
}
