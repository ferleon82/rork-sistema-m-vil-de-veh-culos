import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { User, LogOut, Shield, Info, CheckCircle2, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout, isAdmin, isTechnician, permissions } = useAuth();
  const roleLabel = isAdmin ? 'Administrador' : isTechnician ? 'Técnico' : 'Mecánico';
  const roleColor = isAdmin ? '#dc2626' : isTechnician ? '#2563eb' : '#059669';
  const capabilityItems = [
    { label: 'Crear nuevas mecánicas', enabled: permissions.canManageWorkshops },
    { label: 'Gestionar usuarios', enabled: permissions.canManageUsers },
    { label: 'Gestionar clientes', enabled: permissions.canManageClients },
    { label: 'Gestionar vehículos', enabled: permissions.canManageVehicles },
    { label: 'Crear y editar órdenes', enabled: permissions.canManageWorkOrders },
    { label: 'Asignar órdenes a mecánicos', enabled: permissions.canAssignWorkOrders },
    { label: 'Ver solo órdenes asignadas', enabled: permissions.viewOnlyAssignedWorkOrders },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User size={32} color="#2563eb" />
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Shield size={14} color={roleColor} />
          <Text style={[styles.roleText, { color: roleColor }]}>
            {roleLabel}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Sistema</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión de la App</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modo</Text>
            <Text style={styles.infoValue}>Demo</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permisos de tu rol</Text>
        <View style={styles.permissionsCard}>
          {capabilityItems.map((item) => (
            <View key={item.label} style={styles.permissionRow}>
              {item.enabled ? (
                <CheckCircle2 size={18} color="#16a34a" />
              ) : (
                <XCircle size={18} color="#94a3b8" />
              )}
              <Text style={[styles.permissionLabel, !item.enabled && styles.permissionLabelDisabled]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Funcionalidades</Text>
        
        <View style={styles.featuresCard}>
          <View style={styles.featureItem}>
            <Info size={20} color="#2563eb" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Notificaciones WhatsApp</Text>
              <Text style={styles.featureDescription}>
                Envía actualizaciones de estado y presupuestos directamente a los clientes
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureItem}>
            <Info size={20} color="#2563eb" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Gestión de Órdenes</Text>
              <Text style={styles.featureDescription}>
                Administra órdenes de trabajo con estados y presupuestos detallados
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureItem}>
            <Info size={20} color="#2563eb" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Seguimiento de Vehículos</Text>
              <Text style={styles.featureDescription}>
                Registra y rastrea el historial de mantenimiento de cada vehículo
              </Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Sistema de Mantenimiento Vehicular © 2025
      </Text>
    </ScrollView>
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  permissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionLabel: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  permissionLabelDisabled: {
    color: '#94a3b8',
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#dc2626',
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
});
