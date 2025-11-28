import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Car, Phone, Mail, Plus } from 'lucide-react-native';
import { useVehicles } from '@/contexts/VehiclesContext';

export default function VehiclesScreen() {
  const { vehicles, addVehicle } = useVehicles();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    vin: string;
    plate: string;
    brand: string;
    model: string;
    year: string;
    currentKm: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
  }>({
    vin: '',
    plate: '',
    brand: '',
    model: '',
    year: '',
    currentKm: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
  });

  const handleSubmit = async () => {
    if (!formData.vin || !formData.plate || !formData.brand || !formData.model || !formData.year || !formData.currentKm || !formData.ownerName || !formData.ownerPhone) {
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
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail || undefined,
      });
      Alert.alert('Éxito', 'Vehículo registrado correctamente');
      setModalVisible(false);
      setFormData({
        vin: '',
        plate: '',
        brand: '',
        model: '',
        year: '',
        currentKm: '',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el vehículo');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Vehículos',
          headerRight: () => (
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Plus size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Car size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No hay vehículos registrados</Text>
          <Text style={styles.emptyText}>
            Los vehículos aparecerán aquí cuando se registren
          </Text>
        </View>
      ) : (
        vehicles.map((vehicle) => (
          <View key={vehicle.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Car size={24} color="#2563eb" />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicle.brand} {vehicle.model}
                </Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>VIN:</Text>
                <Text style={styles.value}>{vehicle.vin}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Año:</Text>
                <Text style={styles.value}>{vehicle.year}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Kilometraje:</Text>
                <Text style={styles.value}>{vehicle.currentKm.toLocaleString()} km</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.ownerSection}>
                <Text style={styles.ownerTitle}>Propietario</Text>
                <Text style={styles.ownerName}>{vehicle.ownerName}</Text>

                <View style={styles.contactRow}>
                  <Phone size={16} color="#6b7280" />
                  <Text style={styles.contactText}>{vehicle.ownerPhone}</Text>
                </View>

                {vehicle.ownerEmail && (
                  <View style={styles.contactRow}>
                    <Mail size={16} color="#6b7280" />
                    <Text style={styles.contactText}>{vehicle.ownerEmail}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>

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
              <Text style={styles.sectionTitle}>Datos del Propietario</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.ownerName}
                onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
                placeholder="Nombre completo"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                value={formData.ownerPhone}
                onChangeText={(text) => setFormData({ ...formData, ownerPhone: text })}
                placeholder="+503 1234-5678"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.ownerEmail}
                onChangeText={(text) => setFormData({ ...formData, ownerEmail: text })}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
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
});
