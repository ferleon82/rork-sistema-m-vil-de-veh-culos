import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useWorkOrders } from '@/contexts/WorkOrdersContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { vehicles } = useVehicles();
  const { workOrders } = useWorkOrders();
  const router = useRouter();

  const stats = useMemo(() => {
    const pending = workOrders.filter((wo) => wo.status === 'pending').length;
    const inProgress = workOrders.filter((wo) => wo.status === 'in_progress').length;
    const waitingApproval = workOrders.filter((wo) => wo.status === 'waiting_approval').length;
    const completed = workOrders.filter((wo) => wo.status === 'completed').length;
    const totalRevenue = workOrders
      .filter((wo) => wo.status === 'completed')
      .reduce((sum, wo) => sum + wo.totalCost, 0);

    return {
      pending,
      inProgress,
      waitingApproval,
      completed,
      totalRevenue,
    };
  }, [workOrders]);

  const recentOrders = useMemo(() => {
    return workOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [workOrders]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Hola, {user?.name}</Text>
        <Text style={styles.roleText}>
          {user?.role === 'admin' ? 'Administrador' : 'Técnico'}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Clock size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <AlertCircle size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>En Progreso</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <CheckCircle2 size={24} color="#059669" />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f3e8ff' }]}>
          <DollarSign size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>${stats.totalRevenue}</Text>
          <Text style={styles.statLabel}>Ingresos</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Órdenes Recientes</Text>
          <TouchableOpacity onPress={() => router.push('/work-orders' as any)}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay órdenes de trabajo</Text>
          </View>
        ) : (
          recentOrders.map((order) => {
            const vehicle = vehicles.find((v) => v.id === order.vehicleId);
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/work-orders/${order.id}` as any)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderCode}>{order.code}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.status) },
                      ]}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                {vehicle && (
                  <Text style={styles.vehicleText}>
                    {vehicle.brand} {vehicle.model} - {vehicle.plate}
                  </Text>
                )}

                <Text style={styles.orderDescription} numberOfLines={2}>
                  {order.description}
                </Text>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.orderCost}>${order.totalCost}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehículos Registrados</Text>
        <View style={styles.vehiclesCard}>
          <Text style={styles.vehiclesCount}>{vehicles.length}</Text>
          <Text style={styles.vehiclesLabel}>vehículos en el sistema</Text>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push('/vehicles' as any)}
          >
            <Text style={styles.viewButtonText}>Ver vehículos</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  welcomeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500' as const,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  vehicleText: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 4,
  },
  orderDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  orderCost: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#059669',
  },
  vehiclesCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehiclesCount: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#2563eb',
    marginBottom: 4,
  },
  vehiclesLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});