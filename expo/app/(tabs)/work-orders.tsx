import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import {
  MessageCircle,
  FileText,
  CheckCircle2,
  Plus,
  User,
  ChevronDown,
  Search,
  Edit,
  Trash2,
  ClipboardList,
} from 'lucide-react-native';
import { useWorkOrders } from '@/contexts/WorkOrdersContext';
import { useWorkLogs } from '@/contexts/WorkLogsContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { sendStatusUpdate, sendBudgetApproval } from '@/utils/whatsapp';
import { useBudgetApprovals } from '@/contexts/BudgetApprovalsContext';
import { WorkOrder, WorkOrderItem, WorkOrderStatus } from '@/types';
import {
  VEHICLE_DIAGNOSTICS,
  findDiagnosticCategory,
  findDiagnosticIssueLabel,
} from '@/constants/vehicleDiagnostics';

const formatDateInput = (date: Date) => date.toISOString().split('T')[0];
const formatTimeInput = (date: Date) => date.toISOString().split('T')[1]?.slice(0, 5) ?? '00:00';
const normalizeNumberInput = (value: string) => Number(value.replace(',', '.')) || 0;
const formatUnitPriceDisplay = (value: number) => {
  if (Number.isNaN(value) || value === 0) {
    return '';
  }
  return parseFloat(value.toFixed(2)).toString();
};
const sanitizeDecimalInput = (value: string) => {
  if (!value) {
    return '';
  }
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!cleaned) {
    return '';
  }
  const hasDecimal = cleaned.includes('.');
  const [integerPartRaw, decimalPartRaw] = cleaned.split('.');
  const integerPart = integerPartRaw ?? '';
  const decimals = decimalPartRaw ?? '';
  let result = integerPart;
  if (hasDecimal) {
    result += '.';
    result += decimals.slice(0, 2);
  }
  if (result.startsWith('.')) {
    result = `0${result}`;
  }
  return result;
};
const parsePriceFromInput = (value: string) => {
  if (!value || value === '.' || value === '0.') {
    return 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(2));
};
const buildIsoFromInputs = (date: string, time: string) => {
  const candidate = `${date}T${time}:00`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};
const formatDateTimeLabel = (isoValue?: string) => {
  if (!isoValue) return 'Sin registro';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
};
const getDurationLabel = (startIso?: string, endIso?: string) => {
  if (!startIso) return 'Sin registro';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Sin registro';
  }
  const diff = Math.max(end.getTime() - start.getTime(), 0);
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && !hours) {
    parts.push(`${remainingMinutes}m`);
  } else if (remainingMinutes) {
    parts.push(`${remainingMinutes}m`);
  }
  return parts.join(' ');
};
const createEmptyItem = (): WorkOrderItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  description: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
});
const createActivityDraft = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  description: '',
});
type ActivityDraft = ReturnType<typeof createActivityDraft> & {
  workLogId?: string;
  initialDescription?: string;
};
const splitIsoToInputs = (iso?: string) => {
  const fallback = new Date();
  if (!iso) {
    return {
      date: formatDateInput(fallback),
      time: formatTimeInput(fallback),
    };
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: formatDateInput(fallback),
      time: formatTimeInput(fallback),
    };
  }
  return {
    date: formatDateInput(parsed),
    time: formatTimeInput(parsed),
  };
};
const cloneItems = (items: WorkOrderItem[]) => items.map((item) => ({ ...item }));

const WORKFLOW_STEPS: { status: WorkOrderStatus; label: string }[] = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'in_progress', label: 'En proceso' },
  { status: 'technical_review', label: 'Revisión técnica' },
  { status: 'ready_for_delivery', label: 'Listo para entrega' },
  { status: 'completed', label: 'Entregado / cerrado' },
];

const isStartAuthorized = (approvalStatus: WorkOrder['approvalStatus']) =>
  approvalStatus === 'not_required' || approvalStatus === 'approved';

const getManagerTransitions = (status: WorkOrderStatus, approvalStatus: WorkOrder['approvalStatus']): WorkOrderStatus[] => {
  const transitions: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
    pending: [...(isStartAuthorized(approvalStatus) ? ['in_progress' as WorkOrderStatus] : []), 'cancelled'],
    in_progress: ['technical_review', 'cancelled'],
    technical_review: ['in_progress', 'ready_for_delivery', 'cancelled'],
    ready_for_delivery: ['in_progress', 'completed'],
  };
  return transitions[status] ?? [];
};

type WorkOrderFormState = {
  vehicleId: string;
  description: string;
  diagnosisCategoryId: string;
  diagnosisIssueId: string;
  diagnosisNotes: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  checkInDate: string;
  checkInTime: string;
  items: WorkOrderItem[];
};

const createInitialFormState = (): WorkOrderFormState => {
  const now = new Date();
  return {
    vehicleId: '',
    description: '',
    diagnosisCategoryId: '',
    diagnosisIssueId: '',
    diagnosisNotes: '',
    priority: 'medium',
    assignedTo: '',
    checkInDate: formatDateInput(now),
    checkInTime: formatTimeInput(now),
    items: [],
  };
};

const buildDiagnosisSummary = (params: {
  diagnosisCategoryId?: string;
  diagnosisIssueId?: string;
  diagnosisNotes?: string;
}) => {
  const { categoryLabel, issueLabel } = findDiagnosticIssueLabel(
    params.diagnosisCategoryId,
    params.diagnosisIssueId
  );
  const notes = params.diagnosisNotes?.trim() ?? '';
  const main = [categoryLabel, issueLabel].filter(Boolean).join(': ');
  if (!main && !notes) {
    return undefined;
  }
  if (main && notes) {
    return `${main} — ${notes}`;
  }
  return main || notes;
};

