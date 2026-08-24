import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, ClipboardList } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationsContext';
import { UserNotification } from '@/types';

const formatDate = (value: string) => new Date(value).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const openNotification = async (notification: UserNotification) => {
    if (!notification.readAt) await markRead(notification.id);
    if (notification.workOrderId) router.push('/(tabs)/work-orders');
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} sin leer` : 'Todo al día'}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => void markAllRead()} style={styles.readAllButton}>
            <CheckCheck size={18} color="#2563eb" />
            <Text style={styles.readAllText}>Marcar leídas</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(notification) => notification.id}
        contentContainerStyle={notifications.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.readAt && styles.cardUnread]}
            onPress={() => void openNotification(item)}
          >
            <View style={styles.iconWrap}><ClipboardList size={20} color="#2563eb" /></View>
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.readAt && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Bell size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
            <Text style={styles.emptyText}>Los cambios de órdenes y aprobaciones aparecerán aquí.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toolbar: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  subtitle: { fontSize: 14, color: '#64748b' },
  readAllButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  readAllText: { color: '#2563eb', fontSize: 13, fontWeight: '700' as const },
  list: { padding: 14, gap: 10 },
  emptyList: { flexGrow: 1 },
  card: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardUnread: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: '#1e293b' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  body: { marginTop: 4, fontSize: 13, lineHeight: 18, color: '#475569' },
  date: { marginTop: 7, fontSize: 11, color: '#94a3b8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },
  emptyTitle: { marginTop: 14, fontSize: 17, fontWeight: '700' as const, color: '#334155' },
  emptyText: { marginTop: 6, fontSize: 13, textAlign: 'center', color: '#64748b' },
});
