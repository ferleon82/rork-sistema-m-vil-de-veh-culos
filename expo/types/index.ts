export type UserRole = 'admin' | 'technician' | 'mechanic';

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
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  countryCode: string;
  phone?: string;
  clientId?: string;
  workshopId?: string;
}

export interface Workshop {
  id: string;
  name: string;
  ownerId?: string | null;
  countryCode: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
  createdAt: string;
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
  workshopId?: string;
  createdAt: string;
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'technical_review' | 'ready_for_delivery' | 'completed' | 'cancelled';
export type ApprovalStatus = 'not_required' | 'draft' | 'pending' | 'approved' | 'partial' | 'rejected' | 'expired' | 'revoked';

export interface WorkOrderItem {
  id: string;
  /** Links a billable item to the mechanic activity that originated it. */
  workLogId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface WorkLog {
  id: string;
  workOrderId: string;
  mechanicId: string;
  description: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  vehicleId: string;
  workshopId?: string;
  vehicle?: Vehicle;
  status: WorkOrderStatus;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  priority: 'low' | 'medium' | 'high';
  description: string;
  diagnosis?: string;
  diagnosisCategoryId?: string;
  diagnosisIssueId?: string;
  diagnosisNotes?: string;
  items: WorkOrderItem[];
  totalCost: number;
  createdBy: string;
  assignedTo?: string;
  checkInAt: string;
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

export type InternalNotificationType =
  | 'order_assigned'
  | 'work_started'
  | 'review_requested'
  | 'work_returned'
  | 'ready_for_delivery'
  | 'order_closed'
  | 'order_cancelled'
  | 'budget_approved'
  | 'budget_rejected'
  | 'budget_partial'
  | 'approval_required';

export interface UserNotification {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  workshopId: string;
  workOrderId?: string;
  type: InternalNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface BudgetApproval {
  id: string;
  workOrderId: string;
  workshopId: string;
  version: number;
  status: Exclude<ApprovalStatus, 'not_required'>;
  items: WorkOrderItem[];
  totalCost: number;
  notes?: string;
  expiresAt?: string;
  sentAt?: string;
  respondedAt?: string;
  clientComment?: string;
}
