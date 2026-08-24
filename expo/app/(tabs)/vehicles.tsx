import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Car,
  Phone,
  Mail,
  Plus,
  ChevronDown,
  Search,
  Shield,
  Edit,
  Trash2,
  Camera,
  ImageOff,
} from 'lucide-react-native';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useClients } from '@/contexts/ClientsContext';
import { useAuth } from '@/contexts/AuthContext';
import { VEHICLE_BRANDS } from '@/constants/vehicleBrands';
import { Client, Vehicle } from '@/types';

interface VehicleFormState {
  vin: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  currentKm: string;
  photoUrl: string | null;
}

const createInitialFormState = (): VehicleFormState => ({
  vin: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  currentKm: '',
  photoUrl: null,
});

export default function VehiclesScreen() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const { clients } = useClients();
  const { permissions, user: currentUser } = useAuth();
  const canManageVehicles = permissions.canManageVehicles;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [clientSelectorVisible, setClientSelectorVisible] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<VehicleFormState>(createInitialFormState());
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [brandSelectorVisible, setBrandSelectorVisible] = useState<boolean>(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');

  const resetForm = () => {
    setFormData(createInitialFormState());
    setSelectedClient(null);
    setEditingVehicle(null);
    setBrandSearchQuery('');
    setBrandSelectorVisible(false);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setClientSelectorVisible(false);
    resetForm();
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const resolveClientFromVehicle = (vehicle: Vehicle): Client => {
    const existing = clients.find((client) => client.id === vehicle.clientId);
    if (existing) {
      return existing;
    }

    return {
      id: vehicle.clientId,
      name: vehicle.ownerName,
      phone: vehicle.ownerPhone,
      countryCode: 'EC',
      email: vehicle.ownerEmail,
      createdAt: vehicle.createdAt,
    };
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vin: vehicle.vin,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year.toString(),
      currentKm: vehicle.currentKm.toString(),
      photoUrl: vehicle.photoUrl ?? null,
    });
    setSelectedClient(resolveClientFromVehicle(vehicle));
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Por favor selecciona un cliente');
      return;
    }

    if (!formData.plate || !formData.brand || !formData.model || !formData.year || !formData.currentKm) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    const year = parseInt(formData.year, 10);
    const currentKm = parseInt(formData.currentKm, 10);

    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Año inválido');
      return;
    }

    if (isNaN(currentKm) || currentKm < 0) {
      Alert.alert('Error', 'Kilometraje inválido');
      return;
    }

    try {
      const payload = {
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
        photoUrl: formData.photoUrl ?? undefined,
        // A selected client normally carries its workshop.  The current
        // technician's workshop is a safe fallback while the client list is
        // refreshing after authentication.  The database verifies and derives
        // the final value from client_id as the authoritative source.
        workshopId: selectedClient.workshopId ?? currentUser?.workshopId,
      };

      if (editingVehicle) {
        console.log('[Vehicles] Updating vehicle', editingVehicle.id);
        await updateVehicle(editingVehicle.id, payload);
        Alert.alert('Éxito', 'Vehículo actualizado correctamente');
      } else {
        console.log('[Vehicles] Creating new vehicle');
        await addVehicle(payload);
        Alert.alert('Éxito', 'Vehículo registrado correctamente');
      }

      handleCloseModal();
    } catch (error) {
      console.error('[Vehicles] Error saving vehicle', error);
      Alert.alert('Error', 'No se pudo guardar el vehículo');
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert('Eliminar vehículo', `¿Deseas eliminar ${vehicle.brand} ${vehicle.model}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[Vehicles] Deleting vehicle', vehicle.id);
            await deleteVehicle(vehicle.id);
            Alert.alert('Éxito', 'Vehículo eliminado');
          } catch (error) {
            console.error('[Vehicles] Error deleting vehicle', error);
            Alert.alert('Error', 'No se pudo eliminar el vehículo');
          }
        },
      },
    ]);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSelectorVisible(false);
  };

  const handlePlateChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9\-_.\s]/g, '');
    setFormData((prev) => ({ ...prev, plate: formatted }));
  };

  const handleCapturePhoto = async () => {
    try {
      console.log('[Vehicles] Requesting camera capture');
      if (Platform.OS === 'web') {
        Alert.alert('Cámara no disponible', 'La cámara no está soportada en la versión web. Usa la galería.');
        return;
      }
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la fotografía.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        console.log('[Vehicles] Photo captured');
        setFormData((prev) => ({ ...prev, photoUrl: result.assets?.[0]?.uri ?? prev.photoUrl }));
      }
    } catch (error) {
      console.error('[Vehicles] Error capturing photo', error);
      Alert.alert('Error', 'No se pudo tomar la fotografía del vehículo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      console.log('[Vehicles] Opening gallery');
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setFormData((prev) => ({ ...prev, photoUrl: result.assets?.[0]?.uri ?? prev.photoUrl }));
      }
    } catch (error) {
      console.error('[Vehicles] Error picking photo', error);
      Alert.alert('Error', 'No se pudo seleccionar la fotografía');
    }
  };

  const handleClearPhoto = () => {
    console.log('[Vehicles] Clearing captured photo');
    setFormData((prev) => ({ ...prev, photoUrl: null }));
  };

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) {
      return vehicles;
    }
    const normalized = searchQuery.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.brand.toLowerCase().includes(normalized) ||
        v.model.toLowerCase().includes(normalized) ||
        v.plate.toLowerCase().includes(normalized) ||
        v.ownerName.toLowerCase().includes(normalized),
    );
  }, [searchQuery, vehicles]);

  const normalizedBrandQuery = brandSearchQuery.trim().toLowerCase();

  const brandResults = useMemo(() => {
    if (!normalizedBrandQuery) {
      return VEHICLE_BRANDS;
    }
    return VEHICLE_BRANDS.filter((brand) => brand.toLowerCase().includes(normalizedBrandQuery));
  }, [normalizedBrandQuery]);

  const showCustomBrandOption =
    normalizedBrandQuery.length > 0 &&
    !VEHICLE_BRANDS.some((brand) => brand.toLowerCase() === normalizedBrandQuery);

  const openBrandSelector = () => {
    setBrandSearchQuery('');
    setBrandSelectorVisible(true);
  };

  const handleCloseBrandSelector = () => {
    setBrandSelectorVisible(false);
    setBrandSearchQuery('');
  };

  const handleSelectBrand = (brand: string) => {
    setFormData((prev) => ({ ...prev, brand }));
    handleCloseBrandSelector();
  };

  const handleUseCustomBrand = () => {
    if (!normalizedBrandQuery) {
      return;
    }
    setFormData((prev) => ({ ...prev, brand: brandSearchQuery.trim() }));
    handleCloseBrandSelector();
  };

  if (!canManageVehicles) {
    return (
      <View style={styles.restrictedContainer}>
        <Shield size={48} color="#1d4ed8" />
        <Text style={styles.restrictedTitle}>Acceso restringido</Text>
        <Text style={styles.restrictedText}>
          Este módulo solo está disponible para administradores y técnicos.
        </Text>
      </View>
    );
  }

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.vehicleImage} resizeMode="cover" />
          ) : (
            <Car size={32} color="#2563eb" />
          )}
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.vehiclePlate}>{item.plate}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            style={styles.actionButton}
            testID={`vehicle-edit-${item.id}`}
          >
            <Edit size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteVehicle(item)}
            style={styles.actionButton}
            testID={`vehicle-delete-${item.id}`}
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>VIN:</Text>
          <Text style={styles.value}>{item.vin ? item.vin : 'No registrado'}</Text>
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          testID="add-vehicle-button"
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        testID="vehicles-list"
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
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingVehicle ? 'Editar Vehículo' : 'Registrar Vehículo de Entrada'}
              </Text>

              <Text style={styles.label}>Placa *</Text>
              <TextInput
                style={styles.input}
                value={formData.plate}
                onChangeText={handlePlateChange}
                placeholder="ABC-1234"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                testID="vehicle-plate-input"
              />

              <Text style={styles.label}>Marca *</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                onPress={openBrandSelector}
                testID="vehicle-brand-selector"
              >
                <View style={styles.selectorValueWrapper}>
                  <Text style={formData.brand ? styles.selectorValue : styles.selectorPlaceholder}>
                    {formData.brand ? formData.brand : 'Buscar marca comercial...'}
                  </Text>
                </View>
                <View style={styles.selectorIconBubble}>
                  <Search size={18} color="#0f172a" />
                </View>
              </TouchableOpacity>
              <Text style={styles.selectorHelper}>
                Escribe algunas letras para encontrar marcas comerciales populares.
              </Text>

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

              <Text style={styles.label}>VIN (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.vin}
                onChangeText={(text) => setFormData({ ...formData, vin: text })}
                placeholder="Número de identificación vehicular"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />

              <View style={styles.photoSection}>
                <Text style={styles.sectionTitle}>Fotografía del vehículo</Text>
                <Text style={styles.photoHint}>Captura una imagen para identificar rápidamente el vehículo.</Text>

                {formData.photoUrl ? (
                  <View style={styles.photoPreviewWrapper}>
                    <Image
                      source={{ uri: formData.photoUrl }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={handleClearPhoto}
                      testID="vehicle-photo-remove"
                    >
                      <ImageOff size={18} color="#ef4444" />
                      <Text style={styles.removePhotoText}>Eliminar foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Car size={32} color="#9ca3af" />
                    <Text style={styles.photoPlaceholderText}>Sin fotografía</Text>
                  </View>
                )}

                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoButton, styles.captureButton]}
                    onPress={handleCapturePhoto}
                    testID="vehicle-photo-capture"
                  >
                    <Camera size={18} color="#fff" />
                    <Text style={styles.photoButtonText}>Tomar foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoButton, styles.galleryButton]}
                    onPress={handlePickPhoto}
                    testID="vehicle-photo-gallery"
                  >
                    <ImageOff size={18} color="#1f2937" />
                    <Text style={styles.galleryButtonText}>Seleccionar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Cliente</Text>

              <Text style={styles.label}>Selecciona el cliente *</Text>
              <TouchableOpacity
                style={styles.clientSelector}
                onPress={() => setClientSelectorVisible(true)}
                testID="vehicle-client-selector"
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
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                  testID="vehicle-submit-button"
                >
                  <Text style={styles.submitButtonText}>
                    {editingVehicle ? 'Actualizar' : 'Registrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={brandSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseBrandSelector}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Buscar marca</Text>
            <View style={styles.brandSearchBox}>
              <Search size={18} color="#6b7280" />
              <TextInput
                style={styles.brandSearchInput}
                value={brandSearchQuery}
                onChangeText={setBrandSearchQuery}
                placeholder="Escribe Toyota, Kia, etc."
                placeholderTextColor="#9ca3af"
                autoFocus={true}
                testID="vehicle-brand-search-input"
              />
            </View>

            {brandResults.length === 0 && !showCustomBrandOption ? (
              <View style={styles.brandEmptyState}>
                <Text style={styles.brandEmptyText}>No encontramos coincidencias.</Text>
              </View>
            ) : (
              <ScrollView style={styles.brandList}>
                {brandResults.map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={styles.brandItem}
                    onPress={() => handleSelectBrand(brand)}
                    testID={`vehicle-brand-option-${brand.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Text style={styles.brandItemText}>{brand}</Text>
                  </TouchableOpacity>
                ))}

                {showCustomBrandOption && (
                  <TouchableOpacity
                    style={[styles.brandItem, styles.customBrandButton]}
                    onPress={handleUseCustomBrand}
                    testID="vehicle-brand-custom-option"
                  >
                    <Text style={styles.customBrandText}>
                      Usar “{brandSearchQuery.trim()}”
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={handleCloseBrandSelector}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
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
                  testID={`vehicle-client-option-${client.id}`}
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
    width: 112,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
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
  selectorInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  selectorValueWrapper: {
    flex: 1,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  selectorIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorHelper: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 16,
  },
  brandSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  brandEmptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  brandEmptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  brandList: {
    maxHeight: 360,
    marginBottom: 16,
  },
  brandItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  brandItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500' as const,
  },
  customBrandButton: {
    backgroundColor: '#eef2ff',
  },
  customBrandText: {
    fontSize: 15,
    color: '#4338ca',
    fontWeight: '600' as const,
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
  photoSection: {
    marginTop: 24,
    gap: 12,
  },
  photoHint: {
    fontSize: 14,
    color: '#6b7280',
  },
  photoPreviewWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoPreview: {
    width: '100%',
    height: 200,
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  removePhotoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#b91c1c',
  },
  photoPlaceholder: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  captureButton: {
    backgroundColor: '#2563eb',
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  galleryButton: {
    backgroundColor: '#e0e7ff',
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1f2937',
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
