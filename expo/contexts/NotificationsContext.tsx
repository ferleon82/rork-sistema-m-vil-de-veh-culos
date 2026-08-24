import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserNotification } from '@/types';
import type { Database } from '@/types/database';

type DbNotification = Database['public']['Tables']['user_notifications']['Row'];

const mapNotification = (notification: DbNotification): UserNotification => ({
  id: notification.id,
  recipientUserId: notification.recipient_user_id,
  actorUserId: notification.actor_user_id || undefined,
  workshopId: notification.workshop_id,
  workOrderId: notification.work_order_id || undefined,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  metadata: (notification.metadata || {}) as Record<string, unknown>,
  readAt: notification.read_at || undefined,
  createdAt: notification.created_at,
});

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } else {
      setNotifications((data || []).map(mapNotification));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    void loadNotifications();
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `recipient_user_id=eq.${user.id}` }, () => void loadNotifications())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setNotifications((current) => current.map((notification) =>
      notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification
    ));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.readAt).map((notification) => notification.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('user_notifications').update({ read_at: now }).in('id', unreadIds);
    if (error) throw error;
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || now })));
  };

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);
  return { notifications, unreadCount, isLoading, loadNotifications, markRead, markAllRead };
});
