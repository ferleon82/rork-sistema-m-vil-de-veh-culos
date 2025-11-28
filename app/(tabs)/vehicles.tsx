import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList } from 'react-native';
import { Car, Phone, Mail, Plus, ChevronDown, Search } from 'lucide-react-native';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useClients } from '@/contexts/ClientsContext';
import { Client } from '@/types';

export default function VehiclesScreen() {
  const { vehicles, addVehicle } = useVehicles();
  const { clients } = useClients();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [clientSelectorVisible, setClientSelectorVisible] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<{
    vin: string;
    plate: string;
    brand: string;
    model: string;
    year: string;
    currentKm: string;
  }>({
    vin: '',
    plate: '',
    brand: '',
    model: '',
    year: '',
    currentKm: '',
  });

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Por favor selecciona un cliente');
      return;
    }

    if (!formData.vin || !formData.plate || !formData.brand || !formData.model || !formData.year || !formData.currentKm) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    const year = parseInt(formData.year);
    const currentKm = parseInt(formData.currentKm);

    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Año inválido');
      return;
    }

    if (isNaN(currentKm) || currentKm < 0) {
      Alert.alert('Error', 'Kilometraje inválido');
      return;
    }

    try {
      await addVehicle({
        vin: formData.vin,
        plate: formData.plate,
        brand: formData.brand,
        model: formData.model,
        year,
        currentKm,
        clientId: selectedClient.id,
        ownerName: selectedClient.name,
        ownerPhone: selectedClient.phone,
        ownerEmail: selectedClient.email,
      });
      Alert.alert('Éxito', 'Vehículo registrado correctamente');
      setModalVisible(false);
      setSelectedClient(null);
      setFormData({
        vin: '',
        plate: '',
        brand: '',
        model: '',
        year: '',
        currentKm: '',
      });
    } catch {
      Alert.alert('Error', 'No se pudo registrar el vehículo');
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSelectorVisible(false);
  };

  const filteredVehicles = searchQuery
    ? vehicles.filter(
        (v) =>
          v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : vehicles;

  const renderVehicle = ({ item }: { item: typeof vehicles[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Car size={24} color="#2563eb" />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.vehiclePlate}>{item.plate}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>VIN:</Text>
          <Text style={styles.value}>{item.vin}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Año:</Text>
          <Text style={styles.value}>{item.year}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Kilometraje:</Text>
          <Text style={styles.value}>{item.currentKm.toLocaleString()} km</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.ownerSection}>
          <Text style={styles.ownerTitle}>Propietario</Text>
          <Text style={styles.ownerName}>{item.ownerName}</Text>

          <View style={styles.contactRow}>
            <Phone size={16} color="#6b7280" />
            <Text style={styles.contactText}>{item.ownerPhone}</Text>
          </View>

          {item.ownerEmail && (
            <View style={styles.contactRow}>
              <Mail size={16} color="#6b7280" />
              <Text style={styles.contactText}>{item.ownerEmail}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar vehículos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Car size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No hay vehículos registrados</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No se encontraron vehículos con ese criterio'
                : 'Presiona el botón + para agregar un nuevo vehículo'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Registrar Vehículo de Entrada</Text>

              <Text style={styles.label}>VIN *</Text>
              <TextInput
                style={styles.input}
                value={formData.vin}
                onChangeText={(text) => setFormData({ ...formData, vin: text })}
                placeholder="Número de identificación vehicular"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Placa *</Text>
              <TextInput
                style={styles.input}
                value={formData.plate}
                onChangeText={(text) => setFormData({ ...formData, plate: text })}
                placeholder="ABC-1234"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Marca *</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
                placeholder="Toyota, Honda, etc."
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Modelo *</Text>
              <TextInput
                style={styles.input}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                placeholder="Corolla, Civic, etc."
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Año *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.year}
                    onChangeText={(text) => setFormData({ ...formData, year: text })}
                    placeholder="2020"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Kilometraje *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currentKm}
                    onChangeText={(text) => setFormData({ ...formData, currentKm: text })}
                    placeholder="45000"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Cliente</Text>

              <Text style={styles.label}>Selecciona el cliente *</Text>
              <TouchableOpacity
                style={styles.clientSelector}
                onPress={() => setClientSelectorVisible(true)}
              >
                {selectedClient ? (
                  <View>
                    <Text style={styles.clientName}>{selectedClient.name}</Text>
                    <Text style={styles.clientPhone}>{selectedClient.phone}</Text>
                  </View>
                ) : (
                  <Text style={styles.clientPlaceholder}>Seleccionar cliente...</Text>
                )}
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              {clients.length === 0 && (
                <Text style={styles.warningText}>
                  No hay clientes registrados. Ve a la pestaña Clientes para crear uno.
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={clientSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClientSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <ScrollView style={styles.clientList}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.clientItem}
                  onPress={() => handleSelectClient(client)}
                >
                  <View>
                    <Text style={styles.clientItemName}>{client.name}</Text>
                    <Text style={styles.clientItemPhone}>{client.phone}</Text>
                    {client.email && (
                      <Text style={styles.clientItemEmail}>{client.email}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setClientSelectorVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#2563eb',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  ownerSection: {
    gap: 8,
  },
  ownerTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 16,
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
  clientSelector: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  clientPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  clientPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 16,
    fontStyle: 'italic' as const,
  },
  clientList: {
    maxHeight: 400,
  },
  clientItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  clientItemPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  clientItemEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
