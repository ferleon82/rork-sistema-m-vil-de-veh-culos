import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Wrench,
  Users,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { useWorkOrders } from '@/contexts/WorkOrdersContext';
import { WorkOrderStatus } from '@/types';
import { findDiagnosticCategory } from '@/constants/vehicleDiagnostics';

type StatsRange = '30d' | 'all';

export default function DashboardScreen() {
  const { user, permissions } = useAuth();
  const { vehicles } = useVehicles();
  const { workOrders } = useWorkOrders();
  const router = useRouter();

  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState<boolean>(true);
  const [diagnosticsRange, setDiagnosticsRange] = useState<StatsRange>('30d');

  const scopedOrders = useMemo(() => {
    if (!permissions.viewOnlyAssignedWorkOrders) {
      return workOrders;
    }
    return workOrders.filter((order) => order.assignedTo === user?.id);
  }, [permissions.viewOnlyAssignedWorkOrders, workOrders, user?.id]);

  const stats = useMemo(() => {
    const pending = scopedOrders.filter((wo) => wo.status === 'pending').length;
    const inProgress = scopedOrders.filter((wo) => wo.status === 'in_progress').length;
    const waitingApproval = scopedOrders.filter((wo) => wo.status === 'waiting_approval').length;
    const completed = scopedOrders.filter((wo) => wo.status === 'completed').length;
    const totalRevenue = scopedOrders
      .filter((wo) => wo.status === 'completed')
      .reduce((sum, wo) => sum + wo.totalCost, 0);

    return {
      pending,
      inProgress,
      waitingApproval,
      completed,
      totalRevenue,
    };
  }, [scopedOrders]);

  const statsOrders = useMemo(() => {
    const base = scopedOrders;
    if (diagnosticsRange === 'all') {
      return base;
    }
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - thirtyDaysMs;
    return base.filter((o) => {
      const iso = o.checkInAt ?? o.createdAt;
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) {
        return false;
      }
      return t >= cutoff;
    });
  }, [diagnosticsRange, scopedOrders]);

  const diagnosticsStats = useMemo(() => {
    const statusCounts: Record<WorkOrderStatus, number> = {
      pending: 0,
      in_progress: 0,
      waiting_approval: 0,
      approved: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalRevenue = 0;

    const categoryCounts: Record<
      string,
      { categoryId: string; workOrdersCount: number; vehicles: Set<string> }
    > = {};

    statsOrders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      totalRevenue += o.totalCost ?? 0;

      if (o.diagnosisCategoryId) {
        const current = categoryCounts[o.diagnosisCategoryId] ?? {
          categoryId: o.diagnosisCategoryId,
          workOrdersCount: 0,
          vehicles: new Set<string>(),
        };
        current.workOrdersCount += 1;
        current.vehicles.add(o.vehicleId);
        categoryCounts[o.diagnosisCategoryId] = current;
      }
    });

    const totalOrders = statsOrders.length;

    const topCategories = Object.values(categoryCounts)
      .sort((a, b) => b.workOrdersCount - a.workOrdersCount)
      .slice(0, 8)
      .map((row) => ({
        categoryId: row.categoryId,
        label: findDiagnosticCategory(row.categoryId)?.label ?? row.categoryId,
        workOrdersCount: row.workOrdersCount,
        vehiclesCount: row.vehicles.size,
      }));

    return {
      totalOrders,
      totalRevenue,
      avgTicket: totalOrders ? totalRevenue / totalOrders : 0,
      statusCounts,
      topCategories,
    };
  }, [statsOrders]);

  const recentOrders = useMemo(() => {
    return [...scopedOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [scopedOrders]);

  const roleCopy = user?.role === 'admin' ? 'Administrador' : user?.role === 'technician' ? 'Técnico' : 'Mecánico';
  const emptyOrdersMessage = permissions.viewOnlyAssignedWorkOrders
    ? 'No tienes órdenes asignadas por ahora'
    : 'No hay órdenes de trabajo';

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
        <View style={styles.brandHeader}>
          <Text style={styles.brandBadge}>Drivvo</Text>
          <Text style={styles.brandSubtitle}>Ecosistema inteligente de talleres</Text>
        </View>
        <Text style={styles.welcomeText}>Hola, {user?.name}</Text>
        <Text style={styles.roleText}>{roleCopy}</Text>
      </View>

      {permissions.viewOnlyAssignedWorkOrders && (
        <View style={styles.roleInfoCard}>
          <ShieldAlert size={20} color="#1d4ed8" />
          <View style={styles.roleInfoTextWrapper}>
            <Text style={styles.roleInfoTitle}>Modo Mecánico</Text>
            <Text style={styles.roleInfoDescription}>
              Solo verás las órdenes que el técnico te asigne. Mantén tus estados y notificaciones al día.
            </Text>
          </View>
        </View>
      )}

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

      <View style={styles.diagnosticsWrap} testID="dashboard-diagnostics-stats">
        <TouchableOpacity
          style={styles.diagnosticsHeader}
          onPress={() => setDiagnosticsExpanded((prev) => !prev)}
          testID="dashboard-diagnostics-toggle"
        >
          <View style={styles.diagnosticsHeaderLeft}>
            <View style={styles.diagnosticsIconPill}>
              <BarChart3 size={18} color="#0f172a" />
            </View>
            <View style={styles.diagnosticsHeaderTexts}>
              <Text style={styles.diagnosticsTitle}>Estadísticas (Diagnósticos)</Text>
              <Text style={styles.diagnosticsSubtitle}>
                {diagnosticsRange === '30d' ? 'Últimos 30 días' : 'Histórico'} · {diagnosticsStats.totalOrders} órdenes
              </Text>
            </View>
          </View>
          <ChevronDown size={18} color="#64748b" />
        </TouchableOpacity>

        {diagnosticsExpanded && (
          <View style={styles.diagnosticsBody}>
            <View style={styles.rangeRow}>
              <TouchableOpacity
                style={[styles.rangePill, diagnosticsRange === '30d' && styles.rangePillActive]}
                onPress={() => setDiagnosticsRange('30d')}
                testID="dashboard-diagnostics-range-30d"
              >
                <Text style={[styles.rangePillText, diagnosticsRange === '30d' && styles.rangePillTextActive]}>30 días</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rangePill, diagnosticsRange === 'all' && styles.rangePillActive]}
                onPress={() => setDiagnosticsRange('all')}
                testID="dashboard-diagnostics-range-all"
              >
                <Text style={[styles.rangePillText, diagnosticsRange === 'all' && styles.rangePillTextActive]}>Histórico</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: '#dbeafe' }]}>
                  <TrendingUp size={18} color="#1d4ed8" />
                </View>
                <Text style={styles.kpiLabel}>Ingresos</Text>
                <Text style={styles.kpiValue}>${diagnosticsStats.totalRevenue.toFixed(2)}</Text>
                <Text style={styles.kpiHint}>Ticket prom. ${diagnosticsStats.avgTicket.toFixed(2)}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: '#dcfce7' }]}>
                  <Wrench size={18} color="#166534" />
                </View>
                <Text style={styles.kpiLabel}>Completadas</Text>
                <Text style={styles.kpiValue}>{diagnosticsStats.statusCounts.completed}</Text>
                <Text style={styles.kpiHint}>
                  Activas{' '}
                  {diagnosticsStats.statusCounts.pending +
                    diagnosticsStats.statusCounts.in_progress +
                    diagnosticsStats.statusCounts.waiting_approval +
                    diagnosticsStats.statusCounts.approved}
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Users size={18} color="#3730a3" />
                </View>
                <Text style={styles.kpiLabel}>Órdenes</Text>
                <Text style={styles.kpiValue}>{diagnosticsStats.totalOrders}</Text>
                <Text style={styles.kpiHint}>En este rango</Text>
              </View>
            </View>

            <View style={styles.diagnosticsSection}>
              <Text style={styles.diagnosticsSectionTitle}>Vehículos por sistema</Text>
              {diagnosticsStats.topCategories.length ? (
                diagnosticsStats.topCategories.map((row) => (
                  <View key={row.categoryId} style={styles.rankRow}>
                    <View style={styles.rankLeft}>
                      <Text style={styles.rankLabel} numberOfLines={1}>
                        {row.label}
                      </Text>
                      <Text style={styles.rankSubLabel} numberOfLines={1}>
                        {row.vehiclesCount} vehículos · {row.workOrdersCount} órdenes
                      </Text>
                    </View>
                    <Text style={styles.rankValue}>{row.vehiclesCount}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.statsEmpty}>Aún no hay diagnósticos categorizados.</Text>
              )}
            </View>
          </View>
        )}
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
            <Text style={styles.emptyText}>{emptyOrdersMessage}</Text>
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

      {permissions.canManageVehicles && (
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
      )}
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  brandHeader: {
    marginBottom: 12,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#4c1d95',
    fontWeight: '500' as const,
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
  roleInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 16,
  },
  roleInfoTextWrapper: {
    flex: 1,
    gap: 4,
  },
  roleInfoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  roleInfoDescription: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
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
  diagnosticsWrap: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2ff',
    overflow: 'hidden',
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
  },
  diagnosticsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  diagnosticsIconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticsHeaderTexts: {
    flex: 1,
    gap: 2,
  },
  diagnosticsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  diagnosticsSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  diagnosticsBody: {
    padding: 16,
    gap: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  rangePillActive: {
    backgroundColor: '#0f172a',
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#475569',
  },
  rangePillTextActive: {
    color: '#fff',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700' as const,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0f172a',
  },
  kpiHint: {
    fontSize: 11,
    color: '#64748b',
  },
  diagnosticsSection: {
    gap: 10,
  },
  diagnosticsSectionTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#0f172a',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rankLeft: {
    flex: 1,
    gap: 2,
  },
  rankLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  rankSubLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#0f172a',
  },
  statsEmpty: {
    fontSize: 12,
    color: '#94a3b8',
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