export default function WorkOrdersScreen() {
  const { workOrders, updateWorkOrderStatus, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useWorkOrders();
  const { prepareApproval, markSent } = useBudgetApprovals();
  const { addWorkLog, updateWorkLog, getWorkLogsForOrder } = useWorkLogs();
  const { vehicles, getVehicleById } = useVehicles();
  const { getMechanics, getUserById } = useUsers();
  const { user, permissions } = useAuth();
  const canManageOrders = permissions.canManageWorkOrders;
  const viewOnlyAssigned = permissions.viewOnlyAssignedWorkOrders;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState<boolean>(false);
  const [showMechanicSelector, setShowMechanicSelector] = useState<boolean>(false);
  const [showDiagnosisCategorySelector, setShowDiagnosisCategorySelector] = useState<boolean>(false);
  const [showDiagnosisIssueSelector, setShowDiagnosisIssueSelector] = useState<boolean>(false);
  const [formData, setFormData] = useState<WorkOrderFormState>(createInitialFormState);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [breakdownModalVisible, setBreakdownModalVisible] = useState<boolean>(false);
  const [breakdownItems, setBreakdownItems] = useState<WorkOrderItem[]>([]);
  const [breakdownOrder, setBreakdownOrder] = useState<WorkOrder | null>(null);
  const [unitPriceInputs, setUnitPriceInputs] = useState<Record<string, string>>({});
  const [breakdownUnitPriceInputs, setBreakdownUnitPriceInputs] = useState<Record<string, string>>({});
  const [activityOrder, setActivityOrder] = useState<WorkOrder | null>(null);
  const [activityDrafts, setActivityDrafts] = useState<ActivityDraft[]>([createActivityDraft()]);
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  const mechanics = getMechanics();

  useEffect(() => {
    setUnitPriceInputs((prev) => {
      const next: Record<string, string> = {};
      formData.items.forEach((item) => {
        next[item.id] = Object.prototype.hasOwnProperty.call(prev, item.id)
          ? prev[item.id]
          : formatUnitPriceDisplay(item.unitPrice);
      });
      if (
        Object.keys(prev).length === Object.keys(next).length &&
        formData.items.every((item) => prev[item.id] === next[item.id])
      ) {
        return prev;
      }
      return next;
    });
  }, [formData.items]);

  useEffect(() => {
    setBreakdownUnitPriceInputs((prev) => {
      const next: Record<string, string> = {};
      breakdownItems.forEach((item) => {
        next[item.id] = Object.prototype.hasOwnProperty.call(prev, item.id)
          ? prev[item.id]
          : formatUnitPriceDisplay(item.unitPrice);
      });
      if (
        Object.keys(prev).length === Object.keys(next).length &&
        breakdownItems.every((item) => prev[item.id] === next[item.id])
      ) {
        return prev;
      }
      return next;
    });
  }, [breakdownItems]);

  const scopedOrders = useMemo(() => {
    if (!viewOnlyAssigned) {
      return workOrders;
    }
    return workOrders.filter((order) => order.assignedTo === user?.id);
  }, [viewOnlyAssigned, workOrders, user?.id]);

  const sortedOrders = useMemo(() => {
    return [...scopedOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [scopedOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return sortedOrders;
    return sortedOrders.filter((order) => {
      const vehicle = getVehicleById(order.vehicleId);
      const mechanic = order.assignedTo ? getUserById(order.assignedTo) : null;
      return (
        order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vehicle &&
          (vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (mechanic && mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [sortedOrders, searchQuery, getVehicleById, getUserById]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      technical_review: '#f97316',
      ready_for_delivery: '#14b8a6',
      completed: '#059669',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      technical_review: 'Pendiente de revisión técnica',
      ready_for_delivery: 'Listo para entrega',
      completed: 'Entregado / Cerrado',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  };

  const getApprovalLabel = (order: WorkOrder) => {
    const labels: Record<WorkOrder['approvalStatus'], string> = {
      not_required: 'No requiere aprobación',
      draft: 'Aprobación por enviar',
      pending: 'Esperando aprobación del cliente',
      approved: 'Presupuesto aprobado',
      partial: 'Aprobación parcial',
      rejected: 'Presupuesto rechazado',
      expired: 'Aprobación vencida',
      revoked: 'Aprobación reemplazada',
    };
    return labels[order.approvalStatus];
  };

  const getApprovalColor = (approvalStatus: WorkOrder['approvalStatus']) => {
    const colors: Record<WorkOrder['approvalStatus'], string> = {
      not_required: '#64748b', draft: '#b45309', pending: '#7e22ce', approved: '#047857',
      partial: '#c2410c', rejected: '#b91c1c', expired: '#b45309', revoked: '#64748b',
    };
    return colors[approvalStatus];
  };

  const canManageBreakdown = () => canManageOrders;
  const canRegisterActivity = (order: WorkOrder) =>
    viewOnlyAssigned
    && order.assignedTo === user?.id
    && (order.status === 'in_progress' || (order.status === 'pending' && isStartAuthorized(order.approvalStatus)));

  const handleSendStatusUpdate = async (orderId: string) => {
    const order = workOrders.find((wo) => wo.id === orderId);
    if (!order) return;

    const vehicle = getVehicleById(order.vehicleId);
    if (!vehicle) {
      Alert.alert('Error', 'Vehículo no encontrado');
      return;
    }

    setSendingId(orderId);
    console.log('[WorkOrders] Sending status update', { orderId });
    const success = await sendStatusUpdate(order, vehicle);
    setSendingId(null);

    if (success) {
      Alert.alert('Éxito', 'Notificación enviada por WhatsApp');
    }
  };

  const handleSendBudget = async (orderId: string) => {
    const order = workOrders.find((wo) => wo.id === orderId);
    if (!order) return;

    const vehicle = getVehicleById(order.vehicleId);
    if (!vehicle) {
      Alert.alert('Error', 'Vehículo no encontrado');
      return;
    }

    if (order.items.length === 0) {
      Alert.alert('Error', 'No hay items en el presupuesto');
      return;
    }

    try {
      setSendingId(orderId);
      const { approval, approvalUrl } = await prepareApproval(orderId);
      const success = await sendBudgetApproval(order, vehicle, approvalUrl);
      if (success) {
        await markSent(approval.id);
        Alert.alert('Solicitud enviada', 'El cliente puede aprobar o rechazar cada concepto desde el enlace de WhatsApp.');
      }
    } catch (error) {
      console.error('[WorkOrders] Error preparing approval:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo preparar la aprobación.');
    } finally {
      setSendingId(null);
    }
  };

  const handleStatusTransition = (order: WorkOrder, nextStatus: WorkOrderStatus) => {
    const label = getStatusText(nextStatus);
    const isFinal = nextStatus === 'completed' || nextStatus === 'cancelled';
    const isMechanicReview = nextStatus === 'technical_review' && viewOnlyAssigned;
    const message = isMechanicReview
      ? 'Las actividades quedarán disponibles para que el técnico revise y asigne los rubros.'
      : isFinal
        ? `¿Confirmas cambiar la orden a “${label}”?`
        : `¿Cambiar la orden a “${label}”?`;

    Alert.alert('Actualizar estado', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: nextStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await updateWorkOrderStatus(order.id, nextStatus);
          } catch (error) {
            console.error('[WorkOrders] Error changing status:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cambiar el estado');
          }
        },
      },
    ]);
  };

  const handleOpenModal = () => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'Solo administradores o técnicos pueden crear órdenes');
      return;
    }
    console.log('[WorkOrders] Opening create modal');
    setFormData(createInitialFormState());
    setEditingOrderId(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingOrderId(null);
    setFormData(createInitialFormState());
    setShowVehicleSelector(false);
    setShowMechanicSelector(false);
    setShowDiagnosisCategorySelector(false);
    setShowDiagnosisIssueSelector(false);
  };

  const handleEditOrder = (order: WorkOrder) => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'No puedes editar órdenes en tu rol actual');
      return;
    }
    const checkInParts = splitIsoToInputs(order.checkInAt ?? order.createdAt);
    console.log('[WorkOrders] Opening edit modal', { orderId: order.id });
    setFormData({
      vehicleId: order.vehicleId,
      description: order.description,
      diagnosisCategoryId: order.diagnosisCategoryId ?? '',
      diagnosisIssueId: order.diagnosisIssueId ?? '',
      diagnosisNotes: order.diagnosisNotes ?? '',
      priority: order.priority,
      assignedTo: order.assignedTo ?? '',
      checkInDate: checkInParts.date,
      checkInTime: checkInParts.time,
      items: cloneItems(order.items),
    });
    setEditingOrderId(order.id);
    setModalVisible(true);
  };

  const handleDeleteOrder = (order: WorkOrder) => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'No puedes eliminar órdenes en tu rol actual');
      return;
    }

    Alert.alert(
      'Eliminar Orden',
      `¿Seguro que deseas eliminar ${order.code}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[WorkOrders] Deleting order', { orderId: order.id });
              await deleteWorkOrder(order.id);
              Alert.alert('Éxito', 'Orden eliminada correctamente');
            } catch (error) {
              let errorMessage = 'No se pudo eliminar la orden';
              if (error instanceof Error) {
                errorMessage = error.message;
              } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String((error as any).message);
              } else if (typeof error === 'string') {
                errorMessage = error;
              } else {
                errorMessage = `Error al eliminar: ${JSON.stringify(error)}`;
              }
              console.error('[WorkOrders] Error deleting order:', error);
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleFormItemChange = (itemId: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => {
    if (field === 'unitPrice') {
      const sanitized = sanitizeDecimalInput(value);
      setUnitPriceInputs((prev) => ({ ...prev, [itemId]: sanitized }));
      const numericValue = parsePriceFromInput(sanitized);
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          const nextItem = { ...item, unitPrice: numericValue };
          return { ...nextItem, total: parseFloat((nextItem.quantity * nextItem.unitPrice).toFixed(2)) };
        });
        return { ...prev, items: updatedItems };
      });
      return;
    }
    setFormData((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        if (field === 'description') {
          return { ...item, description: value };
        }
        const numericValue = normalizeNumberInput(value);
        const nextItem = { ...item, quantity: numericValue };
        return { ...nextItem, total: parseFloat((nextItem.quantity * nextItem.unitPrice).toFixed(2)) };
      });
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddFormItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const handleRemoveFormItem = (itemId: string) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
  };

  const handleSubmitWorkOrder = async () => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'No puedes guardar cambios en órdenes');
      return;
    }

    const diagnosisSummary = buildDiagnosisSummary({
      diagnosisCategoryId: formData.diagnosisCategoryId,
      diagnosisIssueId: formData.diagnosisIssueId,
      diagnosisNotes: formData.diagnosisNotes,
    });
    const descriptionFromDiagnosis = diagnosisSummary ?? '';

    if (!formData.vehicleId || !descriptionFromDiagnosis) {
      Alert.alert('Error', 'Por favor selecciona un vehículo y completa el diagnóstico del trabajo');
      return;
    }
    if (!formData.assignedTo) {
      Alert.alert('Error', 'Por favor asigna un mecánico');
      return;
    }

    const checkInAt = buildIsoFromInputs(formData.checkInDate, formData.checkInTime);
    if (!checkInAt) {
      Alert.alert('Error', 'Fecha u hora de ingreso inválida');
      return;
    }

    const totalCost = formData.items.reduce((sum, item) => sum + item.total, 0);

    try {
      if (editingOrderId) {
        console.log('[WorkOrders] Updating order', { orderId: editingOrderId, totalCost });
        await updateWorkOrder(editingOrderId, {
          vehicleId: formData.vehicleId,
          workshopId: getVehicleById(formData.vehicleId)?.workshopId,
          description: descriptionFromDiagnosis,
          diagnosisCategoryId: formData.diagnosisCategoryId || undefined,
          diagnosisIssueId: formData.diagnosisIssueId || undefined,
          diagnosisNotes: formData.diagnosisNotes.trim() ? formData.diagnosisNotes.trim() : undefined,
          diagnosis: diagnosisSummary,
          priority: formData.priority,
          assignedTo: formData.assignedTo,
          items: formData.items,
          totalCost,
          checkInAt,
        });
        Alert.alert('Éxito', 'Orden de trabajo actualizada correctamente');
      } else {
        console.log('[WorkOrders] Creating order', { vehicleId: formData.vehicleId, assignedTo: formData.assignedTo });
        await addWorkOrder({
          vehicleId: formData.vehicleId,
          workshopId: getVehicleById(formData.vehicleId)?.workshopId,
          description: descriptionFromDiagnosis,
          diagnosisCategoryId: formData.diagnosisCategoryId || undefined,
          diagnosisIssueId: formData.diagnosisIssueId || undefined,
          diagnosisNotes: formData.diagnosisNotes.trim() ? formData.diagnosisNotes.trim() : undefined,
          diagnosis: diagnosisSummary,
          priority: formData.priority,
          status: 'pending',
          approvalRequired: false,
          approvalStatus: 'not_required',
          items: formData.items,
          createdBy: user?.id || '',
          assignedTo: formData.assignedTo,
          checkInAt,
        });
        Alert.alert('Éxito', 'Orden de trabajo creada correctamente');
      }
      handleCloseModal();
    } catch (error) {
      let errorMessage = editingOrderId ? 'No se pudo actualizar la orden de trabajo' : 'No se pudo crear la orden de trabajo';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = `${errorMessage}: ${JSON.stringify(error)}`;
      }
      console.error('[WorkOrders] Error submitting work order:', error);
      Alert.alert('Error', errorMessage);
    }
  };

  const handleOpenBreakdownModal = (order: WorkOrder) => {
    if (!canManageBreakdown()) {
      Alert.alert('Rol restringido', 'No puedes editar el desglose de esta orden');
      return;
    }
    console.log('[WorkOrders] Opening breakdown editor', { orderId: order.id });
    const existingItems = cloneItems(order.items);
    const linkedActivityIds = new Set(existingItems.map((item) => item.workLogId).filter(Boolean));
    const activityItems = getWorkLogsForOrder(order.id)
      .filter((log) => !linkedActivityIds.has(log.id))
      .map((log) => ({
        ...createEmptyItem(),
        id: `activity-${log.id}`,
        workLogId: log.id,
        description: log.description,
      }));
    setBreakdownOrder(order);
    setBreakdownItems([...existingItems, ...activityItems].length ? [...existingItems, ...activityItems] : [createEmptyItem()]);
    setBreakdownModalVisible(true);
  };

  const handleOpenActivityModal = (order: WorkOrder) => {
    if (!canRegisterActivity(order)) {
      Alert.alert('Rol restringido', 'Solo puedes registrar actividades en órdenes asignadas a ti.');
      return;
    }
    setActivityOrder(order);
    const existingActivities: ActivityDraft[] = getWorkLogsForOrder(order.id).map((log) => ({
      id: log.id,
      workLogId: log.id,
      description: log.description,
      initialDescription: log.description,
    }));
    setActivityDrafts(existingActivities.length ? existingActivities : [createActivityDraft()]);
    setActivityModalVisible(true);
  };

  const handleSaveActivity = async () => {
    if (!activityOrder) return;
    const existingActivities = activityDrafts.filter((activity) => activity.workLogId);
    const newDescriptions = activityDrafts
      .filter((activity) => !activity.workLogId)
      .map((activity) => activity.description.trim())
      .filter(Boolean);
    if (existingActivities.some((activity) => !activity.description.trim()) || (existingActivities.length === 0 && newDescriptions.length === 0)) {
      Alert.alert('Actividad requerida', 'Describe el trabajo que realizaste.');
      return;
    }
    try {
      await Promise.all(existingActivities
        .filter((activity) => activity.description.trim() !== activity.initialDescription)
        .map((activity) => updateWorkLog(activity.workLogId!, activity.description)));
      await Promise.all(newDescriptions.map((description) => addWorkLog(activityOrder.id, description)));
      if (activityOrder.status === 'pending') {
        await updateWorkOrderStatus(activityOrder.id, 'in_progress');
      }
      Alert.alert(
        'Éxito',
        activityOrder.status === 'pending'
          ? 'Actividades registradas. La orden quedó En proceso.'
          : 'Actividades actualizadas correctamente.',
      );
      setActivityModalVisible(false);
      setActivityOrder(null);
      setActivityDrafts([createActivityDraft()]);
    } catch (error) {
      console.error('[WorkOrders] Error saving activity:', error);
      Alert.alert('Error', 'No se pudo registrar la actividad.');
    }
  };

  const handleActivityDraftChange = (activityId: string, description: string) => {
    setActivityDrafts((current) => current.map((activity) =>
      activity.id === activityId ? { ...activity, description } : activity
    ));
  };

  const handleAddActivityDraft = () => {
    setActivityDrafts((current) => [...current, createActivityDraft()]);
  };

  const handleRemoveActivityDraft = (activityId: string) => {
    setActivityDrafts((current) =>
      current.length === 1 ? current : current.filter((activity) => activity.id !== activityId)
    );
  };

  const handleCloseBreakdownModal = () => {
    setBreakdownModalVisible(false);
    setBreakdownOrder(null);
    setBreakdownItems([]);
  };

  const handleBreakdownItemChange = (itemId: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => {
    if (field === 'unitPrice') {
      const sanitized = sanitizeDecimalInput(value);
      setBreakdownUnitPriceInputs((prev) => ({ ...prev, [itemId]: sanitized }));
      const numericValue = parsePriceFromInput(sanitized);
      setBreakdownItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          const nextItem = { ...item, unitPrice: numericValue };
          return { ...nextItem, total: parseFloat((nextItem.quantity * nextItem.unitPrice).toFixed(2)) };
        })
      );
      return;
    }
    setBreakdownItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        if (field === 'description') {
          return { ...item, description: value };
        }
        const numericValue = normalizeNumberInput(value);
        const nextItem = { ...item, quantity: numericValue };
        return { ...nextItem, total: parseFloat((nextItem.quantity * nextItem.unitPrice).toFixed(2)) };
      })
    );
  };

  const handleAddBreakdownItem = () => {
    setBreakdownItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveBreakdownItem = (itemId: string) => {
    setBreakdownItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSaveBreakdown = async () => {
    if (!breakdownOrder) return;
    const sanitizedItems = breakdownItems
      .map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
      }))
      .filter((item) => item.description.length > 0 && item.total >= 0);

    if (sanitizedItems.length === 0) {
      Alert.alert('Error', 'Registra al menos un trabajo con descripción');
      return;
    }

    const totalCost = sanitizedItems.reduce((sum, item) => sum + item.total, 0);

    try {
      console.log('[WorkOrders] Saving breakdown', { orderId: breakdownOrder.id, itemCount: sanitizedItems.length, items: sanitizedItems });
      await updateWorkOrder(breakdownOrder.id, {
        items: sanitizedItems,
        totalCost,
      });
      Alert.alert('Éxito', 'Desglose guardado correctamente');
      handleCloseBreakdownModal();
    } catch (error) {
      let errorMessage = 'Error desconocido al guardar el desglose';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          const errorObj = error as any;
          if (errorObj.details) {
            errorMessage = `${errorObj.message || 'Error'}: ${errorObj.details}`;
          } else {
            errorMessage = JSON.stringify(error);
          }
        } catch {
          errorMessage = 'Error al guardar el desglose';
        }
      }
      console.error('[WorkOrders] Error saving breakdown:', { error, errorMessage, orderId: breakdownOrder.id });
      Alert.alert('Error al guardar', errorMessage);
    }
  };

  const renderItemsEditor = (
    items: WorkOrderItem[],
    onChange: (itemId: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => void,
    onRemove: (itemId: string) => void,
    testPrefix: string,
    priceInputs: Record<string, string>,
  ) => (
    <>
      {items.map((item, index) => (
        <View key={item.id} style={styles.itemEditorCard}>
          <View style={styles.itemEditorHeader}>
            <Text style={styles.itemEditorLabel}>{item.workLogId ? `Actividad #${index + 1}` : `Rubro #${index + 1}`}</Text>
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              style={styles.itemRemoveButton}
              testID={`${testPrefix}-remove-item-${item.id}`}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.textInput, styles.itemEditorInput]}
            value={item.description}
            onChangeText={(text) => onChange(item.id, 'description', text)}
            placeholder="Descripción del trabajo"
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.itemNumbersRow}>
            <View style={styles.itemNumberField}>
              <Text style={styles.itemNumbersLabel}>Cantidad</Text>
              <TextInput
                style={[styles.textInput, styles.itemNumbersInput]}
                value={String(item.quantity)}
                onChangeText={(text) => onChange(item.id, 'quantity', text)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.itemNumberField}>
              <Text style={styles.itemNumbersLabel}>Precio unitario</Text>
              <TextInput
                style={[styles.textInput, styles.itemNumbersInput]}
                value={priceInputs[item.id] ?? formatUnitPriceDisplay(item.unitPrice)}
                onChangeText={(text) => onChange(item.id, 'unitPrice', text)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.itemTotalPill}>
              <Text style={styles.itemTotalLabel}>Total</Text>
              <Text style={styles.itemTotalValue}>${item.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  const selectedMechanic = mechanics.find((m) => m.id === formData.assignedTo);
  const isEditing = editingOrderId !== null;

  const renderWorkOrder = ({ item: order }: { item: WorkOrder }) => {
    const vehicle = getVehicleById(order.vehicleId);
    const assignedMechanic = order.assignedTo ? getUserById(order.assignedTo) : null;
    const isSending = sendingId === order.id;
    const activityLogs = getWorkLogsForOrder(order.id);
    const workflowIndex = WORKFLOW_STEPS.findIndex((step) => step.status === order.status);
    const availableTransitions = canManageOrders
      ? getManagerTransitions(order.status, order.approvalStatus)
      : viewOnlyAssigned && order.assignedTo === user?.id && order.status === 'pending'
        ? (isStartAuthorized(order.approvalStatus) ? ['in_progress'] : [])
        : canRegisterActivity(order) && activityLogs.length > 0
          ? ['technical_review']
          : [];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderCode}>{order.code}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>

          {canManageOrders && (
            <View style={styles.orderActions}>
              <TouchableOpacity
                onPress={() => handleEditOrder(order)}
                style={styles.actionIconButton}
                testID={`edit-work-order-${order.id}`}
              >
                <Edit size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteOrder(order)}
                style={styles.actionIconButton}
                testID={`delete-work-order-${order.id}`}
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {vehicle && (
          <View style={styles.vehicleSection}>
            <Text style={styles.vehicleText}>
              {vehicle.brand} {vehicle.model} - {vehicle.plate}
            </Text>
            <Text style={styles.ownerText}>{vehicle.ownerName}</Text>
          </View>
        )}

        {assignedMechanic && (
          <View style={styles.mechanicSection}>
            <View style={styles.mechanicRow}>
              <User size={16} color="#6b7280" />
              <Text style={styles.mechanicLabel}>Asignado a:</Text>
              <Text style={styles.mechanicName}>{assignedMechanic.name}</Text>
            </View>
          </View>
        )}

        <Text style={styles.description}>{order.description}</Text>

        {order.approvalRequired && (
          <View style={[styles.approvalBadge, { backgroundColor: `${getApprovalColor(order.approvalStatus)}16` }]}>
            <FileText size={15} color={getApprovalColor(order.approvalStatus)} />
            <Text style={[styles.approvalBadgeText, { color: getApprovalColor(order.approvalStatus) }]}>
              {getApprovalLabel(order)}
            </Text>
          </View>
        )}

        {order.status === 'cancelled' ? (
          <View style={styles.cancelledWorkflowBox}>
            <Text style={styles.cancelledWorkflowText}>Esta orden fue cancelada.</Text>
          </View>
        ) : (
          <View style={styles.workflowBox}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workflowRail}>
              {WORKFLOW_STEPS.map((step, index) => {
                const isCurrent = step.status === order.status;
                const isDone = workflowIndex > index;
                const canSelect = availableTransitions.includes(step.status);
                return (
                  <TouchableOpacity
                    key={step.status}
                    style={styles.workflowStep}
                    disabled={!canSelect}
                    onPress={() => handleStatusTransition(order, step.status)}
                    accessibilityRole="button"
                    accessibilityLabel={`Estado ${step.label}`}
                  >
                    <View style={styles.workflowTrack}>
                      {index > 0 && (
                        <View style={[styles.workflowLine, isDone && styles.workflowLineDone]} />
                      )}
                      <View style={[
                        styles.workflowDot,
                        isDone && styles.workflowDotDone,
                        isCurrent && styles.workflowDotCurrent,
                        canSelect && styles.workflowDotSelectable,
                      ]}>
                        <Text style={[styles.workflowDotText, (isDone || isCurrent) && styles.workflowDotTextActive]}>
                          {isDone ? '✓' : index + 1}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.workflowLabel, isCurrent && styles.workflowLabelCurrent]} numberOfLines={2}>
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {canManageOrders && availableTransitions.includes('cancelled') && (
              <TouchableOpacity
                style={styles.cancelOrderButton}
                onPress={() => handleStatusTransition(order, 'cancelled')}
              >
                <Text style={styles.cancelOrderButtonText}>Cancelar orden</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {order.diagnosis && (
          <View style={styles.diagnosisSection}>
            <Text style={styles.diagnosisLabel}>Diagnóstico:</Text>
            <Text style={styles.diagnosisText}>{order.diagnosis}</Text>
          </View>
        )}

        {order.items.length > 0 ? (
          <View style={styles.itemsSection}>
            <Text style={styles.itemsLabel}>Trabajos ({order.items.length}):</Text>
            {order.items.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemDescription} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={styles.itemPrice}>${item.total}</Text>
              </View>
            ))}
            {order.items.length > 3 && (
              <Text style={styles.moreItems}>+{order.items.length - 3} más...</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyItemsBox}>
            <Text style={styles.emptyItemsText}>El técnico aún no ha registrado rubros.</Text>
          </View>
        )}

        {activityLogs.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.itemsLabel}>Actividades realizadas ({activityLogs.length}):</Text>
            {activityLogs.slice(0, 3).map((log) => (
              <Text key={log.id} style={styles.itemDescription}>• {log.description}</Text>
            ))}
          </View>
        )}

        {canManageBreakdown() && (
          <TouchableOpacity
            style={styles.breakdownButton}
            onPress={() => handleOpenBreakdownModal(order)}
            testID={`open-breakdown-${order.id}`}
          >
            <ClipboardList size={18} color="#2563eb" />
            <Text style={styles.breakdownButtonText}>Gestionar rubros</Text>
          </TouchableOpacity>
        )}

        {canRegisterActivity(order) && (
          <TouchableOpacity
            style={styles.breakdownButton}
            onPress={() => handleOpenActivityModal(order)}
            testID={`open-activity-${order.id}`}
          >
            <ClipboardList size={18} color="#2563eb" />
            <Text style={styles.breakdownButtonText}>Registrar actividad realizada</Text>
          </TouchableOpacity>
        )}

        {canManageOrders && (
          <View style={styles.footer}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${order.totalCost.toFixed(2)}</Text>
            </View>

            <View style={styles.actions}>
              {order.items.length > 0 && !['completed', 'cancelled'].includes(order.status) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.budgetButton, isSending && styles.buttonDisabled]}
                  onPress={() => handleSendBudget(order.id)}
                  disabled={isSending}
                >
                  <FileText size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Solicitar aprobación</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.statusButton, isSending && styles.buttonDisabled]}
                onPress={() => handleSendStatusUpdate(order.id)}
                disabled={isSending}
              >
                <MessageCircle size={16} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {isSending ? 'Enviando...' : 'Notificar Estado'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.timelineSection}>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Ingreso:</Text>
            <Text style={styles.timelineValue}>{formatDateTimeLabel(order.checkInAt)}</Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Tiempo en taller:</Text>
            <Text style={styles.timelineValue}>{getDurationLabel(order.checkInAt, order.completedAt)}</Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateText}>
            Creado: {new Date(order.createdAt).toLocaleDateString('es-ES')}
          </Text>
          {order.completedAt && (
            <View style={styles.completedBadge}>
              <CheckCircle2 size={14} color="#059669" />
              <Text style={styles.completedText}>
                Completado: {new Date(order.completedAt).toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar órdenes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {canManageOrders && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenModal}
            testID="open-work-order-modal-button"
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {viewOnlyAssigned ? 'Sin órdenes asignadas' : 'No hay órdenes de trabajo'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No se encontraron órdenes con ese criterio'
                : viewOnlyAssigned
                  ? 'Tu técnico te notificará cuando tengas un nuevo trabajo asignado'
                  : 'Presiona el botón + para crear una nueva orden'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
              </Text>

              <Text style={styles.inputLabel}>Vehículo *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowVehicleSelector(true)}
              >
                <Text style={selectedVehicle ? styles.selectorTextSelected : styles.selectorTextPlaceholder}>
                  {selectedVehicle
                    ? `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.plate}`
                    : 'Seleccionar vehículo'}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Descripción del Trabajo *</Text>
              <View style={styles.workDescriptionCard} testID="work-description-card">
                <Text style={styles.workDescriptionLabel}>Diagnóstico (Sistema + Problema + Notas):</Text>
                <Text style={styles.workDescriptionValue} numberOfLines={4}>
                  {buildDiagnosisSummary({
                    diagnosisCategoryId: formData.diagnosisCategoryId,
                    diagnosisIssueId: formData.diagnosisIssueId,
                    diagnosisNotes: formData.diagnosisNotes,
                  }) ?? 'Selecciona Sistema y Problema (y agrega notas si aplica).'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Diagnóstico (categorizado)</Text>

              <Text style={styles.fieldHint}>Selecciona el sistema y el problema para estadísticas.</Text>

              <Text style={styles.inputSubLabel}>Sistema</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowDiagnosisCategorySelector(true)}
                testID="diagnosis-category-selector"
              >
                <Text
                  style={
                    formData.diagnosisCategoryId ? styles.selectorTextSelected : styles.selectorTextPlaceholder
                  }
                >
                  {formData.diagnosisCategoryId
                    ? (findDiagnosticCategory(formData.diagnosisCategoryId)?.label ?? 'Seleccionar sistema')
                    : 'Seleccionar sistema'}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputSubLabel}>Problema</Text>
              <TouchableOpacity
                style={[styles.selector, !formData.diagnosisCategoryId && styles.selectorDisabled]}
                onPress={() => {
                  if (!formData.diagnosisCategoryId) {
                    Alert.alert('Selecciona un sistema', 'Primero elige el sistema para ver los problemas.');
                    return;
                  }
                  setShowDiagnosisIssueSelector(true);
                }}
                testID="diagnosis-issue-selector"
              >
                <Text
                  style={
                    formData.diagnosisIssueId ? styles.selectorTextSelected : styles.selectorTextPlaceholder
                  }
                >
                  {formData.diagnosisIssueId
                    ? (findDiagnosticCategory(formData.diagnosisCategoryId)?.issues.find(
                        (issue) => issue.id === formData.diagnosisIssueId
                      )?.label ?? 'Seleccionar problema')
                    : 'Seleccionar problema'}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputSubLabel}>Notas (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={formData.diagnosisNotes}
                onChangeText={(text) => setFormData({ ...formData, diagnosisNotes: text })}
                placeholder="Ej: ruido al frenar, desgaste 80%, fuga, etc."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                testID="diagnosis-notes-input"
              />

              {buildDiagnosisSummary({
                diagnosisCategoryId: formData.diagnosisCategoryId,
                diagnosisIssueId: formData.diagnosisIssueId,
                diagnosisNotes: formData.diagnosisNotes,
              }) ? (
                <View style={styles.diagnosisPreview}>
                  <Text style={styles.diagnosisPreviewLabel}>Vista previa:</Text>
                  <Text style={styles.diagnosisPreviewText}>
                    {buildDiagnosisSummary({
                      diagnosisCategoryId: formData.diagnosisCategoryId,
                      diagnosisIssueId: formData.diagnosisIssueId,
                      diagnosisNotes: formData.diagnosisNotes,
                    })}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Asignar a *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowMechanicSelector(true)}
              >
                <View style={styles.mechanicSelectorContent}>
                  {selectedMechanic ? (
                    <>
                      <User size={18} color="#2563eb" />
                      <Text style={styles.selectorTextSelected}>{selectedMechanic.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.selectorTextPlaceholder}>Seleccionar mecánico</Text>
                  )}
                </View>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Prioridad</Text>
              <View style={styles.prioritySelector}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      formData.priority === priority && styles.priorityOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, priority })}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        formData.priority === priority && styles.priorityTextSelected,
                      ]}
                    >
                      {priority === 'low' ? 'Baja' : priority === 'medium' ? 'Media' : 'Alta'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Fecha y hora de ingreso *</Text>
              <View style={styles.inlineInputs}>
                <TextInput
                  style={[styles.textInput, styles.dateInput]}
                  value={formData.checkInDate}
                  onChangeText={(text) => setFormData({ ...formData, checkInDate: text })}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#9ca3af"
                />
                <TextInput
                  style={[styles.textInput, styles.timeInput]}
                  value={formData.checkInTime}
                  onChangeText={(text) => setFormData({ ...formData, checkInTime: text })}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Text style={styles.inputLabel}>Desglose de trabajos</Text>
              {formData.items.length === 0 ? (
                <View style={styles.emptyItemsBox}>
                  <Text style={styles.emptyItemsText}>Aún no registras trabajos.</Text>
                </View>
              ) : (
                renderItemsEditor(formData.items, handleFormItemChange, handleRemoveFormItem, 'form', unitPriceInputs)
              )}

              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddFormItem}
                testID="add-work-order-item-button"
              >
                <Plus size={18} color="#2563eb" />
                <Text style={styles.addItemButtonText}>Agregar rubro</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseModal}
                  testID="cancel-work-order-modal-button"
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitWorkOrder}
                  testID={isEditing ? 'save-work-order-button' : 'create-work-order-button'}
                >
                  <Text style={styles.submitButtonText}>{isEditing ? 'Guardar' : 'Crear'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVehicleSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <Text style={styles.selectorModalTitle}>Seleccionar Vehículo</Text>
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectorItem}
                  onPress={() => {
                    setFormData({ ...formData, vehicleId: item.id });
                    setShowVehicleSelector(false);
                  }}
                >
                  <View style={styles.selectorItemContent}>
                    <Text style={styles.selectorItemTitle}>
                      {item.brand} {item.model}
                    </Text>
                    <Text style={styles.selectorItemSubtitle}>{item.plate}</Text>
                    <Text style={styles.selectorItemOwner}>{item.ownerName}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySelector}>
                  <Text style={styles.emptySelectorText}>No hay vehículos registrados</Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.closeSelectorButton}
              onPress={() => setShowVehicleSelector(false)}
            >
              <Text style={styles.closeSelectorButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMechanicSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMechanicSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <Text style={styles.selectorModalTitle}>Seleccionar Mecánico</Text>
            <FlatList
              data={mechanics}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectorItem}
                  onPress={() => {
                    setFormData({ ...formData, assignedTo: item.id });
                    setShowMechanicSelector(false);
                  }}
                >
                  <View style={styles.selectorItemContent}>
                    <View style={styles.mechanicItemHeader}>
                      <User size={20} color="#2563eb" />
                      <Text style={styles.selectorItemTitle}>{item.name}</Text>
                    </View>
                    <Text style={styles.selectorItemSubtitle}>{item.email}</Text>
                    {item.phone && <Text style={styles.selectorItemOwner}>{item.phone}</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySelector}>
                  <Text style={styles.emptySelectorText}>No hay mecánicos registrados</Text>
                  <Text style={styles.emptySelectorSubtext}>Crea usuarios con rol de mecánico en la sección de Usuarios</Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.closeSelectorButton}
              onPress={() => setShowMechanicSelector(false)}
            >
              <Text style={styles.closeSelectorButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDiagnosisCategorySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiagnosisCategorySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <Text style={styles.selectorModalTitle}>Seleccionar sistema</Text>
            <FlatList
              data={VEHICLE_DIAGNOSTICS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectorItem}
                  onPress={() => {
                    console.log('[WorkOrders] Selected diagnosis category', { id: item.id });
                    setFormData((prev) => ({
                      ...prev,
                      diagnosisCategoryId: item.id,
                      diagnosisIssueId: '',
                    }));
                    setShowDiagnosisCategorySelector(false);
                  }}
                  testID={`diagnosis-category-${item.id}`}
                >
                  <View style={styles.selectorItemContent}>
                    <Text style={styles.selectorItemTitle}>{item.label}</Text>
                    <Text style={styles.selectorItemSubtitle}>{item.issues.length} problemas comunes</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySelector}>
                  <Text style={styles.emptySelectorText}>No hay categorías</Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.closeSelectorButton}
              onPress={() => setShowDiagnosisCategorySelector(false)}
              testID="close-diagnosis-category-selector"
            >
              <Text style={styles.closeSelectorButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDiagnosisIssueSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiagnosisIssueSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <Text style={styles.selectorModalTitle}>Seleccionar problema</Text>
            <FlatList
              data={findDiagnosticCategory(formData.diagnosisCategoryId)?.issues ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectorItem}
                  onPress={() => {
                    console.log('[WorkOrders] Selected diagnosis issue', { id: item.id });
                    setFormData((prev) => ({ ...prev, diagnosisIssueId: item.id }));
                    setShowDiagnosisIssueSelector(false);
                  }}
                  testID={`diagnosis-issue-${item.id}`}
                >
                  <View style={styles.selectorItemContent}>
                    <Text style={styles.selectorItemTitle}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySelector}>
                  <Text style={styles.emptySelectorText}>No hay problemas para este sistema</Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.closeSelectorButton}
              onPress={() => setShowDiagnosisIssueSelector(false)}
              testID="close-diagnosis-issue-selector"
            >
              <Text style={styles.closeSelectorButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={breakdownModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseBreakdownModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Gestionar rubros</Text>
              {breakdownOrder && (
                <View style={styles.breakdownSummary}>
                  <Text style={styles.breakdownSummaryText}>{breakdownOrder.code}</Text>
                  <Text style={styles.breakdownSummarySubtext}>{breakdownOrder.description}</Text>
                </View>
              )}

              {renderItemsEditor(
                breakdownItems,
                handleBreakdownItemChange,
                handleRemoveBreakdownItem,
                'breakdown',
                breakdownUnitPriceInputs,
              )}

              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddBreakdownItem}
                testID="add-breakdown-item-button"
              >
                <Plus size={18} color="#2563eb" />
                <Text style={styles.addItemButtonText}>Agregar rubro</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseBreakdownModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSaveBreakdown}
                  testID="save-breakdown-button"
                >
                  <Text style={styles.submitButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Gestionar actividades</Text>
              {activityOrder && (
                <View style={styles.breakdownSummary}>
                  <Text style={styles.breakdownSummaryText}>{activityOrder.code}</Text>
                  <Text style={styles.breakdownSummarySubtext}>{activityOrder.description}</Text>
                </View>
              )}
              <Text style={styles.inputLabel}>Actividades realizadas</Text>
              {activityDrafts.map((activity, index) => (
                <View key={activity.id} style={styles.activityDraftCard}>
                  <View style={styles.itemEditorHeader}>
                    <Text style={styles.itemEditorLabel}>Actividad #{index + 1}</Text>
                    {!activity.workLogId && activityDrafts.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveActivityDraft(activity.id)}
                        style={styles.itemRemoveButton}
                        testID={`remove-work-activity-${activity.id}`}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    value={activity.description}
                    onChangeText={(text) => handleActivityDraftChange(activity.id, text)}
                    placeholder="Ej.: Se desmontó la rueda, se reemplazaron las pastillas y se probó el frenado."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    testID={`work-activity-description-${activity.id}`}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddActivityDraft}
                testID="add-work-activity"
              >
                <Plus size={18} color="#2563eb" />
                <Text style={styles.addItemButtonText}>Agregar actividad</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>Las actividades se muestran por fecha de creación. Puedes corregir las existentes y agregar nuevas.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setActivityModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSaveActivity}
                  testID="save-work-activity"
                >
                  <Text style={styles.submitButtonText}>Guardar actividades</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  orderCode: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeDisabled: {
    opacity: 0.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  workflowBox: {
    marginBottom: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  workflowHeading: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  workflowSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },
  workflowRail: {
    paddingHorizontal: 6,
  },
  workflowStep: {
    width: 68,
    alignItems: 'center',
  },
  workflowTrack: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowLine: {
    position: 'absolute',
    right: '50%',
    top: 12,
    width: '100%',
    height: 3,
    backgroundColor: '#cbd5e1',
  },
  workflowLineDone: {
    backgroundColor: '#2563eb',
  },
  workflowDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  workflowDotDone: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  workflowDotCurrent: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  workflowDotSelectable: {
    borderColor: '#0ea5e9',
  },
  workflowDotText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#64748b',
  },
  workflowDotTextActive: {
    color: '#1d4ed8',
  },
  workflowLabel: {
    marginTop: 3,
    minHeight: 24,
    paddingHorizontal: 2,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    color: '#64748b',
  },
  workflowLabelCurrent: {
    color: '#1d4ed8',
    fontWeight: '700' as const,
  },
  workflowHint: {
    marginTop: 10,
    marginHorizontal: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    fontSize: 12,
    lineHeight: 17,
  },
  cancelOrderButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelOrderButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cancelledWorkflowBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelledWorkflowText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  vehicleSection: {
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2563eb',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  mechanicSection: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  mechanicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mechanicLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  mechanicName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  approvalBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  diagnosisSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400e',
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 14,
    color: '#78350f',
  },
  itemsSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemDescription: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#059669',
    marginLeft: 12,
  },
  moreItems: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#059669',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  budgetButton: {
    backgroundColor: '#8b5cf6',
  },
  statusButton: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  timelineSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  timelineValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500' as const,
  },
  dateSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  activityDraftCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -4,
    marginBottom: 8,
  },
  inputSubLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 10,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  workDescriptionCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  workDescriptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600' as const,
  },
  workDescriptionValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  diagnosisPreview: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  diagnosisPreviewLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400e',
    marginBottom: 6,
  },
  diagnosisPreviewText: {
    fontSize: 13,
    color: '#78350f',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  mechanicSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorTextSelected: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500' as const,
  },
  selectorTextPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: '#2563eb',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  priorityTextSelected: {
    color: '#fff',
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    width: 110,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  selectorModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  selectorModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 16,
  },
  selectorItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectorItemContent: {
    gap: 4,
  },
  mechanicItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  selectorItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectorItemOwner: {
    fontSize: 13,
    color: '#9ca3af',
  },
  emptySelector: {
    padding: 32,
    alignItems: 'center',
  },
  emptySelectorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptySelectorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  closeSelectorButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeSelectorButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  breakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    marginBottom: 8,
  },
  breakdownButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1d4ed8',
  },
  itemEditorCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  itemEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemEditorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  itemRemoveButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  itemEditorInput: {
    minHeight: 0,
  },
  itemNumbersRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  itemNumberField: {
    flex: 1,
    gap: 6,
  },
  itemNumbersLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemNumbersInput: {
    minHeight: 0,
  },
  itemTotalPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ecfccb',
    alignItems: 'center',
  },
  itemTotalLabel: {
    fontSize: 12,
    color: '#4d7c0f',
  },
  itemTotalValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3f6212',
  },
  emptyItemsBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    marginTop: 4,
  },
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0369a1',
  },
  breakdownSummary: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
  },
  breakdownSummaryText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#312e81',
  },
  breakdownSummarySubtext: {
    fontSize: 13,
    color: '#4338ca',
    marginTop: 4,
  },
});
