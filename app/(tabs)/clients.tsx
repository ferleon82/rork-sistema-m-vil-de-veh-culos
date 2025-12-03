import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useClients } from '@/contexts/ClientsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@/types';
import { LATIN_AMERICAN_COUNTRIES, getCountryByCode } from '@/constants/countries';
import { Plus, Search, User, Phone, Mail, MapPin, FileText, X, Trash2, Edit, Globe, Shield } from 'lucide-react-native';

export default function ClientsScreen() {
  const { clients, addClient, updateClient, deleteClient, searchClients } = useClients();
  const { permissions } = useAuth();
  const canManageClients = permissions.canManageClients;
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    countryCode: 'SV',
    email: '',
    address: '',
    documentNumber: '',
    notes: '',
  });

  const filteredClients = searchQuery ? searchClients(searchQuery) : clients;

  if (!canManageClients) {
    return (
      <View style={styles.restrictedContainer}>
        <Shield size={48} color="#1d4ed8" />
        <Text style={styles.restrictedTitle}>Acceso restringido</Text>
        <Text style={styles.restrictedText}>
          Solo administradores y técnicos pueden gestionar clientes.
        </Text>
      </View>
    );
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      countryCode: 'SV',
      email: '',
      address: '',
      documentNumber: '',
      notes: '',
    });
    setEditingClient(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      countryCode: client.countryCode,
      email: client.email || '',
      address: client.address || '',
      documentNumber: client.documentNumber || '',
      notes: client.notes || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Nombre y teléfono son obligatorios');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formData.name,
          phone: formData.phone,
          countryCode: formData.countryCode,
          email: formData.email || undefined,
          address: formData.address || undefined,
          documentNumber: formData.documentNumber || undefined,
          notes: formData.notes || undefined,
        });
        Alert.alert('Éxito', 'Cliente actualizado correctamente');
      } else {
        await addClient({
          name: formData.name,
          phone: formData.phone,
          countryCode: formData.countryCode,
          email: formData.email || undefined,
          address: formData.address || undefined,
          documentNumber: formData.documentNumber || undefined,
          notes: formData.notes || undefined,
        });
        Alert.alert('Éxito', 'Cliente creado correctamente');
      }
      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cliente');
    }
  };

  const handleDelete = (client: Client) => {
    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de eliminar a ${client.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteClient(client.id);
            Alert.alert('Éxito', 'Cliente eliminado');
          },
        },
      ]
    );
  };

  const selectedCountry = getCountryByCode(formData.countryCode);

  const renderClient = ({ item }: { item: Client }) => {
    const country = getCountryByCode(item.countryCode);
    
    return (
      <View style={styles.clientCard}>
        <View style={styles.clientHeader}>
          <View style={styles.clientAvatar}>
            <User size={24} color="#2563eb" />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.name}</Text>
            <View style={styles.clientDetail}>
              <Phone size={14} color="#6b7280" />
              <Text style={styles.clientPhone}>{item.phone}</Text>
            </View>
            {item.email && (
              <View style={styles.clientDetail}>
                <Mail size={14} color="#6b7280" />
                <Text style={styles.clientEmail}>{item.email}</Text>
              </View>
            )}
            <View style={styles.clientDetail}>
              <Globe size={14} color="#6b7280" />
              <Text style={styles.clientCountry}>{country?.name}</Text>
            </View>
          </View>
          <View style={styles.clientActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
              <Edit size={20} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.address && (
          <View style={styles.clientDetail}>
            <MapPin size={14} color="#6b7280" />
            <Text style={styles.clientAddress}>{item.address}</Text>
          </View>
        )}
        
        {item.documentNumber && (
          <View style={styles.clientDetail}>
            <FileText size={14} color="#6b7280" />
            <Text style={styles.clientDoc}>DUI: {item.documentNumber}</Text>
          </View>
        )}
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notas:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
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
            placeholder="Buscar clientes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No hay clientes registrados</Text>
            <Text style={styles.emptySubtext}>
              Presiona el botón + para agregar un nuevo cliente
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nombre Completo <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Juan Pérez"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  País <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Globe size={20} color="#6b7280" />
                  <Text style={styles.countrySelectorText}>
                    {selectedCountry?.name} ({selectedCountry?.phonePrefix})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Teléfono <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>{selectedCountry?.phonePrefix}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="1234 5678"
                    value={formData.phone.replace(selectedCountry?.phonePrefix || '', '').trim()}
                    onChangeText={(text) => {
                      const cleanPhone = text.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, phone: `${selectedCountry?.phonePrefix}${cleanPhone}` });
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="cliente@ejemplo.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>DUI / Documento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="01234567-8"
                  value={formData.documentNumber}
                  onChangeText={(text) => setFormData({ ...formData, documentNumber: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Calle, colonia, ciudad"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Información adicional del cliente"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>
                    {editingClient ? 'Actualizar' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar País</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LATIN_AMERICAN_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    formData.countryCode === item.code && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, countryCode: item.code })
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemPrefix}>{item.phonePrefix}</Text>
                </TouchableOpacity>
              )}
              style={styles.countryList}
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
    backgroundColor: '#f9fafb',
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  restrictedText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 4,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientCountry: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientAddress: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  clientDoc: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  countrySelectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    minWidth: 80,
  },
  phonePrefixText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  countryItemSelected: {
    backgroundColor: '#eff6ff',
  },
  countryItemName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500' as const,
  },
  countryItemPrefix: {
    fontSize: 16,
    color: '#6b7280',
  },
});
