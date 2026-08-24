import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  Calendar,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkshops } from '@/contexts/WorkshopsContext';
import { useUsers } from '@/contexts/UsersContext';
import { LATIN_AMERICAN_COUNTRIES, getCountryByCode } from '@/constants/countries';
import { Workshop } from '@/types';

const DEFAULT_COUNTRY = 'EC';

type WorkshopForm = {
  name: string;
  ownerId: string;
  countryCode: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
};

export default function WorkshopsScreen() {
  const { permissions } = useAuth();
  const { workshops, addWorkshop, updateWorkshop, deleteWorkshop } = useWorkshops();
  const { users } = useUsers();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [showOwnerPicker, setShowOwnerPicker] = useState<boolean>(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [formData, setFormData] = useState<WorkshopForm>({
    name: '',
    ownerId: '',
    countryCode: DEFAULT_COUNTRY,
    phone: '',
    address: '',
    email: '',
    notes: '',
  });

  const ownerOptions = useMemo(
    () => users.filter((user) =>
      user.role === 'technician'
      && !!editingWorkshop
      && user.workshopId === editingWorkshop.id
    ),
    [users, editingWorkshop]
  );

  const selectedCountry = getCountryByCode(formData.countryCode);
  const selectedOwner = ownerOptions.find((owner) => owner.id === formData.ownerId);

  const resetForm = () => {
    setFormData({
      name: '',
      ownerId: '',
      countryCode: DEFAULT_COUNTRY,
      phone: '',
      address: '',
      email: '',
      notes: '',
    });
    setEditingWorkshop(null);
  };

  const handleOpenModal = (workshop?: Workshop) => {
    if (workshop) {
      setEditingWorkshop(workshop);
      setFormData({
        name: workshop.name,
        ownerId: workshop.ownerId ?? '',
        countryCode: workshop.countryCode,
        phone: workshop.phone ?? '',
        address: workshop.address ?? '',
        email: workshop.email ?? '',
        notes: workshop.notes ?? '',
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Ingresa el nombre de la mecánica');
      return;
    }
    const payload: Omit<Workshop, 'id' | 'createdAt'> = {
      name: formData.name.trim(),
      ownerId: formData.ownerId || null,
      countryCode: formData.countryCode,
      phone: formData.phone.trim() ? formData.phone.trim() : undefined,
      address: formData.address.trim() ? formData.address.trim() : undefined,
      email: formData.email.trim() ? formData.email.trim().toLowerCase() : undefined,
      notes: formData.notes.trim() ? formData.notes.trim() : undefined,
    };

    try {
      if (editingWorkshop) {
        await updateWorkshop(editingWorkshop.id, payload);
        Alert.alert('Éxito', 'Mecánica actualizada correctamente');
      } else {
        await addWorkshop(payload);
        Alert.alert('Éxito', 'Mecánica creada correctamente');
      }
      handleCloseModal();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la mecánica');
    }
  };

  const handleDelete = (workshop: Workshop) => {
    Alert.alert(
      'Eliminar mecánica',
      `¿Deseas eliminar ${workshop.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkshop(workshop.id);
            Alert.alert('Éxito', 'Mecánica eliminada');
          },
        },
      ]
    );
  };

  const filteredWorkshops = useMemo(() => {
    if (!searchQuery.trim()) return workshops;
    return workshops.filter((workshop) => {
      const owner = users.find((user) => user.id === workshop.ownerId);
      const country = getCountryByCode(workshop.countryCode);
      return (
        workshop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (owner && owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (country && country.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (workshop.address && workshop.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [searchQuery, workshops, users]);

  if (!permissions.canManageWorkshops) {
    return (
      <View style={styles.restrictedContainer}>
        <Shield size={56} color="#1d4ed8" />
        <Text style={styles.restrictedTitle}>Solo el administrador puede gestionar mecánicas</Text>
        <Text style={styles.restrictedText}>
          Solicita a tu administrador que cree la mecánica y te asigne como dueño para que puedas gestionarla.
        </Text>
      </View>
    );
  }

  const renderWorkshop = ({ item }: { item: Workshop }) => {
    const owner = users.find((user) => user.id === item.ownerId);
    const country = getCountryByCode(item.countryCode);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Building2 size={24} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {country && <Text style={styles.cardSubtitle}>{country.name}</Text>}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenModal(item)}
              testID={`workshop-edit-${item.id}`}
            >
              <Edit size={18} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
              testID={`workshop-delete-${item.id}`}
            >
              <Trash2 size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          {owner && (
            <View style={styles.infoRow}>
              <Users size={16} color="#0f172a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Técnico responsable</Text>
                <Text style={styles.infoValue}>{owner.name}</Text>
              </View>
            </View>
          )}

          {item.address && (
            <View style={styles.infoRow}>
              <MapPin size={16} color="#0f172a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{item.address}</Text>
              </View>
            </View>
          )}

          {item.phone && (
            <View style={styles.infoRow}>
              <Phone size={16} color="#0f172a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{item.phone}</Text>
              </View>
            </View>
          )}

          {item.email && (
            <View style={styles.infoRow}>
              <Mail size={16} color="#0f172a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{item.email}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Calendar size={16} color="#0f172a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Creada</Text>
              <Text style={styles.infoValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>

          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mecánicas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="workshop-search-input"
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
          testID="workshop-add-button"
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Mecánicas Gesticar</Text>
        <Text style={styles.heroSubtitle}>
          Crea talleres, asigna técnicos responsables y sincroniza la operación con tus órdenes de trabajo.
        </Text>
      </View>

      <FlatList
        data={filteredWorkshops}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkshop}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Building2 size={48} color="#cbd5f5" />
            <Text style={styles.emptyTitle}>No hay mecánicas registradas</Text>
            <Text style={styles.emptyDescription}>Crea tu primera mecánica para comenzar a asignar órdenes.</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingWorkshop ? 'Editar mecánica' : 'Nueva mecánica'}</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ej. Torque Plus Garage"
                placeholderTextColor="#9ca3af"
                testID="workshop-name-input"
              />

              <Text style={styles.label}>Técnico responsable (opcional)</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowOwnerPicker(true)}
                testID="workshop-owner-selector"
              >
                <Users size={18} color="#6b7280" />
                <Text style={styles.selectorText}>
                  {selectedOwner ? selectedOwner.name : 'Asignar después de crear técnicos'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>País *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowCountryPicker(true)}
                testID="workshop-country-selector"
              >
                <MapPin size={18} color="#6b7280" />
                <Text style={styles.selectorText}>
                  {selectedCountry?.name} ({selectedCountry?.phonePrefix})
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+593 99 123 4567"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                testID="workshop-phone-input"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="contacto@gesticar.ec"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="workshop-email-input"
              />

              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Ciudad, colonia, referencias"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                testID="workshop-address-input"
              />

              <Text style={styles.label}>Notas internas</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Servicios estrella, horarios especiales, etc."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                testID="workshop-notes-input"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCloseModal}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit}>
                  <Text style={styles.submitText}>{editingWorkshop ? 'Guardar cambios' : 'Crear mecánica'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showOwnerPicker} transparent animationType="fade" onRequestClose={() => setShowOwnerPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar técnico responsable</Text>
              <TouchableOpacity onPress={() => setShowOwnerPicker(false)}>
                <X size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ownerOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, formData.ownerId === item.id && styles.pickerItemSelected]}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, ownerId: item.id }));
                    setShowOwnerPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemRole}>Técnico de esta mecánica</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyOwners}>
                  <Text style={styles.emptyOwnersText}>Primero crea un técnico y asígnalo a esta mecánica.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar país</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <X size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LATIN_AMERICAN_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, formData.countryCode === item.code && styles.pickerItemSelected]}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, countryCode: item.code }));
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemRole}>{item.phonePrefix}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#f8fafc',
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    textAlign: 'center',
  },
  restrictedText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#1e3a8a',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#cbd5f5',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600' as const,
  },
  notes: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '92%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorText: {
    fontSize: 16,
    color: '#0f172a',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  cancelText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600' as const,
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemSelected: {
    backgroundColor: '#eff6ff',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  pickerItemRole: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyOwners: {
    padding: 24,
    alignItems: 'center',
  },
  emptyOwnersText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});
