import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { BudgetApproval, WorkOrderItem } from '@/types';

type PrepareResult = { approval: Record<string, unknown>; approvalUrl: string };

const invokeBudgetManager = async <T,>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-budget', { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response?.json ? await response.clone().json().catch(() => null) as { error?: string } | null : null;
    throw new Error(payload?.error || error.message || 'No se pudo gestionar el presupuesto.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};

const mapApproval = (approval: Record<string, unknown>): BudgetApproval => ({
  id: String(approval.id),
  workOrderId: String(approval.work_order_id),
  workshopId: String(approval.workshop_id),
  version: Number(approval.version),
  status: approval.status as BudgetApproval['status'],
  items: (approval.items || []) as WorkOrderItem[],
  totalCost: Number(approval.total_cost || 0),
  notes: typeof approval.notes === 'string' ? approval.notes : undefined,
  expiresAt: typeof approval.expires_at === 'string' ? approval.expires_at : undefined,
  sentAt: typeof approval.sent_at === 'string' ? approval.sent_at : undefined,
  respondedAt: typeof approval.responded_at === 'string' ? approval.responded_at : undefined,
  clientComment: typeof approval.client_comment === 'string' ? approval.client_comment : undefined,
});

export const [BudgetApprovalsProvider, useBudgetApprovals] = createContextHook(() => {
  const prepareApproval = async (workOrderId: string, notes?: string) => {
    const result = await invokeBudgetManager<PrepareResult>({ action: 'prepare', workOrderId, notes });
    return { approval: mapApproval(result.approval), approvalUrl: result.approvalUrl };
  };

  const markSent = async (budgetId: string) => {
    await invokeBudgetManager<{ success: boolean }>({ action: 'mark-sent', budgetId });
  };

  return { prepareApproval, markSent };
});
