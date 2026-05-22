import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import { WorkOrder } from '@/types';

const MECHANIC_ASSIGNMENTS_CHANNEL_ID = 'mechanic-order-assignments';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let notificationsReady = false;

export const prepareOrderAssignmentNotifications = async () => {
  if (notificationsReady || Platform.OS === 'web') {
    return notificationsReady;
  }

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
