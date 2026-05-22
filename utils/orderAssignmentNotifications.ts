import Constants from 'expo-constants';
import { Platform, Vibration } from 'react-native';
import { WorkOrder } from '@/types';

const MECHANIC_ASSIGNMENTS_CHANNEL_ID = 'mechanic-order-assignments';

let notificationsReady = false;
let notificationHandlerConfigured = false;

type NotificationsModule = typeof import('expo-notifications');

const isExpoGo = Constants.appOwnership === 'expo';

const loadNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  const Notifications = await import('expo-notifications');

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
};

export const prepareOrderAssignmentNotifications = async () => {
  if (notificationsReady || Platform.OS === 'web' || isExpoGo) {
    return notificationsReady;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MECHANIC_ASSIGNMENTS_CHANNEL_ID, {
      name: 'Ordenes asignadas',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const currentPermissionsAny = currentPermissions as any;
  const finalPermissions =
    currentPermissionsAny.granted === true ||
    currentPermissionsAny.status === 'granted' ||
    currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();
  const finalPermissionsAny = finalPermissions as any;

  notificationsReady =
    finalPermissionsAny.granted === true ||
    finalPermissionsAny.status === 'granted' ||
    finalPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return notificationsReady;
};

export const notifyMechanicAssignedOrder = async (order: WorkOrder) => {
  try {
    Vibration.vibrate([0, 500, 250, 500]);

    const canNotify = await prepareOrderAssignmentNotifications();
    if (!canNotify || Platform.OS === 'web') {
      return;
    }

    const Notifications = await loadNotificationsModule();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nueva orden asignada',
        body: `${order.code}: ${order.description}`,
        sound: 'default',
        data: {
          orderId: order.id,
          code: order.code,
        },
      },
      trigger: Platform.OS === 'android' ? { channelId: MECHANIC_ASSIGNMENTS_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.error('[OrderAssignmentNotifications] Error sending assignment notification:', error);
  }
};
