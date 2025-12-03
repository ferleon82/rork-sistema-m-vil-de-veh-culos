import React, { useState, useMemo } from 'react';
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
import { MessageCircle, FileText, CheckCircle2, Plus, User, ChevronDown, Search, Edit3, ShieldAlert } from 'lucide-react-native';
import { useWorkOrders } from '@/contexts/WorkOrdersContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { sendStatusUpdate, sendBudget } from '@/utils/whatsapp';
import { WorkOrderStatus, WorkOrderItem } from '@/types';

type WorkOrderFormState = {
  vehicleId: string;
  description: string;
  diagnosis: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  items: WorkOrderItem[];
};

const createInitialFormState = (): WorkOrderFormState => ({
  vehicleId: '',
  description: '',
  diagnosis: '',
  priority: 'medium',
  assignedTo: '',
  items: [],
});

export default function WorkOrdersScreen() {
  const { workOrders, updateWorkOrderStatus, addWorkOrder, updateWorkOrder } = useWorkOrders();
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
  const [formData, setFormData] = useState<WorkOrderFormState>(createInitialFormState);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const mechanics = getMechanics();

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
      waiting_approval: '#8b5cf6',
      approved: '#10b981',
      completed: '#059669',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      waiting_approval: 'Esperando Aprobación',
      approved: 'Aprobado',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  };

  const handleSendStatusUpdate = async (orderId: string) => {
    const order = workOrders.find((wo) => wo.id === orderId);
    if (!order) return;

    const vehicle = getVehicleById(order.vehicleId);
    if (!vehicle) {
      Alert.alert('Error', 'Vehículo no encontrado');
      return;
    }

    setSendingId(orderId);
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

    setSendingId(orderId);
    const success = await sendBudget(order, vehicle);
    setSendingId(null);

    if (success) {
      await updateWorkOrderStatus(orderId, 'waiting_approval');
      Alert.alert('Éxito', 'Presupuesto enviado por WhatsApp');
    }
  };

  const handleChangeStatus = (orderId: string, currentStatus: WorkOrderStatus) => {
    const statusOptions: { label: string; value: WorkOrderStatus }[] = [
      { label: 'Pendiente', value: 'pending' },
      { label: 'En Progreso', value: 'in_progress' },
      { label: 'Esperando Aprobación', value: 'waiting_approval' },
      { label: 'Aprobado', value: 'approved' },
      { label: 'Completado', value: 'completed' },
      { label: 'Cancelado', value: 'cancelled' },
    ];

    Alert.alert(
      'Cambiar Estado',
      'Selecciona el nuevo estado',
      statusOptions.map((option) => ({
        text: option.label,
        onPress: async () => {
          await updateWorkOrderStatus(orderId, option.value);
          Alert.alert('Éxito', 'Estado actualizado');
        },
      }))
    );
  };

  const handleOpenModal = () => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'Solo administradores o técnicos pueden crear órdenes');
      return;
    }
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
  };

  const handleEditOrder = (order: typeof workOrders[0]) => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'No puedes editar órdenes en tu rol actual');
      return;
    }
    setFormData({
      vehicleId: order.vehicleId,
      description: order.description,
      diagnosis: order.diagnosis ?? '',
      priority: order.priority,
      assignedTo: order.assignedTo ?? '',
      items: order.items,
    });
    setEditingOrderId(order.id);
    setModalVisible(true);
  };

  const handleSubmitWorkOrder = async () => {
    if (!canManageOrders) {
      Alert.alert('Rol restringido', 'No puedes guardar cambios en órdenes');
      return;
    }
    if (!formData.vehicleId || !formData.description) {
      Alert.alert('Error', 'Por favor selecciona un vehículo y describe el trabajo');
      return;
    }

    if (!formData.assignedTo) {
      Alert.alert('Error', 'Por favor asigna un mecánico');
      return;
    }

    const trimmedDiagnosis = formData.diagnosis.trim();
    const normalizedDiagnosis = trimmedDiagnosis.length > 0 ? trimmedDiagnosis : undefined;

    try {
      if (editingOrderId) {
        const totalCost = formData.items.reduce((sum, item) => sum + item.total, 0);
        await updateWorkOrder(editingOrderId, {
          vehicleId: formData.vehicleId,
          description: formData.description,
          diagnosis: normalizedDiagnosis,
          priority: formData.priority,
          assignedTo: formData.assignedTo,
          items: formData.items,
          totalCost,
        });
        Alert.alert('Éxito', 'Orden de trabajo actualizada correctamente');
      } else {
        await addWorkOrder({
          vehicleId: formData.vehicleId,
          description: formData.description,
          diagnosis: normalizedDiagnosis,
          priority: formData.priority,
          status: 'pending',
          items: formData.items,
          createdBy: user?.id || '',
          assignedTo: formData.assignedTo,
        });
        Alert.alert('Éxito', 'Orden de trabajo creada correctamente');
      }
      handleCloseModal();
    } catch (error) {
      Alert.alert('Error', editingOrderId ? 'No se pudo actualizar la orden de trabajo' : 'No se pudo crear la orden de trabajo');
      console.error(error);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedMechanic = mechanics.find(m => m.id === formData.assignedTo);
  const isEditing = editingOrderId !== null;

  const renderWorkOrder = ({ item: order }: { item: typeof workOrders[0] }) => {
    const vehicle = getVehicleById(order.vehicleId);
    const assignedMechanic = order.assignedTo ? getUserById(order.assignedTo) : null;
    const isSending = sendingId === order.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderCode}>{order.code}</Text>
            <TouchableOpacity
              onPress={() => canManageOrders && handleChangeStatus(order.id, order.status)}
              disabled={!canManageOrders}
            >
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + '20' },
                  !canManageOrders && styles.statusBadgeDisabled,
                ]}
              >
                <Text
                  style={[styles.statusText, { color: getStatusColor(order.status) }]}
                >
                  {getStatusText(order.status)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {canManageOrders && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditOrder(order)}
              testID={`edit-work-order-${order.id}`}
            >
              <Edit3 size={16} color="#2563eb" />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
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

        {order.diagnosis && (
          <View style={styles.diagnosisSection}>
            <Text style={styles.diagnosisLabel}>Diagnóstico:</Text>
            <Text style={styles.diagnosisText}>{order.diagnosis}</Text>
          </View>
        )}

        {order.items.length > 0 && (
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
              <Text style={styles.moreItems}>
                +{order.items.length - 3} más...
              </Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>${order.totalCost}</Text>
          </View>

          <View style={styles.actions}>
            {order.items.length > 0 && order.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.budgetButton, isSending && styles.buttonDisabled]}
                onPress={() => handleSendBudget(order.id)}
                disabled={isSending}
              >
                <FileText size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Enviar Presupuesto</Text>
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

      {viewOnlyAssigned && (
        <View style={styles.permissionBanner}>
          <ShieldAlert size={18} color="#1d4ed8" />
          <Text style={styles.permissionText}>
            Solo puedes ver y enviar actualizaciones de las órdenes que te asignaron.
          </Text>
        </View>
      )}

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
                    : 'Seleccionar vehículo'
                  }
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Descripción del Trabajo *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Describe el trabajo a realizar"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Diagnóstico</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.diagnosis}
                onChangeText={(text) => setFormData({ ...formData, diagnosis: text })}
                placeholder="Diagnóstico detallado (opcional)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />

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
                    {item.phone && (
                      <Text style={styles.selectorItemOwner}>{item.phone}</Text>
                    )}
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#2563eb',
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
});
